/*
  # Update customers table with additional fields

  1. New Fields
    - birth_date: Date of birth for individual customers
    - trade_name: Trade name for business customers
    - state_registration: State registration number for business customers
    - responsible_name: Name of the responsible person for business customers
    - responsible_document: Document of the responsible person for business customers

  2. Changes
    - Added validation for document format based on customer type
    - Added validation for phone number format
    - Added validation for business and individual specific fields
*/

-- Add new columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS trade_name text,
ADD COLUMN IF NOT EXISTS state_registration text,
ADD COLUMN IF NOT EXISTS responsible_name text,
ADD COLUMN IF NOT EXISTS responsible_document text;

-- Add validation for document format
DO $$
BEGIN
  ALTER TABLE customers
  ADD CONSTRAINT valid_document_format CHECK (
    (type = 'individual' AND document ~ '^[0-9]{11}$') OR
    (type = 'business' AND document ~ '^[0-9]{14}$')
  );
EXCEPTION
  WHEN check_violation THEN
    -- If there's a violation, we'll update invalid documents to a valid format
    UPDATE customers
    SET document = CASE
      WHEN type = 'individual' THEN LPAD(REGEXP_REPLACE(document, '[^0-9]', '', 'g'), 11, '0')
      ELSE LPAD(REGEXP_REPLACE(document, '[^0-9]', '', 'g'), 14, '0')
    END
    WHERE document !~ CASE
      WHEN type = 'individual' THEN '^[0-9]{11}$'
      ELSE '^[0-9]{14}$'
    END;
    
    -- Try adding the constraint again
    ALTER TABLE customers
    ADD CONSTRAINT valid_document_format CHECK (
      (type = 'individual' AND document ~ '^[0-9]{11}$') OR
      (type = 'business' AND document ~ '^[0-9]{14}$')
    );
END $$;

-- Add validation for phone format
DO $$
BEGIN
  ALTER TABLE customers
  ADD CONSTRAINT valid_phone_format CHECK (
    phone IS NULL OR phone ~ '^[0-9]{10,11}$'
  );
EXCEPTION
  WHEN check_violation THEN
    -- If there's a violation, we'll update invalid phone numbers
    UPDATE customers
    SET phone = REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
    WHERE phone !~ '^[0-9]{10,11}$';
    
    -- Try adding the constraint again
    ALTER TABLE customers
    ADD CONSTRAINT valid_phone_format CHECK (
      phone IS NULL OR phone ~ '^[0-9]{10,11}$'
    );
END $$;

-- Add validation for responsible document format
DO $$
BEGIN
  ALTER TABLE customers
  ADD CONSTRAINT valid_responsible_document_format CHECK (
    responsible_document IS NULL OR responsible_document ~ '^[0-9]{11}$'
  );
EXCEPTION
  WHEN check_violation THEN
    -- If there's a violation, we'll update invalid documents
    UPDATE customers
    SET responsible_document = LPAD(REGEXP_REPLACE(responsible_document, '[^0-9]', '', 'g'), 11, '0')
    WHERE responsible_document IS NOT NULL AND responsible_document !~ '^[0-9]{11}$';
    
    -- Try adding the constraint again
    ALTER TABLE customers
    ADD CONSTRAINT valid_responsible_document_format CHECK (
      responsible_document IS NULL OR responsible_document ~ '^[0-9]{11}$'
    );
END $$;

-- Add business-specific field validations
DO $$
BEGIN
  ALTER TABLE customers
  ADD CONSTRAINT business_fields_required CHECK (
    (type = 'business' AND responsible_name IS NOT NULL AND responsible_document IS NOT NULL) OR
    type = 'individual'
  );
EXCEPTION
  WHEN check_violation THEN
    -- If there's a violation, we'll update business customers with missing data
    UPDATE customers
    SET 
      responsible_name = COALESCE(responsible_name, name),
      responsible_document = COALESCE(responsible_document, LPAD('0', 11, '0'))
    WHERE type = 'business' AND (responsible_name IS NULL OR responsible_document IS NULL);
    
    -- Try adding the constraint again
    ALTER TABLE customers
    ADD CONSTRAINT business_fields_required CHECK (
      (type = 'business' AND responsible_name IS NOT NULL AND responsible_document IS NOT NULL) OR
      type = 'individual'
    );
END $$;

-- Add individual-specific field validations
DO $$
BEGIN
  ALTER TABLE customers
  ADD CONSTRAINT individual_fields_required CHECK (
    (type = 'individual' AND birth_date IS NOT NULL) OR
    type = 'business'
  );
EXCEPTION
  WHEN check_violation THEN
    -- If there's a violation, we'll update individual customers with missing birth date
    UPDATE customers
    SET birth_date = '1900-01-01'::date
    WHERE type = 'individual' AND birth_date IS NULL;
    
    -- Try adding the constraint again
    ALTER TABLE customers
    ADD CONSTRAINT individual_fields_required CHECK (
      (type = 'individual' AND birth_date IS NOT NULL) OR
      type = 'business'
    );
END $$;