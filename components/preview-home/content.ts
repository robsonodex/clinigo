export const WHATSAPP_URL =
    'https://wa.me/5521975129005?text=Ol%C3%A1!%20Gostaria%20de%20conhecer%20o%20CliniGo%20para%20nossa%20cl%C3%ADnica%20de%20terapias'

export const MOCKUP_DISCLAIMER = 'Prévia ilustrativa com dados fictícios'

export const SEO_CONTENT = {
    title: 'CliniGo | Sistema para Clínicas de Terapias Multidisciplinares',
    description:
        'Sistema completo para clínicas de terapias multidisciplinares (Psicologia, ABA, Fonoaudiologia, TO, Psicomotricidade e Fisioterapia): agenda recorrente, co-terapia, prontuário, WhatsApp, TISS, biometria facial e repasse.',
} as const

export const NAV_CONTENT = {
    links: [
        { href: '#operacao', label: 'Operação' },
        { href: '#especialidades', label: 'Especialidades' },
        { href: '#governanca', label: 'Governança' },
        { href: '#planos', label: 'Planos' },
    ],
    loginLabel: 'Entrar',
    loginHref: '/login',
    primaryCtaLabel: 'Começar agora',
    primaryCtaHref: '/trial',
} as const

export const HERO_CONTENT = {
    kicker: 'Software para clínicas multidisciplinares',
    headlineBefore: 'Clínicas e profissionais de terapia exigem um sistema ',
    headlineAccent: 'feito para terapias',
    headlineAfter: '.',
    subheadline:
        'Agenda recorrente com co-terapia, prontuário isolado por especialidade, confirmação automática no WhatsApp, presença biométrica e repasse por profissional em um único sistema auditável.',
    primaryCta: { label: 'Começar teste de 7 dias', href: '/trial' },
    secondaryCta: { label: 'Ver planos', href: '#planos' },
    specialtiesLine: [
        'Psicologia',
        'ABA e Neurodesenvolvimento',
        'Fonoaudiologia',
        'Terapia Ocupacional',
        'Psicomotricidade',
        'Fisioterapia',
    ],
    stageTabs: [
        { id: 'recorrencia', label: 'Recorrência e Co-terapia' },
        { id: 'whatsapp', label: 'WhatsApp Automático' },
        { id: 'sigilo', label: 'Modo Sigilo (Visão da Terapeuta)' },
    ] as const,
}

export interface OperationalGap {
    index: string
    metricBadge: string
    solutionTitle: string
    solutionDetail: string
    resultHighlight: string
}

export const OPERATIONAL_CONTRAST = {
    kicker: 'ENTREGA CLÍNICA E OPERACIONAL REAL',
    headlineBefore: 'Resultados concretos em cada área da ',
    headlineAccent: 'clínica multidisciplinar',
    headlineAfter: '.',
    subtitle:
        'Da evolução terapêutica baseada em objetivos ao faturamento organizado, recepção acolhedora e autonomia da equipe — cada módulo já nasce integrado e configurável para sua realidade.',
    items: [
        {
            index: '01',
            metricBadge: '456+ objetivos · 6 áreas',
            solutionTitle: 'Planos de sessão e evolução baseada em dados',
            solutionDetail:
                'Biblioteca pronta para ABA (DTT e NET), Psicologia, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia, com tentativas, acertos, níveis de ajuda e gráficos evolutivos.',
            resultHighlight: 'Acompanhamento objetivo por meta em cada especialidade',
        },
        {
            index: '02',
            metricBadge: 'Grade sem conflitos',
            solutionTitle: 'Agenda recorrente e co-terapia nativa',
            solutionDetail:
                'Séries semanais, quinzenais e mensais (40, 45, 50 ou 120 min), co-atendimento com dois profissionais, reserva de salas sensoriais, lista de espera e reposições organizadas.',
            resultHighlight: 'Máxima ocupação de salas e horários da equipe',
        },
        {
            index: '03',
            metricBadge: '100% digital · Sem app',
            solutionTitle: 'Prontuário estruturado, teleconsulta e contratos',
            solutionDetail:
                'Evolução terapêutica em 7 seções com a marca da clínica, Manual Clínico integrado, sala de teleconsulta WebRTC e contratos assinados pelas famílias no celular (Lei 14.063/2020).',
            resultHighlight: 'Fluxo clínico e jurídico completo sem exigir aplicativo',
        },
        {
            index: '04',
            metricBadge: '4 layouts · Sem papel',
            solutionTitle: 'Recepção inteligente, TV sensorial e biometria',
            solutionDetail:
                'Check-in facial e por QR Code no Totem digital, Painel de TV com modo Editorial Sensorial para salas de terapia, logotipo próprio da clínica, voz neural e privacidade LGPD.',
            resultHighlight: 'Atendimento acolhedor e presença auditável na chegada',
        },
        {
            index: '05',
            metricBadge: 'TISS ANS · Repasse',
            solutionTitle: 'Convênios organizados e repasse transparente',
            solutionDetail:
                'Controle de autorizações e saldo de sessões, geração de lotes XML no padrão ANS, conferência prévia automatizada, demonstrativos por terapeuta e DRE gerencial no mesmo painel.',
            resultHighlight: 'Fechamento mensal previsível e auditável de ponta a ponta',
        },
        {
            index: '06',
            metricBadge: 'WhatsApp · BI · Academy',
            solutionTitle: 'Automação, indicadores e CliniGo Academy',
            solutionDetail:
                'Confirmações automáticas no WhatsApp integradas à agenda, BI de retenção, aderência e conformidade de evoluções, somados ao CliniGo Academy com trilhas visuais por função.',
            resultHighlight: 'Equipe produtiva desde a primeira semana de implantação',
        },
    ] as OperationalGap[],
}

export type DayStepId = 'pre-sessao' | 'chegada' | 'sessao' | 'gestao' | 'fechamento'

export interface DayStep {
    number: string
    id: DayStepId
    stage: string
    title: string
    description: string
    tag: string
}

export const DAY_IN_LIFE_CONTENT = {
    kicker: 'CICLO ASSISTENCIAL E ADMINISTRATIVO',
    headlineBefore: 'Um dia inteiro no ',
    headlineAccent: 'CliniGo',
    headlineAfter: '.',
    subtitle:
        'Cada etapa registra o dado uma única vez e alimenta o próximo setor sem retrabalho.',
    steps: [
        {
            number: '01',
            id: 'pre-sessao',
            stage: 'Antes da sessão',
            title: 'Pré-cadastro e termos assinados no celular',
            description:
                'A família preenche a ficha pelo link ou QR Code, envia foto da carteirinha e assina o termo com o dedo na tela — validade jurídica Lei 14.063/2020, hash SHA-256 e sem precisar de login.',
            tag: 'Link e QR Code',
        },
        {
            number: '02',
            id: 'chegada',
            stage: 'Na chegada',
            title: 'Totem digital, Painel de TV e biometria facial',
            description:
                'Check-in facial ou por QR Code no Totem 100% digital (sem papel), na webcam da terapeuta ou no celular, integrado ao Painel de TV com layout sensorial e logotipo da clínica.',
            tag: 'Recepção e TV',
        },
        {
            number: '03',
            id: 'sessao',
            stage: 'Durante a sessão',
            title: 'Planos de sessão (456+ objetivos) e evolução estruturada',
            description:
                'Biblioteca completa por especialidade, ficha terapêutica em 7 seções, níveis de ajuda, comparação entre sessões e assinatura digital com registro de conselho (CRP, CRFa ou CREFITO).',
            tag: 'Evolução clínica',
        },
        {
            number: '04',
            id: 'gestao',
            stage: 'Na gestão clínica',
            title: 'BI de terapia e conformidade de evoluções',
            description:
                'Leitura contínua de retenção, risco de evasão, fila de espera multidisciplinar, carga de trabalho da equipe e percentual de evoluções em dia.',
            tag: 'Inteligência clínica',
        },
        {
            number: '05',
            id: 'fechamento',
            stage: 'No fechamento',
            title: 'Convênios TISS e repasses por profissional',
            description:
                'Guias e lotes XML no padrão ANS, controle de autorizações e saldo de sessões, somados ao demonstrativo individual de produção para conferência transparente de cada terapeuta.',
            tag: 'TISS e Produção',
        },
    ] as DayStep[],
}

export interface SpecialtyXRay {
    id: string
    label: string
    council: string
    modelBadge: string
    summary: string
    benefits: [string, string, string]
    sheet: {
        headerTitle: string
        patientCode: string
        sessionMeta: string
        categoryCode: string
        categoryLabel: string
        objectives: {
            code: string
            title: string
            criterion: string
            helpLevel: string
            progress: number
        }[]
        nextConduct: string
    }
}

export const SPECIALTIES_XRAY_CONTENT = {
    kicker: 'RAIO-X POR ESPECIALIDADE',
    headlineBefore: 'Cada disciplina com seu ',
    headlineAccent: 'workspace clínico',
    headlineAfter: '.',
    subtitle:
        'Estruturas de sessão e acompanhamento adaptadas à terminologia, aos critérios de desempenho e ao conselho de cada área.',
    specialties: [
        {
            id: 'aba',
            label: 'ABA e Neurodesenvolvimento',
            council: 'ABPMC / Supervisão ABA',
            modelBadge: '106 Objetivos · ABA / DTT / NET',
            summary:
                'Biblioteca completa com 106 objetivos parametrizados de pareamento, comunicação funcional, DTT e ensino naturalista acompanhados pela supervisão.',
            benefits: [
                'Objetivos parametrizados com critério de aquisição e progressão longitudinal.',
                'Registro rápido de níveis de ajuda (independente, gestual, parcial ou total).',
                'Supervisão técnica e conformidade de evoluções auditadas por paciente.',
            ],
            sheet: {
                headerTitle: 'Plano de Sessão · Intervenção Precoce (ABA)',
                patientCode: 'Paciente P-104 · 5 anos',
                sessionMeta: 'Sessão 18 · 50 min · Frequência 3x/sem',
                categoryCode: 'PAR / COM',
                categoryLabel: 'Pareamento e Comunicação Funcional',
                objectives: [
                    {
                        code: 'PAR01',
                        title: 'Permanecer em atividade compartilhada sem esquiva',
                        criterion: '12 min contínuos em contexto lúdico',
                        helpLevel: 'Independente',
                        progress: 88,
                    },
                    {
                        code: 'COM03',
                        title: 'Emitir mando vocal ou gestual para item preferido',
                        criterion: '8 de 10 oportunidades espontâneas',
                        helpLevel: 'Dica gestual leve',
                        progress: 76,
                    },
                ],
                nextConduct:
                    'Esbater dica gestual no alvo COM03 na próxima sessão e manter generalização com dupla de terapeutas.',
            },
        },
        {
            id: 'psicologia',
            label: 'Psicologia',
            council: 'CRP · Sigilo clínico',
            modelBadge: '92 Objetivos · Sigilo RBAC',
            summary:
                'Biblioteca clínica de Psicologia com 92 objetivos estruturados e isolamento rigoroso de acesso para preservar o sigilo profissional exigido pelo CRP.',
            benefits: [
                'Prontuário protegido por perfil: apenas o responsável clínico acessa suas evoluções.',
                'Histórico comparativo entre sessões com metas terapêuticas e revisão periódica.',
                'Teleconsulta WebRTC integrada ao prontuário e agenda recorrente semanal ou quinzenal.',
            ],
            sheet: {
                headerTitle: 'Evolução Estruturada · Psicologia Clínica',
                patientCode: 'Paciente P-219 · 14 anos',
                sessionMeta: 'Sessão 12 · 50 min · Quinzenal',
                categoryCode: 'SOAP / METAS',
                categoryLabel: 'Regulação Emocional e Rotina Escolar',
                objectives: [
                    {
                        code: 'PSI01',
                        title: 'Identificar gatilhos de sobrecarga antes da crise',
                        criterion: 'Registro estruturado em 3 semanas seguidas',
                        helpLevel: 'Mediação verbal',
                        progress: 80,
                    },
                    {
                        code: 'PSI04',
                        title: 'Aplicar técnica de pausa respiratória em transição',
                        criterion: 'Autonomia relatada em ambiente escolar',
                        helpLevel: 'Independente',
                        progress: 65,
                    },
                ],
                nextConduct:
                    'Revisar diário de gatilhos com foco em transições escolares e alinhar devolutiva bimestral com responsáveis.',
            },
        },
        {
            id: 'fonoaudiologia',
            label: 'Fonoaudiologia',
            council: 'CRFa · Linguagem e Motricidade',
            modelBadge: '99 Objetivos · Fonoaudiologia',
            summary:
                'Biblioteca com 99 objetivos para linguagem receptiva e expressiva, consciência fonológica, motricidade orofacial e comunicação alternativa (CAA).',
            benefits: [
                'Metas organizadas por domínio fonológico, pragmático e orofacial.',
                'Anexos privados com URL assinada para áudios, relatórios e materiais de orientação.',
                'Controle integrado de saldo de sessões, faltas e guias de convênio.',
            ],
            sheet: {
                headerTitle: 'Plano de Sessão · Fonoaudiologia',
                patientCode: 'Paciente P-087 · 6 anos',
                sessionMeta: 'Sessão 09 · 45 min · Semanal',
                categoryCode: 'FON / PRAG',
                categoryLabel: 'Linguagem Expressiva e Articulação',
                objectives: [
                    {
                        code: 'FON02',
                        title: 'Produzir encontros consonantais em palavras-alvo',
                        criterion: '80% de acerto em repetição dirigida',
                        helpLevel: 'Pista visual',
                        progress: 74,
                    },
                    {
                        code: 'FON05',
                        title: 'Manter troca de turnos em narrativa breve',
                        criterion: '3 turnos consecutivos com interlocutor',
                        helpLevel: 'Modelagem',
                        progress: 82,
                    },
                ],
                nextConduct:
                    'Avançar para frases espontâneas no alvo FON02 e enviar guia de treino lúdico aos responsáveis.',
            },
        },
        {
            id: 'terapia-ocupacional',
            label: 'Terapia Ocupacional',
            council: 'CREFITO · Integração Sensorial',
            modelBadge: '104 Objetivos · TO e AVDs',
            summary:
                'Biblioteca com 104 objetivos de integração sensorial, coordenação motora fina e autonomia nas atividades de vida diária integrada à reserva de salas.',
            benefits: [
                'Reserva de salas específicas (Sala Sensorial, AVD) sem sobreposição de agenda.',
                'Objetivos claros de desempenho ocupacional comparáveis entre sessões.',
                'Co-atendimento suportado para sessões conjuntas com Fonoaudiologia ou ABA.',
            ],
            sheet: {
                headerTitle: 'Plano de Sessão · Terapia Ocupacional',
                patientCode: 'Paciente P-142 · 7 anos',
                sessionMeta: 'Sessão 15 · 50 min · Sala Sensorial',
                categoryCode: 'TO / AVD',
                categoryLabel: 'Integração Sensorial e Autonomia',
                objectives: [
                    {
                        code: 'TO01',
                        title: 'Tolerar circuito tátil-proprioceptivo graduado',
                        criterion: 'Conclusão de 4 estações sem desorganização',
                        helpLevel: 'Supervisão próxima',
                        progress: 85,
                    },
                    {
                        code: 'TO06',
                        title: 'Executar sequência de abotoar e uso de talheres',
                        criterion: 'Realização com mínima assistência motora',
                        helpLevel: 'Dica parcial',
                        progress: 70,
                    },
                ],
                nextConduct:
                    'Introduzir nova textura no circuito tátil e reavaliar preensão fina no próximo encontro.',
            },
        },
        {
            id: 'psicomotricidade',
            label: 'Psicomotricidade',
            council: 'Catálogo de Objetivos e Gráfico',
            modelBadge: '55 Objetivos · Gráfico Evolutivo',
            summary:
                'Módulo dedicado com Ficha Capa clínica, biblioteca de 55 objetivos psicomotores e gráfico evolutivo automático ao longo do tratamento.',
            benefits: [
                'Catálogo estruturado de tônus, equilíbrio, lateralidade e organização espacial.',
                'Gráfico evolutivo automático a partir dos registros de cada sessão.',
                'Revisões periódicas documentadas na capa clínica do paciente.',
            ],
            sheet: {
                headerTitle: 'Acompanhamento · Psicomotricidade',
                patientCode: 'Paciente P-301 · 4 anos',
                sessionMeta: 'Sessão 11 · 45 min · Sala Motora',
                categoryCode: 'MOT / ESP',
                categoryLabel: 'Coordenação Global e Noção Espacial',
                objectives: [
                    {
                        code: 'MOT02',
                        title: 'Percorrer trilha de equilíbrio alternando apoios',
                        criterion: '2 repetições com estabilidade postural',
                        helpLevel: 'Independente',
                        progress: 90,
                    },
                    {
                        code: 'ESP04',
                        title: 'Reproduzir sequência rítmica e direcional simples',
                        criterion: 'Acerto em 4 de 5 comandos combinados',
                        helpLevel: 'Demonstração prévia',
                        progress: 72,
                    },
                ],
                nextConduct:
                    'Aumentar complexidade do percurso direcional e atualizar marco evolutivo no gráfico trimestral.',
            },
        },
        {
            id: 'fisioterapia',
            label: 'Fisioterapia',
            council: 'CREFITO · Funcional e Motora',
            modelBadge: '14 Categorias Motoras · Funcional',
            summary:
                'Estrutura com 14 categorias motoras (mobilidade, postura, equilíbrio e marcha), evolução por sessão e gestão de reposições e pacotes.',
            benefits: [
                'Capa clínica com diagnóstico funcional, frequência e critérios de progressão.',
                'Comparação direta de evolução motora entre sessões do ciclo.',
                'Gestão de reposições e pacotes acoplada ao faturamento de convênios.',
            ],
            sheet: {
                headerTitle: 'Plano de Sessão · Fisioterapia',
                patientCode: 'Paciente P-176 · 9 anos',
                sessionMeta: 'Sessão 08 · 45 min · Sala 05',
                categoryCode: 'FIS / FUNC',
                categoryLabel: 'Estabilidade de Tronco e Marcha',
                objectives: [
                    {
                        code: 'FIS01',
                        title: 'Manter controle postural em superfície instável',
                        criterion: '3 séries de 40 segundos com alinhamento',
                        helpLevel: 'Supervisão visual',
                        progress: 82,
                    },
                    {
                        code: 'FIS03',
                        title: 'Transição sentado para em pé com simetria',
                        criterion: 'Execução controlada em 8 de 10 repetições',
                        helpLevel: 'Toque orientador',
                        progress: 78,
                    },
                ],
                nextConduct:
                    'Evoluir carga proprioceptiva em ortostatismo e revisar critérios de progressão na sessão 10.',
            },
        },
    ] as SpecialtyXRay[],
}

export const GOVERNANCE_CONTENT = {
    kicker: 'ARQUITETURA DE SEGURANÇA E CONFORMIDADE',
    headlineBefore: 'Sigilo clínico e ',
    headlineAccent: 'governança LGPD',
    headlineAfter: ' aplicados no servidor.',
    subtitle:
        'Controles técnicos executados na camada de banco de dados e autenticação — não apenas ocultados na interface.',
    modules: [
        {
            id: 'rbac',
            code: 'RBAC · RLS',
            title: 'Isolamento por Perfil (RBAC real)',
            description:
                'Cada terapeuta visualiza apenas seus pacientes e não acessa convênios ou dados financeiros da clínica. Inclui perfil Somente Leitura para auditoria.',
        },
        {
            id: 'sessao-unica',
            code: 'AUTH · AUDIT',
            title: 'Sessão Única Auditada',
            description:
                'Impede compartilhamento indevido de credenciais entre dispositivos simultâneos e mantém trilhas de auditoria LGPD por usuário.',
        },
        {
            id: 'documentos',
            code: 'STORAGE · LGPD',
            title: 'Documentos Privados e URLs Assinadas',
            description:
                'Prontuários, anexos e exames isolados por clínica com links temporários criptografados e exportação estruturada para portabilidade LGPD.',
        },
        {
            id: 'assinatura',
            code: 'LEI 14.063/2020',
            title: 'Assinatura Eletrônica Probatória',
            description:
                'Carimbo de data e hora, registro de IP, rubrica digital e hash SHA-256 em termos de famílias, contratos e documentos da equipe.',
        },
    ],
} as const

export const SIMULATOR_CONTENT = {
    kicker: 'DIMENSIONAMENTO E EFICIÊNCIA',
    headlineBefore: 'Simule o ganho operacional da ',
    headlineAccent: 'sua equipe',
    headlineAfter: '.',
    subtitle:
        'Configure o porte da sua clínica para projetar o volume assistencial mensal, as horas administrativas devolvidas à equipe e o plano ideal para sua operação.',
    resetLabel: 'Restaurar',
    recoveryLabel: 'Potencial de receita ampliada',
    ctaLabel: 'Começar teste de 7 dias',
    ctaHref: '/trial',
    disclaimer:
        'Projeção ilustrativa baseada nos parâmetros informados por você. Os resultados variam conforme o porte e a rotina de cada clínica.',
} as const

export interface PlanDefinition {
    id: 'basico' | 'avancado' | 'professional'
    name: string
    price: string
    licenses: string
    audience: string
    featured?: boolean
    badge?: string
    core: [string, string, string, string]
    extra: string[]
}

export const PLANS_CONTENT = {
    kicker: 'PLANOS TRANSPARENTES',
    headlineBefore: 'Estrutura clara para ',
    headlineAccent: 'cada estágio',
    headlineAfter: ' da clínica.',
    subtitle: 'Três planos objetivos, sem fidelidade e com expansão por licença adicional.',
    ctaLabel: 'Começar agora',
    ctaHref: '/cadastro',
    expandLabel: 'Ver todos os recursos',
    collapseLabel: 'Ocultar recursos adicionais',
    commercialNote:
        'Todas as assinaturas contemplam 1 unidade operacional, incluem Guia de Uso interativo e CliniGo Academy por função, e seguem com taxa única de implantação. Todos os módulos clínicos são configuráveis (Planos de Sessão, Contratos Digitais, Teleconsulta e Evolução Estruturada). Precisa de mais usuários? Adicione licenças extras a R$ 49,90/mês.',
    plans: [
        {
            id: 'basico',
            name: 'Básico',
            price: '149',
            licenses: '1 licença · 1 unidade operacional',
            audience: 'Profissional autônomo ou início de operação',
            core: [
                'Atendimentos ilimitados e agenda recorrente',
                'Planos de sessão (6 especialidades · 456+ objetivos) e evolução em 7 seções',
                'Contratos e termos com assinatura digital (Lei 14.063/2020)',
                'Teleconsulta WebRTC, fila de espera e controle de faltas',
            ],
            extra: [
                'Check-in por QR Code, pré-cadastro online e triagem',
                'Manual de Boas Práticas de Evolução Terapêutica integrado',
                'Página pública de agendamento com logotipo da clínica',
                'CliniGo Academy integrado por função',
            ],
        },
        {
            id: 'avancado',
            name: 'Avançado',
            price: '249',
            licenses: 'Até 5 licenças · 1 unidade operacional',
            audience: 'Clínicas de terapia em estruturação de equipe',
            featured: true,
            badge: 'Mais escolhido',
            core: [
                'Tudo do Básico e até 5 profissionais incluídos',
                'BI de Terapia (retenção, evasão, supervisão e conformidade)',
                'Motor de repasse por regra individual com sigilo RBAC',
                'WhatsApp integrado por setores, CRM e assinatura ICP-Brasil A1',
            ],
            extra: [
                'DRE gerencial e auditoria de produção',
                'Assistente de importação em lote via Excel e CSV',
                'Módulos clínicos e fluxo da recepção configuráveis pela clínica',
                'Licença adicional avulsa a R$ 49,90/mês',
            ],
        },
        {
            id: 'professional',
            name: 'Professional',
            price: '449',
            licenses: 'Até 30 licenças · 1 unidade operacional',
            audience: 'Equipe multidisciplinar completa e convênios',
            core: [
                'Tudo do Avançado e até 30 profissionais incluídos',
                'Faturamento TISS completo, lotes XML ANS e controle de autorizações',
                'Check-in biométrico facial multi-superfície (sala, webcam ou totem)',
                'Totem 100% digital e Painel de TV com 4 layouts (Editorial Sensorial)',
            ],
            extra: [
                'Dupla comprovação de presença vinculada às guias TISS',
                'Conferência prévia de guias, recursos e saldo de sessões',
                'Pesquisa de satisfação NPS, API, webhooks e SLA 99,5%',
                'Licença adicional avulsa a R$ 49,90/mês',
            ],
        },
    ] as PlanDefinition[],
}

export interface FaqEntry {
    question: string
    answer: string
}

export const FAQ_CONTENT = {
    kicker: 'PERGUNTAS FREQUENTES',
    title: 'Detalhes técnicos e comerciais sem letras miúdas.',
    items: [
        {
            question: 'Como funciona a implantação e a taxa única inicial?',
            answer:
                'Toda nova assinatura inclui uma taxa única de implantação e configuração inicial da unidade, cobrindo parametrização de especialidades, perfis de acesso, salas e estrutura de agenda para a clínica iniciar organizada.',
        },
        {
            question: 'Como a equipe aprende a usar o sistema no dia a dia?',
            answer:
                'O treinamento é visual e interativo pelo CliniGo Academy integrado ao sistema (/dashboard/help), com trilhas dedicadas para Recepção, Terapeutas e Administração, além de ajuda contextual em cada tela.',
        },
        {
            question: 'Qual o limite de unidades e como funcionam as licenças extras?',
            answer:
                'Cada assinatura atende 1 única unidade operacional. Quando sua clínica precisar adicionar profissionais além da franquia do plano, basta contratar licenças avulsas adicionais a R$ 49,90/mês por usuário excedente.',
        },
        {
            question: 'É possível importar pacientes e cadastros de planilhas ou de outro sistema?',
            answer:
                'Sim. A partir do plano Avançado, o CliniGo disponibiliza um assistente de importação em lote via arquivos Excel e CSV com mapeamento de colunas e validação prévia de consistência.',
        },
        {
            question: 'Como o sistema garante LGPD e sigilo entre terapeutas?',
            answer:
                'O controle de permissões (RBAC) e o isolamento de dados atuam direto no servidor e no banco de dados. Terapeutas visualizam apenas seus próprios pacientes, sem acesso a prontuários de colegas, contratos de convênios ou dados financeiros da clínica.',
        },
        {
            question: 'Como funcionam os convênios TISS e as confirmações pelo WhatsApp?',
            answer:
                'O WhatsApp integrado (a partir do Avançado) envia lembretes e processa respostas de confirmação diretamente na agenda. O módulo TISS completo (no Professional) cobre guias, lotes XML no padrão ANS, controle de autorizações, acompanhamento de recursos e biometria facial de presença.',
        },
    ] as FaqEntry[],
}

export const FINAL_CTA_CONTENT = {
    kicker: 'AVALIAÇÃO PRÁTICA',
    title: 'Teste o CliniGo com os fluxos reais da sua clínica.',
    subtitle:
        'Crie sua conta de avaliação por 7 dias sem fidelidade ou converse pelo WhatsApp para alinhar os detalhes da sua equipe.',
    primaryLabel: 'Começar teste de 7 dias',
    primaryHref: '/trial',
    secondaryLabel: 'Falar no WhatsApp',
    secondaryHref: WHATSAPP_URL,
} as const

export const FOOTER_CONTENT = {
    description:
        'Plataforma operacional e clínica para clínicas de terapias multidisciplinares: Psicologia, ABA, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia.',
    copyright: '© 2026 CliniGo. Todos os direitos reservados.',
    columns: [
        {
            title: 'Soluções',
            links: [
                { label: 'Clínica Multidisciplinar', href: '/solucoes/clinica-multidisciplinar' },
                { label: 'ABA e Neurodesenvolvimento', href: '/solucoes/clinica-aba' },
                { label: 'Psicologia (CRP)', href: '/solucoes/psicologia' },
                { label: 'Fonoaudiologia (CRFa)', href: '/solucoes/fonoaudiologia' },
                { label: 'Terapia Ocupacional', href: '/solucoes/terapia-ocupacional' },
                { label: 'Psicomotricidade', href: '/solucoes/psicomotricidade' },
                { label: 'Fisioterapia', href: '/solucoes/fisioterapia' },
                { label: 'TISS e Biometria Facial', href: '/solucoes/faturamento-tiss-terapias' },
            ],
        },
        {
            title: 'Plataforma',
            links: [
                { label: 'Todas as soluções', href: '/solucoes' },
                { label: 'Comparativo técnico', href: '/comparativo' },
                { label: 'Planos e preços', href: '/planos' },
                { label: 'Blog técnico', href: '/blog' },
                { label: 'Sobre nós', href: '/sobre' },
                { label: 'Sites para clínicas', href: '/site' },
            ],
        },
        {
            title: 'Acesso e Suporte',
            links: [
                { label: 'Entrar', href: '/login' },
                { label: 'Testar grátis (7 dias)', href: '/trial' },
                { label: 'Central de Ajuda', href: '/help' },
                { label: 'Contato', href: '/contato' },
                { label: 'Termos de uso', href: '/termos' },
            ],
        },
    ],
} as const
