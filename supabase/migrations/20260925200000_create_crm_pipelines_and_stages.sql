-- Migration: 20260925200000_create_crm_pipelines_and_stages.sql
-- Description: Implementação de múltiplos funis (pipelines) e etapas customizáveis no CRM
-- Mantém 100% de retrocompatibilidade com crm_stages e appointments existentes

-- 1. Tabela crm_pipelines
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#0284c7',
    is_default BOOLEAN NOT NULL DEFAULT false,
    position INT NOT NULL DEFAULT 0,
    archived_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance para crm_pipelines
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_clinic_id ON public.crm_pipelines(clinic_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_clinic_default ON public.crm_pipelines(clinic_id, is_default) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_archived ON public.crm_pipelines(archived_at);

-- 2. Tabela crm_pipeline_stages
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#64748b',
    is_won_stage BOOLEAN NOT NULL DEFAULT false,
    is_lost_stage BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para crm_pipeline_stages
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_pipeline_id ON public.crm_pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_position ON public.crm_pipeline_stages(pipeline_id, position);

-- 3. Tabela crm_pipeline_cards (para cartões customizados e persistência de dados de CRM)
CREATE TABLE IF NOT EXISTS public.crm_pipeline_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    value NUMERIC(12, 2) DEFAULT 0,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    notes TEXT,
    position INT NOT NULL DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    is_won BOOLEAN DEFAULT false,
    is_lost BOOLEAN DEFAULT false,
    lost_reason TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_cards_clinic_id ON public.crm_pipeline_cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_cards_pipeline_stage ON public.crm_pipeline_cards(pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_cards_patient_id ON public.crm_pipeline_cards(patient_id);

-- 4. Extensão retrocompatível da tabela legada crm_stages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_stages') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_stages' AND column_name = 'pipeline_id') THEN
            ALTER TABLE public.crm_stages ADD COLUMN pipeline_id UUID REFERENCES public.crm_pipelines(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_stages' AND column_name = 'stage_id') THEN
            ALTER TABLE public.crm_stages ADD COLUMN stage_id UUID REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 5. Habilitar RLS em todas as tabelas
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_cards ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para crm_pipelines
DROP POLICY IF EXISTS "crm_pipelines_select" ON public.crm_pipelines;
CREATE POLICY "crm_pipelines_select" ON public.crm_pipelines
FOR SELECT TO authenticated
USING (
    clinic_id IN (
        SELECT u.clinic_id FROM public.users u WHERE u.id = auth.uid()
    )
);

DROP POLICY IF EXISTS "crm_pipelines_insert" ON public.crm_pipelines;
CREATE POLICY "crm_pipelines_insert" ON public.crm_pipelines
FOR INSERT TO authenticated
WITH CHECK (
    clinic_id IN (
        SELECT u.clinic_id FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "crm_pipelines_update" ON public.crm_pipelines;
CREATE POLICY "crm_pipelines_update" ON public.crm_pipelines
FOR UPDATE TO authenticated
USING (
    clinic_id IN (
        SELECT u.clinic_id FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
)
WITH CHECK (
    clinic_id IN (
        SELECT u.clinic_id FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "crm_pipelines_delete" ON public.crm_pipelines;
CREATE POLICY "crm_pipelines_delete" ON public.crm_pipelines
FOR DELETE TO authenticated
USING (
    clinic_id IN (
        SELECT u.clinic_id FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

-- 7. Políticas RLS para crm_pipeline_stages
DROP POLICY IF EXISTS "crm_pipeline_stages_select" ON public.crm_pipeline_stages;
CREATE POLICY "crm_pipeline_stages_select" ON public.crm_pipeline_stages
FOR SELECT TO authenticated
USING (
    pipeline_id IN (
        SELECT p.id FROM public.crm_pipelines p
        JOIN public.users u ON u.clinic_id = p.clinic_id
        WHERE u.id = auth.uid()
    )
);

DROP POLICY IF EXISTS "crm_pipeline_stages_all_admin" ON public.crm_pipeline_stages;
CREATE POLICY "crm_pipeline_stages_all_admin" ON public.crm_pipeline_stages
FOR ALL TO authenticated
USING (
    pipeline_id IN (
        SELECT p.id FROM public.crm_pipelines p
        JOIN public.users u ON u.clinic_id = p.clinic_id
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
)
WITH CHECK (
    pipeline_id IN (
        SELECT p.id FROM public.crm_pipelines p
        JOIN public.users u ON u.clinic_id = p.clinic_id
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

-- 8. Políticas RLS para crm_pipeline_cards
DROP POLICY IF EXISTS "crm_pipeline_cards_select" ON public.crm_pipeline_cards;
CREATE POLICY "crm_pipeline_cards_select" ON public.crm_pipeline_cards
FOR SELECT TO authenticated
USING (
    clinic_id IN (
        SELECT u.clinic_id FROM public.users u WHERE u.id = auth.uid()
    )
);

DROP POLICY IF EXISTS "crm_pipeline_cards_modify" ON public.crm_pipeline_cards;
CREATE POLICY "crm_pipeline_cards_modify" ON public.crm_pipeline_cards
FOR ALL TO authenticated
USING (
    clinic_id IN (
        SELECT u.clinic_id FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR')
    )
)
WITH CHECK (
    clinic_id IN (
        SELECT u.clinic_id FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR')
    )
);

-- 9. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_pipelines_updated_at ON public.crm_pipelines;
CREATE TRIGGER trg_crm_pipelines_updated_at
BEFORE UPDATE ON public.crm_pipelines
FOR EACH ROW EXECUTE FUNCTION public.handle_crm_updated_at();

DROP TRIGGER IF EXISTS trg_crm_pipeline_stages_updated_at ON public.crm_pipeline_stages;
CREATE TRIGGER trg_crm_pipeline_stages_updated_at
BEFORE UPDATE ON public.crm_pipeline_stages
FOR EACH ROW EXECUTE FUNCTION public.handle_crm_updated_at();

DROP TRIGGER IF EXISTS trg_crm_pipeline_cards_updated_at ON public.crm_pipeline_cards;
CREATE TRIGGER trg_crm_pipeline_cards_updated_at
BEFORE UPDATE ON public.crm_pipeline_cards
FOR EACH ROW EXECUTE FUNCTION public.handle_crm_updated_at();

-- 10. Script de Migração de Dados Automática (Backfill Idempotente)
DO $$
DECLARE
    r_clinic RECORD;
    v_pipeline_id UUID;
    v_stage_lead UUID;
    v_stage_agendou UUID;
    v_stage_compareceu UUID;
    v_stage_retornou UUID;
    v_stage_recorrente UUID;
BEGIN
    FOR r_clinic IN SELECT id FROM public.clinics LOOP
        -- Verifica se a clínica já possui um funil padrão ativo
        SELECT id INTO v_pipeline_id 
        FROM public.crm_pipelines 
        WHERE clinic_id = r_clinic.id AND is_default = true AND archived_at IS NULL
        LIMIT 1;

        -- Se não tiver, cria o Funil Padrão
        IF v_pipeline_id IS NULL THEN
            INSERT INTO public.crm_pipelines (clinic_id, name, description, color, is_default, position)
            VALUES (r_clinic.id, 'Funil Padrão', 'Funil padrão do CRM médico integrado', '#0284c7', true, 0)
            RETURNING id INTO v_pipeline_id;

            -- Cria as 5 etapas padrão
            INSERT INTO public.crm_pipeline_stages (pipeline_id, name, position, color, is_won_stage, is_lost_stage)
            VALUES (v_pipeline_id, 'Leads', 0, '#94a3b8', false, false) RETURNING id INTO v_stage_lead;

            INSERT INTO public.crm_pipeline_stages (pipeline_id, name, position, color, is_won_stage, is_lost_stage)
            VALUES (v_pipeline_id, 'Agendou', 1, '#38bdf8', false, false) RETURNING id INTO v_stage_agendou;

            INSERT INTO public.crm_pipeline_stages (pipeline_id, name, position, color, is_won_stage, is_lost_stage)
            VALUES (v_pipeline_id, 'Compareceu', 2, '#34d399', false, false) RETURNING id INTO v_stage_compareceu;

            INSERT INTO public.crm_pipeline_stages (pipeline_id, name, position, color, is_won_stage, is_lost_stage)
            VALUES (v_pipeline_id, 'Retornou', 3, '#818cf8', false, false) RETURNING id INTO v_stage_retornou;

            INSERT INTO public.crm_pipeline_stages (pipeline_id, name, position, color, is_won_stage, is_lost_stage)
            VALUES (v_pipeline_id, 'Recorrente', 4, '#10b981', true, false) RETURNING id INTO v_stage_recorrente;

            -- Se houver crm_stages existentes, vincula as FKs
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_stages') THEN
                UPDATE public.crm_stages 
                SET pipeline_id = v_pipeline_id,
                    stage_id = CASE 
                        WHEN stage = 'lead' THEN v_stage_lead
                        WHEN stage = 'agendou' THEN v_stage_agendou
                        WHEN stage = 'compareceu' THEN v_stage_compareceu
                        WHEN stage = 'retornou' THEN v_stage_retornou
                        WHEN stage = 'recorrente' THEN v_stage_recorrente
                        ELSE v_stage_lead
                    END
                WHERE clinic_id = r_clinic.id AND pipeline_id IS NULL;
            END IF;
        END IF;
    END LOOP;
END $$;
