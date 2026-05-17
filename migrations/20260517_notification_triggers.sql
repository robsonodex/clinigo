-- =====================================================
-- MIGRAÇÃO: Triggers de Notificações Automáticas
-- Data: 2026-05-17
-- Descrição: Triggers para INSERT automático na tabela 
-- notifications quando eventos ocorrem no sistema.
-- O Supabase Realtime já propaga para o frontend.
-- =====================================================

-- =====================================================
-- 1. TRIGGER: Appointment criado → notifica CLINIC_ADMIN e RECEPTIONIST
-- =====================================================
CREATE OR REPLACE FUNCTION notify_appointment_created()
RETURNS TRIGGER AS $$
DECLARE
    _clinic_id uuid;
    _patient_name text;
    _user_record record;
BEGIN
    -- Get patient name
    SELECT p.full_name INTO _patient_name 
    FROM patients p WHERE p.id = NEW.patient_id;
    
    -- Get clinic_id from doctor
    SELECT d.clinic_id INTO _clinic_id 
    FROM doctors d WHERE d.id = NEW.doctor_id;
    
    -- Fallback: get clinic_id from appointment itself if available
    IF _clinic_id IS NULL THEN
        _clinic_id := NEW.clinic_id;
    END IF;
    
    IF _clinic_id IS NULL THEN RETURN NEW; END IF;
    
    -- Notify CLINIC_ADMIN and RECEPTIONIST
    FOR _user_record IN 
        SELECT id FROM users 
        WHERE clinic_id = _clinic_id 
        AND role IN ('CLINIC_ADMIN', 'RECEPTIONIST')
    LOOP
        INSERT INTO notifications (clinic_id, user_id, type, title, message, link)
        VALUES (
            _clinic_id,
            _user_record.id,
            'appointment',
            'Novo agendamento',
            'Paciente ' || COALESCE(_patient_name, 'N/A') || ' agendou uma consulta.',
            '/dashboard/agenda'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_appointment_created ON appointments;
CREATE TRIGGER trg_notify_appointment_created
    AFTER INSERT ON appointments
    FOR EACH ROW EXECUTE FUNCTION notify_appointment_created();


-- =====================================================
-- 2. TRIGGER: Pagamento registrado → notifica CLINIC_ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION notify_payment_registered()
RETURNS TRIGGER AS $$
DECLARE
    _user_record record;
    _amount_text text;
BEGIN
    _amount_text := COALESCE(TO_CHAR(NEW.amount, 'FM999G999D00'), '0,00');
    
    FOR _user_record IN 
        SELECT id FROM users 
        WHERE clinic_id = NEW.clinic_id 
        AND role = 'CLINIC_ADMIN'
    LOOP
        INSERT INTO notifications (clinic_id, user_id, type, title, message, link)
        VALUES (
            NEW.clinic_id,
            _user_record.id,
            'success',
            'Pagamento registrado',
            'Um pagamento de R$ ' || _amount_text || ' foi registrado.',
            '/dashboard/pagamentos'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_payment_registered ON financial_entries;
CREATE TRIGGER trg_notify_payment_registered
    AFTER INSERT ON financial_entries
    FOR EACH ROW
    WHEN (NEW.type = 'INCOME')
    EXECUTE FUNCTION notify_payment_registered();


-- =====================================================
-- 3. TRIGGER: Appointment NO_SHOW → notifica CLINIC_ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION notify_appointment_noshow()
RETURNS TRIGGER AS $$
DECLARE
    _patient_name text;
    _clinic_id uuid;
    _user_record record;
BEGIN
    -- Only trigger when status changes TO NO_SHOW
    IF NEW.status = 'NO_SHOW' AND (OLD.status IS NULL OR OLD.status != 'NO_SHOW') THEN
        SELECT p.full_name INTO _patient_name 
        FROM patients p WHERE p.id = NEW.patient_id;
        
        _clinic_id := NEW.clinic_id;
        
        IF _clinic_id IS NULL THEN
            SELECT d.clinic_id INTO _clinic_id 
            FROM doctors d WHERE d.id = NEW.doctor_id;
        END IF;
        
        IF _clinic_id IS NULL THEN RETURN NEW; END IF;
        
        FOR _user_record IN 
            SELECT id FROM users 
            WHERE clinic_id = _clinic_id 
            AND role = 'CLINIC_ADMIN'
        LOOP
            INSERT INTO notifications (clinic_id, user_id, type, title, message, link)
            VALUES (
                _clinic_id,
                _user_record.id,
                'warning',
                'Paciente não compareceu',
                'O paciente ' || COALESCE(_patient_name, 'N/A') || ' não compareceu à consulta agendada.',
                '/dashboard/agenda'
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_appointment_noshow ON appointments;
CREATE TRIGGER trg_notify_appointment_noshow
    AFTER UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION notify_appointment_noshow();


-- =====================================================
-- NOTA: Trigger de "Plano com renovação em 3 dias"
-- Este trigger é mais adequado via CRON job (já existe /api/cron)
-- pois depende de comparação com NOW() e billing_date.
-- Implementar via endpoint CRON chamado diariamente.
-- =====================================================
