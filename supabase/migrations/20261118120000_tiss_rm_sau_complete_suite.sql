-- ==============================================================================
-- MIGRATION: 20261118120000_tiss_rm_sau_complete_suite.sql
-- Descrição: Reconciliação idempotente do núcleo TISS/Convênios/Recursos (20260929-20260930)
--            e implantação completa da Suíte Padrão TOTVS RM Saúde + CliniGo:
--            1) Ponte Recepção/Autorizações -> Elaboração de Contas (4 grupos)
--            2) Remessas XML e Anexos TISS-ANS
--            3) Controle de Glosas em 3 Níveis (Lote -> Contas -> Itens/Grupos + Irrecuperável + Batimento)
--            4) Catálogos Oficiais TUSS e Tabela 38 ANS (sem dados fictícios)
--            5) RLS Multi-Tenant estrito (get_user_clinic_id() / is_super_admin())
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Reconciliação TUSS Procedures (Catálogo Global)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tuss_procedures') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tuss_procedures' AND column_name = 'type') THEN
            ALTER TABLE tuss_procedures ALTER COLUMN type SET DEFAULT 'PROCEDIMENTO';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tuss_procedures' AND column_name = 'status') THEN
            ALTER TABLE tuss_procedures ALTER COLUMN status SET DEFAULT 'ACTIVE';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tuss_procedures' AND column_name = 'category') THEN
            ALTER TABLE tuss_procedures ADD COLUMN category VARCHAR(50) DEFAULT 'CONSULTA';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tuss_procedures' AND column_name = 'item_group') THEN
            ALTER TABLE tuss_procedures ADD COLUMN item_group VARCHAR(30) NOT NULL DEFAULT 'HONORARIOS';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tuss_procedures' AND column_name = 'source') THEN
            ALTER TABLE tuss_procedures ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT 'OFICIAL_ANS';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tuss_procedures' AND column_name = 'is_active') THEN
            ALTER TABLE tuss_procedures ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'public.tuss_procedures'::regclass
              AND contype = 'u'
        ) THEN
            BEGIN
                ALTER TABLE tuss_procedures ADD CONSTRAINT uq_tuss_procedures_code UNIQUE (code);
            EXCEPTION WHEN duplicate_table THEN NULL;
            END;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tuss_procedures_code ON tuss_procedures(code);

-- Catálogo base oficial TUSS (código oficial ANS — sem dados fictícios)
INSERT INTO tuss_procedures (code, description, type, status, category, item_group, source, is_active) VALUES
('10101012', 'Consulta em consultório (no horário normal ou preestabelecido)', 'CONSULTA', 'ACTIVE', 'CONSULTA', 'HONORARIOS', 'OFICIAL_ANS', true),
('10101020', 'Consulta em domicílio', 'CONSULTA', 'ACTIVE', 'CONSULTA', 'HONORARIOS', 'OFICIAL_ANS', true),
('10101039', 'Consulta em pronto socorro', 'CONSULTA', 'ACTIVE', 'CONSULTA', 'HONORARIOS', 'OFICIAL_ANS', true),
('20104049', 'Sessão de psicoterapia individual', 'TERAPIA', 'ACTIVE', 'TERAPIA', 'HONORARIOS', 'OFICIAL_ANS', true),
('20104081', 'Sessão de fonoterapia', 'TERAPIA', 'ACTIVE', 'TERAPIA', 'HONORARIOS', 'OFICIAL_ANS', true),
('20104090', 'Sessão de terapia ocupacional', 'TERAPIA', 'ACTIVE', 'TERAPIA', 'HONORARIOS', 'OFICIAL_ANS', true),
('20104103', 'Sessão de fisioterapia motora', 'TERAPIA', 'ACTIVE', 'TERAPIA', 'HONORARIOS', 'OFICIAL_ANS', true),
('20104111', 'Sessão de fisioterapia respiratória', 'TERAPIA', 'ACTIVE', 'TERAPIA', 'HONORARIOS', 'OFICIAL_ANS', true),
('20104120', 'Sessão de reabilitação neurológica', 'TERAPIA', 'ACTIVE', 'TERAPIA', 'HONORARIOS', 'OFICIAL_ANS', true),
('40101010', 'Eletrocardiograma convencional de até 12 derivações', 'EXAME', 'ACTIVE', 'EXAME', 'DIAGNOSE', 'OFICIAL_ANS', true),
('50000144', 'Sessão de psicopedagogia / neuropsicopedagogia', 'TERAPIA', 'ACTIVE', 'TERAPIA', 'HONORARIOS', 'OFICIAL_ANS', true)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Tabela de Preços por Clínica, Operadora e Plano
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_insurance_price_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    health_insurance_id UUID NOT NULL REFERENCES health_insurances(id) ON DELETE CASCADE,
    health_insurance_plan_id UUID REFERENCES health_insurance_plans(id) ON DELETE CASCADE,
    tuss_code VARCHAR(15) NOT NULL,
    procedure_name TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    copay_amount DECIMAL(10,2) DEFAULT 0.00,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    requires_authorization BOOLEAN NOT NULL DEFAULT false,
    max_sessions_per_year INT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_clinic_insurance_plan_tuss UNIQUE (clinic_id, health_insurance_id, health_insurance_plan_id, tuss_code)
);

CREATE INDEX IF NOT EXISTS idx_hi_price_tables_clinic ON health_insurance_price_tables(clinic_id);
CREATE INDEX IF NOT EXISTS idx_hi_price_tables_insurance ON health_insurance_price_tables(health_insurance_id);
CREATE INDEX IF NOT EXISTS idx_hi_price_tables_plan ON health_insurance_price_tables(health_insurance_plan_id);
CREATE INDEX IF NOT EXISTS idx_hi_price_tables_lookup ON health_insurance_price_tables(clinic_id, health_insurance_id, tuss_code);

-- ------------------------------------------------------------------------------
-- 3. Catálogo Oficial de Motivos de Glosa ANS (Tabela 38)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tiss_glosa_reasons_ans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'ADMINISTRATIVA',
    source VARCHAR(30) NOT NULL DEFAULT 'OFICIAL_ANS_T38',
    can_appeal_default BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiss_glosa_reasons_code ON tiss_glosa_reasons_ans(code);

INSERT INTO tiss_glosa_reasons_ans (code, description, category, source, can_appeal_default) VALUES
('1001', 'Número da carteira do beneficiário inválido', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1002', 'Beneficiário com atendimento cancelado ou bloqueado', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1003', 'Beneficiário fora de abrangência geográfica do plano', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1005', 'Atendimento anterior à inclusão do beneficiário', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', false),
('1006', 'Atendimento posterior ao cancelamento do beneficiário', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', false),
('1201', 'Atendimento em carência do beneficiário', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1202', 'Número da carteira não pertence ao beneficiário informado', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1302', 'Guia já apresentada anteriormente em outro lote (duplicidade)', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1305', 'Procedimento não coberto pelo plano do beneficiário', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1401', 'Procedimento exige autorização prévia e a senha não foi informada', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1402', 'Senha de autorização expirada ou vencida', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1403', 'Senha de autorização não corresponde ao procedimento cobrado', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1409', 'Quantidade executada excede a quantidade autorizada', 'TECNICA', 'OFICIAL_ANS_T38', true),
('1701', 'Cobrança em duplicidade do mesmo procedimento na mesma data', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1702', 'Guia com data de atendimento fora da vigência contratual', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1705', 'Valor cobrado superior ao acordado em tabela contratada', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1714', 'Cobrança de taxa ou procedimento já incluso no pacote contratado', 'TECNICA', 'OFICIAL_ANS_T38', true),
('1801', 'Código de procedimento TUSS inválido ou inexistente', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('1802', 'Procedimento incompatível com sexo ou faixa etária do beneficiário', 'TECNICA', 'OFICIAL_ANS_T38', true),
('2001', 'Divergência entre quantidade/valor cobrado e tabela da operadora', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('2002', 'Taxa administrativa ou material não previsto em contrato', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('2201', 'Ausência de assinatura ou comprovação de comparecimento do beneficiário', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('2401', 'Quantidade de sessões excede o limite técnico mensal/anual do plano', 'TECNICA', 'OFICIAL_ANS_T38', true),
('2501', 'Ausência de justificativa clínica ou relatório técnico', 'TECNICA', 'OFICIAL_ANS_T38', true),
('2503', 'Evolução clínica incompatível com o procedimento cobrado', 'TECNICA', 'OFICIAL_ANS_T38', true),
('2601', 'Material ou medicamento sem prescrição ou nota técnica vinculada', 'TECNICA', 'OFICIAL_ANS_T38', true),
('2901', 'Profissional executante sem vínculo ou habilitação para o procedimento', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true),
('3001', 'Reapresentação de guia fora do prazo contratual de envio', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', false),
('9999', 'Outras glosas / motivo especificado em observação da operadora', 'ADMINISTRATIVA', 'OFICIAL_ANS_T38', true)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. Extensões em clinics, health_insurances e tiss_authorization_requests
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'repasse_regime') THEN
        ALTER TABLE clinics ADD COLUMN repasse_regime VARCHAR(20) NOT NULL DEFAULT 'PRODUCAO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'glosa_policy') THEN
        ALTER TABLE clinics ADD COLUMN glosa_policy VARCHAR(30) NOT NULL DEFAULT 'CLINICA_ABSORVE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'tiss_hash_algorithm') THEN
        ALTER TABLE clinics ADD COLUMN tiss_hash_algorithm VARCHAR(30) NOT NULL DEFAULT 'LEGACY_SHA256_JSON';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_insurances' AND column_name = 'closing_day') THEN
        ALTER TABLE health_insurances ADD COLUMN closing_day INT DEFAULT 25;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_insurances' AND column_name = 'appeal_deadline_days') THEN
        ALTER TABLE health_insurances ADD COLUMN appeal_deadline_days INT DEFAULT 30;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_authorization_requests' AND column_name = 'sessions_authorized') THEN
        ALTER TABLE tiss_authorization_requests ADD COLUMN sessions_authorized INT NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_authorization_requests' AND column_name = 'sessions_used') THEN
        ALTER TABLE tiss_authorization_requests ADD COLUMN sessions_used INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_authorization_requests' AND column_name = 'procedure_code') THEN
        ALTER TABLE tiss_authorization_requests ADD COLUMN procedure_code VARCHAR(20);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Extensões em tiss_guides (Elaboração de Contas, Ponte Recepção e Auditoria)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Colunas reconciliadas de migrações 20260929*
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'copay_value') THEN
        ALTER TABLE tiss_guides ADD COLUMN copay_value DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'paid_value') THEN
        ALTER TABLE tiss_guides ADD COLUMN paid_value DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'biometric_proof_id') THEN
        ALTER TABLE tiss_guides ADD COLUMN biometric_proof_id UUID REFERENCES patient_face_biometrics(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'term_signature_id') THEN
        ALTER TABLE tiss_guides ADD COLUMN term_signature_id UUID REFERENCES patient_term_signatures(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'status_history') THEN
        ALTER TABLE tiss_guides ADD COLUMN status_history JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE tiss_guides ADD COLUMN cancellation_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'cancelled_at') THEN
        ALTER TABLE tiss_guides ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'cancelled_by') THEN
        ALTER TABLE tiss_guides ADD COLUMN cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Novas colunas Padrão TOTVS RM Saúde (Elaboração / Liberação de Contas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'health_insurance_id') THEN
        ALTER TABLE tiss_guides ADD COLUMN health_insurance_id UUID REFERENCES health_insurances(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'billing_stage') THEN
        ALTER TABLE tiss_guides ADD COLUMN billing_stage VARCHAR(30) NOT NULL DEFAULT 'ELABORACAO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'released_at') THEN
        ALTER TABLE tiss_guides ADD COLUMN released_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'released_by') THEN
        ALTER TABLE tiss_guides ADD COLUMN released_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'authorization_request_id') THEN
        ALTER TABLE tiss_guides ADD COLUMN authorization_request_id UUID REFERENCES tiss_authorization_requests(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guides' AND column_name = 'account_notes') THEN
        ALTER TABLE tiss_guides ADD COLUMN account_notes TEXT;
    END IF;
END $$;

-- Relaxa constraint legada total_value = unit_value * procedure_quantity para suportar múltiplos itens por conta em 4 grupos
ALTER TABLE tiss_guides DROP CONSTRAINT IF EXISTS tiss_guides_check;

-- Garante índice condicional idempotente para ponte automática de atendimento
DO $$
DECLARE
    dup_count INT := 0;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT clinic_id, appointment_id, procedure_code
        FROM tiss_guides
        WHERE appointment_id IS NOT NULL
          AND status NOT IN ('CANCELLED', 'CANCELED')
          AND deleted_at IS NULL
        GROUP BY clinic_id, appointment_id, procedure_code
        HAVING COUNT(*) > 1
    ) d;

    IF dup_count = 0 THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_tiss_guides_appointment_proc
        ON tiss_guides(clinic_id, appointment_id, procedure_code)
        WHERE appointment_id IS NOT NULL AND status NOT IN ('CANCELLED', 'CANCELED') AND deleted_at IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tiss_guides_clinic_billing_stage ON tiss_guides(clinic_id, billing_stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tiss_guides_health_insurance ON tiss_guides(health_insurance_id);
CREATE INDEX IF NOT EXISTS idx_tiss_guides_auth_req ON tiss_guides(authorization_request_id);

-- Backfill seguro de billing_stage para guias já existentes conforme status atual
UPDATE tiss_guides
SET billing_stage = CASE
    WHEN status IN ('PAID', 'PARTIALLY_GLOSED', 'TOTALLY_GLOSED', 'APPROVED', 'DENIED', 'FINISHED') THEN 'FINALIZADA'
    WHEN status IN ('SENT', 'APPEALING') THEN 'FATURADA'
    WHEN batch_id IS NOT NULL THEN 'EM_LOTE'
    WHEN status IN ('VALIDATED', 'IN_BATCH') THEN 'LIBERADA'
    ELSE 'ELABORACAO'
END
WHERE billing_stage = 'ELABORACAO'
  AND (batch_id IS NOT NULL OR status IN ('VALIDATED', 'IN_BATCH', 'SENT', 'PAID', 'PARTIALLY_GLOSED', 'TOTALLY_GLOSED', 'APPROVED', 'DENIED', 'APPEALING', 'FINISHED'));

-- ------------------------------------------------------------------------------
-- 6. Extensões em tiss_guide_procedures (4 Grupos de Conta)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'clinic_id') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'item_group') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN item_group VARCHAR(30) NOT NULL DEFAULT 'HONORARIOS';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'unit_measure') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN unit_measure VARCHAR(20) NOT NULL DEFAULT 'UN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'status') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'approved_quantity') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN approved_quantity DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'approved_unit_value') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN approved_unit_value DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'approved_total_value') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN approved_total_value DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'glosa_value') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN glosa_value DECIMAL(10,2) NOT NULL DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'is_irrecoverable') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN is_irrecoverable BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_guide_procedures' AND column_name = 'updated_at') THEN
        ALTER TABLE tiss_guide_procedures ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

UPDATE tiss_guide_procedures p
SET clinic_id = g.clinic_id
FROM tiss_guides g
WHERE p.guide_id = g.id
  AND p.clinic_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tiss_guide_proc_clinic ON tiss_guide_procedures(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tiss_guide_proc_guide_group ON tiss_guide_procedures(guide_id, item_group);

-- ------------------------------------------------------------------------------
-- 7. Extensões em tiss_batches e tiss_return_imports (Remessas & Nível 1 Glosas)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'dispatch_channel') THEN
        ALTER TABLE tiss_batches ADD COLUMN dispatch_channel VARCHAR(30) DEFAULT 'PORTAL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'receipt_proof_url') THEN
        ALTER TABLE tiss_batches ADD COLUMN receipt_proof_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'file_hash') THEN
        ALTER TABLE tiss_batches ADD COLUMN file_hash VARCHAR(64);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'hash_algorithm') THEN
        ALTER TABLE tiss_batches ADD COLUMN hash_algorithm TEXT DEFAULT 'LEGACY_SHA256_JSON';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'hash_value') THEN
        ALTER TABLE tiss_batches ADD COLUMN hash_value TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'review_status') THEN
        ALTER TABLE tiss_batches ADD COLUMN review_status VARCHAR(30) NOT NULL DEFAULT 'NAO_INICIADA';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'care_type') THEN
        ALTER TABLE tiss_batches ADD COLUMN care_type VARCHAR(40) NOT NULL DEFAULT 'AMBULATORIAL_TERAPIAS';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'return_analysis_xml_url') THEN
        ALTER TABLE tiss_batches ADD COLUMN return_analysis_xml_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'return_payment_xml_url') THEN
        ALTER TABLE tiss_batches ADD COLUMN return_payment_xml_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'last_reviewed_at') THEN
        ALTER TABLE tiss_batches ADD COLUMN last_reviewed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'last_reviewed_by') THEN
        ALTER TABLE tiss_batches ADD COLUMN last_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'expected_glosa_total') THEN
        ALTER TABLE tiss_batches ADD COLUMN expected_glosa_total DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batches' AND column_name = 'entered_glosa_total') THEN
        ALTER TABLE tiss_batches ADD COLUMN entered_glosa_total DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tiss_batches_clinic_review ON tiss_batches(clinic_id, review_status);

CREATE TABLE IF NOT EXISTS tiss_return_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES tiss_batches(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_type VARCHAR(10) NOT NULL DEFAULT 'XML',
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    dry_run_token VARCHAR(64),
    total_guides_file INT NOT NULL DEFAULT 0,
    total_matched INT NOT NULL DEFAULT 0,
    total_unmatched INT NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    amount_glosa DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiss_return_imports_clinic ON tiss_return_imports(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tiss_return_imports_batch ON tiss_return_imports(batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tiss_return_file_hash_active
ON tiss_return_imports (clinic_id, file_hash)
WHERE status != 'CANCELLED';

-- Garante colunas de tiss_batch_xml_versions se existentes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiss_batch_xml_versions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batch_xml_versions' AND column_name = 'validation_status') THEN
            ALTER TABLE tiss_batch_xml_versions ADD COLUMN validation_status TEXT DEFAULT 'PENDING';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_batch_xml_versions' AND column_name = 'errors_count') THEN
            ALTER TABLE tiss_batch_xml_versions ADD COLUMN errors_count INT DEFAULT 0;
        END IF;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. Extensões em tiss_glosas (Nível 3 TOTVS RM Saúde + Glosa Irrecuperável)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'received_at') THEN
        ALTER TABLE tiss_glosas ALTER COLUMN received_at SET DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'status') THEN
        ALTER TABLE tiss_glosas ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'OPEN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'deleted_at') THEN
        ALTER TABLE tiss_glosas ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'deleted_by') THEN
        ALTER TABLE tiss_glosas ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'notes') THEN
        ALTER TABLE tiss_glosas ADD COLUMN notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'contest_deadline') THEN
        ALTER TABLE tiss_glosas ADD COLUMN contest_deadline DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'procedure_id') THEN
        ALTER TABLE tiss_glosas ADD COLUMN procedure_id UUID REFERENCES tiss_guide_procedures(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'item_code') THEN
        ALTER TABLE tiss_glosas ADD COLUMN item_code VARCHAR(30);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'item_description') THEN
        ALTER TABLE tiss_glosas ADD COLUMN item_description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'item_group') THEN
        ALTER TABLE tiss_glosas ADD COLUMN item_group VARCHAR(30) DEFAULT 'HONORARIOS';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'billed_quantity') THEN
        ALTER TABLE tiss_glosas ADD COLUMN billed_quantity DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'billed_unit_value') THEN
        ALTER TABLE tiss_glosas ADD COLUMN billed_unit_value DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'approved_quantity') THEN
        ALTER TABLE tiss_glosas ADD COLUMN approved_quantity DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'approved_unit_value') THEN
        ALTER TABLE tiss_glosas ADD COLUMN approved_unit_value DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'is_irrecoverable') THEN
        ALTER TABLE tiss_glosas ADD COLUMN is_irrecoverable BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'irrecoverable_quantity') THEN
        ALTER TABLE tiss_glosas ADD COLUMN irrecoverable_quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'irrecoverable_value') THEN
        ALTER TABLE tiss_glosas ADD COLUMN irrecoverable_value DECIMAL(10,2) NOT NULL DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'observation') THEN
        ALTER TABLE tiss_glosas ADD COLUMN observation TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'control_date') THEN
        ALTER TABLE tiss_glosas ADD COLUMN control_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'reviewer_user_id') THEN
        ALTER TABLE tiss_glosas ADD COLUMN reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosas' AND column_name = 'review_completed_at') THEN
        ALTER TABLE tiss_glosas ADD COLUMN review_completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tiss_glosas_clinic_status ON tiss_glosas(clinic_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tiss_glosas_batch_active ON tiss_glosas(clinic_id, batch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tiss_glosas_guide_active ON tiss_glosas(clinic_id, guide_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tiss_glosas_procedure ON tiss_glosas(procedure_id);

-- ------------------------------------------------------------------------------
-- 9. Reconciliação tiss_appeals, tiss_appeal_items, tiss_appeal_attachments (C1-C8)
-- ------------------------------------------------------------------------------
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
    dossier_url TEXT,
    appeal_xml_content TEXT,
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiss_appeals_clinic_status ON tiss_appeals(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_tiss_appeals_insurance ON tiss_appeals(clinic_id, health_insurance_id);

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

CREATE INDEX IF NOT EXISTS idx_tiss_appeal_items_clinic ON tiss_appeal_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tiss_appeal_items_appeal ON tiss_appeal_items(appeal_id);
CREATE INDEX IF NOT EXISTS idx_tiss_appeal_items_glosa ON tiss_appeal_items(glosa_id);
CREATE INDEX IF NOT EXISTS idx_tiss_appeal_items_guide ON tiss_appeal_items(guide_id);

CREATE TABLE IF NOT EXISTS tiss_appeal_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    appeal_id UUID NOT NULL REFERENCES tiss_appeals(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    source_type VARCHAR(20) NOT NULL DEFAULT 'UPLOAD',
    source_document_id UUID,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiss_appeal_attachments_clinic ON tiss_appeal_attachments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tiss_appeal_attachments_appeal ON tiss_appeal_attachments(appeal_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tiss_glosa_contests' AND column_name = 'appeal_id') THEN
        ALTER TABLE tiss_glosa_contests ADD COLUMN appeal_id UUID REFERENCES tiss_appeals(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 10. RLS Multi-Tenant Estrito em Todas as Tabelas Novas/Reconciliadas
-- ------------------------------------------------------------------------------
ALTER TABLE tuss_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_insurance_price_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_glosa_reasons_ans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_return_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_appeal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_appeal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_guide_procedures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tuss_procedures_read_all" ON tuss_procedures;
CREATE POLICY "tuss_procedures_read_all" ON tuss_procedures
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "glosa_reasons_read_all" ON tiss_glosa_reasons_ans;
CREATE POLICY "glosa_reasons_read_all" ON tiss_glosa_reasons_ans
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hi_price_tables_clinic_isolation" ON health_insurance_price_tables;
CREATE POLICY "hi_price_tables_clinic_isolation" ON health_insurance_price_tables
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()))
    WITH CHECK (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()));

DROP POLICY IF EXISTS "tiss_return_imports_clinic_isolation" ON tiss_return_imports;
CREATE POLICY "tiss_return_imports_clinic_isolation" ON tiss_return_imports
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()))
    WITH CHECK (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()));

DROP POLICY IF EXISTS "tiss_appeals_clinic_isolation" ON tiss_appeals;
CREATE POLICY "tiss_appeals_clinic_isolation" ON tiss_appeals
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()))
    WITH CHECK (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()));

DROP POLICY IF EXISTS "tiss_appeal_items_clinic_isolation" ON tiss_appeal_items;
CREATE POLICY "tiss_appeal_items_clinic_isolation" ON tiss_appeal_items
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()))
    WITH CHECK (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()));

DROP POLICY IF EXISTS "tiss_appeal_attachments_clinic_isolation" ON tiss_appeal_attachments;
CREATE POLICY "tiss_appeal_attachments_clinic_isolation" ON tiss_appeal_attachments
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()))
    WITH CHECK (clinic_id = (SELECT get_user_clinic_id()) OR (SELECT is_super_admin()));

DROP POLICY IF EXISTS "Isolamento por clinica tiss_guide_procedures" ON tiss_guide_procedures;
CREATE POLICY "Isolamento por clinica tiss_guide_procedures" ON tiss_guide_procedures
    FOR ALL TO authenticated
    USING (
        clinic_id = (SELECT get_user_clinic_id())
        OR guide_id IN (SELECT id FROM tiss_guides WHERE clinic_id = (SELECT get_user_clinic_id()))
        OR (SELECT is_super_admin())
    )
    WITH CHECK (
        clinic_id = (SELECT get_user_clinic_id())
        OR guide_id IN (SELECT id FROM tiss_guides WHERE clinic_id = (SELECT get_user_clinic_id()))
        OR (SELECT is_super_admin())
    );

-- ==============================================================================
-- SCRIPT REVERSO (ROLLBACK MANUAL APENAS SE NECESSÁRIO):
-- ALTER TABLE tiss_glosas DROP COLUMN IF EXISTS review_completed_at, DROP COLUMN IF EXISTS reviewer_user_id, DROP COLUMN IF EXISTS control_date, DROP COLUMN IF EXISTS observation, DROP COLUMN IF EXISTS irrecoverable_value, DROP COLUMN IF EXISTS irrecoverable_quantity, DROP COLUMN IF EXISTS is_irrecoverable, DROP COLUMN IF EXISTS approved_unit_value, DROP COLUMN IF EXISTS approved_quantity, DROP COLUMN IF EXISTS billed_unit_value, DROP COLUMN IF EXISTS billed_quantity, DROP COLUMN IF EXISTS item_group, DROP COLUMN IF EXISTS item_description, DROP COLUMN IF EXISTS item_code, DROP COLUMN IF EXISTS procedure_id;
-- ALTER TABLE tiss_batches DROP COLUMN IF EXISTS entered_glosa_total, DROP COLUMN IF EXISTS expected_glosa_total, DROP COLUMN IF EXISTS last_reviewed_by, DROP COLUMN IF EXISTS last_reviewed_at, DROP COLUMN IF EXISTS return_payment_xml_url, DROP COLUMN IF EXISTS return_analysis_xml_url, DROP COLUMN IF EXISTS care_type, DROP COLUMN IF EXISTS review_status;
-- ALTER TABLE tiss_guide_procedures DROP COLUMN IF EXISTS is_irrecoverable, DROP COLUMN IF EXISTS glosa_value, DROP COLUMN IF EXISTS approved_total_value, DROP COLUMN IF EXISTS approved_unit_value, DROP COLUMN IF EXISTS approved_quantity, DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS unit_measure, DROP COLUMN IF EXISTS item_group, DROP COLUMN IF EXISTS clinic_id;
-- ALTER TABLE tiss_guides DROP COLUMN IF EXISTS account_notes, DROP COLUMN IF EXISTS authorization_request_id, DROP COLUMN IF EXISTS released_by, DROP COLUMN IF EXISTS released_at, DROP COLUMN IF EXISTS billing_stage, DROP COLUMN IF EXISTS health_insurance_id;
-- DROP TABLE IF EXISTS tiss_appeal_attachments, tiss_appeal_items, tiss_appeals, tiss_return_imports, tiss_glosa_reasons_ans, health_insurance_price_tables CASCADE;
-- ==============================================================================

