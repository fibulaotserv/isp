-- Drop existing function
DROP FUNCTION IF EXISTS get_financial_summary();

-- Recreate get_financial_summary function with proper payment counting
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
    COALESCE(SUM(CASE 
      WHEN type = 'income' AND status = 'completed' AND payment_date IS NOT NULL 
      THEN amount 
      ELSE 0 
    END), 0) as total_income,
    COALESCE(SUM(CASE 
      WHEN type = 'expense' AND status = 'completed' AND payment_date IS NOT NULL 
      THEN amount 
      ELSE 0 
    END), 0) as total_expense,
    COALESCE(SUM(CASE 
      WHEN type = 'income' AND status = 'completed' AND payment_date IS NOT NULL THEN amount
      WHEN type = 'expense' AND status = 'completed' AND payment_date IS NOT NULL THEN -amount
      ELSE 0 
    END), 0) as balance,
    COALESCE(SUM(CASE 
      WHEN type = 'income' AND status = 'pending' 
      THEN amount 
      ELSE 0 
    END), 0) as pending_income,
    COALESCE(SUM(CASE 
      WHEN type = 'expense' AND status = 'pending' 
      THEN amount 
      ELSE 0 
    END), 0) as pending_expense
  FROM transactions
  WHERE tenant_id = current_tenant_id
    AND date >= date_trunc('month', current_date)
    AND date < date_trunc('month', current_date) + interval '1 month';
END;
$$;