-- Migration: 20260905193000_add_council_name_and_patient_billing_both.sql
-- Adiciona council_name na tabela doctors e garante suporte ao billing_type 'ambos' em patients

DO $$ 
BEGIN
    -- 1. Adicionar council_name em doctors para permitir especificar o conselho por profissional (CRFa, CRP, CREFITO, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'doctors' AND column_name = 'council_name'
    ) THEN
        ALTER TABLE doctors ADD COLUMN council_name TEXT;
    END IF;

    -- 2. Garantir que se houver alguma restrição de billing_type em patients, ela permita 'ambos'
    -- (No PostgreSQL padrão já é TEXT, mas removemos qualquer check antigo se existir)
    ALTER TABLE patients DROP CONSTRAINT IF EXISTS check_patients_billing_type;
    ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_billing_type_check;

    -- Adiciona constraint segura aceitando particular, convenio e ambos
    ALTER TABLE patients ADD CONSTRAINT patients_billing_type_check 
        CHECK (billing_type IN ('particular', 'convenio', 'ambos'));

END $$;

-- Índice para consultas por conselho
CREATE INDEX IF NOT EXISTS idx_doctors_council_name ON doctors(council_name);
