-- Migration: 20261013140000_create_tasks_and_projects_module.sql
-- Description: Módulo Corporativo de Gestão de Projetos e Tarefas com Farol de Prazos (SLA)
-- Suporte a isolamento estrito de visibilidade (terapeutas enxergam apenas suas tarefas; administradores enxergam toda a clínica)

-- 1. Tabela task_projects (Projetos / Pastas de Trabalho da Clínica)
CREATE TABLE IF NOT EXISTS public.task_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#10b981',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_projects_clinic_id ON public.task_projects(clinic_id);
CREATE INDEX IF NOT EXISTS idx_task_projects_archived ON public.task_projects(clinic_id, is_archived);

-- 2. Tabela clinic_tasks (Tarefas e Pendências)
CREATE TABLE IF NOT EXISTS public.clinic_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.task_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date DATE,
    due_time TIME,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    recurrence TEXT NOT NULL DEFAULT 'NONE' CHECK (recurrence IN ('NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')),
    completed_at TIMESTAMPTZ,
    position INT NOT NULL DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_tasks_clinic_id ON public.clinic_tasks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_tasks_assigned_to ON public.clinic_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clinic_tasks_created_by ON public.clinic_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_clinic_tasks_project_id ON public.clinic_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_clinic_tasks_status ON public.clinic_tasks(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_clinic_tasks_due_date ON public.clinic_tasks(clinic_id, due_date);

-- 3. Tabela clinic_task_checklists (Subtarefas / Itens de Verificação)
CREATE TABLE IF NOT EXISTS public.clinic_task_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.clinic_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_task_checklists_task_id ON public.clinic_task_checklists(task_id);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.task_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_task_checklists ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Acesso (RLS)

-- Service Role Full Access
DROP POLICY IF EXISTS "service_role_all_task_projects" ON public.task_projects;
CREATE POLICY "service_role_all_task_projects" ON public.task_projects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_clinic_tasks" ON public.clinic_tasks;
CREATE POLICY "service_role_all_clinic_tasks" ON public.clinic_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_checklists" ON public.clinic_task_checklists;
CREATE POLICY "service_role_all_checklists" ON public.clinic_task_checklists FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Projetos: Visualização por todos os colaboradores da clínica
DROP POLICY IF EXISTS "users_view_clinic_projects" ON public.task_projects;
CREATE POLICY "users_view_clinic_projects" ON public.task_projects
FOR SELECT TO authenticated
USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
);

-- Projetos: Criação e edição apenas por Administradores da clínica
DROP POLICY IF EXISTS "admins_manage_clinic_projects" ON public.task_projects;
CREATE POLICY "admins_manage_clinic_projects" ON public.task_projects
FOR ALL TO authenticated
USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
)
WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
);

-- Tarefas: SELECT (Isolamento Cirúrgico de Privacidade)
DROP POLICY IF EXISTS "users_select_tasks" ON public.clinic_tasks;
CREATE POLICY "users_select_tasks" ON public.clinic_tasks
FOR SELECT TO authenticated
USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
    AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
        OR assigned_to = auth.uid()
        OR created_by = auth.uid()
    )
);

-- Tarefas: INSERT
DROP POLICY IF EXISTS "users_insert_tasks" ON public.clinic_tasks;
CREATE POLICY "users_insert_tasks" ON public.clinic_tasks
FOR INSERT TO authenticated
WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
);

-- Tarefas: UPDATE
DROP POLICY IF EXISTS "users_update_tasks" ON public.clinic_tasks;
CREATE POLICY "users_update_tasks" ON public.clinic_tasks
FOR UPDATE TO authenticated
USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
    AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
        OR assigned_to = auth.uid()
        OR created_by = auth.uid()
    )
)
WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
);

-- Tarefas: DELETE
DROP POLICY IF EXISTS "users_delete_tasks" ON public.clinic_tasks;
CREATE POLICY "users_delete_tasks" ON public.clinic_tasks
FOR DELETE TO authenticated
USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
    AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
        OR created_by = auth.uid()
    )
);

-- Checklists: Controle herdado da tarefa
DROP POLICY IF EXISTS "users_manage_checklists" ON public.clinic_task_checklists;
CREATE POLICY "users_manage_checklists" ON public.clinic_task_checklists
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.clinic_tasks t
        JOIN public.users u ON u.id = auth.uid()
        WHERE t.id = clinic_task_checklists.task_id
        AND t.clinic_id = u.clinic_id
        AND (u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN') OR t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    )
);
