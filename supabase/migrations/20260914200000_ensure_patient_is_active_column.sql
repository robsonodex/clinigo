-- Migration: 20260914200000_ensure_patient_is_active_column.sql
-- Garante que a coluna is_active exista na tabela patients para suportar
-- inativacao de pacientes (pausa de terapia / cancelamento) sem exclusao.
-- Pacientes inativos nao recebem mensagens de campanha WhatsApp/CRM.

DO $$
BEGIN
    -- Coluna is_active (default true para nao afetar pacientes existentes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'patients'
          AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.patients ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Coluna deleted_at para soft-delete LGPD
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'patients'
          AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.patients ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- Coluna is_anonymized para LGPD
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'patients'
          AND column_name = 'is_anonymized'
    ) THEN
        ALTER TABLE public.patients ADD COLUMN is_anonymized BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Indice para consultas filtradas por status ativo
CREATE INDEX IF NOT EXISTS idx_patients_is_active ON public.patients(is_active);
CREATE INDEX IF NOT EXISTS idx_patients_deleted_at ON public.patients(deleted_at);
