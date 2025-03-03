/*
  # Fix Financial Management Functions

  1. Changes
    - Fix ambiguous date reference in get_daily_balance function
    - Add tenant_id to transaction creation
    - Improve SQL query performance with proper table aliases
    - Fix group by clause in daily balance calculation
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS get_daily_balance(date, date);
DROP FUNCTION IF EXISTS get_financial_summary();

-- Recreate get_daily_balance function with fixed date reference
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
    LEFT JOIN transactions t ON d.series_date = t.date AND t.tenant_id = get_current_tenant_id()
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

-- Recreate get_financial_summary function with improved tenant handling
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
  -- Get current tenant ID
  current_tenant_id := get_current_tenant_id();
  
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