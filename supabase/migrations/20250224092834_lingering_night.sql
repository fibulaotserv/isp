/*
  # Update Tenant ID Function and Customer Policies
  
  1. Changes
    - Create function to get current tenant ID
    - Update customer policies to use the helper function
  
  2. Security
    - Maintain RLS policies
    - Use proper JWT claim parsing
*/

-- Create function to get current tenant ID
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  metadata json;
  tenant_id uuid;
BEGIN
  metadata := current_setting('request.jwt.claims', true)::json->>'user_metadata';
  IF metadata IS NULL THEN
    RETURN NULL;
  END IF;

  tenant_id := (metadata->>'tenant_id')::uuid;
  RETURN tenant_id;
END;
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view customers from their tenant" ON customers;
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;

-- Create new policies using the helper function
CREATE POLICY "Users can view customers from their tenant"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can create customers in their tenant"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can update customers in their tenant"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );