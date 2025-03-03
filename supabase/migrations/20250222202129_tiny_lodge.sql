/*
  # Create internet plans table and functions

  1. New Tables
    - `plans`
      - `id` (uuid, primary key)
      - `name` (text)
      - `download_speed` (integer, in Mbps)
      - `upload_speed` (integer, in Mbps)
      - `data_limit` (integer, in GB, nullable)
      - `price` (numeric)
      - `active` (boolean)
      - `tenant_id` (uuid, references tenants)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `plans` table
    - Add policies for tenant-based access
*/

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  download_speed integer NOT NULL CHECK (download_speed > 0),
  upload_speed integer NOT NULL CHECK (upload_speed > 0),
  data_limit integer CHECK (data_limit IS NULL OR data_limit > 0),
  price numeric NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS plans_tenant_id_idx ON plans(tenant_id);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policies
CREATE POLICY "Users can view plans from their tenant"
  ON plans
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can create plans in their tenant"
  ON plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can update plans in their tenant"
  ON plans
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can delete plans in their tenant"
  ON plans
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );