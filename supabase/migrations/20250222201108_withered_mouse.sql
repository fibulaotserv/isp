/*
  # Fix RLS policies with proper UUID casting

  1. Changes
    - Update RLS policies to properly cast tenant_id from JWT to UUID
    - Fix policy conditions to handle type comparisons correctly
    - Maintain strict tenant isolation

  2. Security
    - Ensure users can only access data from their own tenant
    - Properly validate tenant_id types
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view customers from their tenant" ON customers;
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;

-- Create new policies with proper type casting
CREATE POLICY "Users can view customers from their tenant"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );

CREATE POLICY "Users can create customers in their tenant"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );

CREATE POLICY "Users can update customers in their tenant"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  )
  WITH CHECK (
    tenant_id = (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id')::uuid)
  );