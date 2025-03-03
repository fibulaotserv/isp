/*
  # Add tenant management features

  1. New Fields
    - Added network settings to tenants table
    - Added custom domain support
    - Added plan limits and configuration
    - Added contact information

  2. Changes
    - Enhanced tenant settings structure
    - Added network configuration options
    - Added validation for CNPJ format
*/

-- Add new columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS custom_domain text,
ADD COLUMN IF NOT EXISTS max_customers integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'basic' CHECK (plan_type IN ('basic', 'professional', 'enterprise'));

-- Update settings JSONB structure
ALTER TABLE tenants
ALTER COLUMN settings SET DEFAULT jsonb_build_object(
  'allowMFA', false,
  'maxAdmins', 3,
  'maxOperators', 10,
  'network', jsonb_build_object(
    'ipRanges', '[]'::jsonb,
    'dns', jsonb_build_object(
      'primary', '8.8.8.8',
      'secondary', '8.8.4.4'
    ),
    'vlans', '[]'::jsonb,
    'authType', 'pppoe'
  )
);

-- Add validation for CNPJ format
DO $$
BEGIN
  ALTER TABLE tenants
  ADD CONSTRAINT valid_cnpj_format CHECK (
    cnpj ~ '^[0-9]{14}$'
  );
EXCEPTION
  WHEN check_violation THEN
    -- Clean up existing CNPJs
    UPDATE tenants
    SET cnpj = REGEXP_REPLACE(cnpj, '[^0-9]', '', 'g')
    WHERE cnpj !~ '^[0-9]{14}$';
    
    -- Try adding the constraint again
    ALTER TABLE tenants
    ADD CONSTRAINT valid_cnpj_format CHECK (
      cnpj ~ '^[0-9]{14}$'
    );
END $$;

-- Add validation for contact information
ALTER TABLE tenants
ADD CONSTRAINT valid_contact_email CHECK (
  contact_email IS NULL OR 
  contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
),
ADD CONSTRAINT valid_contact_phone CHECK (
  contact_phone IS NULL OR 
  contact_phone ~ '^[0-9]{10,11}$'
);

-- Add validation for custom domain
ALTER TABLE tenants
ADD CONSTRAINT valid_custom_domain CHECK (
  custom_domain IS NULL OR 
  custom_domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$'
);

-- Function to update tenant network settings
CREATE OR REPLACE FUNCTION update_tenant_network_settings(
  tenant_id uuid,
  ip_ranges text[],
  primary_dns text,
  secondary_dns text,
  vlans integer[],
  auth_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate auth_type
  IF auth_type NOT IN ('pppoe', 'ipoe', 'static') THEN
    RAISE EXCEPTION 'Invalid authentication type';
  END IF;

  -- Update network settings
  UPDATE tenants
  SET settings = jsonb_set(
    settings,
    '{network}',
    jsonb_build_object(
      'ipRanges', to_jsonb(ip_ranges),
      'dns', jsonb_build_object(
        'primary', primary_dns,
        'secondary', secondary_dns
      ),
      'vlans', to_jsonb(vlans),
      'authType', auth_type
    )
  )
  WHERE id = tenant_id
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role')::text = 'master'
  );
END;
$$;