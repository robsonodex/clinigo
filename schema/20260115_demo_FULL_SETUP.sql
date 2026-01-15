-- ==========================================
-- MASTER SCRIPT: DEMO ENVIRONMENT FULL SETUP (FINAL ROBUST VERSION)
-- ==========================================
-- Purpose: Create demo columns, clinic, doctors, patients, appointments,
--          financial data, AND the Admin User.
--          - Handles Schema Drift (adds missing columns)
--          - Handles Foreign Key Constraints (creates Users for Doctors)
--          - Uses NOT EXISTS for idempotency
-- ==========================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. SCHEMA MIGRATION
-- ==========================================

-- 1.1 Add is_demo column to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_clinics_is_demo ON clinics(is_demo);

-- 1.2 Fix missing is_active column in doctors (if missing)
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. CREATE CLINIC
-- ==========================================
-- Attempt to create index, but don't rely on it for logic validation
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);

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

-- 3. SEED DOCTORS (AND THEIR USERS)
-- ==========================================
DO $$
DECLARE
  demo_clinic_id UUID;
  new_user_id UUID;
  doc_json jsonb;
  -- Define doctors data to iterate over
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
        -- Only proceed if doctor with this CRM doesn't exist in this clinic
        IF NOT EXISTS (
            SELECT 1 FROM doctors d 
            WHERE d.crm = (doc_json->>'crm') 
            AND d.clinic_id = demo_clinic_id
        ) THEN
            
            -- 3.1 Create User in Auth (if not exists)
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

            -- 3.2 Ensure public user exists and is linked
            -- (Triggers might handle this, but checking/updating is safer)
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

            -- 3.3 Create Doctor Record
            INSERT INTO doctors (
                id, clinic_id, user_id, crm, specialty, consultation_price, 
                is_accepting_appointments, is_active, display_settings
            ) VALUES (
                gen_random_uuid(),
                demo_clinic_id,
                new_user_id,
                (doc_json->>'crm'),
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

-- 4. SEED PATIENTS
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

-- 5. SEED APPOINTMENTS
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
BEGIN
  SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
  
  IF demo_clinic_id IS NOT NULL THEN
    SELECT ARRAY_AGG(id) INTO doctor_ids FROM doctors WHERE clinic_id = demo_clinic_id;
    SELECT ARRAY_AGG(id) INTO patient_ids FROM patients WHERE clinic_id = demo_clinic_id LIMIT 50;
    
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE clinic_id = demo_clinic_id LIMIT 1) THEN
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
        
        INSERT INTO appointments (
            clinic_id, patient_id, doctor_id, appointment_date, appointment_time,
            status, created_at, updated_at
        ) VALUES (
            demo_clinic_id,
            random_patient,
            random_doctor,
            random_date::DATE,
            to_char(random_date, 'HH24:MI'),
            random_status::appointment_status,
            NOW(),
            NOW()
        );
        END LOOP;
    END IF;
  END IF;
END $$;

-- 6. SEED CONSULTATIONS
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

-- 7. SEED FINANCIAL
-- ==========================================
INSERT INTO financial_entries (clinic_id, type, category, description, amount, date, status)
SELECT 
  c.id, 'EXPENSE', 'Aluguel', 'Aluguel Janeiro 2026', 5000.00, '2026-01-05', 'CONFIRMED'
FROM clinics c WHERE c.slug = 'demo'
AND NOT EXISTS (SELECT 1 FROM financial_entries WHERE description = 'Aluguel Janeiro 2026' AND clinic_id = c.id);

INSERT INTO financial_entries (clinic_id, type, category, description, amount, date, status)
SELECT 
  c.id, 'EXPENSE', 'Salários', 'Folha de Pagamento Janeiro', 15000.00, '2026-01-05', 'CONFIRMED'
FROM clinics c WHERE c.slug = 'demo'
AND NOT EXISTS (SELECT 1 FROM financial_entries WHERE description = 'Folha de Pagamento Janeiro' AND clinic_id = c.id);

-- 8. SEED TISS BATCHES
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

-- 9. CREATE ADMIN USER (AUTH)
-- ==========================================
DO $$
DECLARE
  new_user_id UUID;
  demo_clinic_id UUID;
BEGIN
  -- Get Demo Clinic ID
  SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
  
  IF demo_clinic_id IS NULL THEN
    RAISE EXCEPTION 'CRITICAL ERROR: Demo clinic was not created in step 2.';
  END IF;

  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demo.clinigo.app') THEN
    
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
      '{"full_name": "Demo Admin", "role": "CLINIC_ADMIN"}',
      NOW(),
      NOW()
    ) RETURNING id INTO new_user_id;

    -- Update the linked public user with clinic_id (if trigger created it)
    UPDATE public.users
    SET clinic_id = demo_clinic_id
    WHERE id = new_user_id;
    
  ELSE
    RAISE NOTICE 'User admin@demo.clinigo.app already exists. Updating clinic link...';
    
    UPDATE public.users
    SET clinic_id = demo_clinic_id
    WHERE email = 'admin@demo.clinigo.app';
  END IF;

END $$;
