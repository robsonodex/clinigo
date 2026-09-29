-- ==============================================================================
-- MIGRATION: 20260929120000_tiss_convenios_glosas_repasse.sql
-- Descrição: Implantação cirúrgica de Catálogo TUSS, Tabela de Preços por Convênio,
--            Controle de Saldo de Autorizações, Catálogo ANS de Glosas, Regime de
--            Repasse Configurável (Produção x Recebimento) e Trilha de Conciliação.
-- Data: 29/09/2026
-- Idempotente (IF NOT EXISTS), sem DROP de dados.
-- Como reverter: Ver instruções no final do arquivo.
-- ==============================================================================

-- 1. Extensões e Tipos Base
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela Global de Procedimentos TUSS (Catálogo ANS)
CREATE TABLE IF NOT EXISTS tuss_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE, -- Código TUSS de 8 ou 10 dígitos
    description TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'CONSULTA_OU_TERAPIA', -- CONSULTA, SADT, TERAPIA, EXAME
    source VARCHAR(30) NOT NULL DEFAULT 'NAO_VERIFICADO', -- NAO_VERIFICADO ou OFICIAL_IMPORTADO
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tuss_procedures_code ON tuss_procedures(code);
CREATE INDEX IF NOT EXISTS idx_tuss_procedures_desc ON tuss_procedures USING gin(to_tsvector('portuguese', description));

-- 3. Tabela de Preços por Clínica, Operadora e Plano
CREATE TABLE IF NOT EXISTS health_insurance_price_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    health_insurance_id UUID NOT NULL REFERENCES health_insurances(id) ON DELETE CASCADE,
    health_insurance_plan_id UUID REFERENCES health_insurance_plans(id) ON DELETE CASCADE,
    tuss_code VARCHAR(10) NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_hi_price_tables_lookup ON health_insurance_price_tables(clinic_id, health_insurance_id, tuss_code);

-- 4. Catálogo de Motivos de Glosa ANS (Tabela 38/61 da ANS)
CREATE TABLE IF NOT EXISTS tiss_glosa_reasons_ans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'ADMINISTRATIVA', -- ADMINISTRATIVA ou TECNICA
    source VARCHAR(30) NOT NULL DEFAULT 'NAO_VERIFICADO', -- NAO_VERIFICADO ou OFICIAL_IMPORTADO
    can_appeal_default BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiss_glosa_reasons_code ON tiss_glosa_reasons_ans(code);

-- 5. Extensões na tabela clinics (Regime de Repasse e Política de Glosas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'repasse_regime') THEN
        ALTER TABLE clinics ADD COLUMN repasse_regime VARCHAR(20) NOT NULL DEFAULT 'PRODUCAO';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'glosa_policy') THEN
        ALTER TABLE clinics ADD COLUMN glosa_policy VARCHAR(30) NOT NULL DEFAULT 'CLINICA_ABSORVE';
    END IF;
END $$;

-- 6. Extensões na tabela health_insurances (Dia de Corte e Prazo de Recurso)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_insurances' AND column_name = 'closing_day') THEN
        ALTER TABLE health_insurances ADD COLUMN closing_day INT DEFAULT 25;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_insurances' AND column_name = 'appeal_deadline_days') THEN
        ALTER TABLE health_insurances ADD COLUMN appeal_deadline_days INT DEFAULT 30;
    END IF;
END $$;

-- 7. Extensões na tabela tiss_authorization_requests (Saldo de Sessões e Alertas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_authorization_requests' AND column_name = 'sessions_authorized') THEN
        ALTER TABLE tiss_authorization_requests ADD COLUMN sessions_authorized INT NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_authorization_requests' AND column_name = 'sessions_used') THEN
        ALTER TABLE tiss_authorization_requests ADD COLUMN sessions_used INT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 8. Extensões na tabela tiss_guides (Idempotência, Comprovação e Coparticipação)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'copay_value') THEN
        ALTER TABLE tiss_guides ADD COLUMN copay_value DECIMAL(10,2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'paid_value') THEN
        ALTER TABLE tiss_guides ADD COLUMN paid_value DECIMAL(10,2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'biometric_proof_id') THEN
        ALTER TABLE tiss_guides ADD COLUMN biometric_proof_id UUID REFERENCES patient_face_biometrics(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'term_signature_id') THEN
        ALTER TABLE tiss_guides ADD COLUMN term_signature_id UUID REFERENCES patient_term_signatures(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'status_history') THEN
        ALTER TABLE tiss_guides ADD COLUMN status_history JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 8.1. Relatório prévio de duplicatas existentes em tiss_guides (SEM alteração de status nem exclusão de dados)
DO $$ 
DECLARE
    dup_count INT := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tiss_guides') THEN
        SELECT COUNT(*) INTO dup_count
        FROM (
            SELECT clinic_id, appointment_id, procedure_code
            FROM tiss_guides
            WHERE appointment_id IS NOT NULL 
              AND status NOT IN ('CANCELLED', 'CANCELED')
            GROUP BY clinic_id, appointment_id, procedure_code
            HAVING COUNT(*) > 1
        ) d;

        IF dup_count > 0 THEN
            RAISE NOTICE '[MIGRATION AVISO] Existem % combinacoes duplicadas ativas em tiss_guides. O indice unico falhara se houver duplicatas nao saneadas.', dup_count;
        ELSE
            RAISE NOTICE '[MIGRATION OK] Nenhuma duplicata ativa encontrada em tiss_guides.';
        END IF;
    END IF;
END $$;

-- Criação de índice condicional seguro para impedir guia duplicada ativa.
-- Exclui apenas CANCELLED (não exclui DENIED), permitindo regerar somente guias canceladas.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tiss_guides_appointment_proc 
ON tiss_guides(clinic_id, appointment_id, procedure_code) 
WHERE appointment_id IS NOT NULL AND status NOT IN ('CANCELLED', 'CANCELED');


-- 9. Extensões na tabela tiss_batches (Protocolo de Envio e Comprovante)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'dispatch_channel') THEN
        ALTER TABLE tiss_batches ADD COLUMN dispatch_channel VARCHAR(20) DEFAULT 'PORTAL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'receipt_proof_url') THEN
        ALTER TABLE tiss_batches ADD COLUMN receipt_proof_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'file_hash') THEN
        ALTER TABLE tiss_batches ADD COLUMN file_hash VARCHAR(64);
    END IF;
END $$;

-- 10. Tabela de Importações de Retorno (XML / CSV) com Hash Idempotente
CREATE TABLE IF NOT EXISTS tiss_return_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES tiss_batches(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_type VARCHAR(10) NOT NULL DEFAULT 'XML', -- XML ou CSV
    total_guides_file INT NOT NULL DEFAULT 0,
    total_matched INT NOT NULL DEFAULT 0,
    total_unmatched INT NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    amount_glosa DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_tiss_return_file_hash UNIQUE (clinic_id, file_hash)
);

CREATE INDEX IF NOT EXISTS idx_tiss_return_imports_clinic ON tiss_return_imports(clinic_id);

-- 11. Habilitação de RLS em Todas as Novas Tabelas
ALTER TABLE tuss_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_insurance_price_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_glosa_reasons_ans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiss_return_imports ENABLE ROW LEVEL SECURITY;

-- 12. Políticas de RLS Multi-tenant
-- TUSS Procedures (Catálogo Global: Leitura para todos os usuários autenticados da clínica)
DROP POLICY IF EXISTS "tuss_procedures_read_all" ON tuss_procedures;
CREATE POLICY "tuss_procedures_read_all" ON tuss_procedures
    FOR SELECT TO authenticated USING (true);

-- Tabela de Preços (Isolamento estrito por clinic_id)
DROP POLICY IF EXISTS "hi_price_tables_clinic_isolation" ON health_insurance_price_tables;
CREATE POLICY "hi_price_tables_clinic_isolation" ON health_insurance_price_tables
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
    WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Catálogo de Glosas ANS (Leitura para todos os usuários autenticados)
DROP POLICY IF EXISTS "glosa_reasons_read_all" ON tiss_glosa_reasons_ans;
CREATE POLICY "glosa_reasons_read_all" ON tiss_glosa_reasons_ans
    FOR SELECT TO authenticated USING (true);

-- Importações de Retorno (Isolamento estrito por clinic_id)
DROP POLICY IF EXISTS "tiss_return_imports_clinic_isolation" ON tiss_return_imports;
CREATE POLICY "tiss_return_imports_clinic_isolation" ON tiss_return_imports
    FOR ALL TO authenticated
    USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
    WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- 13. Carga Inicial de Procedimentos TUSS Frequentes (Sem hardcode excessivo, catálogo base)
INSERT INTO tuss_procedures (code, description, category) VALUES
('10101012', 'Consulta em consultório (no horário normal ou preestabelecido)', 'CONSULTA'),
('10101020', 'Consulta em domicílio', 'CONSULTA'),
('10101039', 'Consulta em pronto socorro', 'CONSULTA'),
('20104049', 'Sessão de psicoterapia individual', 'TERAPIA'),
('20104081', 'Sessão de fonoterapia', 'TERAPIA'),
('20104090', 'Sessão de terapia ocupacional', 'TERAPIA'),
('20104103', 'Sessão de fisioterapia motora', 'TERAPIA'),
('20104111', 'Sessão de fisioterapia respiratória', 'TERAPIA'),
('20104120', 'Sessão de reabilitação neurológica', 'TERAPIA'),
('40101010', 'Eletrocardiograma convencional de até 12 derivações', 'EXAME')
ON CONFLICT (code) DO NOTHING;

-- 14. Carga Inicial dos Principais Códigos de Glosa ANS (Tabela 38)
INSERT INTO tiss_glosa_reasons_ans (code, description, category, can_appeal_default) VALUES
('1001', 'Número da carteira do beneficiário inválido', 'ADMINISTRATIVA', true),
('1002', 'Beneficiário com atendimento cancelado ou bloqueado', 'ADMINISTRATIVA', true),
('1005', 'Atendimento anterior à inclusão do beneficiário', 'ADMINISTRATIVA', false),
('1006', 'Atendimento posterior ao cancelamento do beneficiário', 'ADMINISTRATIVA', false),
('1302', 'Guia já apresentada anteriormente em outro lote (duplicidade)', 'ADMINISTRATIVA', true),
('1305', 'Procedimento não coberto pelo plano do beneficiário', 'ADMINISTRATIVA', true),
('1401', 'Procedimento exige autorização prévia e a senha não foi informada', 'ADMINISTRATIVA', true),
('1402', 'Senha de autorização expirada ou vencida', 'ADMINISTRATIVA', true),
('1409', 'Quantidade executada excede a quantidade autorizada', 'TECNICA', true),
('1701', 'Cobrança em duplicidade do mesmo procedimento na mesma data', 'ADMINISTRATIVA', true),
('1801', 'Código de procedimento TUSS inválido ou inexistente', 'ADMINISTRATIVA', true),
('2501', 'Ausência de justificativa clínica ou relatório técnico', 'TECNICA', true),
('2503', 'Evolução clínica incompatível com o procedimento cobrado', 'TECNICA', true)
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- INSTRUÇÕES DE REVERSÃO:
-- DROP TABLE IF EXISTS tiss_return_imports CASCADE;
-- DROP TABLE IF EXISTS health_insurance_price_tables CASCADE;
-- DROP TABLE IF EXISTS tuss_procedures CASCADE;
-- DROP TABLE IF EXISTS tiss_glosa_reasons_ans CASCADE;
-- ALTER TABLE clinics DROP COLUMN IF EXISTS repasse_regime;
-- ALTER TABLE clinics DROP COLUMN IF EXISTS glosa_policy;
-- ALTER TABLE health_insurances DROP COLUMN IF EXISTS closing_day;
-- ALTER TABLE health_insurances DROP COLUMN IF EXISTS appeal_deadline_days;
-- ALTER TABLE tiss_authorization_requests DROP COLUMN IF EXISTS sessions_authorized;
-- ALTER TABLE tiss_authorization_requests DROP COLUMN IF EXISTS sessions_used;
-- ==============================================================================
