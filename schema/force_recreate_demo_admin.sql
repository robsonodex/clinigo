-- ==========================================
-- FORCE RECREATE DEMO ADMIN
-- ==========================================
-- Purpose: Resolve persistent 401 Login Errors by nuking and recreating the admin user.
-- Use this if the previous fix script didn't work.

DO $$
DECLARE
    v_demo_clinic_id UUID;
    v_new_user_id UUID := gen_random_uuid();
    v_email TEXT := 'admin@demo.clinigo.app';
BEGIN
    -- 1. Get Clinic ID
    SELECT id INTO v_demo_clinic_id FROM clinics WHERE slug = 'demo';
    
    IF v_demo_clinic_id IS NULL THEN
        RAISE EXCEPTION 'Demo clinic not found!';
    END IF;

    -- 2. Delete existing user (Public references first to avoid FK issues if no cascade)
    DELETE FROM public.users WHERE email = v_email;
    DELETE FROM auth.users WHERE email = v_email;
    
    -- 3. Create fresh Auth User
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_new_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt('Demo@2026', gen_salt('bf')), -- Password: Demo@2026
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Demo Admin", "role": "CLINIC_ADMIN"}',
        NOW(),
        NOW()
    );

    -- 4. Create fresh Public User
    INSERT INTO public.users (
        id, email, full_name, role, clinic_id, is_active
    ) VALUES (
        v_new_user_id,
        v_email,
        'Demo Admin',
        'CLINIC_ADMIN',
        v_demo_clinic_id,
        true
    );

    RAISE NOTICE 'User recreated successfully.';
    RAISE NOTICE 'Login: %', v_email;
    RAISE NOTICE 'Password: Demo@2026';
    
END $$;
