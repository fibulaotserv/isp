/*
  # Add plan relationship to customers

  1. Changes
    - Add plan_id column to customers table
    - Add foreign key constraint to plans table
    - Add index for plan lookups
*/

-- Add plan_id to customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES plans(id) ON DELETE SET NULL;

-- Create index for plan lookups
CREATE INDEX IF NOT EXISTS customers_plan_id_idx ON customers(plan_id);