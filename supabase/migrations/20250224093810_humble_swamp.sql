/*
  # Fix CTOs Policies
  
  1. Changes
    - Drop existing policies before recreating
    - Ensure proper policies for CTOs table
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view CTOs from their tenant" ON ctos;
DROP POLICY IF EXISTS "Users can create CTOs in their tenant" ON ctos;
DROP POLICY IF EXISTS "Users can update CTOs in their tenant" ON ctos;

-- Create policies
CREATE POLICY "Users can view CTOs from their tenant"
  ON ctos
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can create CTOs in their tenant"
  ON ctos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can update CTOs in their tenant"
  ON ctos
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );