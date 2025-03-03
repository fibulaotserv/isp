/*
  # Customer Management Schema
  
  1. Tables
    - customers: Main table for storing customer information
      - Supports both individual and business customers
      - Includes contact and address information
      - Tracks customer status
  
  2. Indexes
    - tenant_id: For efficient tenant filtering
    - Full-text search on name and document
  
  3. Security
    - RLS enabled
    - Policies for tenant isolation
*/

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
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS customers_search_idx ON customers USING gin (
  to_tsvector('portuguese', name || ' ' || document)
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view customers from their tenant" ON customers;
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;

-- Create new policies with proper type casting
CREATE POLICY "Users can view customers from their tenant"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );

CREATE POLICY "Users can create customers in their tenant"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );

CREATE POLICY "Users can update customers in their tenant"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  )
  WITH CHECK (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );