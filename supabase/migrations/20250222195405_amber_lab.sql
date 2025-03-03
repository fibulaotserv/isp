/*
  # Fix tenant setup and user linking

  1. Changes
    - Ensure master tenant exists with proper ID
    - Update master user metadata with tenant ID
    - Add function to get current tenant ID
    - Update tenant policies
*/

-- Create master tenant if it doesn't exist
DO $$
DECLARE
  master_tenant_id uuid;
BEGIN
  INSERT INTO tenants (
    name,
    cnpj,
    active,
    settings
  )
  VALUES (
    'Master Tenant',
    '00000000000000',
    true,
    jsonb_build_object(
      'allowMFA', false,
      'maxAdmins', 3,
      'maxOperators', 10
    )
  )
  ON CONFLICT (cnpj) DO UPDATE
  SET active = true
  RETURNING id INTO master_tenant_id;

  -- Update master user's metadata with tenant_id
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'name', COALESCE(raw_user_meta_data->>'name', 'Master User'),
    'role', 'master',
    'tenant_id', master_tenant_id
  )
  WHERE email = 'master@isp.com';
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;

-- Create new policies for tenants
CREATE POLICY "Users can view their tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );