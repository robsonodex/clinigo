-- Migration: Adicionar campos de instrução de pagamento para modelo Gateway Agnóstico
-- Data: 2026-01-11
-- Descrição: Remove dependência de gateway integrado, clínica gerencia pagamentos externamente

-- 1. Adicionar campos de instrução de pagamento nas clínicas
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS bank_account_info TEXT,
ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- 2. Comentários para documentação
COMMENT ON COLUMN clinics.pix_key IS 'Chave PIX da clínica (CPF, CNPJ, email ou telefone)';
COMMENT ON COLUMN clinics.bank_account_info IS 'Dados bancários para transferência (banco, agência, conta)';
COMMENT ON COLUMN clinics.payment_instructions IS 'Instruções personalizadas de pagamento exibidas ao paciente';

-- 3. Adicionar novo status de agendamento ao enum
-- PAYMENT_PENDING = paciente clicou "já paguei", aguardando confirmação da clínica
DO $$
BEGIN
    -- Adicionar PAYMENT_PENDING ao enum appointment_status se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PAYMENT_PENDING' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
    ) THEN
        ALTER TYPE appointment_status ADD VALUE 'PAYMENT_PENDING';
        RAISE NOTICE 'Valor PAYMENT_PENDING adicionado ao enum appointment_status';
    ELSE
        RAISE NOTICE 'Valor PAYMENT_PENDING já existe no enum appointment_status';
    END IF;
END $$;

-- 4. View para pagamentos pendentes (facilita consulta no dashboard)
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
