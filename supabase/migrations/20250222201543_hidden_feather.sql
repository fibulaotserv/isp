/*
  # Fix customer-tenant relationship and policies

  1. Changes
    - Update RLS policies to use tenant_id from user metadata
    - Add function to get current tenant_id
    - Ensure proper UUID handling

  2. Security
    - Maintain tenant isolation
    - Ensure proper access control
*/

-- Create function to get current tenant ID
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'user_metadata')::json->>'tenant_id',
    '00000000-0000-0000-0000-000000000000'
  )::uuid;
$$;

-- Drop existing policies
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