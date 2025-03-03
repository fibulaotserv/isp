/*
  # Update tenant policies

  1. Changes
    - Add policies for master users to manage tenants
    - Fix tenant RLS to allow proper CRUD operations
    - Ensure master users can create and update tenants

  2. Security
    - Only master users can manage tenants
    - Users can only view their own tenant
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Master users can manage tenants" ON tenants;

-- Create new policies for tenant management
CREATE POLICY "Master users can manage tenants"
  ON tenants
  FOR ALL
  TO authenticated
  USING ((((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role')::text = 'master'));

CREATE POLICY "Users can view their tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid));