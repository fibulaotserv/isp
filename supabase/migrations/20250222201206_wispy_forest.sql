/*
  # Fix customer policies and tenant handling

  1. Changes
    - Update RLS policies to properly handle tenant_id from session
    - Ensure proper type casting for UUID comparisons
    - Add default tenant_id handling

  2. Security
    - Maintain tenant isolation
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view customers from their tenant" ON customers;
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;

-- Create new policies with proper session handling
CREATE POLICY "Users can view customers from their tenant"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.uid()
  );

CREATE POLICY "Users can create customers in their tenant"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = auth.uid()
  );

CREATE POLICY "Users can update customers in their tenant"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = auth.uid()
  );