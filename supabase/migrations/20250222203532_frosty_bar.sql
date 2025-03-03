/*
  # Fix customer RLS policies

  1. Changes
    - Update customer RLS policies to properly handle tenant_id from user metadata
    - Add validation to ensure tenant_id matches current user's tenant
    - Fix policy expressions to use proper JSON extraction

  2. Security
    - Ensure users can only access data from their own tenant
    - Validate tenant_id on insert and update operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view customers from their tenant" ON customers;
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;

-- Create new policies with proper metadata handling
CREATE POLICY "Users can view customers from their tenant"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (((current_setting('request.jwt.claims', true)::json)->>'user_metadata')::json->>'tenant_id')::uuid
  );

CREATE POLICY "Users can create customers in their tenant"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (((current_setting('request.jwt.claims', true)::json)->>'user_metadata')::json->>'tenant_id')::uuid
  );

CREATE POLICY "Users can update customers in their tenant"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (((current_setting('request.jwt.claims', true)::json)->>'user_metadata')::json->>'tenant_id')::uuid
  )
  WITH CHECK (
    tenant_id = (((current_setting('request.jwt.claims', true)::json)->>'user_metadata')::json->>'tenant_id')::uuid
  );

-- Add trigger to validate tenant_id matches user's tenant
CREATE OR REPLACE FUNCTION validate_customer_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tenant_id uuid;
BEGIN
  -- Get user's tenant_id from JWT claims
  user_tenant_id := (((current_setting('request.jwt.claims', true)::json)->>'user_metadata')::json->>'tenant_id')::uuid;
  
  -- Ensure tenant_id matches
  IF NEW.tenant_id != user_tenant_id THEN
    RAISE EXCEPTION 'tenant_id must match the authenticated user''s tenant';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for tenant validation
DROP TRIGGER IF EXISTS validate_customer_tenant_trigger ON customers;
CREATE TRIGGER validate_customer_tenant_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION validate_customer_tenant();