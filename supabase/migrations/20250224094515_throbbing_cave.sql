/*
  # Fix Users Table Policies
  
  1. Changes
    - Fix infinite recursion in users table policies
    - Update policies to use direct tenant_id comparison
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Master users can manage all users in their tenant" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;

-- Create new policies without recursion
CREATE POLICY "Master users can manage all users in their tenant"
  ON users
  FOR ALL
  TO authenticated
  USING (
    (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role')::text = 'master' AND
    (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid = tenant_id))
  );

CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
  );