-- Add function to update tenant settings
CREATE OR REPLACE FUNCTION update_tenant_settings(
  new_name text,
  new_cnpj text,
  new_settings jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get current user's role
  SELECT 
    (raw_user_meta_data->>'role')::text
  INTO current_user_role
  FROM auth.users
  WHERE id = auth.uid();

  -- Verify permissions
  IF current_user_role != 'master' THEN
    RAISE EXCEPTION 'Only master users can update tenant settings';
  END IF;

  -- Update settings
  UPDATE tenants
  SET 
    name = new_name,
    cnpj = new_cnpj,
    settings = new_settings,
    updated_at = now()
  WHERE cnpj = '00000000000000';
END;
$$;