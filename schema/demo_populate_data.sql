-- ============================================================
-- DEMO: POPULAR COM DADOS
-- ============================================================

DO $$
DECLARE
    v_clinic_id UUID;
    v_doctor_id UUID;
    v_patient1_id UUID;
    v_patient2_id UUID;
    v_patient3_id UUID;
BEGIN
    SELECT id INTO v_clinic_id FROM clinics WHERE slug = 'demo';
    SELECT d.id INTO v_doctor_id FROM doctors d WHERE d.clinic_id = v_clinic_id LIMIT 1;
    
    IF v_clinic_id IS NULL THEN
        RAISE EXCEPTION 'Clínica demo não encontrada.';
    END IF;

    -- Limpar
    DELETE FROM appointments WHERE clinic_id = v_clinic_id;
    DELETE FROM patients WHERE clinic_id = v_clinic_id;
    
    -- Pacientes
    v_patient1_id := gen_random_uuid();
    v_patient2_id := gen_random_uuid();
    v_patient3_id := gen_random_uuid();
    
    INSERT INTO patients (id, clinic_id, cpf, full_name, email, phone, date_of_birth, gender, created_at, updated_at) VALUES
        (v_patient1_id, v_clinic_id, '11122233344', 'Maria Silva Santos', 'maria@email.com', '21999001111', '1985-03-15', 'FEMALE', NOW(), NOW()),
        (v_patient2_id, v_clinic_id, '22233344455', 'João Carlos Oliveira', 'joao@email.com', '21999002222', '1978-07-22', 'MALE', NOW(), NOW()),
        (v_patient3_id, v_clinic_id, '33344455566', 'Ana Paula Costa', 'ana@email.com', '21999003333', '1990-11-08', 'FEMALE', NOW(), NOW());

    IF v_doctor_id IS NOT NULL THEN
        INSERT INTO appointments (id, clinic_id, doctor_id, patient_id, appointment_date, appointment_time, status, created_at, updated_at) VALUES
            (gen_random_uuid(), v_clinic_id, v_doctor_id, v_patient1_id, CURRENT_DATE + 1, '09:00', 'CONFIRMED', NOW(), NOW()),
            (gen_random_uuid(), v_clinic_id, v_doctor_id, v_patient2_id, CURRENT_DATE + 1, '09:30', 'CONFIRMED', NOW(), NOW()),
            (gen_random_uuid(), v_clinic_id, v_doctor_id, v_patient3_id, CURRENT_DATE + 1, '10:00', 'PENDING_PAYMENT', NOW(), NOW()),
            (gen_random_uuid(), v_clinic_id, v_doctor_id, v_patient1_id, CURRENT_DATE + 2, '14:00', 'CONFIRMED', NOW(), NOW()),
            (gen_random_uuid(), v_clinic_id, v_doctor_id, v_patient2_id, CURRENT_DATE + 3, '11:00', 'CONFIRMED', NOW(), NOW());
    END IF;

    RAISE NOTICE 'DEMO OK: 3 pacientes, 5 agendamentos';
END $$;
