/*
  # Add Logo URL to Tenants
  
  1. Schema Changes
    - Add logo_url column to tenants table
  
  2. Functions
    - Create function to update tenant logo
*/

-- Add logo_url column to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS logo_url text;

-- Function to update tenant logo
CREATE OR REPLACE FUNCTION update_tenant_logo(new_logo_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role text;
  current_user_tenant_id uuid;
BEGIN
  -- Get current user's role and tenant
  SELECT 
    (raw_user_meta_data->>'role')::text,
    (raw_user_meta_data->>'tenant_id')::uuid
  INTO current_user_role, current_user_tenant_id
  FROM auth.users
  WHERE id = auth.uid();

  -- Verify permissions
  IF current_user_role != 'master' THEN
    RAISE EXCEPTION 'Only master users can update tenant logo';
  END IF;

  -- Update logo
  UPDATE tenants
  SET 
    logo_url = new_logo_url,
    updated_at = now()
  WHERE id = current_user_tenant_id;
END;
$$;