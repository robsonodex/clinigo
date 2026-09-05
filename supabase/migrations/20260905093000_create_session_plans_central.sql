-- Migration: Central de Planos de Sessão (Multi-Especialidades) & Auditoria
-- Data: 2026-09-05
-- Especialidades: Fisioterapia, Fonoaudiologia, Intervenção Precoce (ABA), Psicologia, Terapia Ocupacional, Psicopedagogia

-- 1. Adicionar coluna com backfill seguro em clinica_modulos
ALTER TABLE public.clinica_modulos 
ADD COLUMN IF NOT EXISTS modulos_planos_sessao_habilitados jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Garantir backfill explícito de qualquer registro nulo
UPDATE public.clinica_modulos 
SET modulos_planos_sessao_habilitados = '[]'::jsonb 
WHERE modulos_planos_sessao_habilitados IS NULL;

-- 2. Tabela genérica de Planos de Sessão (Folha de Atendimento)
CREATE TABLE IF NOT EXISTS public.planos_sessao (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    paciente_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    profissional_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    especialidade text NOT NULL, -- 'fisioterapia', 'fonoaudiologia', 'intervencao_precoce_aba', 'psicologia', 'terapia_ocupacional', 'psicopedagogia'
    data_sessao date NOT NULL DEFAULT CURRENT_DATE,
    duracao_minutos integer DEFAULT 50,
    contexto text,
    forma_mobilidade text,
    condicao_inicial jsonb NOT NULL DEFAULT '{}'::jsonb,
    objetivos_selecionados jsonb NOT NULL DEFAULT '[]'::jsonb,
    estrategias jsonb NOT NULL DEFAULT '{}'::jsonb,
    planejamento_etapas jsonb NOT NULL DEFAULT '[]'::jsonb,
    registro_desempenho jsonb NOT NULL DEFAULT '[]'::jsonb,
    qualidade_movimento jsonb NOT NULL DEFAULT '{}'::jsonb,
    analise_clinica jsonb NOT NULL DEFAULT '{}'::jsonb,
    decisao_proxima_sessao jsonb NOT NULL DEFAULT '{}'::jsonb,
    orientacao_familia jsonb NOT NULL DEFAULT '{}'::jsonb,
    grafico_indicadores jsonb NOT NULL DEFAULT '{}'::jsonb,
    assinatura jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'rascunho', -- 'rascunho', 'finalizado', 'assinado'
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_sessao_clinica_paciente 
ON public.planos_sessao(clinica_id, paciente_id, especialidade);

CREATE INDEX IF NOT EXISTS idx_planos_sessao_data 
ON public.planos_sessao(data_sessao DESC);

ALTER TABLE public.planos_sessao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados acessam planos de sua clínica"
ON public.planos_sessao
FOR ALL TO authenticated
USING (
    clinica_id IN (
        SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
    )
)
WITH CHECK (
    clinica_id IN (
        SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
    )
);

-- 3. Tabela genérica de Capa do Paciente por Especialidade
CREATE TABLE IF NOT EXISTS public.planos_sessao_capa (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    paciente_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    especialidade text NOT NULL,
    profissional_referencia text,
    inicio_acompanhamento date,
    frequencia_sessoes text,
    duracao_padrao_sessao text,
    resumo_clinico text,
    objetivos_longo_prazo text,
    historico_revisoes jsonb NOT NULL DEFAULT '[]'::jsonb,
    grafico_pontos jsonb NOT NULL DEFAULT '[]'::jsonb,
    criterios_progressao text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(clinica_id, paciente_id, especialidade)
);

CREATE INDEX IF NOT EXISTS idx_planos_capa_clinica_paciente 
ON public.planos_sessao_capa(clinica_id, paciente_id, especialidade);

ALTER TABLE public.planos_sessao_capa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados acessam capa da sua clínica"
ON public.planos_sessao_capa
FOR ALL TO authenticated
USING (
    clinica_id IN (
        SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
    )
)
WITH CHECK (
    clinica_id IN (
        SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
    )
);

-- 4. Tabela de Auditoria Estrita de Acessos
CREATE TABLE IF NOT EXISTS public.auditoria_acesso_planos_sessao (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id uuid,
    user_id uuid,
    rota text NOT NULL,
    especialidade text,
    acao text NOT NULL, -- 'acesso_permitido', 'bloqueio_404_fora_allowlist', 'bloqueio_modulo_desativado', 'kill_switch_bloqueio'
    resultado text NOT NULL, -- 'PERMITIDO', 'NEGADO'
    ip text,
    user_agent text,
    detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_planos_clinica_data 
ON public.auditoria_acesso_planos_sessao(clinica_id, created_at DESC);

ALTER TABLE public.auditoria_acesso_planos_sessao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins da clínica ou superadmin visualizam auditoria"
ON public.auditoria_acesso_planos_sessao
FOR SELECT TO authenticated
USING (
    clinica_id IN (
        SELECT clinic_id FROM public.users WHERE users.id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

CREATE POLICY "Inserção de auditoria permitida"
ON public.auditoria_acesso_planos_sessao
FOR INSERT TO authenticated
WITH CHECK (true);
