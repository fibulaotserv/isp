/*
  # Create base schema for tenants and customers

  1. New Tables
    - `tenants`
      - `id` (uuid, primary key)
      - `name` (text)
      - `cnpj` (text, unique)
      - `active` (boolean)
      - `settings` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `customers`
      - `id` (uuid, primary key)
      - `type` (text, check constraint)
      - `name` (text)
      - `document` (text)
      - `email` (text)
      - `phone` (text)
      - `address` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `tenant_id` (uuid, foreign key)

  2. Security
    - Enable RLS on both tables
    - Add policies for tenant-based access control
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

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('individual', 'business')),
  name text NOT NULL,
  document text NOT NULL,
  email text,
  phone text,
  address jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create index for search
CREATE INDEX IF NOT EXISTS customers_search_idx ON customers USING gin (
  to_tsvector('portuguese', name || ' ' || document)
);

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON customers(tenant_id);

-- Enable RLS on customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Users can view customers from their tenant" ON customers;
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;

-- Create policies for tenants
CREATE POLICY "Users can view their tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Create policies for customers
CREATE POLICY "Users can view customers from their tenant"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can create customers in their tenant"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can update customers in their tenant"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default tenant for master user
INSERT INTO tenants (name, cnpj)
VALUES ('Master Tenant', '00000000000000')
ON CONFLICT DO NOTHING;

-- Add tenant_id to auth.users metadata
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Update master user with tenant_id
DO $$
DECLARE
  master_tenant_id uuid;
BEGIN
  SELECT id INTO master_tenant_id FROM tenants WHERE cnpj = '00000000000000' LIMIT 1;
  
  UPDATE auth.users
  SET tenant_id = master_tenant_id
  WHERE email = 'master@isp.com';
END $$;