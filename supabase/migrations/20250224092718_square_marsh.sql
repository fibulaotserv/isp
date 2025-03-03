/*
  # User Creation Function
  
  1. Changes
    - Create function to handle new user creation
    - Add proper error handling
    - Ensure tenant validation
  
  2. Security
    - SECURITY DEFINER for elevated privileges
    - Role validation
    - Tenant validation
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

  -- Generate new UUID for user
  new_user_id := gen_random_uuid();

  -- Create new user in auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
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
    'authenticated',
    now(),
    now()
  );

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
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Email já está em uso';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar usuário: %', SQLERRM;
END;
$$;