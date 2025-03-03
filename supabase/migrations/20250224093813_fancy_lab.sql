/*
  # Fix Tenant Policies
  
  1. Changes
    - Drop existing policies before recreating
    - Ensure proper policies for tenants table
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;

-- Create policies for tenants
CREATE POLICY "Users can view their tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id = get_current_tenant_id()
  );