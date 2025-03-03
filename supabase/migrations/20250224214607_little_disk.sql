/*
  # Fix custom domain validation

  1. Changes
    - Drop existing custom domain constraint
    - Add new constraint with more flexible validation
    - Allow subdomains and longer TLDs

  2. Security
    - Maintains basic domain format validation
    - Prevents invalid characters
*/

-- Drop existing constraint
ALTER TABLE tenants
DROP CONSTRAINT IF EXISTS valid_custom_domain;

-- Add new constraint with more flexible validation
ALTER TABLE tenants
ADD CONSTRAINT valid_custom_domain CHECK (
  custom_domain IS NULL OR 
  custom_domain ~ '^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
);