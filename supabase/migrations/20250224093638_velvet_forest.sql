/*
  # Core Schema Setup
  
  1. Tables
    - tenants: Core table for multi-tenant support
    - customers: Customer management table
  
  2. Functions
    - get_current_tenant_id: Helper for tenant context
  
  3. Security
    - RLS enabled on all tables
    - Tenant isolation policies
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  active boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{"allowMFA": false, "maxAdmins": 3, "maxOperators": 10}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('individual', 'business')),
  name text NOT NULL,
  document text NOT NULL,
  email text,
  phone text,
  address jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'cancelled')),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS customers_search_idx ON customers USING gin (
  to_tsvector('portuguese', name || ' ' || document)
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Users can view customers from their tenant" ON customers;
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;

-- Create policies
CREATE POLICY "Users can view their tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id = get_current_tenant_id()
  );

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

-- Create master tenant
INSERT INTO tenants (id, name, cnpj)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Master Tenant',
  '00000000000000'
) ON CONFLICT (cnpj) DO NOTHING;