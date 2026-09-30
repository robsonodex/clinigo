-- Migration: 20260930100000_create_patient_intake_module.sql
-- Módulo: Pré-cadastros (ficha de cadastro por link)
-- Descrição: Links de intake, submissões, arquivos e auditoria — multitenant por clinic_id
-- Data: 2026-09-30

-- =============================================
-- 1. patient_intake_links
-- =============================================
CREATE TABLE IF NOT EXISTS patient_intake_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    lead_name TEXT,
    lead_phone TEXT,
    status TEXT NOT NULL DEFAULT 'created'
        CHECK (status IN ('created', 'sent', 'opened', 'submitted', 'expired', 'cancelled')),
    is_static BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intake_links_token_hash ON patient_intake_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_intake_links_clinic_status ON patient_intake_links(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_intake_links_clinic_static ON patient_intake_links(clinic_id, is_static) WHERE is_static = true;

COMMENT ON TABLE patient_intake_links IS 'Links de pré-cadastro enviados a pacientes para preenchimento remoto';
COMMENT ON COLUMN patient_intake_links.token_hash IS 'SHA-256 do token aleatório — nunca armazenar o token puro';

-- =============================================
-- 2. patient_intake_submissions
-- =============================================
CREATE TABLE IF NOT EXISTS patient_intake_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    link_id UUID NOT NULL REFERENCES patient_intake_links(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'needs_correction', 'approved', 'cancelled')),
    original_data JSONB NOT NULL DEFAULT '{}',
    edited_data JSONB,
    cancel_reason TEXT,
    correction_note TEXT,
    approved_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    consent JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_clinic_status ON patient_intake_submissions(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_link ON patient_intake_submissions(link_id);

COMMENT ON TABLE patient_intake_submissions IS 'Fichas enviadas por pacientes via link de pré-cadastro';
COMMENT ON COLUMN patient_intake_submissions.consent IS 'Aceite LGPD: texto versionado, timestamp, IP, user-agent, hash SHA-256';

-- =============================================
-- 3. patient_intake_files
-- =============================================
CREATE TABLE IF NOT EXISTS patient_intake_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES patient_intake_submissions(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('carteirinha_frente', 'carteirinha_verso')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_files_submission ON patient_intake_files(submission_id);

COMMENT ON TABLE patient_intake_files IS 'Fotos de carteirinha anexadas ao pré-cadastro';

-- =============================================
-- 4. patient_intake_audit
-- =============================================
CREATE TABLE IF NOT EXISTS patient_intake_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    link_id UUID REFERENCES patient_intake_links(id) ON DELETE SET NULL,
    submission_id UUID REFERENCES patient_intake_submissions(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    actor_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_audit_clinic ON patient_intake_audit(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_audit_link ON patient_intake_audit(link_id);

COMMENT ON TABLE patient_intake_audit IS 'Log de eventos do módulo de pré-cadastro — sem dados pessoais do paciente';

-- =============================================
-- 5. RLS — Isolamento por clinic_id
-- =============================================

-- patient_intake_links
ALTER TABLE patient_intake_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intake_links_select" ON patient_intake_links;
CREATE POLICY "intake_links_select" ON patient_intake_links
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_links_insert" ON patient_intake_links;
CREATE POLICY "intake_links_insert" ON patient_intake_links
    FOR INSERT TO authenticated
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_links_update" ON patient_intake_links;
CREATE POLICY "intake_links_update" ON patient_intake_links
    FOR UPDATE TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_links_delete" ON patient_intake_links;
CREATE POLICY "intake_links_delete" ON patient_intake_links
    FOR DELETE TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- patient_intake_submissions
ALTER TABLE patient_intake_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intake_submissions_select" ON patient_intake_submissions;
CREATE POLICY "intake_submissions_select" ON patient_intake_submissions
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_submissions_insert" ON patient_intake_submissions;
CREATE POLICY "intake_submissions_insert" ON patient_intake_submissions
    FOR INSERT TO authenticated
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_submissions_update" ON patient_intake_submissions;
CREATE POLICY "intake_submissions_update" ON patient_intake_submissions
    FOR UPDATE TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_submissions_delete" ON patient_intake_submissions;
CREATE POLICY "intake_submissions_delete" ON patient_intake_submissions
    FOR DELETE TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- patient_intake_files
ALTER TABLE patient_intake_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intake_files_select" ON patient_intake_files;
CREATE POLICY "intake_files_select" ON patient_intake_files
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_files_insert" ON patient_intake_files;
CREATE POLICY "intake_files_insert" ON patient_intake_files
    FOR INSERT TO authenticated
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_files_delete" ON patient_intake_files;
CREATE POLICY "intake_files_delete" ON patient_intake_files
    FOR DELETE TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- patient_intake_audit
ALTER TABLE patient_intake_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intake_audit_select" ON patient_intake_audit;
CREATE POLICY "intake_audit_select" ON patient_intake_audit
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_audit_insert" ON patient_intake_audit;
CREATE POLICY "intake_audit_insert" ON patient_intake_audit
    FOR INSERT TO authenticated
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- =============================================
-- 6. Trigger: updated_at em submissions
-- =============================================
CREATE OR REPLACE FUNCTION update_patient_intake_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_intake_submissions_updated_at ON patient_intake_submissions;
CREATE TRIGGER trg_intake_submissions_updated_at
    BEFORE UPDATE ON patient_intake_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_intake_submissions_updated_at();

-- =============================================
-- 7. Storage: bucket privado para fotos de carteirinha
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'intake-files',
    'intake-files',
    false,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: apenas usuários autenticados da mesma clínica
DROP POLICY IF EXISTS "intake_files_storage_select" ON storage.objects;
CREATE POLICY "intake_files_storage_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'intake-files'
        AND (storage.foldername(name))[1] IN (
            SELECT clinic_id::text FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_files_storage_insert" ON storage.objects;
CREATE POLICY "intake_files_storage_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'intake-files'
        AND (storage.foldername(name))[1] IN (
            SELECT clinic_id::text FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "intake_files_storage_delete" ON storage.objects;
CREATE POLICY "intake_files_storage_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'intake-files'
        AND (storage.foldername(name))[1] IN (
            SELECT clinic_id::text FROM users WHERE id = auth.uid()
        )
    );
