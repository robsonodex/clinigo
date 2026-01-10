-- =============================================================================
-- SISTEMA DE CONVÊNIOS MÉDICOS - CliniGo
-- =============================================================================
-- Execute este script no Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. TIPOS ENUM
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE health_insurance_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE health_insurance_plan_type AS ENUM ('INDIVIDUAL', 'EMPRESARIAL', 'COLETIVO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE health_insurance_coverage_type AS ENUM ('AMBULATORIAL', 'HOSPITALAR', 'COMPLETO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_type AS ENUM ('PARTICULAR', 'CONVENIO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. TABELA: health_insurances (Operadoras de Saúde)
-- =============================================================================

CREATE TABLE IF NOT EXISTS health_insurances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT, -- Código ANS da operadora
    phone TEXT,
    email TEXT,
    notes TEXT,
    status health_insurance_status NOT NULL DEFAULT 'ACTIVE',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_health_insurances_clinic_id ON health_insurances(clinic_id);
CREATE INDEX IF NOT EXISTS idx_health_insurances_status ON health_insurances(status);
CREATE INDEX IF NOT EXISTS idx_health_insurances_name ON health_insurances(name);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_health_insurances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_health_insurances_updated_at ON health_insurances;
CREATE TRIGGER trigger_health_insurances_updated_at
    BEFORE UPDATE ON health_insurances
    FOR EACH ROW
    EXECUTE FUNCTION update_health_insurances_updated_at();

-- =============================================================================
-- 3. TABELA: health_insurance_plans (Planos de Saúde)
-- =============================================================================

CREATE TABLE IF NOT EXISTS health_insurance_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    health_insurance_id UUID NOT NULL REFERENCES health_insurances(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT, -- Código do plano
    type health_insurance_plan_type NOT NULL DEFAULT 'INDIVIDUAL',
    coverage_type health_insurance_coverage_type NOT NULL DEFAULT 'COMPLETO',
    notes TEXT,
    status health_insurance_status NOT NULL DEFAULT 'ACTIVE',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_health_insurance_plans_insurance_id ON health_insurance_plans(health_insurance_id);
CREATE INDEX IF NOT EXISTS idx_health_insurance_plans_status ON health_insurance_plans(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_health_insurance_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_health_insurance_plans_updated_at ON health_insurance_plans;
CREATE TRIGGER trigger_health_insurance_plans_updated_at
    BEFORE UPDATE ON health_insurance_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_health_insurance_plans_updated_at();

-- =============================================================================
-- 4. TABELA: doctor_health_insurances (Vínculo Médico-Convênio)
-- =============================================================================

CREATE TABLE IF NOT EXISTS doctor_health_insurances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    health_insurance_plan_id UUID NOT NULL REFERENCES health_insurance_plans(id) ON DELETE CASCADE,
    consultation_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    accepts_new_patients BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    status health_insurance_status NOT NULL DEFAULT 'ACTIVE',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraint: Um médico só pode ter um vínculo por plano
    CONSTRAINT unique_doctor_plan UNIQUE (doctor_id, health_insurance_plan_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_doctor_health_insurances_doctor_id ON doctor_health_insurances(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_health_insurances_plan_id ON doctor_health_insurances(health_insurance_plan_id);
CREATE INDEX IF NOT EXISTS idx_doctor_health_insurances_status ON doctor_health_insurances(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_doctor_health_insurances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_doctor_health_insurances_updated_at ON doctor_health_insurances;
CREATE TRIGGER trigger_doctor_health_insurances_updated_at
    BEFORE UPDATE ON doctor_health_insurances
    FOR EACH ROW
    EXECUTE FUNCTION update_doctor_health_insurances_updated_at();

-- =============================================================================
-- 5. ALTERAR TABELA appointments (Adicionar campos de convênio)
-- =============================================================================

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_type payment_type DEFAULT 'PARTICULAR';

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS health_insurance_plan_id UUID REFERENCES health_insurance_plans(id) ON DELETE SET NULL;

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS insurance_card_number TEXT;

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS insurance_card_validity DATE;

-- Índice para consultas por convênio
CREATE INDEX IF NOT EXISTS idx_appointments_health_insurance ON appointments(health_insurance_plan_id);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_type ON appointments(payment_type);

-- =============================================================================
-- 6. RLS POLICIES - health_insurances
-- =============================================================================

ALTER TABLE health_insurances ENABLE ROW LEVEL SECURITY;

-- Policy: Clinic Admin pode gerenciar operadoras da própria clínica
DROP POLICY IF EXISTS health_insurances_clinic_admin ON health_insurances;
CREATE POLICY health_insurances_clinic_admin ON health_insurances
    FOR ALL
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    )
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Super Admin tem acesso total
DROP POLICY IF EXISTS health_insurances_super_admin ON health_insurances;
CREATE POLICY health_insurances_super_admin ON health_insurances
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'SUPER_ADMIN'
        )
    );

-- =============================================================================
-- 7. RLS POLICIES - health_insurance_plans
-- =============================================================================

ALTER TABLE health_insurance_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Acesso via operadora da clínica
DROP POLICY IF EXISTS health_insurance_plans_clinic ON health_insurance_plans;
CREATE POLICY health_insurance_plans_clinic ON health_insurance_plans
    FOR ALL
    USING (
        health_insurance_id IN (
            SELECT id FROM health_insurances 
            WHERE clinic_id IN (
                SELECT clinic_id FROM users WHERE id = auth.uid()
            )
            AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    )
    WITH CHECK (
        health_insurance_id IN (
            SELECT id FROM health_insurances 
            WHERE clinic_id IN (
                SELECT clinic_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Policy: Super Admin
DROP POLICY IF EXISTS health_insurance_plans_super_admin ON health_insurance_plans;
CREATE POLICY health_insurance_plans_super_admin ON health_insurance_plans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'SUPER_ADMIN'
        )
    );

-- =============================================================================
-- 8. RLS POLICIES - doctor_health_insurances
-- =============================================================================

ALTER TABLE doctor_health_insurances ENABLE ROW LEVEL SECURITY;

-- Policy: Médico pode ver seus próprios convênios
DROP POLICY IF EXISTS doctor_health_insurances_doctor ON doctor_health_insurances;
CREATE POLICY doctor_health_insurances_doctor ON doctor_health_insurances
    FOR SELECT
    USING (
        doctor_id IN (
            SELECT id FROM doctors 
            WHERE user_id = auth.uid()
        )
        AND deleted_at IS NULL
    );

-- Policy: Clinic Admin pode gerenciar convênios dos médicos da clínica
DROP POLICY IF EXISTS doctor_health_insurances_clinic_admin ON doctor_health_insurances;
CREATE POLICY doctor_health_insurances_clinic_admin ON doctor_health_insurances
    FOR ALL
    USING (
        doctor_id IN (
            SELECT id FROM doctors 
            WHERE clinic_id IN (
                SELECT clinic_id FROM users WHERE id = auth.uid()
            )
        )
        AND deleted_at IS NULL
    )
    WITH CHECK (
        doctor_id IN (
            SELECT id FROM doctors 
            WHERE clinic_id IN (
                SELECT clinic_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Policy: Super Admin
DROP POLICY IF EXISTS doctor_health_insurances_super_admin ON doctor_health_insurances;
CREATE POLICY doctor_health_insurances_super_admin ON doctor_health_insurances
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'SUPER_ADMIN'
        )
    );

-- =============================================================================
-- 9. VIEWS ÚTEIS
-- =============================================================================

-- View: Convênios completos do médico (com operadora e plano)
CREATE OR REPLACE VIEW doctor_health_insurances_full AS
SELECT 
    dhi.id,
    dhi.doctor_id,
    dhi.health_insurance_plan_id,
    dhi.consultation_price,
    dhi.accepts_new_patients,
    dhi.notes,
    dhi.status,
    dhi.created_at,
    dhi.updated_at,
    hip.name AS plan_name,
    hip.code AS plan_code,
    hip.type AS plan_type,
    hip.coverage_type,
    hi.id AS insurance_id,
    hi.name AS insurance_name,
    hi.code AS insurance_code,
    hi.clinic_id
FROM doctor_health_insurances dhi
JOIN health_insurance_plans hip ON dhi.health_insurance_plan_id = hip.id
JOIN health_insurances hi ON hip.health_insurance_id = hi.id
WHERE dhi.deleted_at IS NULL
  AND hip.deleted_at IS NULL
  AND hi.deleted_at IS NULL;

-- =============================================================================
-- 10. FUNÇÃO: Contar médicos por plano
-- =============================================================================

CREATE OR REPLACE FUNCTION count_doctors_by_plan(plan_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM doctor_health_insurances
        WHERE health_insurance_plan_id = plan_id
          AND status = 'ACTIVE'
          AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 11. FUNÇÃO: Contar planos por operadora
-- =============================================================================

CREATE OR REPLACE FUNCTION count_plans_by_insurance(insurance_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM health_insurance_plans
        WHERE health_insurance_id = insurance_id
          AND status = 'ACTIVE'
          AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================

SELECT 
    'health_insurances' AS table_name, 
    COUNT(*) AS row_count 
FROM health_insurances
UNION ALL
SELECT 
    'health_insurance_plans', 
    COUNT(*) 
FROM health_insurance_plans
UNION ALL
SELECT 
    'doctor_health_insurances', 
    COUNT(*) 
FROM doctor_health_insurances;
