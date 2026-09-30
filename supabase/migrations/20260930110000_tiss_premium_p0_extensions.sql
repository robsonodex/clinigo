-- ==============================================================================
-- Migration: 20260930110000_tiss_premium_p0_extensions.sql
-- Descrição: Estrutura para Gestão de Recursos de Glosa Multicanal (C1 a C8)
--            Vinculação por Operadora, Anexos em Bucket Privado e Liquidação por Item
-- ==============================================================================

-- 1. Tabela Principal de Recursos de Glosa (C1 - Lote de Recurso por Operadora)
CREATE TABLE IF NOT EXISTS tiss_appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    health_insurance_id UUID NOT NULL REFERENCES health_insurances(id) ON DELETE CASCADE,
    appeal_number VARCHAR(50) NOT NULL,
    protocol_number VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PREPARATION',
    deadline_at DATE,
    general_reason TEXT,
    submission_date DATE,
    submission_channel VARCHAR(30) DEFAULT 'PORTAL',
    total_glosa_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_contested_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_recovered_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_loss_registered BOOLEAN NOT NULL DEFAULT false,
    loss_reason TEXT,
    loss_registered_at TIMESTAMP WITH TIME ZONE,
    loss_registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiss_appeals_clinic_status ON tiss_appeals(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_tiss_appeals_insurance ON tiss_appeals(clinic_id, health_insurance_id);

-- 2. Itens do Recurso de Glosa (C2, C3, C8 - Detalhamento por Item com Trava de Valor)
CREATE TABLE IF NOT EXISTS tiss_appeal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    appeal_id UUID NOT NULL REFERENCES tiss_appeals(id) ON DELETE CASCADE,
    glosa_id UUID NOT NULL REFERENCES tiss_glosas(id) ON DELETE CASCADE,
    guide_id UUID REFERENCES tiss_guides(id) ON DELETE SET NULL,
    item_code VARCHAR(30),
    item_description TEXT,
    original_glosa_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    contested_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    item_reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PREPARATION',
    recovered_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    financial_entry_id UUID,
    repasse_adjusted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_contested_le_glosa CHECK (contested_value <= original_glosa_value)
);

CREATE INDEX IF NOT EXISTS idx_tiss_appeal_items_appeal ON tiss_appeal_items(appeal_id);
CREATE INDEX IF NOT EXISTS idx_tiss_appeal_items_glosa ON tiss_appeal_items(glosa_id);

-- 3. Anexos do Recurso (C4 - Bucket Privado ou Vinculado do Prontuário)
CREATE TABLE IF NOT EXISTS tiss_appeal_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    appeal_id UUID NOT NULL REFERENCES tiss_appeals(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    source_type VARCHAR(20) NOT NULL DEFAULT 'UPLOAD', -- 'UPLOAD' ou 'PRONTUARIO'
    source_document_id UUID,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiss_appeal_attachments_appeal ON tiss_appeal_attachments(appeal_id);

-- 4. Extensões em tabelas existentes (Idempotente)
DO $$
BEGIN
    -- Vínculo de recurso em tiss_glosa_contests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_glosa_contests' AND column_name = 'appeal_id') THEN
        ALTER TABLE tiss_glosa_contests ADD COLUMN appeal_id UUID REFERENCES tiss_appeals(id) ON DELETE SET NULL;
    END IF;

    -- Hash do retorno dry-run para evitar duplicação (R2)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_return_imports' AND column_name = 'dry_run_token') THEN
        ALTER TABLE tiss_return_imports ADD COLUMN dry_run_token VARCHAR(64);
    END IF;

    -- Protocolo e comprovante de envio manual no lote (L7)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'protocol_number') THEN
        ALTER TABLE tiss_batches ADD COLUMN protocol_number VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'receipt_proof_url') THEN
        ALTER TABLE tiss_batches ADD COLUMN receipt_proof_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'dispatch_channel') THEN
        ALTER TABLE tiss_batches ADD COLUMN dispatch_channel VARCHAR(30) DEFAULT 'PORTAL';
    END IF;
END $$;

-- 5. Habilitar RLS em Todas as Tabelas de Recurso
ALTER TABLE tiss_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_appeal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_appeal_attachments ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Segurança RLS com Isolamento Estrito de Clínica
DROP POLICY IF EXISTS "tiss_appeals_clinic_isolation" ON tiss_appeals;
CREATE POLICY "tiss_appeals_clinic_isolation" ON tiss_appeals
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
    WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "tiss_appeal_items_clinic_isolation" ON tiss_appeal_items;
CREATE POLICY "tiss_appeal_items_clinic_isolation" ON tiss_appeal_items
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
    WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "tiss_appeal_attachments_clinic_isolation" ON tiss_appeal_attachments;
CREATE POLICY "tiss_appeal_attachments_clinic_isolation" ON tiss_appeal_attachments
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
    WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ==============================================================================
-- ROLLBACK:
-- ==============================================================================
-- DROP POLICY IF EXISTS "tiss_appeal_attachments_clinic_isolation" ON tiss_appeal_attachments;
-- DROP POLICY IF EXISTS "tiss_appeal_items_clinic_isolation" ON tiss_appeal_items;
-- DROP POLICY IF EXISTS "tiss_appeals_clinic_isolation" ON tiss_appeals;
-- ALTER TABLE tiss_glosa_contests DROP COLUMN IF EXISTS appeal_id;
-- ALTER TABLE tiss_return_imports DROP COLUMN IF EXISTS dry_run_token;
-- DROP TABLE IF EXISTS tiss_appeal_attachments;
-- DROP TABLE IF EXISTS tiss_appeal_items;
-- DROP TABLE IF EXISTS tiss_appeals;
