/*
  # Fix customer tenant policies and add default tenant

  1. Changes
    - Add default tenant for master user
    - Update RLS policies to handle tenant_id properly
    - Add function to get current user's tenant_id

  2. Security
    - Maintain tenant isolation
    - Ensure proper access control
*/

-- Create or replace function to get current tenant ID
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

-- Ensure master tenant exists
DO $$
BEGIN
  INSERT INTO tenants (id, name, cnpj)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Master Tenant',
    '00000000000000'
  )
  ON CONFLICT (cnpj) DO NOTHING;
END $$;

-- Update master user's tenant_id if not set
DO $$
DECLARE
  master_tenant_id uuid;
BEGIN
  SELECT id INTO master_tenant_id FROM tenants WHERE cnpj = '00000000000000' LIMIT 1;
  
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || 
    json_build_object('tenant_id', master_tenant_id)::jsonb
  WHERE email = 'master@isp.com'
  AND (raw_user_meta_data->>'tenant_id') IS NULL;
END $$;

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