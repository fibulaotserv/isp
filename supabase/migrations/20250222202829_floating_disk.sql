/*
  # Add CTOs table

  1. New Tables
    - `ctos`
      - `id` (uuid, primary key)
      - `name` (text)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `total_ports` (integer)
      - `used_ports` (integer)
      - `address` (text)
      - `tenant_id` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `ctos` table
    - Add policies for authenticated users to manage their tenant's CTOs
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

-- Create trigger for updated_at
CREATE TRIGGER update_ctos_updated_at
  BEFORE UPDATE ON ctos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();