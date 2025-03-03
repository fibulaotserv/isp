/*
  # Add CTO association functionality

  1. New Tables
    - `customer_ctos` - Associates customers with CTOs
      - `customer_id` (uuid, references customers)
      - `cto_id` (uuid, references ctos)
      - `port_number` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. New Functions
    - `find_nearest_cto` - Finds the nearest CTO to given coordinates
    - `associate_customer_cto` - Associates a customer with a CTO

  3. Security
    - Enable RLS on new table
    - Add policies for tenant access
*/

-- Create customer_ctos table
CREATE TABLE IF NOT EXISTS customer_ctos (
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  cto_id uuid REFERENCES ctos(id) ON DELETE CASCADE,
  port_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, cto_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS customer_ctos_customer_id_idx ON customer_ctos(customer_id);
CREATE INDEX IF NOT EXISTS customer_ctos_cto_id_idx ON customer_ctos(cto_id);

-- Enable RLS
ALTER TABLE customer_ctos ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_customer_ctos_updated_at
  BEFORE UPDATE ON customer_ctos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policies
CREATE POLICY "Users can view customer_ctos from their tenant"
  ON customer_ctos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_id
      AND c.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "Users can manage customer_ctos in their tenant"
  ON customer_ctos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_id
      AND c.tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_id
      AND c.tenant_id = get_current_tenant_id()
    )
  );

-- Function to find nearest CTO
CREATE OR REPLACE FUNCTION find_nearest_cto(
  p_latitude numeric,
  p_longitude numeric
)
RETURNS ctos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_result ctos%ROWTYPE;
BEGIN
  -- Get current tenant ID
  v_tenant_id := get_current_tenant_id();

  -- Find nearest CTO with available ports
  SELECT *
  INTO v_result
  FROM ctos c
  WHERE c.tenant_id = v_tenant_id
    AND c.used_ports < c.total_ports
  ORDER BY 
    point(c.longitude, c.latitude) <-> point(p_longitude, p_latitude)
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- Function to associate customer with CTO
CREATE OR REPLACE FUNCTION associate_customer_cto(
  p_customer_id uuid,
  p_cto_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_next_port integer;
BEGIN
  -- Get current tenant ID
  v_tenant_id := get_current_tenant_id();

  -- Verify customer belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM customers
    WHERE id = p_customer_id
    AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Customer not found or belongs to different tenant';
  END IF;

  -- Verify CTO belongs to tenant and has available ports
  IF NOT EXISTS (
    SELECT 1 FROM ctos
    WHERE id = p_cto_id
    AND tenant_id = v_tenant_id
    AND used_ports < total_ports
  ) THEN
    RAISE EXCEPTION 'CTO not found, belongs to different tenant, or has no available ports';
  END IF;

  -- Find next available port
  SELECT used_ports + 1
  INTO v_next_port
  FROM ctos
  WHERE id = p_cto_id;

  -- Create association
  INSERT INTO customer_ctos (customer_id, cto_id, port_number)
  VALUES (p_customer_id, p_cto_id, v_next_port)
  ON CONFLICT (customer_id, cto_id) DO UPDATE
  SET port_number = v_next_port;

  -- Update CTO used ports
  UPDATE ctos
  SET used_ports = used_ports + 1
  WHERE id = p_cto_id;
END;
$$;