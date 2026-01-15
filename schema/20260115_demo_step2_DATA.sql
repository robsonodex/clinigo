-- ==========================================
-- STEP 2: DATA SEEDING (FINAL ROBUST VERSION)
-- ==========================================
-- Run this script to populate the demo environment.
-- 
-- FIXES INCLUDED:
-- 1. Schema Patches: Creates missing columns (consultations, financial_entries).
-- 2. Missing Tables: Creates financial_categories if missing.
-- 3. Data Integrity: Correct column names (due_date, entry_type).
-- 4. Constraint Handling: ON CONFLICT DO NOTHING checks.
-- 5. Standard Columns: Adds created_at, updated_at, status, created_by.
-- 6. Check Constraints: Uses uppercase 'PAID' for status.
-- 7. Password Sync: Updates admin password if user exists.
-- ==========================================

-- 0. SCHEMA PATCHES (Fix for missing columns and tables)
-- ==========================================

-- 0.1 Create financial_categories if not exists
CREATE TABLE IF NOT EXISTS financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'INCOME' or 'EXPENSE'
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, name, type)
);

-- 0.2 Add missing columns to consultations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS prescription TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS list_symptoms TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS treatment_plan TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS status TEXT;

-- 0.3 Add missing columns to financial_entries (Match API expectations)
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS entry_type TEXT; -- API uses entry_type
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS due_date DATE;   -- API uses due_date
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES financial_categories(id);
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 1. CREATE CLINIC
-- ==========================================
INSERT INTO clinics (
  id, name, slug, cnpj, email, phone, 
  plan_type, is_active, is_demo, 
  subscription_starts_at, subscription_ends_at,
  plan_limits
)
SELECT
  gen_random_uuid(),
  'Clínica Modelo - Demonstração CliniGo',
  'demo',
  '00.000.000/0001-00',
  'demo@clinigo.app',
  '(11) 0000-0000',
  'ENTERPRISE', 
  true,
  true,
  NOW(),
  NULL,
  '{
    "max_doctors": 999,
    "max_appointments_per_month": 9999,
    "storage_gb": 999,
    "telemedicine_enabled": true,
    "tiss_enabled": true,
    "whatsapp_enabled": false,
    "ai_enabled": true
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE slug = 'demo');

-- 2. SEED DOCTORS (AND THEIR USERS)
-- ==========================================
DO $$
DECLARE
  demo_clinic_id UUID;
  new_user_id UUID;
  doc_json jsonb;
  doctors_data jsonb[] := ARRAY[
    '{"email": "doctor1@demo.clinigo.app", "crm": "123456", "name": "Dr. Cardio", "specialty": "Cardiologia"}',
    '{"email": "doctor2@demo.clinigo.app", "crm": "234567", "name": "Dr. Pedi", "specialty": "Pediatria"}',
    '{"email": "doctor3@demo.clinigo.app", "crm": "345678", "name": "Dr. Orto", "specialty": "Ortopedia"}',
    '{"email": "doctor4@demo.clinigo.app", "crm": "456789", "name": "Dra. Gineco", "specialty": "Ginecologia"}',
    '{"email": "doctor5@demo.clinigo.app", "crm": "567890", "name": "Dra. Derma", "specialty": "Dermatologia"}'
  ]::jsonb[];
BEGIN
  SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
  
  IF demo_clinic_id IS NOT NULL THEN
      FOREACH doc_json IN ARRAY doctors_data LOOP
        IF NOT EXISTS (
            SELECT 1 FROM doctors d 
            WHERE d.crm = (doc_json->>'crm') 
            AND d.clinic_id = demo_clinic_id
        ) THEN
            
            -- Create User in Auth
            SELECT id INTO new_user_id FROM auth.users WHERE email = (doc_json->>'email');
            
            IF new_user_id IS NULL THEN
                INSERT INTO auth.users (
                    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
                ) VALUES (
                    '00000000-0000-0000-0000-000000000000',
                    gen_random_uuid(),
                    'authenticated',
                    'authenticated',
                    (doc_json->>'email'),
                    crypt('Demo@2026', gen_salt('bf')),
                    NOW(),
                    '{"provider": "email", "providers": ["email"]}',
                    jsonb_build_object('full_name', (doc_json->>'name'), 'role', 'DOCTOR'),
                    NOW(),
                    NOW()
                ) RETURNING id INTO new_user_id;
            END IF;

            -- Ensure public user exists and is linked
            IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = new_user_id) THEN
                INSERT INTO public.users (id, email, full_name, role, clinic_id, is_active, created_at, updated_at)
                VALUES (
                    new_user_id, 
                    (doc_json->>'email'), 
                    (doc_json->>'name'), 
                    'DOCTOR', 
                    demo_clinic_id, 
                    true, 
                    NOW(), 
                    NOW()
                );
            ELSE
                UPDATE public.users SET clinic_id = demo_clinic_id WHERE id = new_user_id;
            END IF;

            -- Create Doctor Record
            INSERT INTO doctors (
                id, clinic_id, user_id, crm, crm_state, specialty, consultation_price, 
                is_accepting_appointments, is_active, display_settings
            ) VALUES (
                gen_random_uuid(),
                demo_clinic_id,
                new_user_id,
                (doc_json->>'crm'),
                'SP',
                (doc_json->>'specialty'),
                250.00,
                true,
                true,
                '{"bio": "Médico Demo"}'::jsonb
            );
            
        END IF;
      END LOOP;
  END IF;
END $$;

-- 3. SEED PATIENTS
-- ==========================================
DO $$
DECLARE
  demo_clinic_id UUID;
  patient_names TEXT[] := ARRAY[
    'Maria Silva Santos', 'João Pedro Oliveira', 'Ana Carolina Costa',
    'Carlos Eduardo Lima', 'Juliana Ferreira Alves', 'Pedro Henrique Souza',
    'Beatriz Rodrigues Martins', 'Lucas Gabriel Pereira', 'Fernanda Cristina Ribeiro',
    'Rafael Augusto Carvalho', 'Gabriel Almeida', 'Larissa Costa', 'Matheus Pereira',
    'Sofia Rodrigues', 'Guilherme Santos', 'Camila Oliveira', 'Bruno Lima',
    'Manuela Ferreira', 'Enzo Souza', 'Valentina Alves', 'Thiago Silva',
    'Isabella Martins', 'Henrique Ribeiro', 'Lorena Carvalho', 'Eduardo Almeida',
    'Luiza Costa', 'Felipe Pereira', 'Heloisa Rodrigues', 'Rodrigo Santos',
    'Cecilia Oliveira', 'Arthur Lima', 'Maitê Ferreira', 'Caio Souza',
    'Elisa Alves', 'Murilo Silva', 'Nicole Martins', 'Vinicius Ribeiro',
    'Bárbara Carvalho', 'Gustavo Almeida', 'Clara Costa', 'Antonio Pereira',
    'Marina Rodrigues', 'Davi Santos', 'Laura Oliveira', 'Pedro Lima',
    'Alice Ferreira', 'João Souza', 'Julia Alves', 'Lucas Silva', 'Bianca Martins'
  ];
  i INT;
BEGIN
  SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
  
  -- Only insert if we don't have patients yet
  IF demo_clinic_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM patients WHERE clinic_id = demo_clinic_id LIMIT 1) THEN
    FOR i IN 1..50 LOOP
      INSERT INTO patients (
        clinic_id, full_name, cpf, email, phone, 
        date_of_birth, created_at, updated_at
      ) VALUES (
        demo_clinic_id,
        patient_names[((i - 1) % array_length(patient_names, 1)) + 1],
        LPAD((100000000 + i)::TEXT, 11, '0'),
        'paciente' || i || '@exemplo.com',
        '(11) 9' || LPAD(i::TEXT, 8, '0'),
        (NOW() - (INTERVAL '1 year' * (random() * 80 + 5))),
        NOW(),
        NOW()
      );
    END LOOP;
  END IF;
END $$;

-- 4. SEED APPOINTMENTS
-- ==========================================
DO $$
DECLARE
  demo_clinic_id UUID;
  doctor_ids UUID[];
  patient_ids UUID[];
  i INT;
  random_doctor UUID;
  random_patient UUID;
  random_date TIMESTAMPTZ;
  random_status TEXT;
  appt_time TIME;
BEGIN
  SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
  
  IF demo_clinic_id IS NOT NULL THEN
    SELECT ARRAY_AGG(id) INTO doctor_ids FROM doctors WHERE clinic_id = demo_clinic_id;
    SELECT ARRAY_AGG(id) INTO patient_ids FROM patients WHERE clinic_id = demo_clinic_id LIMIT 50;
    
    -- Check if we have enough appointments, otherwise insert more
    -- Using a count check or just attempting to insert more won't hurt with ON CONFLICT
    -- 4.1 Update: Fetch existing count to avoid over-seeding if already run
    -- But since we use DO NOTHING on conflict, looping 100 times is fine.
    
    FOR i IN 1..100 LOOP
        random_doctor := doctor_ids[1 + floor(random() * array_length(doctor_ids, 1))];
        random_patient := patient_ids[1 + floor(random() * array_length(patient_ids, 1))];
        
        IF i <= 50 THEN
            random_date := NOW() - (INTERVAL '1 day' * floor(random() * 60)); 
            random_status := 'COMPLETED';
        ELSIF i <= 60 THEN
            random_date := NOW() + (INTERVAL '1 hour' * floor(random() * 8)); 
            random_status := 'CONFIRMED';
        ELSE
            random_date := NOW() + (INTERVAL '1 day' * floor(random() * 30 + 1)); 
            random_status := 'CONFIRMED';
        END IF;

        appt_time := to_char(random_date, 'HH24:MI')::time;
        
        -- Insert with Conflict Handling
        INSERT INTO appointments (
            clinic_id, patient_id, doctor_id, appointment_date, appointment_time,
            status, created_at, updated_at
        ) VALUES (
            demo_clinic_id,
            random_patient,
            random_doctor,
            random_date::DATE,
            appt_time,
            random_status::appointment_status,
            NOW(),
            NOW()
        )
        ON CONFLICT (doctor_id, appointment_date, appointment_time) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 5. SEED CONSULTATIONS
-- ==========================================
DO $$
DECLARE
   k record;
BEGIN
   FOR k IN 
      SELECT a.id, a.clinic_id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time
      FROM appointments a
      WHERE a.clinic_id = (SELECT id FROM clinics WHERE slug = 'demo')
        AND a.status = 'COMPLETED'
      LIMIT 30
   LOOP
      IF NOT EXISTS (SELECT 1 FROM consultations WHERE appointment_id = k.id) THEN
        INSERT INTO consultations (
            appointment_id, clinic_id, patient_id, doctor_id, 
            started_at, ended_at, 
            diagnosis, prescription, list_symptoms, treatment_plan,
            status
        ) VALUES (
            k.id, k.clinic_id, k.patient_id, k.doctor_id,
            (k.appointment_date || ' ' || k.appointment_time)::timestamp,
            (k.appointment_date || ' ' || k.appointment_time)::timestamp + INTERVAL '30 minutes',
            'CID-10: R51 - Cefaleia. Provável enxaqueca sem aura.',
            'Prescrição de analgésico. Orientação sobre hidratação e sono.',
            'Dor de cabeça persistente, náuseas.',
            'Retorno em 15 dias.',
            'COMPLETED'
        );
      END IF;
   END LOOP;
END $$;

-- 6. SEED FINANCIAL
-- ==========================================
DO $$
DECLARE
  demo_clinic_id UUID;
  cat_fixed UUID;
  cat_payroll UUID;
  new_user_id UUID; -- Variable for created_by
BEGIN
  SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
  -- Try to find an admin user for 'created_by' field
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'admin@demo.clinigo.app' LIMIT 1;
  -- Fallback if admin not created yet (it is created in step 8, so let's try to get any user or null)
  IF new_user_id IS NULL THEN
     SELECT id INTO new_user_id FROM auth.users WHERE email LIKE '%@demo.clinigo.app' LIMIT 1;
  END IF;


  IF demo_clinic_id IS NOT NULL THEN
    
    -- 6.1 Ensure Categories Exist
    -- Note: Ensure financial_categories table was created by schema patch (step 0.1)
    INSERT INTO financial_categories (clinic_id, name, type, color, is_active)
    VALUES (demo_clinic_id, 'Despesas Fixas', 'EXPENSE', '#EF4444', true)
    ON CONFLICT (clinic_id, name, type) DO NOTHING;

    INSERT INTO financial_categories (clinic_id, name, type, color, is_active)
    VALUES (demo_clinic_id, 'Custos com Pessoal', 'EXPENSE', '#F59E0B', true)
    ON CONFLICT (clinic_id, name, type) DO NOTHING;

    -- Get IDs
    SELECT id INTO cat_fixed FROM financial_categories WHERE clinic_id = demo_clinic_id AND name = 'Despesas Fixas' LIMIT 1;
    SELECT id INTO cat_payroll FROM financial_categories WHERE clinic_id = demo_clinic_id AND name = 'Custos com Pessoal' LIMIT 1;

    -- 6.2 Insert Entries
    -- Using uppercase 'PAID' to satisfy constraints
    IF cat_fixed IS NOT NULL AND NOT EXISTS (SELECT 1 FROM financial_entries WHERE description = 'Aluguel Janeiro 2026' AND clinic_id = demo_clinic_id) THEN
        INSERT INTO financial_entries (
            clinic_id, entry_type, category_id, description, amount, due_date, status, created_at, updated_at, created_by
        ) VALUES (
            demo_clinic_id, 'EXPENSE', cat_fixed, 'Aluguel Janeiro 2026', 5000.00, '2026-01-05', 'PAID', NOW(), NOW(), new_user_id
        );
    END IF;

    IF cat_payroll IS NOT NULL AND NOT EXISTS (SELECT 1 FROM financial_entries WHERE description = 'Folha de Pagamento Janeiro' AND clinic_id = demo_clinic_id) THEN
        INSERT INTO financial_entries (
            clinic_id, entry_type, category_id, description, amount, due_date, status, created_at, updated_at, created_by
        ) VALUES (
            demo_clinic_id, 'EXPENSE', cat_payroll, 'Folha de Pagamento Janeiro', 15000.00, '2026-01-05', 'PAID', NOW(), NOW(), new_user_id
        );
    END IF;

  END IF;
END $$;

-- 7. SEED TISS BATCHES
-- ==========================================
DO $$
DECLARE
  demo_clinic_id UUID;
BEGIN
  SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
  
  IF demo_clinic_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tiss_batches WHERE clinic_id = demo_clinic_id LIMIT 1) THEN
    INSERT INTO tiss_batches (clinic_id, batch_number, reference_month, reference_year, status, total_guides, total_value, approved_value)
    VALUES (demo_clinic_id, '202512001', 12, 2025, 'APPROVED', 25, 6250.00, 6250.00);
    
    INSERT INTO tiss_batches (clinic_id, batch_number, reference_month, reference_year, status, total_guides, total_value, approved_value, glosa_value)
    VALUES (demo_clinic_id, '202601001', 1, 2026, 'PARTIAL', 30, 7500.00, 6800.00, 700.00);
  END IF;
END $$;

-- 8. CREATE ADMIN USER (AUTH)
-- ==========================================
DO $$
DECLARE
  new_user_id UUID;
  demo_clinic_id UUID;
BEGIN
  SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
  
  IF demo_clinic_id IS NULL THEN
    RAISE EXCEPTION 'CRITICAL ERROR: Demo clinic was not created in step 2.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demo.clinigo.app') THEN
    
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
    ) RETURNING id INTO new_user_id;

    -- Update linked public user
    UPDATE public.users SET clinic_id = demo_clinic_id WHERE id = new_user_id;
    
  ELSE
    -- UPDATE PASSWORD AND LINK (The Fix)
    UPDATE auth.users
    SET encrypted_password = crypt('Demo@2026', gen_salt('bf')),
        updated_at = NOW()
    WHERE email = 'admin@demo.clinigo.app';

    UPDATE public.users SET clinic_id = demo_clinic_id WHERE email = 'admin@demo.clinigo.app';
  END IF;

END $$;
