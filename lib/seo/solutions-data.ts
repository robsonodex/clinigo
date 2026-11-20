export interface SolutionComparisonRow {
    criterion: string
    genericSoftware: string
    clinigo: string
}

export interface SolutionFaq {
    question: string
    answer: string
}

export interface SolutionFeature {
    code: string
    title: string
    description: string
}

export interface SolutionPageData {
    slug: string
    shortLabel: string
    councilBadge: string
    seoTitle: string
    seoDescription: string
    keywords: string[]
    h1Before: string
    h1Accent: string
    h1After: string
    subtitle: string
    directAnswerTitle: string
    directAnswerBody: string
    directAnswerFacts: string[]
    recommendedPlan: {
        name: string
        price: string
        reason: string
    }
    features: SolutionFeature[]
    comparison: SolutionComparisonRow[]
    faqs: SolutionFaq[]
    relatedSlugs: string[]
    relatedBlogSlugs: string[]
}

export const SOLUTIONS_DATA: SolutionPageData[] = [
    {
        slug: 'clinica-multidisciplinar',
        shortLabel: 'Clínica Multidisciplinar',
        councilBadge: 'PSICOLOGIA · ABA · FONO · TO · PSICOMOTRICIDADE · FISIO',
        seoTitle: 'Sistema para Clínica Multidisciplinar de Terapias',
        seoDescription:
            'Software completo para clínicas de terapias multidisciplinares: agenda recorrente com co-terapia, workspaces por especialidade, sigilo RBAC/RLS, WhatsApp automático, TISS ANS, biometria facial e repasse.',
        keywords: [
            'sistema para clínica multidisciplinar',
            'software para clínica de terapias multidisciplinares',
            'sistema de gestão clínica de terapia',
            'agenda recorrente clínica multidisciplinar',
            'sistema clínica neurodesenvolvimento',
        ],
        h1Before: 'Sistema operacional para ',
        h1Accent: 'clínicas multidisciplinares',
        h1After: ' de terapias.',
        subtitle:
            'Unifique Psicologia, ABA, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia em uma arquitetura feita para terapias seriadas — sem planilhas paralelas.',
        directAnswerTitle: 'Por que clínicas multidisciplinares precisam de um sistema especializado em terapias',
        directAnswerBody:
            'Clínicas multidisciplinares atendem o mesmo paciente em múltiplas especialidades por semana, com séries recorrentes, co-terapia, salas temáticas e regras distintas de conselhos (CRP, CRFa, CREFITO). O CliniGo centraliza agenda, prontuários isolados por perfil, faturamento TISS e repasses individuais em um único ambiente auditável.',
        directAnswerFacts: [
            'Agenda recorrente minuto a minuto (40, 45, 50 ou 120 min) com suporte nativo a co-terapia e reserva de salas.',
            'Isolamento real por perfil (RBAC + RLS no servidor): cada terapeuta acessa apenas seus próprios pacientes.',
            'BI de Terapia com retenção, risco de evasão, fila de espera multidisciplinar e conformidade de evoluções.',
            'Motor de repasse automático por profissional, convênio ou paciente, acoplado ao TISS ANS e à biometria facial.',
        ],
        recommendedPlan: {
            name: 'Avançado ou Professional',
            price: 'A partir de R$ 249/mês',
            reason: 'Avançado (até 5 licenças) inclui BI de Terapia, WhatsApp e repasse; Professional (até 30 licenças) adiciona TISS ANS, biometria facial, Totem e Painel de TV.',
        },
        features: [
            {
                code: 'AGENDA · SÉRIES',
                title: 'Recorrência flexível, co-terapia e salas',
                description:
                    'Monte séries semanais, quinzenais ou mensais por duração real, vincule salas sensoriais sem colisão e agende dois terapeutas na mesma sessão sem conflito falso.',
            },
            {
                code: 'WORKSPACES · 6 ÁREAS',
                title: 'Prontuário estruturado por disciplina',
                description:
                    'Cada área trabalha com sua terminologia: programas ABA, SOAP em Psicologia, domínios fonológicos em Fonoaudiologia, AVD em TO, gráfico psicomotor e avaliação funcional.',
            },
            {
                code: 'LGPD · RBAC / RLS',
                title: 'Sigilo clínico aplicado no banco de dados',
                description:
                    'Recepção, coordenação, financeiro e terapeutas operam no mesmo sistema visualizando exclusivamente o que compete ao seu papel, com sessão única auditada.',
            },
            {
                code: 'FINANCEIRO · TISS',
                title: 'Repasses automáticos e convênios ANS',
                description:
                    'Apure a produção individual por contrato, convênio ou paciente considerando apenas sessões realizadas e gere lotes XML TISS com dupla comprovação biométrica.',
            },
        ],
        comparison: [
            {
                criterion: 'Agenda de terapias seriadas e co-terapia',
                genericSoftware: 'Blocos fixos voltados a consulta única; acusa conflito em atendimento conjunto.',
                clinigo: 'Séries flexíveis (40, 45, 50 ou 120 min), co-terapia nativa e bloqueio de salas.',
            },
            {
                criterion: 'Sigilo entre especialidades (CRP, CRFa, CREFITO)',
                genericSoftware: 'Prontuário único visível para vários perfis ou oculto apenas na tela.',
                clinigo: 'Isolamento RBAC e RLS direto no servidor e no banco de dados.',
            },
            {
                criterion: 'Faltas, reposições e saldo de sessões',
                genericSoftware: 'Controle manual em planilhas externas ou anotações soltas.',
                clinigo: 'Créditos de reposição e saldo por pacote ou guia integrados à grade.',
            },
            {
                criterion: 'Fechamento de repasse por profissional',
                genericSoftware: 'Cálculo genérico por percentual fixo ou fechamento manual no fim do mês.',
                clinigo: 'Regras individuais por terapeuta, contrato, convênio e exceção por paciente.',
            },
        ],
        faqs: [
            {
                question: 'Um único cadastro do paciente integra todas as especialidades sem quebrar o sigilo?',
                answer:
                    'Sim. A ficha cadastral e a agenda são compartilhadas com a recepção e a coordenação, enquanto as evoluções clínicas permanecem isoladas por perfil e conselho (RBAC/RLS) diretamente no servidor.',
            },
            {
                question: 'Como funciona o limite de profissionais em clínicas multidisciplinares maiores?',
                answer:
                    'O plano Avançado inclui até 5 licenças (R$ 249/mês) e o Professional inclui até 30 licenças (R$ 449/mês) em 1 unidade operacional. Licenças extras avulsas custam R$ 49,90/mês por usuário adicional.',
            },
            {
                question: 'O sistema controla fila de espera para várias terapias ao mesmo tempo?',
                answer:
                    'Sim. A fila de espera multidisciplinar organiza a demanda por especialidade e disponibilidade, facilitando o preenchimento de horários liberados pelas confirmações automáticas no WhatsApp.',
            },
            {
                question: 'A equipe consegue aprender a usar sem parar a agenda da clínica?',
                answer:
                    'Sim. Além da implantação e configuração inicial, o treinamento é 100% autônomo pelo Guia de Uso integrado em todas as telas, filtrado automaticamente pelo perfil de cada colaborador.',
            },
        ],
        relatedSlugs: ['clinica-aba', 'psicologia', 'fonoaudiologia', 'terapia-ocupacional', 'faturamento-tiss-terapias'],
        relatedBlogSlugs: ['agenda-recorrente-co-terapia', 'lgpd-sigilo-clinico-rbac', 'repasse-profissional-regras-individuais'],
    },
    {
        slug: 'clinica-aba',
        shortLabel: 'ABA e Neurodesenvolvimento',
        councilBadge: 'ABPMC · INTERVENÇÃO PRECOCE E TEA',
        seoTitle: 'Sistema para Clínica ABA e Neurodesenvolvimento (TEA)',
        seoDescription:
            'Software especializado para clínicas de terapia ABA e neurodesenvolvimento: planos terapêuticos, metas de pareamento, níveis de ajuda, folha de tentativas, co-terapia, supervisão e TISS com biometria facial.',
        keywords: [
            'sistema para clínica ABA',
            'software terapia ABA',
            'sistema clínica autismo TEA',
            'prontuário eletrônico ABA',
            'folha de tentativas ABA software',
            'biometria facial convênio terapia ABA',
        ],
        h1Before: 'Sistema para ',
        h1Accent: 'clínicas ABA',
        h1After: ' e neurodesenvolvimento.',
        subtitle:
            'Estruture programas de pareamento, níveis de ajuda, co-terapia, supervisão de conformidade e comprovação biométrica para convênios em uma plataforma criada para intervenção contínua.',
        directAnswerTitle: 'O que um sistema para clínica ABA precisa resolver na prática',
        directAnswerBody:
            'Clínicas de Análise do Comportamento Aplicada (ABA) operam cargas semanais intensivas (muitas vezes de 10 a 20 horas por criança), com aplicadores, supervisores, dupla de terapeutas e auditorias rigorosas de operadoras de saúde. O CliniGo une plano terapêutico ABA, registro de níveis de ajuda, supervisão de evoluções e check-in biométrico facial vinculado às guias TISS.',
        directAnswerFacts: [
            'Planos de sessão ABA com metas parametrizadas, critérios de aquisição e acompanhamento longitudinal.',
            'Registro estruturado de níveis de ajuda (independente, dica gestual, dica parcial ou ajuda total).',
            'Suporte nativo a dupla de terapeutas e supervisão em sala sem gerar conflito na agenda.',
            'Dupla comprovação biométrica facial de presença vinculada às guias TISS para blindar contra glosas.',
        ],
        recommendedPlan: {
            name: 'Professional',
            price: 'R$ 449/mês',
            reason: 'Inclui até 30 licenças para aplicadores e supervisores, faturamento TISS ANS completo, gestão de glosas e biometria facial multi-superfície.',
        },
        features: [
            {
                code: 'ABA · PROGRAMAS',
                title: 'Planos terapêuticos e níveis de ajuda',
                description:
                    'Organize alvos de pareamento, comunicação funcional e autonomia com critérios claros de aquisição e registro rápido de dicas em cada sessão.',
            },
            {
                code: 'SUPERVISÃO · BI',
                title: 'Auditoria de evoluções e carga da equipe',
                description:
                    'A supervisão acompanha em tempo real quais sessões realizadas ainda não possuem evolução fechada e monitora aderência e risco de evasão.',
            },
            {
                code: 'AGENDA · CO-TERAPIA',
                title: 'Dupla de terapeutas e grade intensiva',
                description:
                    'Agende blocos de 50 a 120 minutos em séries recorrentes com supervisão simultânea na mesma sala sem quebrar o controle de horas.',
            },
            {
                code: 'TISS · BIOMETRIA',
                title: 'Presença comprovada para operadoras',
                description:
                    'Valide a chegada da criança ou responsável por biometria facial na sala, totem ou celular e vincule a evidência diretamente às guias XML TISS.',
            },
        ],
        comparison: [
            {
                criterion: 'Registro de programas ABA e níveis de ajuda',
                genericSoftware: 'Apenas campo de texto livre sem critérios de aquisição nem níveis de dica.',
                clinigo: 'Metas estruturadas, critérios mensuráveis e registro de nível de ajuda por alvo.',
            },
            {
                criterion: 'Supervisão de aplicadores na mesma sessão',
                genericSoftware: 'Bloqueia o agendamento por conflito de horário do paciente.',
                clinigo: 'Co-terapia nativa que permite aplicador e supervisor no mesmo atendimento.',
            },
            {
                criterion: 'Comprovação de presença em guias de alta frequência',
                genericSoftware: 'Listas de assinatura em papel sujeitas a perda e glosa do convênio.',
                clinigo: 'Biometria facial multi-superfície acoplada ao controle de saldo e guias TISS.',
            },
            {
                criterion: 'Termos e autorizações assinados pelas famílias',
                genericSoftware: 'Impressão e arquivamento físico na recepção.',
                clinigo: 'Pré-cadastro e assinatura eletrônica no celular com validade Lei 14.063/2020 e SHA-256.',
            },
        ],
        faqs: [
            {
                question: 'O CliniGo permite acompanhar a evolução dos alvos ABA ao longo dos meses?',
                answer:
                    'Sim. Os planos terapêuticos registram critérios de aquisição, nível de ajuda por sessão e comparação entre encontros anteriores para apoiar a condução e as devolutivas da supervisão.',
            },
            {
                question: 'Como a biometria facial funciona para crianças em terapia ABA?',
                answer:
                    'O check-in biométrico pode validar o paciente ou o responsável legal na chegada, diretamente no dispositivo da sala, no totem da recepção, na webcam do terapeuta ou via link temporário no celular.',
            },
            {
                question: 'Posso controlar quantas sessões restam na guia autorizada do convênio?',
                answer:
                    'Sim. O módulo TISS controla autorizações prévias, vigência de senhas, códigos TUSS e saldo de sessões realizadas, alertando antes de realizar atendimentos descobertos.',
            },
            {
                question: 'Supervisores e aplicadores têm permissões diferentes no sistema?',
                answer:
                    'Sim. O controle RBAC/RLS separa estritamente os papéis de recepção, terapeuta/aplicador, coordenação e financeiro diretamente no servidor.',
            },
        ],
        relatedSlugs: ['clinica-multidisciplinar', 'faturamento-tiss-terapias', 'terapia-ocupacional', 'fonoaudiologia'],
        relatedBlogSlugs: ['como-escolher-sistema-clinica-aba', 'planos-terapeuticos-aba-evolucoes', 'faturamento-tiss-terapias-glosas'],
    },
    {
        slug: 'psicologia',
        shortLabel: 'Psicologia',
        councilBadge: 'CRP · SIGILO CLÍNICO E EVOLUÇÃO SOAP',
        seoTitle: 'Sistema para Clínica de Psicologia com Sigilo CRP e LGPD',
        seoDescription:
            'Software para clínicas de psicologia com prontuário eletrônico estruturado (SOAP), sigilo clínico RBAC/RLS no servidor exigido pelo CRP, teleconsulta WebRTC, agenda recorrente e repasse.',
        keywords: [
            'sistema para clínica de psicologia',
            'software psicologia CRP',
            'prontuário eletrônico psicologia sigilo',
            'sistema para psicólogos com teleconsulta',
            'agenda recorrente psicologia',
        ],
        h1Before: 'Sistema para clínicas de ',
        h1Accent: 'Psicologia',
        h1After: ' com sigilo real.',
        subtitle:
            'Prontuário estruturado em formato SOAP, isolamento rigoroso no servidor alinhado ao CRP e à LGPD, teleconsulta WebRTC integrada e controle de séries semanais ou quinzenais.',
        directAnswerTitle: 'Como o CliniGo protege o sigilo exigido pelo CRP em clínicas de Psicologia',
        directAnswerBody:
            'Em clínicas de Psicologia com vários profissionais, esconder prontuários apenas na interface não basta. O CliniGo aplica controle de acesso baseado em perfil (RBAC) e políticas de isolamento por linha (RLS) no banco de dados: cada psicólogo acessa exclusivamente os registros dos seus próprios pacientes, com sessão única auditada e assinatura eletrônica com registro de CRP.',
        directAnswerFacts: [
            'Isolamento real no servidor (RBAC + RLS): recepção, financeiro e outros colegas não visualizam evoluções psicológicas.',
            'Evoluções em estrutura SOAP com metas terapêuticas e comparação longitudinal entre sessões.',
            'Teleconsulta WebRTC integrada ao prontuário sem necessidade de aplicativos externos.',
            'Séries semanais ou quinzenais com confirmação automática via WhatsApp e controle de faltas/reposições.',
        ],
        recommendedPlan: {
            name: 'Básico ou Avançado',
            price: 'A partir de R$ 149/mês',
            reason: 'Básico (R$ 149/mês, 1 licença) atende psicólogo autônomo com prontuário, agenda e teleconsulta; Avançado (R$ 249/mês, até 5 licenças) adiciona WhatsApp, BI e repasse.',
        },
        features: [
            {
                code: 'CRP · SIGILO',
                title: 'Isolamento estrito de prontuário por profissional',
                description:
                    'Apenas o psicólogo responsável lê e edita suas evoluções. A recepção agenda e faz pré-cadastro sem nunca acessar conteúdo clínico sensível.',
            },
            {
                code: 'SOAP · METAS',
                title: 'Evolução estruturada e revisão periódica',
                description:
                    'Registre sessões em formato SOAP, defina metas terapêuticas, compare evoluções anteriores e assine com número de registro no CRP.',
            },
            {
                code: 'WEBRTC · ONLINE',
                title: 'Teleconsulta nativa e assinatura de termos',
                description:
                    'Atenda online por WebRTC integrado ao prontuário e colete contratos de atendimento e consentimentos LGPD no celular do paciente (Lei 14.063/2020).',
            },
            {
                code: 'AGENDA · REPASSE',
                title: 'Séries recorrentes e extrato individual',
                description:
                    'Gerencie sessões semanais ou quinzenais, lembretes no WhatsApp e libere ao psicólogo apenas seu próprio demonstrativo de produção.',
            },
        ],
        comparison: [
            {
                criterion: 'Sigilo do prontuário psicológico entre equipe',
                genericSoftware: 'Administradores ou colegas visualizam todo o histórico do paciente.',
                clinigo: 'RBAC + RLS no banco de dados garantindo sigilo estrito por profissional.',
            },
            {
                criterion: 'Teleatendimento e termos de consentimento',
                genericSoftware: 'Links soltos em apps externos e PDF enviado manualmente.',
                clinigo: 'Teleconsulta WebRTC nativa e assinatura eletrônica com IP e SHA-256.',
            },
            {
                criterion: 'Controle de faltas e pacotes de psicoterapia',
                genericSoftware: 'Anotações manuais fora da agenda.',
                clinigo: 'Saldo de pacotes, faltas justificadas e reposições dentro da série recorrente.',
            },
            {
                criterion: 'Extrato de produção do psicólogo',
                genericSoftware: 'Planilhas enviadas por e-mail com risco de erro de cálculo.',
                clinigo: 'Motor automático de repasse com painel individual privado por profissional.',
            },
        ],
        faqs: [
            {
                question: 'A recepcionista ou o financeiro conseguem ler as evoluções psicológicas?',
                answer:
                    'Não. As permissões RBAC e RLS bloqueiam o acesso a evoluções clínicas diretamente no servidor. A recepção vê apenas dados cadastrais e agenda; o financeiro vê lançamentos administrativos.',
            },
            {
                question: 'O CliniGo funciona tanto para psicólogo autônomo quanto para clínica com vários psicólogos?',
                answer:
                    'Sim. O plano Básico (R$ 149/mês) atende 1 profissional completo com agenda, prontuário e teleconsulta; os planos Avançado (até 5 licenças) e Professional (até 30 licenças) escalam para equipes completas.',
            },
            {
                question: 'A teleconsulta precisa de integração paga com Zoom ou Google Meet?',
                answer:
                    'Não. O CliniGo possui sala de teleconsulta WebRTC nativa incluída desde o plano Básico, integrada ao agendamento e ao prontuário.',
            },
            {
                question: 'Consigo emitir contrato terapêutico e termo LGPD com assinatura digital?',
                answer:
                    'Sim. O paciente ou responsável assina pelo celular via link ou QR Code sem precisar criar conta, gerando registro probatório com data, IP e hash SHA-256 (Lei 14.063/2020).',
            },
        ],
        relatedSlugs: ['clinica-multidisciplinar', 'clinica-aba', 'fonoaudiologia', 'terapia-ocupacional'],
        relatedBlogSlugs: ['sigilo-prontuario-crp-crfa-crefito', 'lgpd-sigilo-clinico-rbac', 'confirmacao-whatsapp-reducao-faltas'],
    },
    {
        slug: 'fonoaudiologia',
        shortLabel: 'Fonoaudiologia',
        councilBadge: 'CRFa · LINGUAGEM E MOTRICIDADE OROFACIAL',
        seoTitle: 'Sistema para Clínica de Fonoaudiologia (CRFa)',
        seoDescription:
            'Software para fonoaudiólogos e clínicas de fonoaudiologia: plano fonoaudiológico por domínio, anexos privados para áudios e relatórios, agenda recorrente, saldo de sessões e faturamento TISS.',
        keywords: [
            'sistema para clínica de fonoaudiologia',
            'software fonoaudiologia CRFa',
            'prontuário eletrônico fonoaudiologia',
            'gestão clínica fonoaudiologia convênio TISS',
            'agenda recorrente fonoaudiólogo',
        ],
        h1Before: 'Sistema para clínicas de ',
        h1Accent: 'Fonoaudiologia',
        h1After: '.',
        subtitle:
            'Registre metas de linguagem oral, consciência fonológica, pragmática e motricidade orofacial com anexos criptografados, controle de saldo de sessões e faturamento TISS.',
        directAnswerTitle: 'Como o CliniGo atende a rotina clínica e administrativa da Fonoaudiologia',
        directAnswerBody:
            'O acompanhamento fonoaudiológico exige continuidade semanal ou bissemanal, armazenamento seguro de áudios, vídeos e relatórios de orientação familiar, além de controle rigoroso de guias de convênio. O CliniGo oferece workspace dedicado à Fonoaudiologia (CRFa), anexos privados com URL assinada, agenda de 45 minutos recorrente e integração completa com TISS e repasses.',
        directAnswerFacts: [
            'Plano fonoaudiológico estruturado por domínio fonológico, pragmático, linguagem expressiva e motricidade orofacial.',
            'Anexos privados com URLs temporárias criptografadas para áudios, exames e guias de treino domiciliar.',
            'Agenda minuto a minuto (40, 45 ou 50 min) com co-terapia para sessões conjuntas com TO ou ABA.',
            'Controle de saldo de sessões, faltas, reposições e faturamento TISS no padrão ANS.',
        ],
        recommendedPlan: {
            name: 'Avançado ou Professional',
            price: 'A partir de R$ 249/mês',
            reason: 'Para equipes de fonoaudiologia com WhatsApp e repasse (Avançado) ou clínicas conveniadas com TISS ANS e biometria facial (Professional).',
        },
        features: [
            {
                code: 'CRFa · PLANO',
                title: 'Metas por domínio fonoaudiológico',
                description:
                    'Acompanhe articulação, consciência fonológica, comunicação alternativa e motricidade orofacial com histórico comparativo e assinatura CRFa.',
            },
            {
                code: 'STORAGE · LGPD',
                title: 'Anexos privados para áudios e relatórios',
                description:
                    'Guarde avaliações, registros de fala e materiais de orientação em armazenamento isolado por clínica com links temporários criptografados.',
            },
            {
                code: 'AGENDA · SALDO',
                title: 'Séries de 45 min, reposições e co-terapia',
                description:
                    'Configure a duração exata da sessão fonoaudiológica, registre faltas com crédito de reposição e realize atendimentos conjuntos sem conflitos.',
            },
            {
                code: 'CONVÊNIOS · TISS',
                title: 'Autorizações prévias e gestão de glosas',
                description:
                    'Valide códigos TUSS, acompanhe o saldo autorizado da guia e vincule a biometria facial para evitar glosas em terapias seriadas.',
            },
        ],
        comparison: [
            {
                criterion: 'Estrutura clínica para linguagem e motricidade orofacial',
                genericSoftware: 'Anamnese médica padrão incompatível com evolução fonoaudiológica.',
                clinigo: 'Workspace dedicado à Fonoaudiologia com metas por domínio e assinatura CRFa.',
            },
            {
                criterion: 'Anexos de áudio e relatórios de orientação',
                genericSoftware: 'Arquivos salvos no WhatsApp ou pastas locais sem trilha LGPD.',
                clinigo: 'Armazenamento privado isolado com URLs assinadas temporárias.',
            },
            {
                criterion: 'Duração real de sessões (45 min) e recorrência',
                genericSoftware: 'Grade rígida de 30 ou 60 minutos que gera espaços ociosos.',
                clinigo: 'Agenda minuto a minuto com séries automáticas e controle de faltas.',
            },
            {
                criterion: 'Atendimento conjunto com TO ou ABA',
                genericSoftware: 'Impede dois terapeutas no mesmo horário para o mesmo paciente.',
                clinigo: 'Co-terapia nativa integrada à produção individual de cada profissional.',
            },
        ],
        faqs: [
            {
                question: 'Posso anexar áudios, exames audiológicos e relatórios no prontuário?',
                answer:
                    'Sim. O CliniGo armazena documentos e anexos em área privada isolada por clínica, acessada exclusivamente via URLs temporárias assinadas em conformidade com a LGPD.',
            },
            {
                question: 'A agenda aceita sessões de 45 minutos recorrentes toda semana?',
                answer:
                    'Sim. A agenda opera minuto a minuto e permite criar séries semanais, quinzenais ou mensais com durações como 40, 45, 50 ou 120 minutos.',
            },
            {
                question: 'O sistema calcula o repasse diferenciado quando há convênio e particular?',
                answer:
                    'Sim. O motor de repasse permite definir regras distintas por fonoaudiólogo, por convênio, por contrato ou por paciente específico.',
            },
            {
                question: 'É possível enviar lembretes automáticos para os pais pelo WhatsApp?',
                answer:
                    'Sim. A partir do plano Avançado, o WhatsApp integrado envia lembretes e processa confirmações direto na agenda da clínica.',
            },
        ],
        relatedSlugs: ['clinica-multidisciplinar', 'clinica-aba', 'terapia-ocupacional', 'psicomotricidade'],
        relatedBlogSlugs: ['agenda-recorrente-co-terapia', 'faturamento-tiss-terapias-glosas', 'confirmacao-whatsapp-reducao-faltas'],
    },
    {
        slug: 'terapia-ocupacional',
        shortLabel: 'Terapia Ocupacional',
        councilBadge: 'CREFITO · INTEGRAÇÃO SENSORIAL E AVD',
        seoTitle: 'Sistema para Terapia Ocupacional e Sala Sensorial (CREFITO)',
        seoDescription:
            'Software para clínicas de Terapia Ocupacional: planos de integração sensorial e AVD, reserva de salas sensoriais sem sobreposição, co-terapia com Fono/ABA, evolução CREFITO e TISS.',
        keywords: [
            'sistema para terapia ocupacional',
            'software terapia ocupacional CREFITO',
            'gestão sala sensorial clínica',
            'prontuário eletrônico terapia ocupacional',
            'sistema clínica integração sensorial',
        ],
        h1Before: 'Sistema para ',
        h1Accent: 'Terapia Ocupacional',
        h1After: ' e gestão de salas sensoriais.',
        subtitle:
            'Reserve Salas Sensoriais e de AVD sem sobreposição, acompanhe objetivos de integração sensorial e coordenação fina e opere co-terapia com registro CREFITO.',
        directAnswerTitle: 'Como o CliniGo elimina gargalos de sala sensorial e agenda na Terapia Ocupacional',
        directAnswerBody:
            'Um dos maiores gargalos em clínicas com Terapia Ocupacional é a disputa por espaços físicos especializados — como a Sala de Integração Sensorial ou a Sala de AVD. O CliniGo vincula a reserva da sala física diretamente à série recorrente do paciente, bloqueia sobreposições automaticamente e oferece workspace clínico próprio para objetivos ocupacionais e co-atendimentos.',
        directAnswerFacts: [
            'Reserva de Salas Sensoriais e de AVD acoplada à agenda recorrente, impedindo colisões entre terapeutas.',
            'Planos de TO e AVD com objetivos de integração sensorial, coordenação fina e autonomia comparáveis entre sessões.',
            'Co-terapia nativa para sessões conjuntas de TO com Fonoaudiologia ou ABA.',
            'Conformidade de evoluções, assinatura com registro CREFITO, TISS ANS e repasse por profissional.',
        ],
        recommendedPlan: {
            name: 'Avançado ou Professional',
            price: 'A partir de R$ 249/mês',
            reason: 'Gestão completa de salas, equipe multidisciplinar, BI de aderência/evasão e faturamento de convênios com biometria facial.',
        },
        features: [
            {
                code: 'SALAS · GRADE',
                title: 'Reserva inteligente de Sala Sensorial e AVD',
                description:
                    'Vincule cada sessão recorrente à sala física utilizada. O sistema impede que dois terapeutas reservem a Sala Sensorial no mesmo horário.',
            },
            {
                code: 'CREFITO · TO / AVD',
                title: 'Workspace de integração sensorial e autonomia',
                description:
                    'Registre tolerância tátil-proprioceptiva, preensão fina, atividades de vida diária e critérios de progressão com assinatura CREFITO.',
            },
            {
                code: 'CO-TERAPIA',
                title: 'Sessões conjuntas sem conflito de agenda',
                description:
                    'Agende atendimentos integrados de Terapia Ocupacional com Fonoaudiologia ou ABA mantendo o cálculo exato de produção de cada profissional.',
            },
            {
                code: 'BI · CONFORMIDADE',
                title: 'Acompanhamento de faltas, reposições e evoluções',
                description:
                    'Identifique precocemente quedas de frequência no BI de Terapia e garanta evoluções em dia antes do fechamento mensal.',
            },
        ],
        comparison: [
            {
                criterion: 'Controle de uso da Sala Sensorial',
                genericSoftware: 'Não bloqueia recurso físico compartilhado; conflitos descobertos na hora da sessão.',
                clinigo: 'Bloqueio físico de sala acoplado à série recorrente com visualização imediata.',
            },
            {
                criterion: 'Prontuário voltado para integração sensorial e AVD',
                genericSoftware: 'Formulários médicos genéricos sem metas ocupacionais.',
                clinigo: 'Planos de TO e AVD estruturados por objetivos, nível de ajuda e progresso.',
            },
            {
                criterion: 'Co-atendimento interdisciplinar',
                genericSoftware: 'Exige duplicar paciente ou criar agendamentos improvisados.',
                clinigo: 'Co-terapia nativa com múltiplos profissionais no mesmo atendimento.',
            },
            {
                criterion: 'Assinatura de termos e contratos pelas famílias',
                genericSoftware: 'Papelada física na recepção.',
                clinigo: 'Assinatura eletrônica no celular com validade jurídica Lei 14.063/2020.',
            },
        ],
        faqs: [
            {
                question: 'O sistema impede dois terapeutas ocupacionais de reservarem a Sala Sensorial no mesmo horário?',
                answer:
                    'Sim. As salas físicas são cadastradas como recursos vinculados à agenda. Ao agendar ou gerar séries recorrentes, o sistema valida a disponibilidade da sala e bloqueia sobreposições.',
            },
            {
                question: 'Consigo registrar co-atendimento de Terapia Ocupacional com Fonoaudiologia?',
                answer:
                    'Sim. O recurso de co-terapia permite incluir dois profissionais na mesma sessão do paciente sem gerar falso conflito, contabilizando corretamente a produção de ambos.',
            },
            {
                question: 'Os prontuários de TO ficam separados do prontuário de Psicologia?',
                answer:
                    'Sim. O isolamento RBAC/RLS no servidor respeita as fronteiras de sigilo de cada conselho e perfil de acesso configurado pela clínica.',
            },
            {
                question: 'O CliniGo atende convênios TISS para Terapia Ocupacional?',
                answer:
                    'Sim. O plano Professional inclui autorizações prévias, códigos TUSS, geração de lotes XML ANS, gestão de glosas e comprovação biométrica de presença.',
            },
        ],
        relatedSlugs: ['clinica-multidisciplinar', 'clinica-aba', 'fonoaudiologia', 'psicomotricidade'],
        relatedBlogSlugs: ['agenda-recorrente-co-terapia', 'planos-terapeuticos-aba-evolucoes', 'sigilo-prontuario-crp-crfa-crefito'],
    },
    {
        slug: 'psicomotricidade',
        shortLabel: 'Psicomotricidade',
        councilBadge: 'CATÁLOGO DE OBJETIVOS E GRÁFICO EVOLUTIVO',
        seoTitle: 'Sistema para Clínica de Psicomotricidade com Gráfico Evolutivo',
        seoDescription:
            'Software dedicado à Psicomotricidade: catálogo de objetivos psicomotores (tônus, equilíbrio, lateralidade e organização espacial), capa clínica, gráfico evolutivo automático e agenda recorrente.',
        keywords: [
            'sistema para psicomotricidade',
            'software psicomotricidade clínica',
            'prontuário eletrônico psicomotricidade',
            'gráfico evolutivo psicomotricidade',
            'gestão clínica psicomotricista',
        ],
        h1Before: 'Sistema dedicado à ',
        h1Accent: 'Psicomotricidade',
        h1After: ' com gráfico evolutivo.',
        subtitle:
            'Catálogo estruturado de tônus, equilíbrio, lateralidade e organização espacial, capa clínica do acompanhamento e gráficos gerados automaticamente a partir das sessões.',
        directAnswerTitle: 'Por que o CliniGo se destaca no acompanhamento em Psicomotricidade',
        directAnswerBody:
            'Diferente de sistemas genéricos que oferecem apenas um bloco de texto corrido, o CliniGo conta com módulo dedicado à Psicomotricidade: catálogo estruturado de objetivos psicomotores, capa clínica de acompanhamento, revisões periódicas documentadas e geração automática de gráfico evolutivo para devolutivas claras às famílias e escolas.',
        directAnswerFacts: [
            'Catálogo estruturado cobrindo tônus, equilíbrio, lateralidade, coordenação global e organização espacial.',
            'Gráfico evolutivo automático construído a partir dos registros de cada sessão.',
            'Capa clínica do acompanhamento com revisões periódicas organizadas.',
            'Agenda recorrente integrada à reserva de sala motora, WhatsApp automático e repasses.',
        ],
        recommendedPlan: {
            name: 'Básico ou Avançado',
            price: 'A partir de R$ 149/mês',
            reason: 'Módulo de Psicomotricidade incluído desde o Básico (R$ 149/mês); Avançado (R$ 249/mês) adiciona BI, WhatsApp e repasses para clínicas com equipe.',
        },
        features: [
            {
                code: 'MOT · CATÁLOGO',
                title: 'Catálogo de objetivos psicomotores',
                description:
                    'Selecione e parametrize metas de tônus, equilíbrio, lateralidade, ritmo e noção espacial com critérios objetivos de progresso.',
            },
            {
                code: 'EVOLUÇÃO · GRÁFICO',
                title: 'Gráfico evolutivo automático',
                description:
                    'Visualize a progressão do paciente ao longo dos ciclos trimestrais para embasar relatórios e reuniões de devolutiva com responsáveis.',
            },
            {
                code: 'CAPA CLÍNICA',
                title: 'Histórico contínuo e revisões periódicas',
                description:
                    'Mantenha a capa clínica atualizada com frequência semanal, marcos evolutivos e condutas para o próximo encontro.',
            },
            {
                code: 'SALA MOTORA',
                title: 'Agenda recorrente e controle de faltas',
                description:
                    'Reserve a Sala Motora em séries recorrentes, gerencie reposições de sessões e acione lembretes automáticos via WhatsApp.',
            },
        ],
        comparison: [
            {
                criterion: 'Catálogo de objetivos psicomotores',
                genericSoftware: 'Inexistente; exige digitação repetitiva em texto livre.',
                clinigo: 'Catálogo estruturado de tônus, equilíbrio, lateralidade e organização espacial.',
            },
            {
                criterion: 'Visualização da evolução para devolutivas',
                genericSoftware: 'Profissional precisa montar gráficos manualmente no Excel.',
                clinigo: 'Gráfico evolutivo automático alimentado pelas próprias evoluções.',
            },
            {
                criterion: 'Integração com equipe multidisciplinar',
                genericSoftware: 'Dados isolados em ferramentas desconexas.',
                clinigo: 'Mesma plataforma para Psicomotricidade, Psicologia, ABA, Fono, TO e Fisioterapia.',
            },
            {
                criterion: 'Termos eletrônicos e pré-cadastro familiar',
                genericSoftware: 'Fichas impressas preenchidas na recepção.',
                clinigo: 'Link/QR Code no celular com assinatura jurídica Lei 14.063/2020.',
            },
        ],
        faqs: [
            {
                question: 'O módulo de Psicomotricidade está disponível já no plano Básico?',
                answer:
                    'Sim. O prontuário por especialidade — incluindo o acompanhamento estruturado de Psicomotricidade — está disponível desde o plano Básico (R$ 149/mês).',
            },
            {
                question: 'Como o gráfico evolutivo de Psicomotricidade é gerado?',
                answer:
                    'Ele é alimentado automaticamente pelos registros objetivos lançados a cada sessão, exibindo a evolução longitudinal do paciente sem precisar exportar para planilhas.',
            },
            {
                question: 'Posso integrar a Psicomotricidade com outras especialidades da mesma clínica?',
                answer:
                    'Sim. O CliniGo foi projetado para clínicas multidisciplinares, integrando agenda, sala motora, fila de espera e repasses entre todas as disciplinas.',
            },
            {
                question: 'O sistema ajuda a reduzir faltas em sessões semanais?',
                answer:
                    'Sim. O WhatsApp integrado envia lembretes e confirmações automáticas vinculadas à agenda, enquanto o BI de Terapia sinaliza faltas consecutivas e risco de evasão.',
            },
        ],
        relatedSlugs: ['clinica-multidisciplinar', 'terapia-ocupacional', 'fisioterapia', 'clinica-aba'],
        relatedBlogSlugs: ['planos-terapeuticos-aba-evolucoes', 'agenda-recorrente-co-terapia', 'confirmacao-whatsapp-reducao-faltas'],
    },
    {
        slug: 'fisioterapia',
        shortLabel: 'Fisioterapia',
        councilBadge: 'CREFITO · AVALIAÇÃO FUNCIONAL E REABILITAÇÃO',
        seoTitle: 'Sistema para Clínica de Fisioterapia com Agenda Recorrente e TISS',
        seoDescription:
            'Software para clínicas de fisioterapia: avaliação funcional, comparação evolutiva por ciclo, agenda recorrente por sala, pacotes e reposições, convênios TISS ANS, biometria facial e repasse.',
        keywords: [
            'sistema para clínica de fisioterapia',
            'software fisioterapia CREFITO',
            'prontuário eletrônico fisioterapia',
            'sistema fisioterapia agenda recorrente e pacotes',
            'faturamento TISS fisioterapia',
        ],
        h1Before: 'Sistema para clínicas de ',
        h1Accent: 'Fisioterapia',
        h1After: ' e reabilitação.',
        subtitle:
            'Controle avaliação funcional, evolução motora comparativa, pacotes de sessões, agenda por sala, repasses por fisioterapeuta e faturamento TISS sem planilhas.',
        directAnswerTitle: 'Como o CliniGo organiza a operação de clínicas de Fisioterapia',
        directAnswerBody:
            'Clínicas de Fisioterapia lidam com alto giro de sessões seriadas, pacotes fechados, reposições, uso simultâneo de salas/boxes e grande volume de guias de convênio. O CliniGo une avaliação funcional e comparação entre sessões à agenda recorrente por sala, controle automático de pacotes/saldos, biometria facial de presença e geração de lotes XML TISS.',
        directAnswerFacts: [
            'Capa clínica funcional com diagnóstico fisioterapêutico, frequência e critérios de progressão.',
            'Comparação direta de evolução motora entre sessões do ciclo com assinatura CREFITO.',
            'Gestão de pacotes, faltas, reposições e reserva de salas acoplada ao financeiro.',
            'Faturamento TISS completo, gestão de glosas e motor automático de repasse por fisioterapeuta.',
        ],
        recommendedPlan: {
            name: 'Avançado ou Professional',
            price: 'A partir de R$ 249/mês',
            reason: 'Avançado (até 5 licenças) cobre pacotes, WhatsApp e repasses; Professional (até 30 licenças) inclui TISS ANS, biometria facial, Totem e Painel de TV.',
        },
        features: [
            {
                code: 'CREFITO · FUNCIONAL',
                title: 'Avaliação funcional e evolução comparativa',
                description:
                    'Documente estabilidade postural, mobilidade, marcha e metas funcionais com comparação rápida entre sessões do ciclo.',
            },
            {
                code: 'PACOTES · SALAS',
                title: 'Pacotes de sessões, reposições e grade por sala',
                description:
                    'Acompanhe automaticamente o saldo de sessões contratadas ou autorizadas, reagende reposições e organize a ocupação de cada sala.',
            },
            {
                code: 'TISS · PRESENÇA',
                title: 'Convênios ANS com check-in biométrico',
                description:
                    'Controle validade de guias, gere lotes XML TISS e comprove cada sessão realizada com biometria facial na recepção ou na sala.',
            },
            {
                code: 'PRODUÇÃO · REPASSE',
                title: 'Repasse automático por fisioterapeuta',
                description:
                    'Elimine planilhas no fechamento mensal calculando automaticamente a produção por regra individual, convênio ou pacote.',
            },
        ],
        comparison: [
            {
                criterion: 'Controle de saldo de pacotes e guias seriadas',
                genericSoftware: 'Baixa manual de sessões em fichas de papel ou planilhas.',
                clinigo: 'Saldo atualizado automaticamente conforme sessões realizadas e reposições válidas.',
            },
            {
                criterion: 'Comprovação de presença para operadoras',
                genericSoftware: 'Guia física assinada suscetível a rasura ou extravio.',
                clinigo: 'Biometria facial multi-superfície vinculada às guias TISS.',
            },
            {
                criterion: 'Fechamento de repasse da equipe',
                genericSoftware: 'Horas conferindo agendas e tabelas de convênio manualmente.',
                clinigo: 'Motor automático por profissional com demonstrativo individual transparente.',
            },
            {
                criterion: 'Recepção de alto fluxo',
                genericSoftware: 'Fila desorganizada sem integração com a agenda.',
                clinigo: 'Totem de autoatendimento, check-in QR/Facial e Painel de TV com chamada.',
            },
        ],
        faqs: [
            {
                question: 'O CliniGo controla pacotes de 10 ou 20 sessões de fisioterapia?',
                answer:
                    'Sim. O controle de pacotes, saldo de sessões, faltas justificadas e créditos de reposição é nativo desde o plano Básico.',
            },
            {
                question: 'Funciona para clínicas que atendem Fisioterapia junto com outras terapias?',
                answer:
                    'Sim. Você pode operar Fisioterapia isoladamente ou integrada a Psicologia, ABA, Fonoaudiologia, Terapia Ocupacional e Psicomotricidade na mesma unidade.',
            },
            {
                question: 'O sistema gera lotes XML no padrão TISS da ANS?',
                answer:
                    'Sim. O plano Professional inclui faturamento TISS completo, geração de lotes XML ANS, controle de autorizações prévias e gestão de glosas e recursos.',
            },
            {
                question: 'Consigo usar Painel de TV e Totem na recepção da clínica de fisioterapia?',
                answer:
                    'Sim. O plano Professional inclui Totem de autoatendimento com emissão de senha/check-in e Painel de TV com chamada sonora e visual na sala de espera.',
            },
        ],
        relatedSlugs: ['clinica-multidisciplinar', 'faturamento-tiss-terapias', 'terapia-ocupacional', 'psicomotricidade'],
        relatedBlogSlugs: ['faturamento-tiss-terapias-glosas', 'repasse-profissional-regras-individuais', 'agenda-recorrente-co-terapia'],
    },
    {
        slug: 'faturamento-tiss-terapias',
        shortLabel: 'TISS e Biometria Facial',
        councilBadge: 'ANS TISS · XML · GESTÃO DE GLOSAS · BIOMETRIA FACIAL',
        seoTitle: 'Faturamento TISS e Biometria Facial para Clínicas de Terapias',
        seoDescription:
            'Reduza glosas em terapias seriadas com faturamento TISS padrão ANS, controle de autorizações prévias e saldo de sessões, lotes XML e dupla comprovação de presença por biometria facial.',
        keywords: [
            'faturamento TISS clínicas de terapias',
            'biometria facial presença convênio TISS',
            'sistema gestão de glosas terapias',
            'lote XML ANS clínica ABA e terapias',
            'comprovação de presença TISS terapias seriadas',
        ],
        h1Before: 'Faturamento ',
        h1Accent: 'TISS e biometria facial',
        h1After: ' para terapias seriadas.',
        subtitle:
            'Blinde sua clínica contra glosas evitáveis unindo autorizações prévias, controle de saldo de sessões, lotes XML no padrão ANS e dupla comprovação biométrica de presença.',
        directAnswerTitle: 'Como reduzir glosas de convênios em clínicas de terapias seriadas',
        directAnswerBody:
            'Em clínicas de terapias multidisciplinares e ABA, a maior parte das glosas acontece por três falhas operacionais: sessão realizada com senha vencida, divergência de código TUSS ou contestação de comparecimento pela operadora. O CliniGo resolve o ciclo ponta a ponta: valida saldo e vigência na agenda, coleta biometria facial multi-superfície na chegada, gera lotes XML no padrão ANS e rastreia glosas e recursos por guia.',
        directAnswerFacts: [
            'Controle de autorizações prévias, vigência de senhas, códigos TUSS e saldo de sessões antes do atendimento.',
            'Check-in biométrico facial na sala, totem, webcam da terapeuta ou link temporário no celular.',
            'Geração de guias e lotes XML no padrão ANS com rastreabilidade de retorno e recursos de glosa.',
            'Integração direta com o motor de repasse para pagar somente sessões realizadas e validadas.',
        ],
        recommendedPlan: {
            name: 'Professional',
            price: 'R$ 449/mês',
            reason: 'Plano completo com até 30 licenças, TISS ANS, lotes XML, gestão de glosas, biometria facial multi-superfície, Totem, Painel de TV e SLA 99,5%.',
        },
        features: [
            {
                code: 'ANS · XML TISS',
                title: 'Guias e lotes XML no padrão ANS',
                description:
                    'Estruture guias de terapias seriadas com códigos TUSS corretos e gere lotes XML validados para envio às operadoras de saúde.',
            },
            {
                code: 'BIOMETRIA FACIAL',
                title: 'Dupla comprovação multi-superfície',
                description:
                    'Realize reconhecimento facial do paciente ou responsável no totem, na sala, na webcam ou no celular (sem derrubar o login do computador).',
            },
            {
                code: 'SALDO · VIGÊNCIA',
                title: 'Controle de autorizações prévias',
                description:
                    'Acompanhe quantas sessões foram autorizadas e quantas já foram executadas em cada guia para impedir atendimentos descobertos.',
            },
            {
                code: 'GLOSAS · REPASSE',
                title: 'Gestão de glosas e vínculo com produção',
                description:
                    'Identifique retornos glosados por guia para protocolar recursos no prazo e cruze a produção aprovada com os repasses dos terapeutas.',
            },
        ],
        comparison: [
            {
                criterion: 'Prova de comparecimento nas sessões seriadas',
                genericSoftware: 'Folhas de assinatura em papel sujeitas a perda ou questionamento.',
                clinigo: 'Biometria facial multi-superfície vinculada diretamente às guias TISS.',
            },
            {
                criterion: 'Controle de saldo e validade de autorizações',
                genericSoftware: 'Conferência manual descoberta apenas na hora de faturar o lote.',
                clinigo: 'Saldo de sessões e vigência acompanhados continuamente durante a agenda.',
            },
            {
                criterion: 'Fechamento de lote XML e glosas',
                genericSoftware: 'Digitação portal a portal na operadora com alto risco de erro.',
                clinigo: 'Lotes XML padrão ANS com histórico de status e tratamento de glosas.',
            },
            {
                criterion: 'Integração entre faturamento e repasse',
                genericSoftware: 'Dois controles desconectados que geram divergência financeira.',
                clinigo: 'Agenda, presença biométrica, guia TISS e repasse no mesmo fluxo.',
            },
        ],
        faqs: [
            {
                question: 'Preciso comprar equipamento caro para usar o check-in por biometria facial?',
                answer:
                    'Não. A biometria facial do CliniGo é multi-superfície: funciona na webcam do computador da terapeuta, em tablet/totem da recepção ou via link temporário no celular.',
            },
            {
                question: 'O uso do link temporário no celular desconecta a terapeuta do computador?',
                answer:
                    'Não. O link temporário de validação facial foi projetado especificamente para registrar a presença no celular sem derrubar a sessão única ativa no computador.',
            },
            {
                question: 'O módulo TISS atende clínicas com múltiplos convênios e especialidades?',
                answer:
                    'Sim. Você configura convênios, tabelas, autorizações prévias e regras de repasse específicas por operadora e por especialidade terapêutica.',
            },
            {
                question: 'Qual plano inclui TISS completo e biometria facial?',
                answer:
                    'O plano Professional (R$ 449/mês), que inclui até 30 licenças de profissionais em 1 unidade operacional, TISS ANS, biometria facial, Totem e Painel de TV.',
            },
        ],
        relatedSlugs: ['clinica-aba', 'clinica-multidisciplinar', 'fisioterapia', 'fonoaudiologia'],
        relatedBlogSlugs: ['faturamento-tiss-terapias-glosas', 'repasse-profissional-regras-individuais', 'como-escolher-sistema-clinica-aba'],
    },
]

export function getSolutionBySlug(slug: string): SolutionPageData | undefined {
    return SOLUTIONS_DATA.find((item) => item.slug === slug)
}

