/*
  # Transaction Validation Functions
  
  1. Functions
    - validate_transaction: Trigger function to validate transaction data
      - Validates customer belongs to same tenant
      - Ensures tenant_id is set
      - Validates due_date is not before transaction date
  
  2. Triggers
    - validate_transaction_trigger: Applies validation on INSERT and UPDATE
  
  3. Policies
    - Updated transaction policies with stricter tenant and customer validation
*/

-- Create function to validate transaction data
CREATE OR REPLACE FUNCTION validate_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate customer_id if provided
  IF NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM customers 
      WHERE id = NEW.customer_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Invalid customer_id or customer belongs to different tenant';
    END IF;
  END IF;

  -- Ensure tenant_id is set
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  -- Validate dates
  IF NEW.due_date IS NOT NULL AND NEW.due_date < NEW.date THEN
    RAISE EXCEPTION 'due_date cannot be earlier than transaction date';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_transaction_trigger ON transactions;

-- Create trigger for transaction validation
CREATE TRIGGER validate_transaction_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction();

-- Update transaction policies to be more strict
DROP POLICY IF EXISTS "Users can create transactions in their tenant" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions in their tenant" ON transactions;

CREATE POLICY "Users can create transactions in their tenant"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid) AND
    (customer_id IS NULL OR EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_id 
      AND tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
    ))
  );

CREATE POLICY "Users can update transactions in their tenant"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  )
  WITH CHECK (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid) AND
    (customer_id IS NULL OR EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_id 
      AND tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
    ))
  );