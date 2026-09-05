-- Migration: 20260905163000_add_health_insurance_fields_to_patients.sql
-- Adiciona campos de convênio e modalidade de atendimento (particular vs convênio) na tabela patients

DO $$ 
BEGIN
    -- 1. Modalidade de faturamento: 'particular' ou 'convenio' (default: particular para retrocompatibilidade)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'billing_type'
    ) THEN
        ALTER TABLE patients ADD COLUMN billing_type TEXT DEFAULT 'particular';
    END IF;

    -- 2. Chave estrangeira para a operadora de saúde credenciada da clínica
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'health_insurance_id'
    ) THEN
        ALTER TABLE patients ADD COLUMN health_insurance_id UUID REFERENCES health_insurances(id) ON DELETE SET NULL;
    END IF;

    -- 3. Número da carteirinha / matrícula do convênio
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'insurance_card_number'
    ) THEN
        ALTER TABLE patients ADD COLUMN insurance_card_number TEXT;
    END IF;

    -- 4. Validade da carteirinha
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'insurance_validity'
    ) THEN
        ALTER TABLE patients ADD COLUMN insurance_validity DATE;
    END IF;

    -- 5. Nome do plano / categoria (ex: Básico, Especial, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'insurance_plan_name'
    ) THEN
        ALTER TABLE patients ADD COLUMN insurance_plan_name TEXT;
    END IF;
END $$;

-- Criação de índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_patients_billing_type ON patients(billing_type);
CREATE INDEX IF NOT EXISTS idx_patients_health_insurance_id ON patients(health_insurance_id);
