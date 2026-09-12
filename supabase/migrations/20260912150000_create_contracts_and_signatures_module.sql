-- ==============================================================================
-- Migration: 20260912150000_create_contracts_and_signatures_module.sql
-- Módulo: Gestão Corporativa de Contratos e Assinatura Eletrônica (Clinigo)
-- Padrão: Multi-tenant estrito, LGPD v5.2, RLS, trilha probatória MP 2.200-2/2001
-- ==============================================================================

-- 1. TABELA: Modelos de Contratos da Clínica (contract_templates)
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'prestacao_servicos_pj', 'aditivo_contratual', 'distrato_servicos', 'nda_confidencialidade', 'termo_imagem_profissional', 'termo_imagem_menor', 'termo_geral'
    description TEXT,
    content TEXT NOT NULL, -- Texto completo com tags no formato {{nome_da_variavel}}
    required_variables JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lista de variáveis esperadas
    default_signers JSONB NOT NULL DEFAULT '[]'::jsonb, -- Configuração padrão de signatários
    allowed_target_types TEXT[] NOT NULL DEFAULT ARRAY['PROFESSIONAL', 'PATIENT_LEGAL_GUARDIAN', 'PATIENT_ADULT', 'CUSTOM'],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_clinic_id ON public.contract_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON public.contract_templates(category);

-- 2. TABELA: Instâncias de Contratos Emitidos (contract_documents)
CREATE TABLE IF NOT EXISTS public.contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
    document_number TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aguardando_envio' 
        CHECK (status IN ('rascunho', 'aguardando_envio', 'enviado', 'visualizado', 'assinado_parcial', 'assinado', 'recusado', 'expirado', 'cancelado')),
    rendered_content TEXT NOT NULL, -- Texto final com variáveis preenchidas e inalterável
    variables_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    target_type TEXT NOT NULL DEFAULT 'CUSTOM' 
        CHECK (target_type IN ('PROFESSIONAL', 'PATIENT_LEGAL_GUARDIAN', 'PATIENT_ADULT', 'CUSTOM')),
    target_id UUID, -- doctor_id ou patient_id quando aplicável
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    final_pdf_path TEXT,
    final_document_hash TEXT, -- SHA-256 probatório do documento consolidado
    is_sequential BOOLEAN NOT NULL DEFAULT false, -- Ordem estrita de assinatura
    current_step INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_documents_clinic_id ON public.contract_documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_status ON public.contract_documents(status);
CREATE INDEX IF NOT EXISTS idx_contract_documents_template_id ON public.contract_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_target ON public.contract_documents(target_type, target_id);

-- 3. TABELA: Signatários do Documento (contract_signers)
CREATE TABLE IF NOT EXISTS public.contract_signers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    contract_document_id UUID NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'CONTRATADA', -- 'CONTRATANTE', 'CONTRATADA', 'REPRESENTANTE_LEGAL', 'TESTEMUNHA_1', 'TESTEMUNHA_2', 'OUTRO'
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    document_tax_id TEXT, -- CPF ou CNPJ formatado
    signing_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'VIEWED', 'SIGNED', 'REJECTED', 'EXPIRED')),
    signing_order INTEGER NOT NULL DEFAULT 1,
    viewed_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    signed_ip TEXT,
    signed_user_agent TEXT,
    signature_image_url TEXT, -- Base64 PNG do traço manuscrito
    signer_hash TEXT, -- SHA-256 probatório individual
    reject_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_signers_clinic_id ON public.contract_signers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_contract_signers_document_id ON public.contract_signers(contract_document_id);
CREATE INDEX IF NOT EXISTS idx_contract_signers_token ON public.contract_signers(signing_token);
CREATE INDEX IF NOT EXISTS idx_contract_signers_status ON public.contract_signers(status);

-- 4. TABELA: Trilha Probatória de Auditoria Imutável (contract_audit_events)
CREATE TABLE IF NOT EXISTS public.contract_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    contract_document_id UUID NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
    signer_id UUID REFERENCES public.contract_signers(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'CRIADO', 'ENVIO_EMAIL', 'ENVIO_WHATSAPP', 'VISUALIZADO', 'ASSINADO', 'RECUSADO', 'CANCELADO', 'DOWNLOAD_PDF'
    ip_address TEXT,
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_audit_document_id ON public.contract_audit_events(contract_document_id);
CREATE INDEX IF NOT EXISTS idx_contract_audit_clinic_id ON public.contract_audit_events(clinic_id);

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_audit_events ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES DE RLS (Acesso Autenticado por Clínica ou SUPER_ADMIN)
DO $$
BEGIN
    -- contract_templates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_templates' AND policyname = 'Clinics manage their contract templates') THEN
        CREATE POLICY "Clinics manage their contract templates" ON public.contract_templates
            FOR ALL TO authenticated
            USING (
                clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
                OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
            )
            WITH CHECK (
                clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
                OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
            );
    END IF;

    -- contract_documents
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_documents' AND policyname = 'Clinics manage their contract documents') THEN
        CREATE POLICY "Clinics manage their contract documents" ON public.contract_documents
            FOR ALL TO authenticated
            USING (
                clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
                OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
            )
            WITH CHECK (
                clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
                OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
            );
    END IF;

    -- contract_signers
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_signers' AND policyname = 'Clinics manage their contract signers') THEN
        CREATE POLICY "Clinics manage their contract signers" ON public.contract_signers
            FOR ALL TO authenticated
            USING (
                clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
                OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
            )
            WITH CHECK (
                clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
                OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
            );
    END IF;

    -- contract_audit_events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_audit_events' AND policyname = 'Clinics manage their contract audit events') THEN
        CREATE POLICY "Clinics manage their contract audit events" ON public.contract_audit_events
            FOR ALL TO authenticated
            USING (
                clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
                OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
            )
            WITH CHECK (
                clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
                OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
            );
    END IF;
END $$;

-- 7. SEED: Os 6 Modelos Contratuais Oficiais do DOC.docx para Todas as Clínicas Ativas
DO $$
DECLARE
    clin RECORD;
BEGIN
    FOR clin IN SELECT id, name FROM public.clinics WHERE is_active = true LOOP

        -- Modelo 1: Contrato de Prestação de Serviços (PJ) com Anexo I Proposta Comercial/Técnica
        IF NOT EXISTS (SELECT 1 FROM public.contract_templates WHERE clinic_id = clin.id AND category = 'prestacao_servicos_pj') THEN
            INSERT INTO public.contract_templates (
                clinic_id,
                title,
                category,
                description,
                allowed_target_types,
                required_variables,
                default_signers,
                content
            ) VALUES (
                clin.id,
                'Contrato de Prestação de Serviços (PJ)',
                'prestacao_servicos_pj',
                'Contrato padrão com prestador PJ, com Anexo I integrado, validade de assinatura eletrônica e plataforma de gestão.',
                ARRAY['PROFESSIONAL', 'CUSTOM'],
                '[
                    {"name": "contrato_numero", "label": "Número do Contrato", "group": "Contrato", "required": true},
                    {"name": "contratante_razao_social", "label": "Razão Social da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_cnpj", "label": "CNPJ da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_endereco", "label": "Endereço da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_cidade", "label": "Cidade da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_estado", "label": "UF da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_representante_nome", "label": "Representante Legal da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_representante_cpf", "label": "CPF do Representante da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_representante_email", "label": "E-mail do Representante da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_telefone", "label": "Telefone da Contratante", "group": "Contratante", "required": true},
                    {"name": "prestador_razao_social", "label": "Razão Social do Prestador (PJ)", "group": "Prestador", "required": true},
                    {"name": "prestador_cnpj", "label": "CNPJ do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_endereco", "label": "Endereço do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_cidade", "label": "Cidade do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_estado", "label": "UF do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_representante_nome", "label": "Representante Legal do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_representante_cpf", "label": "CPF do Representante do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_representante_email", "label": "E-mail do Representante do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_telefone", "label": "Telefone do Prestador", "group": "Prestador", "required": true},
                    {"name": "servicos_prestados", "label": "Serviços Prestados", "group": "Serviço", "required": true},
                    {"name": "atribuicoes_servicos_prestados", "label": "Detalhamento e Atribuições dos Serviços", "group": "Serviço", "required": true},
                    {"name": "contrato_vigencia_inicial", "label": "Início da Vigência", "group": "Vigência", "required": true},
                    {"name": "contrato_vigencia_final", "label": "Término da Vigência", "group": "Vigência", "required": true},
                    {"name": "valor_sessao_em_reais", "label": "Valor por Sessão Especializada (R$)", "group": "Valores", "required": true},
                    {"name": "valor_sessao_unimed", "label": "Valor Sessão Convênio Unimed (R$)", "group": "Valores", "required": false},
                    {"name": "nome_cliente_especial_1", "label": "Cliente Especial 1", "group": "Exceções", "required": false},
                    {"name": "valor_cliente_especial_1", "label": "Valor Cliente Especial 1", "group": "Exceções", "required": false},
                    {"name": "nome_cliente_especial_2", "label": "Cliente Especial 2", "group": "Exceções", "required": false},
                    {"name": "valor_cliente_especial_2", "label": "Valor Cliente Especial 2", "group": "Exceções", "required": false},
                    {"name": "nome_cliente_especial_3", "label": "Cliente Especial 3", "group": "Exceções", "required": false},
                    {"name": "valor_cliente_especial_3", "label": "Valor Cliente Especial 3", "group": "Exceções", "required": false},
                    {"name": "nome_cliente_especial_4", "label": "Cliente Especial 4", "group": "Exceções", "required": false},
                    {"name": "valor_cliente_especial_4", "label": "Valor Cliente Especial 4", "group": "Exceções", "required": false}
                ]'::jsonb,
                '[
                    {"role": "CONTRATANTE", "label": "Clínica (Contratante)", "required": true},
                    {"role": "CONTRATADA", "label": "Prestador de Serviços (Contratada)", "required": true},
                    {"role": "TESTEMUNHA_1", "label": "Testemunha 1", "required": false},
                    {"role": "TESTEMUNHA_2", "label": "Testemunha 2", "required": false}
                ]'::jsonb,
'CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº {{contrato_numero}}

{{contratante_razao_social}}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº {{contratante_cnpj}}, com sede na Rua {{contratante_endereco}}, na cidade de {{contratante_cidade}} – {{contratante_estado}}, neste ato representada na forma de seus atos constitutivos por {{contratante_representante_nome}}, sob CPF nº {{contratante_representante_cpf}}, e-mail {{contratante_representante_email}} e sob nº de telefone para contato {{contratante_telefone}}, doravante denominada simplesmente "CONTRATANTE"; e

{{prestador_razao_social}}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº {{prestador_cnpj}}, com sede na Rua {{prestador_endereco}}, na cidade de {{prestador_cidade}} – {{prestador_estado}}, neste ato representada na forma de seus atos constitutivos por {{prestador_representante_nome}}, sob CPF nº {{prestador_representante_cpf}}, e-mail {{prestador_representante_email}} e sob nº de telefone para contato {{prestador_telefone}}, doravante denominada simplesmente "CONTRATADA";

Por este instrumento particular, as partes acima nominadas e qualificadas, ambas representadas na melhor forma de suas constituições sociais, têm entre si, justo e acordado, o presente "CONTRATO DE PRESTAÇÃO DE SERVIÇOS", que reger-se-á mediante cláusulas e condições seguintes:

1. OBJETO
1.1. Através do presente instrumento a CONTRATADA obriga-se a prestar à CONTRATANTE serviços de {{servicos_prestados}}, de forma não exclusiva, onerosa e pelo prazo determinado neste Contrato, ora em diante designado(s) apenas SERVIÇOS.
1.2. O detalhamento dos Serviços encontra-se descrito no Anexo I – Proposta Comercial/Técnica, parte integrante e complementar a esse contrato desde que com este não conflita.

2. DA FORMA DE EXECUÇÃO DOS SERVIÇOS
2.1. A CONTRATADA prestará os SERVIÇOS contratados dentro dos critérios de rigor e qualidade aplicáveis a tais serviços, especialmente quanto à habilidade técnica, desempenho e produtividade dos profissionais alocados, observados os termos e condições indicados neste instrumento.
2.2. A CONTRATADA prestará os serviços nas dependências da CONTRATANTE, em razão da natureza específica da atividade, sem que isso implique em subordinação hierárquica ou vínculo trabalhista.
2.3. A prestação dos serviços ocorrerá preferencialmente dentro do período comercial, exclusivamente em razão do horário de funcionamento, devido a natureza das atividades, não se tratando de controle de jornada, imposição de carga horária ou subordinação hierárquica.
2.4. A CONTRATADA, por seus profissionais, responderá pela guarda, conservação e devolução de quaisquer materiais, documentos, instrumentos e equipamentos de propriedade da CONTRATANTE, eventualmente entregues à CONTRATADA durante a execução dos SERVIÇOS.
2.5. A CONTRATADA, na condição de prestador de serviços, alinhará junto com a CONTRATANTE as atividades que deverão ser desenvolvidas com os respectivos prazos de cumprimento.
2.6. A CONTRATANTE poderá formular dúvidas, solicitações e reclamações quanto aos SERVIÇOS, diretamente à CONTRATADA, conforme disposto neste Contrato.
2.7. Nenhum acompanhamento dos SERVIÇOS executados pela CONTRATADA por parte da CONTRATANTE e nenhuma informação ou documento disponibilizado pela CONTRATADA à CONTRATANTE será entendido como aceitação tácita da qualidade ou da adequação dos SERVIÇOS prestados pela CONTRATADA e, portanto, não a eximirá de qualquer das responsabilidades decorrentes do presente Instrumento.
2.8. A CONTRATADA exercerá suas atividades de maneira autônoma e independente, com liberdade na escolha dos métodos e meios para a prestação dos serviços contratados, respeitado o disposto neste Instrumento.

3. DAS RESPONSABILIDADES DA CONTRATADA
3.1. Sem prejuízo de outras responsabilidades previstas em lei e neste contrato, a CONTRATADA compromete-se a:
a. Executar os serviços objeto deste contrato em estrita concordância com a legislação pertinente. Qualquer dificuldade que venha a ocorrer no cumprimento das condições dos serviços, em virtude de problemas externos, a CONTRATADA informará imediatamente à CONTRATANTE.
b. Respeitar as normas, especificações técnicas e condições de segurança aplicáveis aos serviços;
c. Manter sob sua guarda, durante a execução dos serviços, todos os documentos, especificações e equipamentos fornecidos pela CONTRATANTE, não os cedendo a terceiros, cuidando ainda para a sua manutenção, integridade e qualidade deles.
d. Devolver à CONTRATANTE, após o encerramento dos serviços, todos os documentos, materiais e equipamentos pertinentes ao mesmo, nas mesmas condições que os recebeu, exceto em decorrência de desgaste natural.
e. Manter a CONTRATANTE informada sobre o andamento da execução do objeto deste CONTRATO, conforme a forma de trabalho estabelecida na proposta comercial.
f. Manter o registro de seus profissionais regularizado junto ao Conselho de Classe;
g. Elaborar laudos e relatórios técnicos relativos aos atendimentos realizados, sempre que necessário para o adequado registro das atividades e para o cumprimento de exigências técnicas, éticas ou legais aplicáveis à prestação dos serviços.
h. Realizar o pagamento de todos os tributos, diretos e indiretos, resultantes da prestação de serviços objeto deste contrato e sobre ela incidentes, inclusive os encargos de natureza trabalhista e previdenciária resultantes da mão de obra, que a CONTRATADA utilizar para a prestação dos serviços objeto deste contrato.
i. Utilizar, quando da prestação de serviços, profissionais especializados e em número suficiente, cabendo-lhe total e exclusiva responsabilidade pelo integral cumprimento de toda a legislação que rege os negócios jurídicos com tais profissionais, enfatizadas as áreas tributária, civil, previdenciária e trabalhista.
j. Comunicar a CONTRATANTE por escrito acerca da necessidade de substituição de profissional integrante de sua equipe, indicando os motivos da substituição, bem como os dados pessoais e profissionais do substituto indicado. A substituição somente poderá ocorrer após a concordância da CONTRATANTE, permanecendo a CONTRATADA integralmente responsável pelos serviços prestados por seus profissionais.
k. Indenizar e/ou reembolsar à CONTRATANTE, sem prejuízo da apuração das perdas e danos, todas as despesas judiciais e extrajudiciais que ela tiver decorrentes de reconhecimento judicial de vínculo empregatício, danos a terceiros ou solidariedade trabalhista e previdenciária.
l. Corrigir e/ou refazer, conforme o caso, por sua inteira conta e responsabilidade, os serviços em que se verificarem vícios, defeitos e/ou incorreções.
m. Não caucionar o presente contrato, bem como não descontar duplicatas oriundas com terceiros.
n. Manter-se sempre rigorosamente regular perante as entidades da administração pública e conselhos profissionais.
3.2. É de responsabilidade exclusiva da CONTRATADA a elaboração das evoluções clínicas e a guarda de toda a documentação que compõe o histórico clínico dos pacientes atendidos por força deste contrato, incluindo prontuários, laudos e relatórios.

4. OBRIGAÇÕES DA CONTRATANTE
4.1. Sem prejuízo de outras responsabilidades previstas em lei e neste contrato, a CONTRATANTE deverá:
a. Indicar um ponto de contato para facilitar a comunicação com a CONTRATADA.
b. Assegurar o livre acesso do profissional indicado pela CONTRATADA às suas instalações.
c. Disponibilizar à CONTRATADA os recursos de hardware e software necessários para a execução dos serviços.
d. Fornecer todas as informações necessárias à realização do serviço.
e. Efetuar os pagamentos pactuados na forma estabelecida neste Instrumento.
f. Abster-se de impor jornada de trabalho nem exercer fiscalização sobre a execução dos serviços de forma a caracterizar ingerência na organização interna da CONTRATADA.

5. DO RELACIONAMENTO ENTRE AS PARTES
5.1. Este contrato não estabelece nenhuma sociedade ou Joint-Venture e a CONTRATADA não deverá referir a si como empregado, representante, revendedor ou distribuidor da CONTRATANTE.

6. DO PRAZO
6.1. O presente contrato terá prazo máximo de 1 (um) ano, iniciado a partir da data de {{contrato_vigencia_inicial}}, findando em {{contrato_vigencia_final}}, salvo manifestação em contrário.

7. DO PREÇO E FORMA DE PAGAMENTO
7.1. Em contraprestação aos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor descrito no Anexo I.
7.2. A importância correspondente à prestação de serviços objeto do presente instrumento será paga via depósito em conta bancária de titularidade da Pessoa Jurídica CONTRATADA.

8. DA INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO
8.1. O presente contrato não vincula as partes sob a incidência da relação de emprego prevista no art. 3º da CLT, possuindo estrito caráter de autonomia profissional e técnica.

9. DO SIGILO E CONFIDENCIALIDADE
9.1. A CONTRATADA compromete-se a manter absoluto sigilo sobre quaisquer dados, técnicas, materiais e informações aos quais venha a ter acesso em virtude deste contrato, pelo prazo mínimo de 05 (cinco) anos após o término ou rescisão deste instrumento.

10. LEI GERAL DE PROTEÇÃO DE DADOS (LGPD)
10.1. As partes comprometem-se a cumprir a Lei nº 13.709/2018 (LGPD), tratando dados estritamente para o objeto assistencial e contratual pactuado, assegurando sigilo absoluto sobre dados sensíveis de saúde dos pacientes.

11. ANTICORRUPÇÃO E ÉTICA
11.1. As Partes declaram atuar em estrita observância à Lei nº 12.846/2013 (Lei Anticorrupção).

12. NÃO CONCORRÊNCIA
12.1. A CONTRATADA compromete-se a não realizar atendimentos particulares diretos a pacientes ativos ou encaminhados pela CONTRATANTE pelo período de vigência e até 02 (dois) anos após o término deste contrato.

13. PLATAFORMA DE GESTÃO E ARQUIVAMENTO
13.1. As PARTES acordam a utilização de plataforma tecnológica de governança para registro, controle e arquivamento deste contrato, emissão de notas fiscais e relatórios técnicos.

14. VALIDADE DA ASSINATURA ELETRÔNICA
14.1. As Partes declaram e concordam que a assinatura do presente termo poderá ser realizada eletronicamente, produzindo os mesmos efeitos legais que uma via impressa assinada, nos termos da Lei nº 13.874/2019, Decreto nº 10.278/2020 e art. 784, §4º do Código de Processo Civil. Os signatários concordam expressamente com a utilização de assinatura eletrônica simples ou avançada, nos termos do art. 10, §2º da Medida Provisória nº 2.200-2/2001 e Lei nº 14.063/2020, reconhecendo sua autenticidade, integridade e eficácia probatória plena.

15. DO FORO
15.1. Para dirimir dúvidas oriundas do presente contrato, as partes elegem o foro da Comarca de {{contratante_cidade}}, Estado de {{contratante_estado}}.

E assim, por estarem justos e contratados, assinam o presente instrumento para que produza seus jurídicos e legais efeitos.

{{contratante_cidade}} – {{contratante_estado}}, {{contrato_vigencia_inicial}}.

---------------------------------------------------------
ANEXO I – PROPOSTA COMERCIAL / TÉCNICA

I. DOS SERVIÇOS PRESTADOS:
{{atribuicoes_servicos_prestados}}

II. DO PREÇO:
Valor padrão por sessão especializada realizada (mínimo 45 minutos): R$ {{valor_sessao_em_reais}}.
Valor por sessão de clientes provenientes do convênio Unimed: R$ {{valor_sessao_unimed}}.

Tabela de Atendimento Especial (quando aplicável):
• Cliente {{nome_cliente_especial_1}}: R$ {{valor_cliente_especial_1}} por sessão.
• Cliente {{nome_cliente_especial_2}}: R$ {{valor_cliente_especial_2}} por sessão.
• Cliente {{nome_cliente_especial_3}}: R$ {{valor_cliente_especial_3}} por sessão.
• Cliente {{nome_cliente_especial_4}}: R$ {{valor_cliente_especial_4}} por sessão.

O período de apuração compreende o intervalo entre o dia 16 de um mês e o dia 15 do mês subsequente, com pagamento até o dia 21 mediante envio de Nota Fiscal e devida regularização das evoluções clínicas em prontuário.'
            );
        END IF;

        -- Modelo 2: Termo Aditivo Contratual de Prestação de Serviços
        IF NOT EXISTS (SELECT 1 FROM public.contract_templates WHERE clinic_id = clin.id AND category = 'aditivo_contratual') THEN
            INSERT INTO public.contract_templates (
                clinic_id,
                title,
                category,
                description,
                allowed_target_types,
                required_variables,
                default_signers,
                content
            ) VALUES (
                clin.id,
                'Termo Aditivo Contratual de Prestação de Serviços',
                'aditivo_contratual',
                'Altera cláusulas específicas de contrato de prestação de serviços vigente.',
                ARRAY['PROFESSIONAL', 'CUSTOM'],
                '[
                    {"name": "contrato_numero", "label": "Número do Contrato Principal", "group": "Contrato", "required": true},
                    {"name": "contratante_razao_social", "label": "Razão Social da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_cnpj", "label": "CNPJ da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_cidade", "label": "Cidade da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_estado", "label": "UF da Contratante", "group": "Contratante", "required": true},
                    {"name": "prestador_razao_social", "label": "Razão Social do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_cnpj", "label": "CNPJ do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_representante_nome", "label": "Representante do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_representante_cpf", "label": "CPF do Representante", "group": "Prestador", "required": true},
                    {"name": "data_inicial_do_aditivo", "label": "Data Inicial de Eficácia do Aditivo", "group": "Vigência", "required": true},
                    {"name": "descreva_a_clausula_a_aditivar", "label": "Descrição Detalhada das Cláusulas Aditadas", "group": "Objeto do Aditivo", "required": true}
                ]'::jsonb,
                '[
                    {"role": "CONTRATANTE", "label": "Clínica (Contratante)", "required": true},
                    {"role": "CONTRATADA", "label": "Prestador (Contratada)", "required": true}
                ]'::jsonb,
'TERMO ADITIVO AO CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº {{contrato_numero}}

CONTRATANTE: {{contratante_razao_social}}, inscrita no CNPJ sob nº {{contratante_cnpj}}, com sede em {{contratante_cidade}} – {{contratante_estado}}.

CONTRATADA: {{prestador_razao_social}}, inscrita no CNPJ sob nº {{prestador_cnpj}}, neste ato representada por {{prestador_representante_nome}}, sob CPF nº {{prestador_representante_cpf}}.

As partes acima qualificadas têm, entre si, justo e avençado o presente Termo Aditivo, mediante as seguintes cláusulas:

CLÁUSULA PRIMEIRA – DO OBJETO DO ADITIVO
O presente instrumento tem por objeto aditar as condições contratuais avençadas entre as partes, com início de vigência em {{data_inicial_do_aditivo}}, nos seguintes termos:

{{descreva_a_clausula_a_aditivar}}

CLÁUSULA SEGUNDA – DA RATIFICAÇÃO
Permanecem em pleno vigor e ratificadas todas as demais cláusulas e condições do contrato original que não tenham sido expressamente alteradas por este Termo Aditivo.

CLÁUSULA TERCEIRA – DA ASSINATURA ELETRÔNICA
As Partes declaram a validade da assinatura eletrônica deste Termo Aditivo para todos os fins de direito (Lei nº 13.874/2019, MP nº 2.200-2/2001 e Art. 784, §4º do CPC).

{{contratante_cidade}} – {{contratante_estado}}, {{data_inicial_do_aditivo}}.'
            );
        END IF;

        -- Modelo 3: Distrato de Contrato de Prestação de Serviços
        IF NOT EXISTS (SELECT 1 FROM public.contract_templates WHERE clinic_id = clin.id AND category = 'distrato_servicos') THEN
            INSERT INTO public.contract_templates (
                clinic_id,
                title,
                category,
                description,
                allowed_target_types,
                required_variables,
                default_signers,
                content
            ) VALUES (
                clin.id,
                'Distrato de Contrato de Prestação de Serviços',
                'distrato_servicos',
                'Instrumento de rescisão e quitação de contrato de prestação de serviços entre clínica e prestador.',
                ARRAY['PROFESSIONAL', 'CUSTOM'],
                '[
                    {"name": "contrato_numero", "label": "Número do Contrato a Rescindir", "group": "Contrato", "required": true},
                    {"name": "contratante_razao_social", "label": "Razão Social da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_cnpj", "label": "CNPJ da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_cidade", "label": "Cidade da Contratante", "group": "Contratante", "required": true},
                    {"name": "contratante_estado", "label": "UF da Contratante", "group": "Contratante", "required": true},
                    {"name": "prestador_razao_social", "label": "Razão Social do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_cnpj", "label": "CNPJ do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_representante_nome", "label": "Representante do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_representante_cpf", "label": "CPF do Representante", "group": "Prestador", "required": true},
                    {"name": "data_de_rescisao_do_contrato", "label": "Data Efetiva da Rescisão", "group": "Rescisão", "required": true},
                    {"name": "prazo_para_devolucao_bens", "label": "Prazo para Devolução de Materiais/Bens (dias)", "group": "Rescisão", "required": true}
                ]'::jsonb,
                '[
                    {"role": "CONTRATANTE", "label": "Clínica (Contratante)", "required": true},
                    {"role": "CONTRATADA", "label": "Prestador (Contratada)", "required": true}
                ]'::jsonb,
'TERMO DE DISTRATO AO CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº {{contrato_numero}}

CONTRATANTE: {{contratante_razao_social}}, inscrita no CNPJ sob nº {{contratante_cnpj}}, com sede em {{contratante_cidade}} – {{contratante_estado}}.

CONTRATADA: {{prestador_razao_social}}, inscrita no CNPJ sob nº {{prestador_cnpj}}, neste ato representada por {{prestador_representante_nome}}, sob CPF nº {{prestador_representante_cpf}}.

As partes acima qualificadas resolvem, de comum acordo, pôr fim à relação contratual mantida sob o Contrato nº {{contrato_numero}}, mediante os termos a seguir:

1. DO ENCERRAMENTO:
Fica rescindido de pleno direito na data de {{data_de_rescisao_do_contrato}} o Contrato de Prestação de Serviços outrora celebrado.

2. DA DEVOLUÇÃO DE BENS E PRONTUÁRIOS:
A CONTRATADA obriga-se a devolver à CONTRATANTE, no prazo improrrogável de {{prazo_para_devolucao_bens}} dias a contar desta assinatura, todos os materiais, instrumentos, documentos, crachás e relatórios clínicos que estejam em sua posse, assegurando a guarda e entrega completa de todas as evoluções clínicas em sistema.

3. DA QUITAÇÃO:
Cumpridas as obrigações pendentes de apuração final de serviços efetivamente prestados e faturados até a data da rescisão, as Partes outorgam-se mutuamente a mais ampla, geral e irrevogável quitação, para nada mais reclamar a qualquer título.

4. DA PERMANÊNCIA DO SIGILO:
As obrigações de confidencialidade e proteção de dados (LGPD) permanecem plenamente vigentes pelo prazo de 05 (cinco) anos após esta rescisão.

{{contratante_cidade}} – {{contratante_estado}}, {{data_de_rescisao_do_contrato}}.'
            );
        END IF;

        -- Modelo 4: Acordo de Confidencialidade (NDA)
        IF NOT EXISTS (SELECT 1 FROM public.contract_templates WHERE clinic_id = clin.id AND category = 'nda_confidencialidade') THEN
            INSERT INTO public.contract_templates (
                clinic_id,
                title,
                category,
                description,
                allowed_target_types,
                required_variables,
                default_signers,
                content
            ) VALUES (
                clin.id,
                'Acordo de Confidencialidade e Sigilo (NDA)',
                'nda_confidencialidade',
                'Termo de confidencialidade, proteção de segredos comerciais, protocolos clínicos e LGPD.',
                ARRAY['PROFESSIONAL', 'CUSTOM'],
                '[
                    {"name": "contratante_razao_social", "label": "Razão Social da Reveladora (Clínica)", "group": "Clínica", "required": true},
                    {"name": "contratante_cnpj", "label": "CNPJ da Reveladora", "group": "Clínica", "required": true},
                    {"name": "contratante_cidade", "label": "Cidade da Clínica", "group": "Clínica", "required": true},
                    {"name": "contratante_estado", "label": "UF da Clínica", "group": "Clínica", "required": true},
                    {"name": "prestador_razao_social", "label": "Razão Social da Receptora (Prestador)", "group": "Prestador", "required": true},
                    {"name": "prestador_cnpj", "label": "CNPJ do Prestador", "group": "Prestador", "required": true},
                    {"name": "prestador_representante_nome", "label": "Representante Legal da Receptora", "group": "Prestador", "required": true},
                    {"name": "prestador_representante_cpf", "label": "CPF do Representante", "group": "Prestador", "required": true}
                ]'::jsonb,
                '[
                    {"role": "CONTRATANTE", "label": "Parte Reveladora (Clínica)", "required": true},
                    {"role": "CONTRATADA", "label": "Parte Receptora (Prestador)", "required": true}
                ]'::jsonb,
'ACORDO DE CONFIDENCIALIDADE E NÃO DIVULGAÇÃO (NDA)

PARTE REVELADORA: {{contratante_razao_social}}, inscrita no CNPJ sob nº {{contratante_cnpj}}, com sede em {{contratante_cidade}} – {{contratante_estado}}.

PARTE RECEPTORA: {{prestador_razao_social}}, inscrita no CNPJ sob nº {{prestador_cnpj}}, neste ato representada por {{prestador_representante_nome}}, sob CPF nº {{prestador_representante_cpf}}.

As Partes acordam manter o mais rigoroso sigilo quanto a quaisquer Informações Confidenciais transmitidas, observadas as seguintes disposições:

1. DEFINIÇÃO:
Considera-se Informação Confidencial todo dado técnico, prontuário médico ou terapêutico, plano de atendimento, identidade de pacientes, método clínico, modelo de negócio, tabela de preços e segredo de negócio da PARTE REVELADORA.

2. OBRIGAÇÕES DA PARTE RECEPTORA:
A PARTE RECEPTORA compromete-se a: (a) utilizar as informações exclusivamente para o desempenho de suas atividades clínicas contratadas; (b) proteger as informações com o mesmo grau de cuidado que dispensaria às suas próprias informações confidenciais; (c) não copiar, divulgar ou transmitir a terceiros sem autorização prévia por escrito.

3. PRAZO DE VIGÊNCIA DO SIGILO:
As obrigações de confidencialidade deste acordo vigorarão pelo período de vinculação contratual e por 05 (cinco) anos após o seu encerramento.

4. LGPD E DADOS SENSÍVEIS DE SAÚDE:
O tratamento de dados sensíveis de pacientes observará estritamente os termos da Lei nº 13.709/2018 (LGPD), respondendo a Parte infratora pelas sanções civis, administrativas e criminais cabíveis.

{{contratante_cidade}} – {{contratante_estado}}.'
            );
        END IF;

        -- Modelo 5: Termo de Autorização de Uso de Imagem — Profissional
        IF NOT EXISTS (SELECT 1 FROM public.contract_templates WHERE clinic_id = clin.id AND category = 'termo_imagem_profissional') THEN
            INSERT INTO public.contract_templates (
                clinic_id,
                title,
                category,
                description,
                allowed_target_types,
                required_variables,
                default_signers,
                content
            ) VALUES (
                clin.id,
                'Termo de Autorização de Uso de Imagem — Profissional',
                'termo_imagem_profissional',
                'Cessão e autorização de uso de imagem e voz para fins institucionais e científicos da clínica.',
                ARRAY['PROFESSIONAL', 'CUSTOM'],
                '[
                    {"name": "contratante_razao_social", "label": "Razão Social da Clínica (Cessionária)", "group": "Clínica", "required": true},
                    {"name": "contratante_cnpj", "label": "CNPJ da Clínica", "group": "Clínica", "required": true},
                    {"name": "contratante_cidade", "label": "Cidade da Clínica", "group": "Clínica", "required": true},
                    {"name": "contratante_estado", "label": "UF da Clínica", "group": "Clínica", "required": true},
                    {"name": "prestador_representante_nome", "label": "Nome do Profissional (Cedente)", "group": "Profissional", "required": true},
                    {"name": "prestador_representante_cpf", "label": "CPF do Profissional", "group": "Profissional", "required": true}
                ]'::jsonb,
                '[
                    {"role": "CONTRATADA", "label": "Profissional (Cedente)", "required": true},
                    {"role": "CONTRATANTE", "label": "Clínica (Cessionária)", "required": true}
                ]'::jsonb,
'TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E VOZ — PROFISSIONAL

CESSIONÁRIA: {{contratante_razao_social}}, inscrita no CNPJ sob nº {{contratante_cnpj}}, sediada em {{contratante_cidade}} – {{contratante_estado}}.

CEDENTE: {{prestador_representante_nome}}, portador(a) do CPF nº {{prestador_representante_cpf}}.

Pelo presente termo, o(a) CEDENTE autoriza, de forma livre, espontânea e gratuita, o uso de sua imagem e voz pela CESSIONÁRIA, para fins exclusivos de divulgação institucional, científica, educativa e em redes sociais oficiais da clínica, vedada qualquer utilização descontextualizada ou que atente contra a honra, moral ou reputação do profissional.

A presente autorização é firmada a título gratuito, em conformidade com o art. 20 do Código Civil Brasileiro e Lei nº 13.709/2018 (LGPD).

{{contratante_cidade}} – {{contratante_estado}}.'
            );
        END IF;

        -- Modelo 6: Termo de Autorização de Uso de Imagem — Paciente Menor
        IF NOT EXISTS (SELECT 1 FROM public.contract_templates WHERE clinic_id = clin.id AND category = 'termo_imagem_menor') THEN
            INSERT INTO public.contract_templates (
                clinic_id,
                title,
                category,
                description,
                allowed_target_types,
                required_variables,
                default_signers,
                content
            ) VALUES (
                clin.id,
                'Termo de Autorização de Uso de Imagem — Paciente Menor',
                'termo_imagem_menor',
                'Autorização assinada pelo responsável legal para registro institucional e pedagógico de paciente menor.',
                ARRAY['PATIENT_LEGAL_GUARDIAN', 'CUSTOM'],
                '[
                    {"name": "contratante_razao_social", "label": "Razão Social da Clínica (Cessionária)", "group": "Clínica", "required": true},
                    {"name": "contratante_cnpj", "label": "CNPJ da Clínica", "group": "Clínica", "required": true},
                    {"name": "contratante_cidade", "label": "Cidade da Clínica", "group": "Clínica", "required": true},
                    {"name": "contratante_estado", "label": "UF da Clínica", "group": "Clínica", "required": true},
                    {"name": "nome_completo_responsavel", "label": "Nome Completo do Responsável Legal", "group": "Responsável", "required": true},
                    {"name": "cpf_responsavel", "label": "CPF do Responsável Legal", "group": "Responsável", "required": true},
                    {"name": "rg_responsavel", "label": "RG do Responsável Legal", "group": "Responsável", "required": false},
                    {"name": "nacionalidade_responsavel", "label": "Nacionalidade do Responsável", "group": "Responsável", "required": false},
                    {"name": "estado_civil_responsavel", "label": "Estado Civil do Responsável", "group": "Responsável", "required": false},
                    {"name": "profissao_responsavel", "label": "Profissão do Responsável", "group": "Responsável", "required": false},
                    {"name": "endereco_responsavel", "label": "Endereço do Responsável", "group": "Responsável", "required": false},
                    {"name": "nome_completo_menor", "label": "Nome Completo do Menor (Paciente)", "group": "Menor", "required": true},
                    {"name": "nacionalidade_menor", "label": "Nacionalidade do Menor", "group": "Menor", "required": false},
                    {"name": "data_nascimento_menor", "label": "Data de Nascimento do Menor", "group": "Menor", "required": false}
                ]'::jsonb,
                '[
                    {"role": "REPRESENTANTE_LEGAL", "label": "Responsável Legal do Paciente", "required": true},
                    {"role": "CONTRATANTE", "label": "Clínica (Cessionária)", "required": true}
                ]'::jsonb,
'TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E VOZ — PACIENTE MENOR DE IDADE

CESSIONÁRIA: {{contratante_razao_social}}, inscrita no CNPJ sob nº {{contratante_cnpj}}, sediada em {{contratante_cidade}} – {{contratante_estado}}.

REPRESENTANTE LEGAL (CEDENTE): {{nome_completo_responsavel}}, nacionalidade {{nacionalidade_responsavel}}, estado civil {{estado_civil_responsavel}}, profissão {{profissao_responsavel}}, portador(a) do RG nº {{rg_responsavel}} e inscrito(a) no CPF nº {{cpf_responsavel}}, residente e domiciliado(a) em {{endereco_responsavel}}, na qualidade de genitor(a) / representante legal do(a) menor:

MENOR BENEFICIÁRIO(A): {{nome_completo_menor}}, nacionalidade {{nacionalidade_menor}}, nascido(a) em {{data_nascimento_menor}}.

Pelo presente instrumento, o(a) REPRESENTANTE LEGAL autoriza a CESSIONÁRIA a registrar e utilizar a imagem e voz do(a) menor supracitado(a), com estrita finalidade de:
(a) Registro de evolução clínica terapêutica;
(b) Discussão em reuniões científicas internas e estudos de caso multidisciplinares;
(c) Divulgação institucional em canais oficiais da clínica, respeitando-se rigorosamente a dignidade e a integridade moral do menor, nos termos do Estatuto da Criança e do Adolescente (Lei nº 8.069/1990) e da LGPD (Lei nº 13.709/2018, art. 14).

A presente autorização é firmada a título gratuito.

{{contratante_cidade}} – {{contratante_estado}}.'
            );
        END IF;

    END LOOP;
END $$;
