/*
  # Add Map Locations Table
  
  1. New Tables
    - `map_locations`: Stores the last viewed map location for each tenant
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenants)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `zoom` (integer)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for tenant access
*/

-- Create map_locations table
CREATE TABLE IF NOT EXISTS map_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  zoom integer NOT NULL DEFAULT 13,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS map_locations_tenant_id_idx ON map_locations(tenant_id);

-- Enable RLS
ALTER TABLE map_locations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view map locations from their tenant"
  ON map_locations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Users can create map locations in their tenant"
  ON map_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );