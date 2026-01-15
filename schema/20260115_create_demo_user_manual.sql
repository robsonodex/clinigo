-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  new_user_id UUID;
  demo_clinic_id UUID;
BEGIN
  -- Get Demo Clinic ID
  SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
  
  IF demo_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Demo clinic not found. Please run the setup migration first.';
  END IF;

  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demo.clinigo.app') THEN
    
    -- Create User in auth.users with required metadata
    -- This ensures the 'public.users' trigger receives the necessary fields
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@demo.clinigo.app',
      crypt('Demo@2026', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Demo Admin", "role": "CLINIC_ADMIN"}', -- CRITICAL: Trigger needs this
      NOW(),
      NOW()
    ) RETURNING id INTO new_user_id;

    -- Update the linked public user with clinic_id
    -- The trigger should have created the record, but clinic_id might be null
    UPDATE public.users
    SET clinic_id = demo_clinic_id
    WHERE id = new_user_id;
    
  ELSE
    RAISE NOTICE 'User admin@demo.clinigo.app already exists.';
  END IF;

END $$;
