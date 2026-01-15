-- ==========================================
-- RESTORE SPECIFIC DEMO ADMIN (Preserve ID)
-- ==========================================
-- Purpose: Restore auth login for existing user ID to preserve foreign keys.
-- User ID: 7d355240-67a0-47cc-813f-803582461dea

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_user_id UUID := '7d355240-67a0-47cc-813f-803582461dea';
    v_email TEXT := 'admin@demo.clinigo.app';
    v_demo_clinic_id UUID;
BEGIN
    SELECT id INTO v_demo_clinic_id FROM clinics WHERE slug = 'demo';

    -- 1. Check if Auth User exists (by email)
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        -- Update password
        UPDATE auth.users 
        SET encrypted_password = crypt('Demo@2026', gen_salt('bf')),
            updated_at = NOW()
        WHERE email = v_email;
        
        RAISE NOTICE 'Password updated for existing auth user.';
    ELSE
        -- Create Auth User forcing the SPECIFIC ID
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            crypt('Demo@2026', gen_salt('bf')),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Demo Admin", "role": "CLINIC_ADMIN"}',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Restored auth user with ID: %', v_user_id;
    END IF;

    -- 2. Ensure Public User matches
    INSERT INTO public.users (id, email, full_name, role, clinic_id, is_active)
    VALUES (v_user_id, v_email, 'Demo Admin', 'CLINIC_ADMIN', v_demo_clinic_id, true)
    ON CONFLICT (id) DO UPDATE 
    SET clinic_id = EXCLUDED.clinic_id,
        role = EXCLUDED.role,
        is_active = true;

END $$;
