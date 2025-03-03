/*
  # Create Master User
  
  1. Changes
    - Create master user with specified credentials
    - Set proper metadata and role
  
  2. Security
    - Password is properly hashed
    - User is automatically confirmed
    - Role is set to master
*/

-- Create master user with email authentication
DO $$
BEGIN
  -- Get master tenant ID
  DECLARE
    master_tenant_id uuid;
  BEGIN
    SELECT id INTO master_tenant_id 
    FROM tenants 
    WHERE cnpj = '00000000000000' 
    LIMIT 1;

    -- Create master user if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'master@isp.com') THEN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      )
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'master@isp.com',
        crypt('12345678', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object(
          'name', 'Master User',
          'role', 'master',
          'tenant_id', master_tenant_id
        ),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      );
    ELSE
      -- Update existing master user's metadata if needed
      UPDATE auth.users
      SET raw_user_meta_data = jsonb_build_object(
        'name', 'Master User',
        'role', 'master',
        'tenant_id', master_tenant_id
      )
      WHERE email = 'master@isp.com';
    END IF;
  END;
END $$;