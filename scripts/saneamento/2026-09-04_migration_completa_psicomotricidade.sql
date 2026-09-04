-- =====================================================
-- MIGRATION COMPLETA: Módulo Psicomotricidade
-- Cole INTEIRO no SQL Editor do Supabase e clique RUN
-- =====================================================

-- 1. clinica_modulos (Feature Flags)
CREATE TABLE IF NOT EXISTS public.clinica_modulos (
    clinica_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    modulo_id text NOT NULL,
    ativo boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (clinica_id, modulo_id)
);

ALTER TABLE public.clinica_modulos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Users can view their clinic modules" ON public.clinica_modulos
    FOR SELECT TO authenticated
    USING (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Clinic admins can manage clinic modules" ON public.clinica_modulos
    FOR ALL TO authenticated
    USING (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid() AND role = 'CLINIC_ADMIN'
        )
    )
    WITH CHECK (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid() AND role = 'CLINIC_ADMIN'
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. objetivos_biblioteca
CREATE TABLE IF NOT EXISTS public.objetivos_biblioteca (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    codigo text NOT NULL,
    categoria text NOT NULL,
    descricao_template text NOT NULL,
    estrutura_parametros jsonb NOT NULL DEFAULT '[]'::jsonb,
    versao integer NOT NULL DEFAULT 1,
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(clinica_id, codigo)
);

ALTER TABLE public.objetivos_biblioteca ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Module access for objetivos_biblioteca" ON public.objetivos_biblioteca
    FOR ALL TO authenticated
    USING (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = objetivos_biblioteca.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    )
    WITH CHECK (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = objetivos_biblioteca.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. paciente_objetivos
CREATE TABLE IF NOT EXISTS public.paciente_objetivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
    clinica_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    objetivo_id uuid REFERENCES public.objetivos_biblioteca(id) ON DELETE RESTRICT,
    objetivo_versao integer NOT NULL,
    parametros_definidos jsonb NOT NULL DEFAULT '[]'::jsonb,
    criterio_texto_gerado text NOT NULL,
    data_definicao date NOT NULL DEFAULT CURRENT_DATE,
    profissional_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    status text NOT NULL CHECK (status IN ('ativo', 'adquirido', 'suspenso', 'descontinuado')),
    data_status date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.paciente_objetivos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Module access for paciente_objetivos" ON public.paciente_objetivos
    FOR ALL TO authenticated
    USING (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = paciente_objetivos.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    )
    WITH CHECK (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = paciente_objetivos.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. sessoes_psicomotricidade
CREATE TABLE IF NOT EXISTS public.sessoes_psicomotricidade (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    atendimento_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
    paciente_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
    profissional_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    tipo_sessao text CHECK (tipo_sessao IN ('individual', 'dupla', 'grupo')),
    ambiente text CHECK (ambiente IN ('interno', 'externo', 'misto')),
    tempo_sessao_min integer,
    condicao_inicial jsonb DEFAULT '[]'::jsonb,
    observacoes_iniciais text,
    planejamento_etapas jsonb DEFAULT '[]'::jsonb,
    intercorrencias jsonb DEFAULT '[]'::jsonb,
    descricao_intercorrencia text,
    favoreceu_desempenho text,
    dificuldades_observadas text,
    alterou_planejamento boolean DEFAULT false,
    qual_alteracao text,
    estrategia_melhor_resposta text,
    estrategia_baixa_efetividade text,
    decisao_proxima_sessao jsonb DEFAULT '[]'::jsonb,
    observacoes_proxima_sessao text,
    status_sessao text NOT NULL DEFAULT 'rascunho' CHECK (status_sessao IN ('rascunho', 'encerrada')),
    encerrada_em timestamptz,
    editada_apos_encerramento boolean DEFAULT false,
    editada_em timestamptz,
    editada_por uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sessoes_psicomotricidade ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Module access for sessoes_psicomotricidade" ON public.sessoes_psicomotricidade
    FOR ALL TO authenticated
    USING (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = sessoes_psicomotricidade.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    )
    WITH CHECK (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = sessoes_psicomotricidade.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. sessao_objetivos
CREATE TABLE IF NOT EXISTS public.sessao_objetivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id uuid REFERENCES public.sessoes_psicomotricidade(id) ON DELETE CASCADE,
    clinica_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    paciente_objetivo_id uuid REFERENCES public.paciente_objetivos(id) ON DELETE CASCADE,
    objetivo_id uuid REFERENCES public.objetivos_biblioteca(id) ON DELETE RESTRICT,
    objetivo_versao integer NOT NULL,
    ordem integer NOT NULL CHECK (ordem BETWEEN 1 AND 20),
    criterio_desempenho_esperado text NOT NULL,
    oportunidades_apresentadas integer,
    respostas_adequadas integer,
    percentual_acerto numeric(5,2),
    nivel_ajuda text CHECK (nivel_ajuda IN ('independente', 'pista_visual', 'pista_gestual', 'pista_verbal', 'ajuda_fisica_parcial', 'ajuda_fisica_total')),
    criterio_alcancado text CHECK (criterio_alcancado IN ('sim', 'nao', 'parcial')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT valid_respostas CHECK (respostas_adequadas <= oportunidades_apresentadas)
);

ALTER TABLE public.sessao_objetivos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Module access for sessao_objetivos" ON public.sessao_objetivos
    FOR ALL TO authenticated
    USING (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = sessao_objetivos.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    )
    WITH CHECK (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = sessao_objetivos.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. sessao_estrategias
CREATE TABLE IF NOT EXISTS public.sessao_estrategias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id uuid REFERENCES public.sessoes_psicomotricidade(id) ON DELETE CASCADE,
    clinica_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    categoria text NOT NULL CHECK (categoria IN ('organizacao_antecedente', 'estrategias_ensino', 'estrategias_motivacionais')),
    estrategia text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sessao_estrategias ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Module access for sessao_estrategias" ON public.sessao_estrategias
    FOR ALL TO authenticated
    USING (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = sessao_estrategias.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    )
    WITH CHECK (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = sessao_estrategias.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. ficha_capa
CREATE TABLE IF NOT EXISTS public.ficha_capa_psicomotricidade (
    paciente_id uuid PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
    clinica_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    diagnostico_hipotese text,
    responsavel_legal text,
    contato_responsavel text,
    profissional_referencia uuid REFERENCES public.users(id) ON DELETE SET NULL,
    inicio_acompanhamento date,
    frequencia_sessoes text,
    duracao_padrao_sessao integer,
    resumo_clinico_objetivos text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ficha_capa_psicomotricidade ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Module access for ficha_capa_psicomotricidade" ON public.ficha_capa_psicomotricidade
    FOR ALL TO authenticated
    USING (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = ficha_capa_psicomotricidade.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    )
    WITH CHECK (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = ficha_capa_psicomotricidade.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. ficha_revisoes
CREATE TABLE IF NOT EXISTS public.ficha_revisoes_psicomotricidade (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
    clinica_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    data date NOT NULL DEFAULT CURRENT_DATE,
    profissional_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    observacao_alteracao text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ficha_revisoes_psicomotricidade ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Module access for ficha_revisoes_psicomotricidade" ON public.ficha_revisoes_psicomotricidade
    FOR ALL TO authenticated
    USING (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = ficha_revisoes_psicomotricidade.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    )
    WITH CHECK (
        clinica_id IN (
            SELECT clinic_id FROM public.users WHERE users.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.clinica_modulos
            WHERE clinica_modulos.clinica_id = ficha_revisoes_psicomotricidade.clinica_id
            AND clinica_modulos.modulo_id = 'psicomotricidade_sensory'
            AND clinica_modulos.ativo = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- ATIVAR MÓDULO PARA "ROBSON TESTE"
-- =====================================================
DO $$
DECLARE
    v_clinica_id uuid;
BEGIN
    SELECT id INTO v_clinica_id FROM public.clinics WHERE name ILIKE '%Robson Teste%' LIMIT 1;
    
    IF v_clinica_id IS NULL THEN
        -- Fallback: pega a primeira clínica disponível
        SELECT id INTO v_clinica_id FROM public.clinics LIMIT 1;
    END IF;

    IF v_clinica_id IS NOT NULL THEN
        -- Ativar módulo
        INSERT INTO public.clinica_modulos (clinica_id, modulo_id, ativo)
        VALUES (v_clinica_id, 'psicomotricidade_sensory', true)
        ON CONFLICT (clinica_id, modulo_id) DO UPDATE SET ativo = true;

        -- Seed dos 55 objetivos
        INSERT INTO public.objetivos_biblioteca (clinica_id, codigo, categoria, descricao_template, estrutura_parametros)
        VALUES 
        (v_clinica_id, 'ERP01', 'Engajamento, Regulação e Participação', 'Permanência em atividade motora dirigida (___ min, máx. ___ redirecionamentos)', '[{"tipo": "numero_ou_texto", "rotulo": "minutos"}, {"tipo": "numero_ou_texto", "rotulo": "máx. redirecionamentos"}]'::jsonb),
        (v_clinica_id, 'ERP02', 'Engajamento, Regulação e Participação', 'Seguir a sequência de atividades da rotina (___/___ etapas)', '[{"tipo": "numero_ou_texto", "rotulo": "etapas corretas"}, {"tipo": "numero_ou_texto", "rotulo": "total de etapas"}]'::jsonb),
        (v_clinica_id, 'ERP03', 'Engajamento, Regulação e Participação', 'Transição entre duas atividades (___/___ sem fuga/choro/recusa, máx. ___ prompts)', '[{"tipo": "numero_ou_texto", "rotulo": "corretas"}, {"tipo": "numero_ou_texto", "rotulo": "tentativas"}, {"tipo": "numero_ou_texto", "rotulo": "máx. prompts"}]'::jsonb),
        (v_clinica_id, 'ERP04', 'Engajamento, Regulação e Participação', 'Aceitar o encerramento de atividade preferida (interromper em até ___s, ___/___ oport.)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}, {"tipo": "numero_ou_texto", "rotulo": "sucessos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'ERP05', 'Engajamento, Regulação e Participação', 'Aguardar antes de acessar atividade/material (esperar ___s/min, ___/___ oport.)', '[{"tipo": "numero_ou_texto", "rotulo": "tempo (s/min)"}, {"tipo": "numero_ou_texto", "rotulo": "sucessos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'ERP06', 'Engajamento, Regulação e Participação', 'Aceitar mudança sinalizada na atividade/sequência (aceitar ___ mudanças sem oposição)', '[{"tipo": "numero_ou_texto", "rotulo": "mudanças"}]'::jsonb),
        (v_clinica_id, 'ECC01', 'Esquema Corporal e Consciência Corporal', 'Identificar partes do próprio corpo (___/___ partes corretas)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'ECC02', 'Esquema Corporal e Consciência Corporal', 'Imitar movimentos apresentados pelo profissional (___/___ mov.)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'ECC03', 'Esquema Corporal e Consciência Corporal', 'Reproduzir sequência de movimentos (seq. de ___ mov., ___/___ tentativas)', '[{"tipo": "numero_ou_texto", "rotulo": "movimentos"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "tentativas"}]'::jsonb),
        (v_clinica_id, 'ECC04', 'Esquema Corporal e Consciência Corporal', 'Diferenciar/utilizar direita e esquerda (___/___ comandos corretos)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'ECC05', 'Esquema Corporal e Consciência Corporal', 'Executar movimento cruzando a linha média (___ repetições consecutivas funcionais)', '[{"tipo": "numero_ou_texto", "rotulo": "repetições"}]'::jsonb),
        (v_clinica_id, 'CMG01', 'Coordenação Motora Global', 'Correr com controle corporal e direção definida (___m sem queda/colisão, ___/___ tent.)', '[{"tipo": "numero_ou_texto", "rotulo": "metros"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "tentativas"}]'::jsonb),
        (v_clinica_id, 'CMG02', 'Coordenação Motora Global', 'Saltar com os dois pés simultaneamente (___ saltos consecutivos bipodais)', '[{"tipo": "numero_ou_texto", "rotulo": "saltos"}]'::jsonb),
        (v_clinica_id, 'CMG03', 'Coordenação Motora Global', 'Saltar utilizando apenas um membro inferior (___ saltos/perna, sem apoio externo)', '[{"tipo": "numero_ou_texto", "rotulo": "saltos"}]'::jsonb),
        (v_clinica_id, 'CMG04', 'Coordenação Motora Global', 'Transpor obstáculos com organização motora (___ obstáculos, ___/___ tent.)', '[{"tipo": "numero_ou_texto", "rotulo": "obstáculos"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "tentativas"}]'::jsonb),
        (v_clinica_id, 'CMG05', 'Coordenação Motora Global', 'Combinar diferentes padrões motores em sequência (seq. de ___ ações, ___/___ oport.)', '[{"tipo": "numero_ou_texto", "rotulo": "ações"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'EQP01', 'Equilíbrio e Controle Postural', 'Manter postura corporal estável (equilíbrio estático) (___s sem apoio externo)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}]'::jsonb),
        (v_clinica_id, 'EQP02', 'Equilíbrio e Controle Postural', 'Permanecer em apoio sobre um membro inferior (___s cada lado)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}]'::jsonb),
        (v_clinica_id, 'EQP03', 'Equilíbrio e Controle Postural', 'Caminhar sobre superfície/trajeto delimitado (___m, ___/___ tentativas)', '[{"tipo": "numero_ou_texto", "rotulo": "metros"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "tentativas"}]'::jsonb),
        (v_clinica_id, 'EQP04', 'Equilíbrio e Controle Postural', 'Manter equilíbrio em superfície instável (___s)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}]'::jsonb),
        (v_clinica_id, 'EQP05', 'Equilíbrio e Controle Postural', 'Manter estabilidade de tronco durante a atividade (___ repetições com alinhamento funcional)', '[{"tipo": "numero_ou_texto", "rotulo": "repetições"}]'::jsonb),
        (v_clinica_id, 'COM01', 'Coordenação Óculo-Manual e Óculo-Pedal', 'Arremessar bola em direção a alvo (___/___ acertos a ___m)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}, {"tipo": "numero_ou_texto", "rotulo": "metros"}]'::jsonb),
        (v_clinica_id, 'COM02', 'Coordenação Óculo-Manual e Óculo-Pedal', 'Receber bola utilizando as mãos (___/___ recepções a ___m)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}, {"tipo": "numero_ou_texto", "rotulo": "metros"}]'::jsonb),
        (v_clinica_id, 'COM03', 'Coordenação Óculo-Manual e Óculo-Pedal', 'Chutar bola em direção a alvo (___/___ chutes direcionados)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'COM04', 'Coordenação Óculo-Manual e Óculo-Pedal', 'Interceptar objeto em movimento (___/___ interceptações)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'COM05', 'Coordenação Óculo-Manual e Óculo-Pedal', 'Acompanhar visualmente objeto em movimento (___/___ trajetórias)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'PMP01', 'Planejamento Motor / Praxia', 'Iniciar ação após instrução (em até ___s, ___/___ oport.)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'PMP02', 'Planejamento Motor / Praxia', 'Executar duas ações motoras em sequência (___/___ sem ajuda física)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'PMP03', 'Planejamento Motor / Praxia', 'Executar três ou mais ações em sequência (seq. de ___ etapas, ___/___ oport.)', '[{"tipo": "numero_ou_texto", "rotulo": "etapas"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'PMP04', 'Planejamento Motor / Praxia', 'Completar circuito motor previamente organizado (___ etapas, ___/___ tent.)', '[{"tipo": "numero_ou_texto", "rotulo": "etapas"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "tentativas"}]'::jsonb),
        (v_clinica_id, 'PMP05', 'Planejamento Motor / Praxia', 'Encontrar estratégia p/ superar desafio motor (___/___ com máx. ___ intervenções)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}, {"tipo": "numero_ou_texto", "rotulo": "intervenções"}]'::jsonb),
        (v_clinica_id, 'OET01', 'Organização Espacial e Temporal', 'Responder a dentro/fora, frente/atrás, em cima/embaixo (___/___ comandos corretos)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'OET02', 'Organização Espacial e Temporal', 'Seguir trajeto previamente delimitado (___/___ percursos sem sair da sequência)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'OET03', 'Organização Espacial e Temporal', 'Alterar direção mediante sinalização (___/___ mudanças corretas)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'OET04', 'Organização Espacial e Temporal', 'Executar movimentos acompanhando ritmo apresentado (___s ou ___ repetições no ritmo)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}, {"tipo": "numero_ou_texto", "rotulo": "repetições"}]'::jsonb),
        (v_clinica_id, 'OET05', 'Organização Espacial e Temporal', 'Diferenciar movimentos rápidos e lentos (___/___ comandos corretos)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'ATR01', 'Agilidade e Tempo de Reação', 'Iniciar movimento diante de sinal visual/auditivo (em até ___s, ___/___ oport.)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'ATR02', 'Agilidade e Tempo de Reação', 'Interromper deslocamento mediante sinal (em até ___s, ___/___ oport.)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'ATR03', 'Agilidade e Tempo de Reação', 'Mudar rapidamente a direção do deslocamento (___/___ sem perda de equilíbrio)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'ATR04', 'Agilidade e Tempo de Reação', 'Desviar de obstáculos durante o deslocamento (___ obstáculos, ___/___ sem colisão)', '[{"tipo": "numero_ou_texto", "rotulo": "obstáculos"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'FRC01', 'Força, Resistência e Capacidade Funcional', 'Manter participação em atividade física continuada (___ min, máx. ___ pausas)', '[{"tipo": "numero_ou_texto", "rotulo": "minutos"}, {"tipo": "numero_ou_texto", "rotulo": "pausas"}]'::jsonb),
        (v_clinica_id, 'FRC02', 'Força, Resistência e Capacidade Funcional', 'Realizar tarefa funcional de empurrar (deslocar objeto ___m, ___ repetições)', '[{"tipo": "numero_ou_texto", "rotulo": "metros"}, {"tipo": "numero_ou_texto", "rotulo": "repetições"}]'::jsonb),
        (v_clinica_id, 'FRC03', 'Força, Resistência e Capacidade Funcional', 'Realizar tarefa funcional de puxar (___ repetições com execução funcional)', '[{"tipo": "numero_ou_texto", "rotulo": "repetições"}]'::jsonb),
        (v_clinica_id, 'FRC04', 'Força, Resistência e Capacidade Funcional', 'Transportar objeto durante deslocamento (___m sem soltar, ___/___ tentativas)', '[{"tipo": "numero_ou_texto", "rotulo": "metros"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "tentativas"}]'::jsonb),
        (v_clinica_id, 'FRC05', 'Força, Resistência e Capacidade Funcional', 'Manter determinada posição corporal — sustentação (___s, ___ repetições)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}, {"tipo": "numero_ou_texto", "rotulo": "repetições"}]'::jsonb),
        (v_clinica_id, 'HSP01', 'Habilidades Sociais e Participação em Jogos', 'Aguardar turno em atividade compartilhada (___s, ___/___ oport.)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}, {"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'HSP02', 'Habilidades Sociais e Participação em Jogos', 'Permitir uso compartilhado de materiais (___/___ sem oposição)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'HSP03', 'Habilidades Sociais e Participação em Jogos', 'Seguir regras simples de jogo (___/___ regras cumpridas)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'HSP04', 'Habilidades Sociais e Participação em Jogos', 'Participar de atividade motora com outra pessoa (___ min na atividade compartilhada)', '[{"tipo": "numero_ou_texto", "rotulo": "minutos"}]'::jsonb),
        (v_clinica_id, 'HSP05', 'Habilidades Sociais e Participação em Jogos', 'Aceitar diferentes resultados de atividade competitiva (___ jogos sem abandonar após perda)', '[{"tipo": "numero_ou_texto", "rotulo": "jogos"}]'::jsonb),
        (v_clinica_id, 'HSP06', 'Habilidades Sociais e Participação em Jogos', 'Cooperar com parceiro para objetivo comum (___/___ etapas da atividade cooperativa)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'AUT01', 'Autonomia Durante a Sessão', 'Guardar materiais após o uso (___/___ com máx. pista verbal)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "total"}]'::jsonb),
        (v_clinica_id, 'AUT02', 'Autonomia Durante a Sessão', 'Solicitar ajuda de forma funcional (___/___ oport. em que necessitar)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'AUT03', 'Autonomia Durante a Sessão', 'Comunicar necessidade de pausa (resposta comunicativa antes de abandonar, ___/___ oport.)', '[{"tipo": "numero_ou_texto", "rotulo": "acertos"}, {"tipo": "numero_ou_texto", "rotulo": "oportunidades"}]'::jsonb),
        (v_clinica_id, 'AUT04', 'Autonomia Durante a Sessão', 'Escolher entre atividades/materiais disponíveis (em até ___s entre ___ opções)', '[{"tipo": "numero_ou_texto", "rotulo": "segundos"}, {"tipo": "numero_ou_texto", "rotulo": "opções"}]'::jsonb)
        ON CONFLICT (clinica_id, codigo) DO UPDATE SET
            categoria = EXCLUDED.categoria,
            descricao_template = EXCLUDED.descricao_template,
            estrutura_parametros = EXCLUDED.estrutura_parametros,
            versao = public.objetivos_biblioteca.versao + 1;
    END IF;
END $$;
