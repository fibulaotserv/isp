/*
  # Ensure CTO table columns use snake_case

  This migration ensures the CTO table has the correct column names in snake_case format.
  
  1. Changes
    - Ensures total_ports and used_ports columns exist with correct names
    - Preserves existing data
*/

-- First check if we need to create the columns
DO $$
BEGIN
  -- Add total_ports if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ctos' AND column_name = 'total_ports'
  ) THEN
    ALTER TABLE ctos ADD COLUMN total_ports integer NOT NULL DEFAULT 16;
  END IF;

  -- Add used_ports if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ctos' AND column_name = 'used_ports'
  ) THEN
    ALTER TABLE ctos ADD COLUMN used_ports integer NOT NULL DEFAULT 0;
  END IF;
END $$;