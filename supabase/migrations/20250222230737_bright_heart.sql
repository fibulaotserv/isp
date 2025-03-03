/*
  # Add coordinates to customer address

  1. Changes
    - Add latitude and longitude to customer address jsonb
    - Update find_nearest_cto function to handle null coordinates
    - Add function to update customer coordinates

  2. Security
    - Functions are security definer to ensure proper tenant access
*/

-- Function to update customer coordinates
CREATE OR REPLACE FUNCTION update_customer_coordinates(
  p_customer_id uuid,
  p_latitude numeric,
  p_longitude numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
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

  -- Update customer address with coordinates
  UPDATE customers
  SET address = address || jsonb_build_object(
    'latitude', p_latitude,
    'longitude', p_longitude
  )
  WHERE id = p_customer_id
  AND tenant_id = v_tenant_id;
END;
$$;

-- Update find_nearest_cto function to handle null coordinates
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

  -- Validate coordinates
  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

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