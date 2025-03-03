/*
  # Auth Schema Setup
  
  1. Changes
    - Enable required extensions
    - Create auth schema and functions
    - Set up JWT handling functions
  
  2. Security
    - Added stable functions for JWT claims
    - Proper error handling for claims
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure auth schema exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Drop and recreate auth schema function
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS uuid 
LANGUAGE sql 
STABLE
AS $$
  SELECT 
    COALESCE(
      current_setting('request.jwt.claim.sub', true),
      (current_setting('request.jwt.claims', true)::jsonb->>'sub')
    )::uuid
$$;

-- Function to get current user metadata
CREATE OR REPLACE FUNCTION auth.jwt() 
RETURNS jsonb 
LANGUAGE sql 
STABLE
AS $$
  SELECT 
    COALESCE(
      nullif(current_setting('request.jwt.claim', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;

-- Function to get current tenant ID from JWT claims
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  metadata json;
  tenant_id uuid;
BEGIN
  metadata := current_setting('request.jwt.claims', true)::json->>'user_metadata';
  IF metadata IS NULL THEN
    RETURN NULL;
  END IF;

  tenant_id := (metadata->>'tenant_id')::uuid;
  RETURN tenant_id;
END;
$$;