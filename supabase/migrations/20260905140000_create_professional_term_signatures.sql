-- Migration: Create professional_term_signatures table and default templates for team contracts
-- Date: 2026-09-05

CREATE TABLE IF NOT EXISTS public.professional_term_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.clinic_document_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'contrato_equipe',
    document_content TEXT NOT NULL,
    signer_name TEXT NOT NULL,
    signer_cpf TEXT,
    signer_phone TEXT,
    signer_email TEXT,
    professional_council TEXT,
    professional_specialty TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SIGNED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
    signing_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    signature_data_url TEXT,
    signed_at TIMESTAMPTZ,
    signed_ip TEXT,
    signed_user_agent TEXT,
    security_hash TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prof_signatures_clinic ON public.professional_term_signatures(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prof_signatures_doctor ON public.professional_term_signatures(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prof_signatures_token ON public.professional_term_signatures(signing_token);
CREATE INDEX IF NOT EXISTS idx_prof_signatures_status ON public.professional_term_signatures(status);

-- Enable RLS
ALTER TABLE public.professional_term_signatures ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'professional_term_signatures' AND policyname = 'Users can view professional signatures from their clinic'
    ) THEN
        CREATE POLICY "Users can view professional signatures from their clinic"
        ON public.professional_term_signatures
        FOR SELECT
        USING (
            clinic_id IN (
                SELECT clinic_id FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'professional_term_signatures' AND policyname = 'Users can insert professional signatures for their clinic'
    ) THEN
        CREATE POLICY "Users can insert professional signatures for their clinic"
        ON public.professional_term_signatures
        FOR INSERT
        WITH CHECK (
            clinic_id IN (
                SELECT clinic_id FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'professional_term_signatures' AND policyname = 'Users can update professional signatures in their clinic'
    ) THEN
        CREATE POLICY "Users can update professional signatures in their clinic"
        ON public.professional_term_signatures
        FOR UPDATE
        USING (
            clinic_id IN (
                SELECT clinic_id FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'professional_term_signatures' AND policyname = 'Users can delete professional signatures in their clinic'
    ) THEN
        CREATE POLICY "Users can delete professional signatures in their clinic"
        ON public.professional_term_signatures
        FOR DELETE
        USING (
            clinic_id IN (
                SELECT clinic_id FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Seeding Default Professional Templates for World Sensory and Demo Clinic
INSERT INTO public.clinic_document_templates (clinic_id, title, category, description, content, is_active)
SELECT 
    c.id as clinic_id,
    'Contrato de Prestação de Serviços e Parceria Profissional (Autônomo/PJ)',
    'contrato_equipe',
    'Contrato formal de admissão e prestação de serviços terapêuticos sem vínculo empregatício (art. 442-B CLT)',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS E PARCERIA PROFISSIONAL

Pelo presente instrumento particular, de um lado:

CONTRATANTE: {{nome_clinica}}, pessoa jurídica de direito privado, doravante denominada simplesmente CLÍNICA.

CONTRATADO(A): {{nome_profissional}}, portador(a) do CPF nº {{cpf_profissional}}, inscrito(a) no Conselho de Classe sob o nº {{conselho_regional}}, atuante na especialidade de {{especialidade}}, com contato eletrônico {{email_profissional}} e telefone {{telefone_profissional}}, doravante denominado(a) simplesmente PROFISSIONAL PARCEIRO(A).

As partes têm, entre si, justo e acordado o que segue:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de atendimento clínico e terapêutico nas dependências e/ou modalidades autorizadas pela CLÍNICA, com total autonomia técnica e científica do(a) PROFISSIONAL PARCEIRO(A), observados rigorosamente os preceitos éticos e regulamentares do seu Conselho de Classe.

CLÁUSULA 2ª - DA NATUREZA DA RELAÇÃO E AUTONOMIA (ART. 442-B CLT)
As partes declaram expressamente que a relação ora pactuada possui natureza estritamente civil de prestação de serviços autônomos ou como pessoa jurídica, inexistindo qualquer subordinação jurídica, hierárquica ou vínculo de emprego regido pela CLT (Consolidação das Leis do Trabalho), nos termos do art. 442-B da CLT (Lei nº 13.467/2017). O(A) PROFISSIONAL PARCEIRO(A) organiza sua própria rotina de atendimentos e métodos terapêuticos.

CLÁUSULA 3ª - DOS HONORÁRIOS E REPASSE
3.1. Pelos serviços efetivamente prestados, a CLÍNICA efetuará o repasse percentual de {{porcentagem_repasse}} incidente sobre o valor líquido faturado e recebido das consultas e sessões terapêuticas realizadas pelo(a) PROFISSIONAL PARCEIRO(A).
3.2. Fica estipulado como valor de referência padrão para consulta/sessão particular o montante de {{valor_consulta}}, sujeito a eventuais pacotes ou convênios acordados formalmente.
3.3. Os repasses serão apurados periodicamente conforme o fechamento financeiro do sistema CliniGO, mediante conferência e emissão do respectivo comprovante/nota fiscal.

CLÁUSULA 4ª - DAS OBRIGAÇÕES DO(A) PROFISSIONAL
O(A) PROFISSIONAL PARCEIRO(A) compromete-se a:
a) Manter ativa e regular a sua inscrição no respectivo Conselho Regional de Classe;
b) Registrar de forma tempestiva e fidedigna no sistema CliniGO todos os prontuários, evoluções de sessões, planos terapêuticos e faltas dos pacientes atendidos;
c) Zelar pelas instalações, equipamentos, brinquedos terapêuticos e materiais disponibilizados pela CLÍNICA;
d) Comunicar previamente eventuais ausências, férias ou impossibilidade de atendimento para reagendamento adequado dos pacientes.

CLÁUSULA 5ª - DO SIGILO E CONFIDENCIALIDADE
O(A) PROFISSIONAL obriga-se a manter absoluto sigilo quanto aos dados clínicos e pessoais dos pacientes atendidos, em estrita conformidade com o Código de Ética Profissional e com a Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018 - LGPD).

CLÁUSULA 6ª - DA VIGÊNCIA E RESCISÃO
O presente contrato vige por prazo indeterminado a partir da data de sua assinatura eletrônica, podendo ser rescindido por qualquer das partes mediante comunicação prévia por escrito com antecedência mínima de 30 (trinta) dias, sem incidência de multa, garantida a conclusão ou transição ética dos tratamentos em curso.

CLÁUSULA 7ª - DA ASSINATURA ELETRÔNICA E VALIDADE JURÍDICA
As partes reconhecem a plena validade jurídica, autenticidade e força probatória da assinatura eletrônica aposta neste instrumento, nos termos da Medida Provisória nº 2.200-2/2001 e da Lei Federal nº 14.063/2020.

E, por estarem assim justas e contratadas, assinam o presente contrato eletronicamente.

Local e Data: {{data_atual}}.',
    true
FROM public.clinics c
WHERE c.id IN ('4c13e586-5390-4393-a180-2c9dd7ed81c7', '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30')
  AND NOT EXISTS (
      SELECT 1 FROM public.clinic_document_templates t 
      WHERE t.clinic_id = c.id AND t.category = 'contrato_equipe'
  );

-- Template 2: Termo de Cessão de Uso de Imagem e Voz do Profissional
INSERT INTO public.clinic_document_templates (clinic_id, title, category, description, content, is_active)
SELECT 
    c.id as clinic_id,
    'Termo de Autorização e Cessão de Uso de Imagem e Voz do Profissional',
    'termo_imagem_profissional',
    'Autorização formal para divulgação institucional, redes sociais (Instagram) e website da clínica',
    'TERMO DE AUTORIZAÇÃO E CESSÃO DE USO DE IMAGEM E VOZ DO PROFISSIONAL

Pelo presente termo:

AUTORIZADOR(A): {{nome_profissional}}, portador(a) do CPF nº {{cpf_profissional}}, inscrito(a) no Conselho de Classe sob o nº {{conselho_regional}}, atuante na especialidade de {{especialidade}}.

FAVORECIDA: {{nome_clinica}}, pessoa jurídica de direito privado.

1. AUTORIZAÇÃO: O(A) AUTORIZADOR(A) AUTORIZA a FAVORECIDA, a título gratuito e de forma espontânea, a utilizar, fixar e veicular sua imagem, fotografia, nome profissional e som de voz para fins exclusivamente institucionais, educativos e de divulgação dos serviços multidisciplinares da clínica.

2. MEIOS DE VEICULAÇÃO: A presente autorização abrange a veiculação em redes sociais oficiais da clínica (incluindo Instagram, Facebook, LinkedIn, YouTube), website institucional, panfletos informativos, materiais gráficos de apresentação de equipe e murais internos.

3. ÉTICA PROFISSIONAL: Fica expressamente assegurado que a veiculação respeitará rigorosamente o decoro profissional e as normas éticas e de publicidade estabelecidas pelo respectivo Conselho de Classe do(a) profissional, sendo vedada qualquer utilização vexatória, descontextualizada ou que fira a honra e a imagem do(a) profissional.

4. VIGÊNCIA E GRATUIDADE: A presente cessão é realizada a título estritamente gratuito, não cabendo qualquer remuneração adicional além dos honorários profissionais pactuados, e perdurará enquanto mantida a atuação profissional junto à clínica, podendo ser revogada mediante notificação por escrito para materiais futuros.

5. VALIDADE JURÍDICA: O presente termo é firmado por assinatura eletrônica com validade assegurada nos termos da MP 2.200-2/2001 e Lei 14.063/2020.

Local e Data: {{data_atual}}.',
    true
FROM public.clinics c
WHERE c.id IN ('4c13e586-5390-4393-a180-2c9dd7ed81c7', '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30')
  AND NOT EXISTS (
      SELECT 1 FROM public.clinic_document_templates t 
      WHERE t.clinic_id = c.id AND t.category = 'termo_imagem_profissional'
  );

-- Template 3: Termo de Confidencialidade, Sigilo Terapêutico e LGPD da Equipe
INSERT INTO public.clinic_document_templates (clinic_id, title, category, description, content, is_active)
SELECT 
    c.id as clinic_id,
    'Termo de Confidencialidade, Sigilo Terapêutico e Proteção de Dados (LGPD) da Equipe',
    'termo_sigilo_equipe',
    'Compromisso formal de sigilo de prontuários, dados de saúde e não divulgação de segredos clínicos',
    'TERMO DE CONFIDENCIALIDADE, SIGILO TERAPÊUTICO E PROTEÇÃO DE DADOS (LGPD)

COMPROMISSÁRIO(A): {{nome_profissional}}, portador(a) do CPF nº {{cpf_profissional}}, inscrito(a) no Conselho de Classe sob o nº {{conselho_regional}}, atuante na especialidade de {{especialidade}}.

CLÍNICA: {{nome_clinica}}.

Por meio deste instrumento, o(a) COMPROMISSÁRIO(A) firma o compromisso solene e irrevogável de cumprir as seguintes diretrizes:

1. DO DEVER DE SIGILO PROFISSIONAL E MÉDICO/TERAPÊUTICO
O(A) COMPROMISSÁRIO(A) reconhece que todos os dados clínicos, prontuários, evoluções de pacientes, diagnósticos, laudos, avaliações neuropsicológicas e filmagens terapêuticas a que tiver acesso em razão da sua atuação na CLÍNICA são estritamente CONFIDENCIAIS, protegidos por sigilo legal e ético inescusável.

2. DA CONFORMIDADE COM A LGPD (LEI Nº 13.709/2018)
Na qualidade de operador(a) de dados pessoais sensíveis de saúde, o(a) COMPROMISSÁRIO(A) compromete-se a:
a) Acessar apenas os prontuários e dados dos pacientes sob seu atendimento direto ou discussão em equipe multidisciplinar autorizada;
b) Não fotografar, filmar ou reproduzir dados de prontuários em dispositivos pessoais não autorizados;
c) Manter em sigilo absoluto suas credenciais de login e senha individual no sistema CliniGO, sendo vedado o compartilhamento com terceiros;
d) Bloquear ou deslogar seu terminal sempre que se ausentar da sala de atendimento.

3. DA VEDAÇÃO DE APROPRIAÇÃO OU DIVULGAÇÃO
É expressamente proibido transferir, divulgar, alienar ou dar conhecimento de informações de pacientes e métodos internos da clínica a quaisquer terceiros ou concorrentes, sob pena de responsabilização civil, criminal (art. 154 do Código Penal) e processo disciplinar perante o respectivo Conselho de Classe.

4. DA PERMANÊNCIA DO DEVER DE SIGILO
O dever de confidencialidade ora assumido permanecerá em vigor por prazo indeterminado, mesmo após o encerramento do vínculo de prestação de serviços com a CLÍNICA.

E por ser a expressão da verdade e compromisso ético, firma o presente termo eletronicamente.

Local e Data: {{data_atual}}.',
    true
FROM public.clinics c
WHERE c.id IN ('4c13e586-5390-4393-a180-2c9dd7ed81c7', '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30')
  AND NOT EXISTS (
      SELECT 1 FROM public.clinic_document_templates t 
      WHERE t.clinic_id = c.id AND t.category = 'termo_sigilo_equipe'
  );
