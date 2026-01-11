-- Migration PARTE 2: Criar VIEW usando novo enum value
-- Data: 2026-01-11
-- Descrição: View para pagamentos pendentes
-- EXECUTAR ESTA PARTE DEPOIS DA PARTE 1

-- ATENÇÃO: Execute esta parte SOMENTE DEPOIS de:
-- 1. Executar gateway-agnostic-migration-part1.sql
-- 2. Aguardar o commit da transação (fechar e reabrir o SQL Editor)

-- View para pagamentos pendentes (facilita consulta no dashboard)
CREATE OR REPLACE VIEW v_pending_payments AS
SELECT 
    a.id as appointment_id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.created_at,
    c.id as clinic_id,
    c.name as clinic_name,
    p.full_name as patient_name,
    p.email as patient_email,
    p.phone as patient_phone,
    d.id as doctor_id,
    u.full_name as doctor_name,
    pay.amount,
    pay.status as payment_status
FROM appointments a
JOIN clinics c ON a.clinic_id = c.id
JOIN patients p ON a.patient_id = p.id
JOIN doctors d ON a.doctor_id = d.id
JOIN users u ON d.user_id = u.id
LEFT JOIN payments pay ON pay.appointment_id = a.id
WHERE a.status IN ('PENDING_PAYMENT', 'PAYMENT_PENDING')
ORDER BY a.created_at DESC;

-- Permissões
GRANT SELECT ON v_pending_payments TO authenticated;
