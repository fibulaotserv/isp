/*
  # Add Google Maps API configuration

  This migration ensures the Google Maps API configuration is properly set up.
  
  1. Changes
    - Adds Google Maps API configuration to tenant settings
*/

-- Update tenant settings to include Google Maps configuration
DO $$
BEGIN
  -- Update settings for all tenants
  UPDATE tenants
  SET settings = settings || jsonb_build_object(
    'maps', jsonb_build_object(
      'provider', 'google',
      'enabled', true
    )
  )
  WHERE NOT (settings ? 'maps');
END $$;