-- =====================================================
-- MIGRAÇÃO: Refinamento de Notificações - Padrão SaaS Premium
-- Data: 2026-09-06
-- Descrição: 
-- 1. Elimina auto-notificações redundantes (o operador não recebe notificação de si mesmo).
-- 2. Altera a redação para tom corporativo sóbrio internacional.
-- 3. Adiciona metadata 'silent: true' para que transações financeiras e agendamentos rotineiros
--    alimentem discretamente o Sino de Notificações sem disparar popups/toasts invasivos na tela.
-- =====================================================

-- 1. TRIGGER: Pagamento registrado -> notifica outros administradores no feed
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
        AND (NEW.created_by IS NULL OR id != NEW.created_by)
    LOOP
        INSERT INTO notifications (clinic_id, user_id, type, title, message, link, metadata)
        VALUES (
            NEW.clinic_id,
            _user_record.id,
            'info',
            'Recebimento em caixa',
            'Entrada de R$ ' || _amount_text || ' conciliada no caixa.',
            '/dashboard/pagamentos',
            jsonb_build_object('silent', true, 'category', 'counter_payment', 'amount', NEW.amount)
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER: Agendamento criado -> notifica outros administradores/recepcionistas no feed
CREATE OR REPLACE FUNCTION notify_appointment_created()
RETURNS TRIGGER AS $$
DECLARE
    _clinic_id uuid;
    _patient_name text;
    _user_record record;
BEGIN
    SELECT p.full_name INTO _patient_name 
    FROM patients p WHERE p.id = NEW.patient_id;
    
    SELECT d.clinic_id INTO _clinic_id 
    FROM doctors d WHERE d.id = NEW.doctor_id;
    
    IF _clinic_id IS NULL THEN
        _clinic_id := NEW.clinic_id;
    END IF;
    
    IF _clinic_id IS NULL THEN RETURN NEW; END IF;
    
    FOR _user_record IN 
        SELECT id FROM users 
        WHERE clinic_id = _clinic_id 
        AND role IN ('CLINIC_ADMIN', 'RECEPTIONIST')
    LOOP
        INSERT INTO notifications (clinic_id, user_id, type, title, message, link, metadata)
        VALUES (
            _clinic_id,
            _user_record.id,
            'appointment',
            'Agendamento confirmado',
            'Paciente ' || COALESCE(_patient_name, 'N/A') || ' inserido na agenda.',
            '/dashboard/agenda',
            jsonb_build_object('silent', true, 'category', 'appointment_created')
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
