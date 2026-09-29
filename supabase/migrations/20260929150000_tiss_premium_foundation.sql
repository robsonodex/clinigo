-- ==============================================================================
-- MIGRATION: 20260929150000_tiss_premium_foundation.sql
-- Descrição: Fundação do Módulo de Faturamento Premium (Fase B1):
--            1. Contador atômico de numeração de guias por clínica e ano sob lock (B1.5)
--            2. Colunas de exclusão lógica (deleted_at) e concorrência otimista (version) (B1.6 / B1.7)
--            3. Metadados de fechamento e reabertura de lotes (B1.2 / Seção 4)
--            4. Tabela versionada de XML de lotes (L4)
--            5. Tabela de modelos de justificativa de recursos (C9)
--            6. Habilitação de RLS e políticas por clinic_id
-- Data: 29/09/2026
-- Idempotente (IF NOT EXISTS), sem DROP de dados.
-- Como reverter: Ver instruções no final do arquivo (-- ROLLBACK:).
-- ==============================================================================

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Contadores Atômicos de Guias (B1.5 - Eliminação de Race Condition)
CREATE TABLE IF NOT EXISTS tiss_guide_counters (
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    year INT NOT NULL,
    current_value INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (clinic_id, year)
);

CREATE INDEX IF NOT EXISTS idx_tiss_guide_counters_lookup 
ON tiss_guide_counters(clinic_id, year);

-- 3. Função SQL Atômica para Geração de Número Sequencial da Guia sob Lock (FOR UPDATE)
CREATE OR REPLACE FUNCTION generate_tiss_guide_number(p_clinic_id UUID, p_year INT)
RETURNS TEXT AS $$
DECLARE
    v_next_val INT;
    v_year_str TEXT := p_year::TEXT;
    v_formatted_num TEXT;
BEGIN
    -- Bloqueio exclusivo na linha da clínica/ano para garantir atomicidade sob concorrência
    SELECT current_value + 1 INTO v_next_val
    FROM tiss_guide_counters
    WHERE clinic_id = p_clinic_id AND year = p_year
    FOR UPDATE;

    IF v_next_val IS NULL THEN
        -- Primeira inserção do ano para a clínica: inicializa a partir do maior existente ou 1
        SELECT COALESCE(
            MAX(
                CASE 
                    WHEN guide_number ~ '^[0-9]+$' AND LENGTH(guide_number) >= 10 
                    THEN SUBSTRING(guide_number FROM 5)::INT 
                    ELSE 0 
                END
            ), 0
        ) + 1 INTO v_next_val
        FROM tiss_guides
        WHERE clinic_id = p_clinic_id 
          AND created_at >= MAKE_DATE(p_year, 1, 1)::TIMESTAMP WITH TIME ZONE
          AND created_at < MAKE_DATE(p_year + 1, 1, 1)::TIMESTAMP WITH TIME ZONE;

        IF v_next_val IS NULL OR v_next_val < 1 THEN
            v_next_val := 1;
        END IF;

        INSERT INTO tiss_guide_counters (clinic_id, year, current_value, updated_at)
        VALUES (p_clinic_id, p_year, v_next_val, NOW())
        ON CONFLICT (clinic_id, year) DO UPDATE
        SET current_value = tiss_guide_counters.current_value + 1,
            updated_at = NOW()
        RETURNING current_value INTO v_next_val;
    ELSE
        UPDATE tiss_guide_counters
        SET current_value = v_next_val,
            updated_at = NOW()
        WHERE clinic_id = p_clinic_id AND year = p_year;
    END IF;

    -- Formato regulamentar: AAAA + Sequencial de 6 dígitos com padding (ex: 2026000001)
    v_formatted_num := v_year_str || LPAD(v_next_val::TEXT, 6, '0');
    RETURN v_formatted_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Extensões em tiss_guides (Exclusão Lógica e Bloqueio Otimista)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'deleted_at') THEN
        ALTER TABLE tiss_guides ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'deleted_by') THEN
        ALTER TABLE tiss_guides ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'version') THEN
        ALTER TABLE tiss_guides ADD COLUMN version INT NOT NULL DEFAULT 1;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tiss_guides_active 
ON tiss_guides(clinic_id, deleted_at) 
WHERE deleted_at IS NULL;

-- 5. Extensões em tiss_batches (Bloqueio Otimista, Fechamento e Integridade)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'version') THEN
        ALTER TABLE tiss_batches ADD COLUMN version INT NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'closed_at') THEN
        ALTER TABLE tiss_batches ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'closed_by') THEN
        ALTER TABLE tiss_batches ADD COLUMN closed_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'reopen_reason') THEN
        ALTER TABLE tiss_batches ADD COLUMN reopen_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'checksum') THEN
        ALTER TABLE tiss_batches ADD COLUMN checksum TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'requires_double_check') THEN
        ALTER TABLE tiss_batches ADD COLUMN requires_double_check BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'approved_by') THEN
        ALTER TABLE tiss_batches ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'approved_at') THEN
        ALTER TABLE tiss_batches ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 6. Extensões em tiss_glosa_contests (Bloqueio Otimista e Versionamento)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_glosa_contests' AND column_name = 'version') THEN
        ALTER TABLE tiss_glosa_contests ADD COLUMN version INT NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_glosa_contests' AND column_name = 'deleted_at') THEN
        ALTER TABLE tiss_glosa_contests ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_glosa_contests' AND column_name = 'status_history') THEN
        ALTER TABLE tiss_glosa_contests ADD COLUMN status_history JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 7. Tabela de Versões de XML do Lote (L4 - Histórico Imutável de XML Gerado)
CREATE TABLE IF NOT EXISTS tiss_batch_xml_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_batch_xml_versions_batch 
ON tiss_batch_xml_versions(batch_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_batch_xml_versions_clinic 
ON tiss_batch_xml_versions(clinic_id);

-- 8. Tabela de Modelos de Justificativa de Recurso de Glosa (C9)
CREATE TABLE IF NOT EXISTS tiss_appeal_justification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    template_text TEXT NOT NULL,
    glosa_code VARCHAR(10),
    health_insurance_id UUID REFERENCES health_insurances(id) ON DELETE SET NULL,
    usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appeal_templates_clinic 
ON tiss_appeal_justification_templates(clinic_id, is_active);

CREATE INDEX IF NOT EXISTS idx_appeal_templates_code 
ON tiss_appeal_justification_templates(clinic_id, glosa_code);

-- 9. Habilitação de RLS em Todas as Novas Tabelas
ALTER TABLE tiss_guide_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_batch_xml_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_appeal_justification_templates ENABLE ROW LEVEL SECURITY;

-- 10. Políticas de RLS Multi-tenant
DROP POLICY IF EXISTS "tiss_guide_counters_clinic_isolation" ON tiss_guide_counters;
CREATE POLICY "tiss_guide_counters_clinic_isolation" ON tiss_guide_counters
    FOR ALL
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tiss_batch_xml_versions_clinic_isolation" ON tiss_batch_xml_versions;
CREATE POLICY "tiss_batch_xml_versions_clinic_isolation" ON tiss_batch_xml_versions
    FOR ALL
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tiss_appeal_templates_clinic_isolation" ON tiss_appeal_justification_templates;
CREATE POLICY "tiss_appeal_templates_clinic_isolation" ON tiss_appeal_justification_templates
    FOR ALL
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- ==============================================================================
-- ROLLBACK:
-- Para reverter esta migration de forma limpa caso necessário:
--
-- DROP POLICY IF EXISTS "tiss_appeal_templates_clinic_isolation" ON tiss_appeal_justification_templates;
-- DROP POLICY IF EXISTS "tiss_batch_xml_versions_clinic_isolation" ON tiss_batch_xml_versions;
-- DROP POLICY IF EXISTS "tiss_guide_counters_clinic_isolation" ON tiss_guide_counters;
-- DROP TABLE IF EXISTS tiss_appeal_justification_templates;
-- DROP TABLE IF EXISTS tiss_batch_xml_versions;
-- DROP FUNCTION IF EXISTS generate_tiss_guide_number(UUID, INT);
-- DROP TABLE IF EXISTS tiss_guide_counters;
-- ALTER TABLE tiss_guides DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE tiss_guides DROP COLUMN IF EXISTS deleted_by;
-- ALTER TABLE tiss_guides DROP COLUMN IF EXISTS version;
-- ALTER TABLE tiss_batches DROP COLUMN IF EXISTS version;
-- ALTER TABLE tiss_batches DROP COLUMN IF EXISTS closed_at;
-- ALTER TABLE tiss_batches DROP COLUMN IF EXISTS closed_by;
-- ALTER TABLE tiss_batches DROP COLUMN IF EXISTS reopen_reason;
-- ALTER TABLE tiss_batches DROP COLUMN IF EXISTS checksum;
-- ALTER TABLE tiss_batches DROP COLUMN IF EXISTS requires_double_check;
-- ALTER TABLE tiss_batches DROP COLUMN IF EXISTS approved_by;
-- ALTER TABLE tiss_batches DROP COLUMN IF EXISTS approved_at;
-- ALTER TABLE tiss_glosa_contests DROP COLUMN IF EXISTS version;
-- ALTER TABLE tiss_glosa_contests DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE tiss_glosa_contests DROP COLUMN IF EXISTS status_history;
-- ==============================================================================
