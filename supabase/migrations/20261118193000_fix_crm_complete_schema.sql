-- Migration: 20261118193000_fix_crm_complete_schema.sql
-- Description: Correção estrutural completa do módulo CRM (patient_notes, crm_pipelines,
--              crm_pipeline_stages, crm_pipeline_cards, extensão de crm_stages e RPC get_crm_patient_metrics)
-- Security: Multi-tenant estrito via clinic_id + RLS com (SELECT auth.uid())

-- 1. Função utilitária de updated_at com search_path fixo
CREATE OR REPLACE FUNCTION public.handle_crm_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 2. Tabela public.patient_notes (notas e tarefas do CRM)
CREATE TABLE IF NOT EXISTS public.patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'general',
    is_task BOOLEAN NOT NULL DEFAULT false,
    task_due_date TIMESTAMPTZ,
    task_assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    task_completed_at TIMESTAMPTZ,
    priority TEXT NOT NULL DEFAULT 'normal',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_notes_clinic_created
    ON public.patient_notes(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_notes_clinic_patient
    ON public.patient_notes(clinic_id, patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_notes_clinic_tasks
    ON public.patient_notes(clinic_id, is_task, task_completed_at) WHERE is_task = true;
CREATE INDEX IF NOT EXISTS idx_patient_notes_created_by
    ON public.patient_notes(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_notes_task_assigned_to
    ON public.patient_notes(task_assigned_to) WHERE task_assigned_to IS NOT NULL;

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_notes_select" ON public.patient_notes;
CREATE POLICY "patient_notes_select" ON public.patient_notes
FOR SELECT TO authenticated
USING (
    clinic_id = (SELECT u.clinic_id FROM public.users u WHERE u.id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "patient_notes_insert" ON public.patient_notes;
CREATE POLICY "patient_notes_insert" ON public.patient_notes
FOR INSERT TO authenticated
WITH CHECK (
    clinic_id = (SELECT u.clinic_id FROM public.users u WHERE u.id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "patient_notes_update" ON public.patient_notes;
CREATE POLICY "patient_notes_update" ON public.patient_notes
FOR UPDATE TO authenticated
USING (
    clinic_id = (SELECT u.clinic_id FROM public.users u WHERE u.id = (SELECT auth.uid()))
)
WITH CHECK (
    clinic_id = (SELECT u.clinic_id FROM public.users u WHERE u.id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "patient_notes_delete" ON public.patient_notes;
CREATE POLICY "patient_notes_delete" ON public.patient_notes
FOR DELETE TO authenticated
USING (
    clinic_id = (SELECT u.clinic_id FROM public.users u WHERE u.id = (SELECT auth.uid()))
);

DROP TRIGGER IF EXISTS trg_patient_notes_updated_at ON public.patient_notes;
CREATE TRIGGER trg_patient_notes_updated_at
BEFORE UPDATE ON public.patient_notes
FOR EACH ROW EXECUTE FUNCTION public.handle_crm_updated_at();

-- 3. Tabela public.crm_pipelines
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

CREATE INDEX IF NOT EXISTS idx_crm_pipelines_clinic_id
    ON public.crm_pipelines(clinic_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_clinic_default
    ON public.crm_pipelines(clinic_id, is_default) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_archived
    ON public.crm_pipelines(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_created_by
    ON public.crm_pipelines(created_by) WHERE created_by IS NOT NULL;

ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_pipelines_select" ON public.crm_pipelines;
CREATE POLICY "crm_pipelines_select" ON public.crm_pipelines
FOR SELECT TO authenticated
USING (
    clinic_id = (SELECT u.clinic_id FROM public.users u WHERE u.id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "crm_pipelines_insert" ON public.crm_pipelines;
CREATE POLICY "crm_pipelines_insert" ON public.crm_pipelines
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid())
          AND u.clinic_id = crm_pipelines.clinic_id
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "crm_pipelines_update" ON public.crm_pipelines;
CREATE POLICY "crm_pipelines_update" ON public.crm_pipelines
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid())
          AND u.clinic_id = crm_pipelines.clinic_id
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid())
          AND u.clinic_id = crm_pipelines.clinic_id
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "crm_pipelines_delete" ON public.crm_pipelines;
CREATE POLICY "crm_pipelines_delete" ON public.crm_pipelines
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid())
          AND u.clinic_id = crm_pipelines.clinic_id
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

DROP TRIGGER IF EXISTS trg_crm_pipelines_updated_at ON public.crm_pipelines;
CREATE TRIGGER trg_crm_pipelines_updated_at
BEFORE UPDATE ON public.crm_pipelines
FOR EACH ROW EXECUTE FUNCTION public.handle_crm_updated_at();

-- 4. Tabela public.crm_pipeline_stages
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

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_pipeline_id
    ON public.crm_pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_position
    ON public.crm_pipeline_stages(pipeline_id, position);

ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_pipeline_stages_select" ON public.crm_pipeline_stages;
CREATE POLICY "crm_pipeline_stages_select" ON public.crm_pipeline_stages
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.crm_pipelines p
        JOIN public.users u ON u.clinic_id = p.clinic_id
        WHERE p.id = crm_pipeline_stages.pipeline_id
          AND u.id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS "crm_pipeline_stages_insert" ON public.crm_pipeline_stages;
CREATE POLICY "crm_pipeline_stages_insert" ON public.crm_pipeline_stages
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.crm_pipelines p
        JOIN public.users u ON u.clinic_id = p.clinic_id
        WHERE p.id = crm_pipeline_stages.pipeline_id
          AND u.id = (SELECT auth.uid())
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "crm_pipeline_stages_update" ON public.crm_pipeline_stages;
CREATE POLICY "crm_pipeline_stages_update" ON public.crm_pipeline_stages
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.crm_pipelines p
        JOIN public.users u ON u.clinic_id = p.clinic_id
        WHERE p.id = crm_pipeline_stages.pipeline_id
          AND u.id = (SELECT auth.uid())
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.crm_pipelines p
        JOIN public.users u ON u.clinic_id = p.clinic_id
        WHERE p.id = crm_pipeline_stages.pipeline_id
          AND u.id = (SELECT auth.uid())
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "crm_pipeline_stages_delete" ON public.crm_pipeline_stages;
CREATE POLICY "crm_pipeline_stages_delete" ON public.crm_pipeline_stages
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.crm_pipelines p
        JOIN public.users u ON u.clinic_id = p.clinic_id
        WHERE p.id = crm_pipeline_stages.pipeline_id
          AND u.id = (SELECT auth.uid())
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

DROP TRIGGER IF EXISTS trg_crm_pipeline_stages_updated_at ON public.crm_pipeline_stages;
CREATE TRIGGER trg_crm_pipeline_stages_updated_at
BEFORE UPDATE ON public.crm_pipeline_stages
FOR EACH ROW EXECUTE FUNCTION public.handle_crm_updated_at();

-- 5. Tabela public.crm_pipeline_cards
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

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_cards_clinic_id
    ON public.crm_pipeline_cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_cards_pipeline_stage
    ON public.crm_pipeline_cards(pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_cards_stage_id
    ON public.crm_pipeline_cards(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_cards_patient_id
    ON public.crm_pipeline_cards(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_cards_created_by
    ON public.crm_pipeline_cards(created_by) WHERE created_by IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_crm_pipeline_cards_clinic_pipeline_patient
    ON public.crm_pipeline_cards(clinic_id, pipeline_id, patient_id)
    WHERE patient_id IS NOT NULL;

ALTER TABLE public.crm_pipeline_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_pipeline_cards_select" ON public.crm_pipeline_cards;
CREATE POLICY "crm_pipeline_cards_select" ON public.crm_pipeline_cards
FOR SELECT TO authenticated
USING (
    clinic_id = (SELECT u.clinic_id FROM public.users u WHERE u.id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "crm_pipeline_cards_insert" ON public.crm_pipeline_cards;
CREATE POLICY "crm_pipeline_cards_insert" ON public.crm_pipeline_cards
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid())
          AND u.clinic_id = crm_pipeline_cards.clinic_id
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR')
    )
);

DROP POLICY IF EXISTS "crm_pipeline_cards_update" ON public.crm_pipeline_cards;
CREATE POLICY "crm_pipeline_cards_update" ON public.crm_pipeline_cards
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid())
          AND u.clinic_id = crm_pipeline_cards.clinic_id
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid())
          AND u.clinic_id = crm_pipeline_cards.clinic_id
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR')
    )
);

DROP POLICY IF EXISTS "crm_pipeline_cards_delete" ON public.crm_pipeline_cards;
CREATE POLICY "crm_pipeline_cards_delete" ON public.crm_pipeline_cards
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid())
          AND u.clinic_id = crm_pipeline_cards.clinic_id
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR')
    )
);

DROP TRIGGER IF EXISTS trg_crm_pipeline_cards_updated_at ON public.crm_pipeline_cards;
CREATE TRIGGER trg_crm_pipeline_cards_updated_at
BEFORE UPDATE ON public.crm_pipeline_cards
FOR EACH ROW EXECUTE FUNCTION public.handle_crm_updated_at();

-- 6. Extensão retrocompatível de public.crm_stages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_stages') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crm_stages' AND column_name = 'pipeline_id') THEN
            ALTER TABLE public.crm_stages ADD COLUMN pipeline_id UUID REFERENCES public.crm_pipelines(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crm_stages' AND column_name = 'stage_id') THEN
            ALTER TABLE public.crm_stages ADD COLUMN stage_id UUID REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crm_stages' AND column_name = 'created_at') THEN
            ALTER TABLE public.crm_stages ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_stages_pipeline_id
    ON public.crm_stages(pipeline_id) WHERE pipeline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_stages_stage_id
    ON public.crm_stages(stage_id) WHERE stage_id IS NOT NULL;

-- 7. Backfill idempotente do Funil Padrão + 5 etapas para cada clínica
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
        SELECT id INTO v_pipeline_id
        FROM public.crm_pipelines
        WHERE clinic_id = r_clinic.id AND is_default = true AND archived_at IS NULL
        LIMIT 1;

        IF v_pipeline_id IS NULL THEN
            INSERT INTO public.crm_pipelines (clinic_id, name, description, color, is_default, position)
            VALUES (r_clinic.id, 'Funil Padrão', 'Funil padrão do CRM médico integrado', '#0284c7', true, 0)
            RETURNING id INTO v_pipeline_id;

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

-- 8. RPC agregada de métricas de pacientes para o CRM Pipeline
-- Elimina scan de dezenas de milhares de linhas no app e calcula LTV real via financial_entries.appointment_id
CREATE OR REPLACE FUNCTION public.get_crm_patient_metrics(
    p_clinic_id UUID,
    p_doctor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    patient_id UUID,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    lead_source VARCHAR,
    created_at TIMESTAMPTZ,
    completed_count BIGINT,
    total_appointments BIGINT,
    last_appointment DATE,
    doctor_name TEXT,
    ltv NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    WITH filtered_appts AS (
        SELECT
            a.id,
            a.patient_id,
            a.doctor_id,
            a.status::text AS status_text,
            a.appointment_date
        FROM public.appointments a
        WHERE a.clinic_id = p_clinic_id
          AND (p_doctor_id IS NULL OR a.doctor_id = p_doctor_id)
    ),
    appt_stats AS (
        SELECT
            fa.patient_id,
            COUNT(*) FILTER (WHERE fa.status_text = 'COMPLETED') AS completed_count,
            COUNT(*) AS total_appointments,
            MAX(fa.appointment_date) FILTER (WHERE fa.status_text = 'COMPLETED') AS last_appointment
        FROM filtered_appts fa
        GROUP BY fa.patient_id
    ),
    latest_doctor AS (
        SELECT DISTINCT ON (fa.patient_id)
            fa.patient_id,
            u.full_name AS doctor_name
        FROM filtered_appts fa
        JOIN public.doctors d ON d.id = fa.doctor_id
        JOIN public.users u ON u.id = d.user_id
        ORDER BY
            fa.patient_id,
            (CASE WHEN fa.status_text = 'COMPLETED' THEN 0 ELSE 1 END),
            fa.appointment_date DESC
    ),
    patient_ltv AS (
        SELECT
            fa.patient_id,
            COALESCE(SUM(fe.amount), 0)::numeric AS ltv
        FROM filtered_appts fa
        JOIN public.financial_entries fe
          ON fe.appointment_id = fa.id
         AND fe.clinic_id = p_clinic_id
        WHERE COALESCE(fe.entry_type, fe.type) = 'INCOME'
          AND fe.status = 'PAID'
        GROUP BY fa.patient_id
    )
    SELECT
        p.id AS patient_id,
        p.full_name,
        p.phone,
        p.email,
        p.lead_source,
        p.created_at,
        COALESCE(s.completed_count, 0) AS completed_count,
        COALESCE(s.total_appointments, 0) AS total_appointments,
        s.last_appointment,
        ld.doctor_name,
        COALESCE(l.ltv, 0)::numeric AS ltv
    FROM public.patients p
    LEFT JOIN appt_stats s ON s.patient_id = p.id
    LEFT JOIN latest_doctor ld ON ld.patient_id = p.id
    LEFT JOIN patient_ltv l ON l.patient_id = p.id
    WHERE p.clinic_id = p_clinic_id
      AND p.deleted_at IS NULL
    ORDER BY p.full_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_crm_patient_metrics(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_crm_patient_metrics(UUID, UUID) TO authenticated, service_role;

