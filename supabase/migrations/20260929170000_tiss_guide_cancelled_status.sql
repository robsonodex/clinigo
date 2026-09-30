-- ==============================================================================
-- MIGRATION: 20260929170000_tiss_guide_cancelled_status.sql
-- Faturamento Premium TISS - Status CANCELLED e Compatibilidade de Versões de XML (B2.1 / B3)
-- Idempotente, não destrutivo, executável no SQL Editor do Supabase sem erros.
-- ==============================================================================

BEGIN;

-- 1. Suporte seguro a status CANCELLED no tipo enumerado ou constraint de tiss_guides
DO $$
BEGIN
    -- Se existir enum formal tiss_guide_status
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiss_guide_status') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = 'tiss_guide_status'::regtype AND enumlabel = 'CANCELLED'
        ) THEN
            ALTER TYPE tiss_guide_status ADD VALUE 'CANCELLED';
        END IF;
    END IF;

    -- Se existir enum tiss_guide_validation_status
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiss_guide_validation_status') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = 'tiss_guide_validation_status'::regtype AND enumlabel = 'CANCELLED'
        ) THEN
            ALTER TYPE tiss_guide_validation_status ADD VALUE 'CANCELLED';
        END IF;
    END IF;
END $$;

-- 2. Campos de auditoria de cancelamento formal em tiss_guides
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tiss_guides' AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE tiss_guides ADD COLUMN cancellation_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tiss_guides' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE tiss_guides ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tiss_guides' AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE tiss_guides ADD COLUMN cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Índice para filtros de relatórios excluindo canceladas e soft-deleted
CREATE INDEX IF NOT EXISTS idx_tiss_guides_clinic_status_active 
ON tiss_guides(clinic_id, status) 
WHERE deleted_at IS NULL;

-- 4. Garantia de idempotência da tabela tiss_batch_xml_versions (criada na 150000)
CREATE TABLE IF NOT EXISTS tiss_batch_xml_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES tiss_batches(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    xml_content TEXT NOT NULL,
    xml_file_url TEXT,
    file_size INT NOT NULL DEFAULT 0,
    hash_algorithm VARCHAR(30) NOT NULL DEFAULT 'SHA-256',
    hash_value VARCHAR(64) NOT NULL,
    validation_mode VARCHAR(30) NOT NULL DEFAULT 'ESTRUTURAL',
    is_valid BOOLEAN NOT NULL DEFAULT true,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir colunas adicionais caso a tabela tenha sido criada em versão prévia
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tiss_batch_xml_versions' AND column_name = 'validation_status'
    ) THEN
        ALTER TABLE tiss_batch_xml_versions ADD COLUMN validation_status TEXT DEFAULT 'PENDING';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tiss_batch_xml_versions' AND column_name = 'errors_count'
    ) THEN
        ALTER TABLE tiss_batch_xml_versions ADD COLUMN errors_count INT DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_batch_xml_versions_batch_v2 
ON tiss_batch_xml_versions(clinic_id, batch_id, version_number DESC);

ALTER TABLE tiss_batch_xml_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tiss_batch_xml_versions' AND policyname = 'tiss_batch_xml_versions_isolation_policy'
    ) THEN
        CREATE POLICY tiss_batch_xml_versions_isolation_policy ON tiss_batch_xml_versions
            FOR ALL
            TO authenticated
            USING (
                clinic_id IN (
                    SELECT clinic_id FROM users WHERE id = auth.uid()
                )
            )
            WITH CHECK (
                clinic_id IN (
                    SELECT clinic_id FROM users WHERE id = auth.uid()
                )
            );
    END IF;
END $$;

COMMIT;
