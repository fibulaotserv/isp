/*
  # Network Infrastructure Schema
  
  1. Tables
    - ctos: Fiber optic network termination points
  
  2. Security
    - RLS enabled
    - Tenant isolation policies
*/

-- Create CTOs table
CREATE TABLE IF NOT EXISTS ctos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  total_ports integer NOT NULL DEFAULT 16,
  used_ports integer NOT NULL DEFAULT 0,
  address text NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS ctos_tenant_id_idx ON ctos(tenant_id);

-- Enable RLS
ALTER TABLE ctos ENABLE ROW LEVEL SECURITY;

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_ctos_updated_at ON ctos;

-- Create trigger for updated_at
CREATE TRIGGER update_ctos_updated_at
  BEFORE UPDATE ON ctos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();