-- ==========================================
-- FIX DEMO ADMIN USER
-- ==========================================
-- Purpose: Ensure admin@demo.clinigo.app exists and has the correct password.
-- Password: Demo@2026

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_demo_clinic_id UUID;
  v_user_id UUID;
BEGIN
  -- 1. Get Demo Clinic ID
  SELECT id INTO v_demo_clinic_id FROM clinics WHERE slug = 'demo';

  IF v_demo_clinic_id IS NULL THEN
     RAISE EXCEPTION 'Demo clinic not found. Run the full setup script first.';
  END IF;

  -- 2. Check/Create/Update Auth User
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@demo.clinigo.app';

  IF v_user_id IS NOT NULL THEN
      -- User exists: Update password
      UPDATE auth.users 
      SET encrypted_password = crypt('Demo@2026', gen_salt('bf')),
          updated_at = NOW()
      WHERE id = v_user_id;
      
      RAISE NOTICE 'Password for admin@demo.clinigo.app updated to Demo@2026';
  ELSE
      -- User does not exist: Create it
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'admin@demo.clinigo.app',
        crypt('Demo@2026', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Demo Admin", "role": "CLINIC_ADMIN"}',
        NOW(),
        NOW()
      ) RETURNING id INTO v_user_id;

      RAISE NOTICE 'User admin@demo.clinigo.app created.';
  END IF;

  -- 3. Ensure Public User Link
  -- The trigger might have created the public user, or we update it if exists
  UPDATE public.users
  SET clinic_id = v_demo_clinic_id,
      role = 'CLINIC_ADMIN',
      full_name = 'Demo Admin',
      is_active = true
  WHERE id = v_user_id;

  -- If public user doesn't exist (trigger failed?), create it manually
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
      INSERT INTO public.users (id, email, full_name, role, clinic_id, is_active)
      VALUES (v_user_id, 'admin@demo.clinigo.app', 'Demo Admin', 'CLINIC_ADMIN', v_demo_clinic_id, true);
  END IF;

END $$;
