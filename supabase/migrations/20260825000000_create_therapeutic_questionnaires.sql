-- Migration: 20260825000000_create_therapeutic_questionnaires.sql
-- Description: Módulo de Questionários e Folhas de Registro Clínico ABA (Linha de Base, Tentativas com Dica, Ensino Naturalista) integrados ao Plano Terapêutico

CREATE TABLE IF NOT EXISTS therapeutic_plan_questionnaire_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'aba_attempts', -- 'aba_attempts' | 'baseline' | 'naturalistic' | 'custom'
    description TEXT,
    structure JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS therapeutic_plan_questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES therapeutic_plans(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES therapeutic_plan_goals(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    template_id UUID REFERENCES therapeutic_plan_questionnaire_templates(id) ON DELETE SET NULL,
    template_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    program_name TEXT,
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary_metrics JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_tpqt_clinic ON therapeutic_plan_questionnaire_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tpqr_clinic ON therapeutic_plan_questionnaire_responses(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tpqr_patient ON therapeutic_plan_questionnaire_responses(patient_id);
CREATE INDEX IF NOT EXISTS idx_tpqr_plan ON therapeutic_plan_questionnaire_responses(plan_id);

-- RLS
ALTER TABLE therapeutic_plan_questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapeutic_plan_questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Policies para Templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'therapeutic_plan_questionnaire_templates' AND policyname = 'tpqt_clinic_isolation') THEN
        CREATE POLICY tpqt_clinic_isolation ON therapeutic_plan_questionnaire_templates
            FOR ALL
            USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()))
            WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
    END IF;
END $$;

-- Policies para Respostas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'therapeutic_plan_questionnaire_responses' AND policyname = 'tpqr_clinic_isolation') THEN
        CREATE POLICY tpqr_clinic_isolation ON therapeutic_plan_questionnaire_responses
            FOR ALL
            USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()))
            WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
    END IF;
END $$;
