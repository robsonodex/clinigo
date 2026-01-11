-- Migration PARTE 1: Adicionar campos e enum value
-- Data: 2026-01-11
-- Descrição: Preparação para modelo Gateway Agnóstico
-- EXECUTAR ESTA PARTE PRIMEIRO

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

-- FIM DA PARTE 1
-- Após executar esta parte, AGUARDE o commit da transação
-- Depois execute a PARTE 2: gateway-agnostic-migration-part2.sql
