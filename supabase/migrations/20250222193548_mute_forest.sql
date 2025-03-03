/*
  # Add user creation function

  1. New Functions
    - create_user: Allows master users to create new users in their tenant

  2. Security
    - Function is restricted to master users only
    - New users are automatically assigned to the creator's tenant
    - Email confirmation is enabled by default
*/

-- Function to create new users
CREATE OR REPLACE FUNCTION create_user(
  user_email text,
  user_password text,
  user_name text,
  user_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role text;
  current_user_tenant_id uuid;
  new_user_id uuid;
  result json;
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
    RAISE EXCEPTION 'Only master users can create new users';
  END IF;

  -- Create new user in auth.users
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(), -- Email automatically confirmed
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'name', user_name,
      'role', user_role,
      'tenant_id', current_user_tenant_id
    ),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO new_user_id;

  -- Get the created user data
  SELECT json_build_object(
    'id', u.id,
    'email', u.email,
    'name', u.raw_user_meta_data->>'name',
    'role', u.raw_user_meta_data->>'role',
    'tenant_id', u.raw_user_meta_data->>'tenant_id'
  )
  INTO result
  FROM auth.users u
  WHERE u.id = new_user_id;

  RETURN result;
END;
$$;