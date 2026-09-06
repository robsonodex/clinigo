-- ====================================================================
-- Migration: Create feature_suggestions table
-- Permite que usuários e clínicas sugiram novas funcionalidades ao CliniGo
-- ====================================================================

CREATE TABLE IF NOT EXISTS feature_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    clinic_name TEXT,
    user_name TEXT NOT NULL,
    user_email TEXT,
    user_phone TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_REVIEW', 'PLANNED', 'COMPLETED', 'DECLINED')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_clinic ON feature_suggestions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_status ON feature_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_created_at ON feature_suggestions(created_at DESC);

-- Habilitar RLS
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários autenticados podem enviar sugestões"
    ON feature_suggestions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuários podem ver sugestões de sua clínica"
    ON feature_suggestions
    FOR SELECT
    TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );
