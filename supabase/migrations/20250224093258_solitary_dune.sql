/*
  # Financial Transactions Schema
  
  1. Tables
    - transactions
      - Basic transaction info (type, amount, dates)
      - Customer and tenant references
      - Status tracking
  
  2. Functions
    - get_daily_balance: Calculate daily financial totals
    - get_financial_summary: Get monthly financial overview
  
  3. Policies
    - Transaction viewing and management policies
*/

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  date date NOT NULL,
  due_date date,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  category text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_due_date CHECK (due_date IS NULL OR due_date >= date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS transactions_tenant_id_idx ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date);
CREATE INDEX IF NOT EXISTS transactions_customer_id_idx ON transactions(customer_id);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policies
CREATE POLICY "Users can view transactions from their tenant"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );

CREATE POLICY "Users can create transactions in their tenant"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );

CREATE POLICY "Users can update transactions in their tenant"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  )
  WITH CHECK (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );

-- Function to get daily balance
CREATE OR REPLACE FUNCTION get_daily_balance(start_date date, end_date date)
RETURNS TABLE (
  date date,
  income numeric,
  expense numeric,
  balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(start_date, end_date, '1 day'::interval)::date AS series_date
  ),
  daily_totals AS (
    SELECT
      d.series_date as transaction_date,
      COALESCE(SUM(CASE WHEN t.type = 'income' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as expense
    FROM dates d
    LEFT JOIN transactions t ON d.series_date = t.date 
      AND t.tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
    GROUP BY d.series_date
  )
  SELECT
    dt.transaction_date as date,
    dt.income,
    dt.expense,
    dt.income - dt.expense as balance
  FROM daily_totals dt
  ORDER BY dt.transaction_date;
END;
$$;

-- Function to get financial summary
CREATE OR REPLACE FUNCTION get_financial_summary()
RETURNS TABLE (
  total_income numeric,
  total_expense numeric,
  balance numeric,
  pending_income numeric,
  pending_expense numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_tenant_id uuid;
BEGIN
  -- Get current tenant ID from JWT claims
  current_tenant_id := (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid);
  
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_expense,
    COALESCE(SUM(CASE 
      WHEN type = 'income' AND status = 'completed' THEN amount
      WHEN type = 'expense' AND status = 'completed' THEN -amount
      ELSE 0 
    END), 0) as balance,
    COALESCE(SUM(CASE WHEN type = 'income' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_income,
    COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_expense
  FROM transactions
  WHERE tenant_id = current_tenant_id
    AND date >= date_trunc('month', current_date)
    AND date < date_trunc('month', current_date) + interval '1 month';
END;
$$;