/*
  # Update master user metadata

  1. Changes
    - Update existing master user's metadata
    - Set proper role and name
*/

-- Update master user metadata
DO $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'name', 'Master User',
    'role', 'master'
  )
  WHERE email = 'master@isp.com'
  AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'name' IS NULL);
END $$;