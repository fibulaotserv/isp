/*
  # Add billing features

  1. New Tables
    - `billing_settings`
      - Configuration for billing like grace period, late fees
    - `invoices`
      - Customer invoices with payment status
    - `payment_slips`
      - Generated payment slips (carnê/boleto)

  2. Security
    - Enable RLS on all tables
    - Add policies for tenant access
*/

-- Create billing_settings table
CREATE TABLE IF NOT EXISTS billing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grace_period_days integer NOT NULL DEFAULT 5,
  late_fee_percentage numeric NOT NULL DEFAULT 2.0,
  daily_interest_rate numeric NOT NULL DEFAULT 0.033,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  payment_date date,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_type text NOT NULL CHECK (payment_type IN ('slip', 'manual')),
  late_fee numeric,
  interest numeric,
  total_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create payment_slips table
CREATE TABLE IF NOT EXISTS payment_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  barcode text,
  our_number text,
  document_number text,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add customer status
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'cancelled'));

-- Enable RLS
ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_slips ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS billing_settings_tenant_id_idx ON billing_settings(tenant_id);
CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS invoices_tenant_id_idx ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON invoices(due_date);
CREATE INDEX IF NOT EXISTS payment_slips_invoice_id_idx ON payment_slips(invoice_id);
CREATE INDEX IF NOT EXISTS payment_slips_tenant_id_idx ON payment_slips(tenant_id);

-- Create triggers for updated_at
CREATE TRIGGER update_billing_settings_updated_at
  BEFORE UPDATE ON billing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_slips_updated_at
  BEFORE UPDATE ON payment_slips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policies
CREATE POLICY "Users can view billing settings from their tenant"
  ON billing_settings
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can manage billing settings in their tenant"
  ON billing_settings
  FOR ALL
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can view invoices from their tenant"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can manage invoices in their tenant"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can view payment slips from their tenant"
  ON payment_slips
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can manage payment slips in their tenant"
  ON payment_slips
  FOR ALL
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Function to generate invoice
CREATE OR REPLACE FUNCTION generate_invoice(
  p_customer_id uuid,
  p_amount numeric,
  p_due_date date,
  p_payment_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_invoice_id uuid;
BEGIN
  -- Get tenant_id from current user
  v_tenant_id := get_current_tenant_id();
  
  -- Create invoice
  INSERT INTO invoices (
    customer_id,
    tenant_id,
    amount,
    due_date,
    status,
    payment_type,
    total_amount
  )
  VALUES (
    p_customer_id,
    v_tenant_id,
    p_amount,
    p_due_date,
    'pending',
    p_payment_type,
    p_amount
  )
  RETURNING id INTO v_invoice_id;

  -- If payment type is slip, generate payment slip
  IF p_payment_type = 'slip' THEN
    INSERT INTO payment_slips (
      invoice_id,
      tenant_id,
      barcode,
      our_number,
      document_number,
      status
    )
    VALUES (
      v_invoice_id,
      v_tenant_id,
      'DUMMY_BARCODE_' || v_invoice_id,
      'DUMMY_NUMBER_' || v_invoice_id,
      'DOC_' || v_invoice_id,
      'pending'
    );
  END IF;

  -- Create financial transaction
  INSERT INTO transactions (
    type,
    description,
    amount,
    date,
    due_date,
    status,
    category,
    customer_id,
    tenant_id
  )
  VALUES (
    'income',
    'Fatura - ' || to_char(p_due_date, 'MM/YYYY'),
    p_amount,
    CURRENT_DATE,
    p_due_date,
    'pending',
    'mensalidade',
    p_customer_id,
    v_tenant_id
  );

  RETURN v_invoice_id;
END;
$$;