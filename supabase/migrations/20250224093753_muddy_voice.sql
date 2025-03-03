/*
  # Fix Tenants Trigger
  
  1. Changes
    - Drop existing trigger before recreating
    - Ensure proper trigger setup for tenants table
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;

-- Create trigger for updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();