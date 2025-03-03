/*
  # Setup Auth and Master User
  
  1. Extensions and Schema
    - Enable required extensions
    - Create auth schema
  
  2. Master User Setup
    - Create master user if not exists
    - Update metadata
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure auth schema exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Create master tenant if it doesn't exist
DO $$
DECLARE
  master_tenant_id uuid;
  existing_tenant_id uuid;
BEGIN
  -- First check if we have an existing tenant
  SELECT id INTO existing_tenant_id 
  FROM tenants 
  WHERE cnpj = '00000000000000'
  LIMIT 1;

  IF existing_tenant_id IS NULL THEN
    -- Create new master tenant
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
    RETURNING id INTO master_tenant_id;
  ELSE
    -- Use existing tenant ID
    master_tenant_id := existing_tenant_id;
  END IF;

  -- Update master user if it exists
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'name', COALESCE(raw_user_meta_data->>'name', 'Master User'),
    'role', 'master',
    'tenant_id', master_tenant_id
  )
  WHERE email = 'master@isp.com';

  -- Create master user if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'master@isp.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'master@isp.com',
      crypt('12345678', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'name', 'Master User',
        'role', 'master',
        'tenant_id', master_tenant_id
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- Ensure RLS is enabled on existing tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctos ENABLE ROW LEVEL SECURITY;

-- Drop and recreate tenant policies
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
CREATE POLICY "Users can view their tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );