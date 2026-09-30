-- ==============================================================================
-- MIGRATION: 20260929170000_tiss_guide_cancelled_status.sql
-- Faturamento Premium TISS - Status CANCELLED e Versionamento de XML (B2.1 e B3)
-- Idempotente, não destrutivo e seguro para produção
-- ==============================================================================

BEGIN;

-- 1. Campos de rastreamento de cancelamento formal em tiss_guides
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

-- 2. Índice para consultas de faturamento e exclusão de canceladas
CREATE INDEX IF NOT EXISTS idx_tiss_guides_clinic_status 
ON tiss_guides(clinic_id, status);

-- 3. Tabela de histórico de versões de XML de lote (L4 do Prompt B)
CREATE TABLE IF NOT EXISTS tiss_batch_xml_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES tiss_batches(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    xml_content TEXT NOT NULL,
    hash_value VARCHAR(64) NOT NULL,
    hash_algorithm VARCHAR(10) NOT NULL DEFAULT 'SHA-256',
    tiss_version VARCHAR(20) NOT NULL DEFAULT '4.01.00',
    file_size_bytes INT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiss_batch_xml_versions_batch 
ON tiss_batch_xml_versions(clinic_id, batch_id, version DESC);

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
