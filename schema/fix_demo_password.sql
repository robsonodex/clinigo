-- ==========================================
-- FIX DEMO LOGIN PASSWORD
-- ==========================================
-- Force update the password for the demo admin user.
-- Run this if you are getting "401 Unauthorized" failures.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    -- 1. Check if user exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demo.clinigo.app') THEN
        
        -- 2. Force Update Password
        UPDATE auth.users
        SET encrypted_password = crypt('Demo@2026', gen_salt('bf')),
            updated_at = NOW(),
            -- Ensure it's confirmed
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            -- Ensure metadata is correct
            raw_app_meta_data = '{"provider": "email", "providers": ["email"]}',
            raw_user_meta_data = jsonb_build_object('full_name', 'Demo Admin', 'role', 'CLINIC_ADMIN')
        WHERE email = 'admin@demo.clinigo.app';
        
    ELSE
        -- 3. If not exists (weird, but safety net), create it
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
        );
    END IF;

    -- 4. Sync Public User
    -- Ensure the public.users record exists and is linked
    INSERT INTO public.users (id, clinic_id, email, full_name, role, is_active, created_at, updated_at)
    SELECT 
        id, 
        (SELECT id FROM clinics WHERE slug = 'demo'), 
        email, 
        'Demo Admin', 
        'CLINIC_ADMIN', 
        true, 
        NOW(), 
        NOW()
    FROM auth.users 
    WHERE email = 'admin@demo.clinigo.app'
    ON CONFLICT (id) DO UPDATE 
    SET clinic_id = EXCLUDED.clinic_id,
        role = 'CLINIC_ADMIN';

END $$;
