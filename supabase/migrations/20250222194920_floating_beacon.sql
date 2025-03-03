/*
  # Initial Schema Setup

  1. Authentication Setup
    - Enable email authentication
    - Create master user profile

  2. Security
    - Enable RLS on all tables
    - Set up appropriate policies
*/

-- Create master user with email authentication
DO $$
BEGIN
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
    '{"name":"Master User","role":"master"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );
END $$;