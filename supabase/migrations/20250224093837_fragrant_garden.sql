/*
  # Fix Users Table Setup
  
  1. Changes
    - Drop existing policies before recreating
    - Ensure proper setup for users table and related objects
    - Handle existing triggers and functions
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('master', 'admin', 'operator')),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  mfa_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users(tenant_id);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Master users can manage all users in their tenant" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;

-- Create trigger for users updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policies
CREATE POLICY "Master users can manage all users in their tenant"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'master'
      AND u.tenant_id = users.tenant_id
    )
  );

CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
  );

-- Function to sync user data from auth.users to public.users
CREATE OR REPLACE FUNCTION sync_user_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.users (
      id,
      email,
      name,
      role,
      tenant_id
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Novo Usuário'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'operator'),
      (NEW.raw_user_meta_data->>'tenant_id')::uuid
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.users
    SET
      email = NEW.email,
      name = COALESCE(NEW.raw_user_meta_data->>'name', users.name),
      role = COALESCE(NEW.raw_user_meta_data->>'role', users.role),
      tenant_id = COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, users.tenant_id),
      updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.users WHERE id = OLD.id;
    RETURN OLD;
  END IF;
END;
$$;

-- Create triggers to sync auth.users changes to public.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_data();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_data();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_data();

-- Sync existing users
INSERT INTO public.users (id, email, name, role, tenant_id)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', 'Usuário Existente'),
  COALESCE(u.raw_user_meta_data->>'role', 'operator'),
  (SELECT id FROM tenants WHERE cnpj = '00000000000000')
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();