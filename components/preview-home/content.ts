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
    kicker: 'CLÍNICAS DE TERAPIAS MULTIDISCIPLINARES',
    headlineBefore: 'A ',
    headlineAccent: 'arquitetura operacional',
    headlineAfter: ' de clínicas de terapia multidisciplinares.',
    subheadline:
        'Agenda recorrente minuto a minuto, planos de sessão por especialidade, confirmação automática no WhatsApp, biometria facial e repasse por profissional — sem planilhas paralelas.',
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
    problem: string
    solutionTitle: string
    solutionDetail: string
}

export const OPERATIONAL_CONTRAST = {
    kicker: 'DIAGNÓSTICO DE OPERAÇÃO',
    headlineBefore: 'O custo silencioso da ',
    headlineAccent: 'rotina improvisada',
    headlineAfter: '.',
    subtitle:
        'Quando uma clínica multidisciplinar cresce em planilhas e ferramentas soltas, o gargalo aparece na agenda, nas evoluções e no fechamento mensal.',
    items: [
        {
            index: '01',
            problem: 'Séries quebradas e horários engessados',
            solutionTitle: 'Recorrência flexível e co-terapia nativa',
            solutionDetail:
                'Séries semanais, quinzenais e mensais com durações de 40, 45, 50 ou 120 min e dois profissionais no mesmo atendimento sem conflito de grade.',
        },
        {
            index: '02',
            problem: 'Evoluções atrasadas no fim do mês',
            solutionTitle: 'Conformidade auditada em tempo real',
            solutionDetail:
                'O painel aponta quem atendeu e ainda não registrou evolução, com trava biométrica opcional antes do encerramento do prontuário.',
        },
        {
            index: '03',
            problem: 'Fechamento de repasse manual',
            solutionTitle: 'Produção calculada por regra individual',
            solutionDetail:
                'Repasse apurado automaticamente por contrato, terapeuta e paciente, considerando apenas sessões realizadas ou reposições válidas.',
        },
        {
            index: '04',
            problem: 'Dados sensíveis espalhados',
            solutionTitle: 'Camadas isoladas por perfil de acesso',
            solutionDetail:
                'Recepção, coordenação, financeiro administrativo e terapeuta operam no mesmo sistema vendo estritamente o que compete à sua função.',
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
            title: 'Check-in biométrico multi-superfície',
            description:
                'Validação facial do paciente ou responsável no dispositivo da sala, na webcam da terapeuta ou via link temporário no celular — sem derrubar o login do computador.',
            tag: 'Biometria facial',
        },
        {
            number: '03',
            id: 'sessao',
            stage: 'Durante a sessão',
            title: 'Prontuário estruturado e planos terapêuticos',
            description:
                'Evolução com objetivos, nível de ajuda, comparação entre sessões anteriores e assinatura digital do profissional com registro de conselho (CRP, CRFa ou CREFITO).',
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
                'Guias e lotes XML no padrão ANS, gestão de glosas e recursos, somados ao resumo individual de produção e demonstrativos para conferência do terapeuta.',
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
            modelBadge: 'Plano ABA e Folha de Tentativas',
            summary:
                'Programas estruturados com metas de pareamento, linha de base, registro de tentativas discretas e ensino naturalista acompanhados pela supervisão.',
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
            modelBadge: 'Evolução SOAP e Sigilo RBAC',
            summary:
                'Acompanhamento contínuo em formato estruturado, com isolamento rigoroso de acesso para preservar o sigilo profissional exigido pelo CRP.',
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
            modelBadge: 'Plano Fonoaudiológico',
            summary:
                'Registro direcionado para linguagem oral, consciência fonológica, motricidade orofacial e comunicação alternativa com anexos no prontuário.',
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
            modelBadge: 'Plano de TO e AVD',
            summary:
                'Acompanhamento de integração sensorial, coordenação fina e autonomia nas atividades de vida diária vinculado à reserva de salas sensoriais.',
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
            modelBadge: 'Evolução Psicomotora',
            summary:
                'Módulo dedicado com catálogo de objetivos psicomotores, capa clínica do acompanhamento e gráfico evolutivo ao longo do tratamento.',
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
            modelBadge: 'Avaliação e Plano Funcional',
            summary:
                'Estrutura de avaliação funcional, controle postural, mobilidade e evolução por sessão integrada à agenda por sala e gestão de faltas.',
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
    kicker: 'SIMULADOR OPERACIONAL',
    headlineBefore: 'Cálculo transparente do ',
    headlineAccent: 'impacto mensal',
    headlineAfter: '.',
    subtitle:
        'Ajuste os parâmetros conforme a estrutura atual da sua clínica para estimar perdas evitáveis e visualizar o plano compatível.',
    resetLabel: 'Restaurar',
    recoveryLabel: 'Recuperação estimada',
    ctaLabel: 'Começar teste de 7 dias',
    ctaHref: '/trial',
    disclaimer:
        'Estimativa ilustrativa baseada nos parâmetros informados por você. Resultados variam conforme a operação de cada clínica.',
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
        'Todas as assinaturas contemplam 1 unidade operacional, contam com taxa única de implantação e configuração inicial e incluem treinamento 100% autônomo pelo Guia de Uso integrado ao sistema. Precisa de mais usuários? Adicione licenças extras a R$ 49,90/mês sem travar sua equipe.',
    plans: [
        {
            id: 'basico',
            name: 'Básico',
            price: '149',
            licenses: '1 licença · 1 unidade operacional',
            audience: 'Profissional autônomo ou início de operação',
            core: [
                'Atendimentos ilimitados e agenda recorrente',
                'Prontuário por especialidade e planos terapêuticos ABA',
                'Controle de faltas, reposições e pacotes de sessões',
                'Teleconsulta WebRTC e fila de espera multidisciplinar',
            ],
            extra: [
                'Check-in por QR Code, pré-cadastro e triagem',
                'Página pública de agendamento online',
                'Documentos privados, termos eletrônicos e relatórios',
                'Guia de Uso integrado em todas as telas',
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
                'Templates customizados de prontuário e documentos',
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
                'Faturamento TISS completo, lotes XML ANS e gestão de glosas',
                'Check-in biométrico facial multi-superfície (sala, webcam ou totem)',
                'Totem de autoatendimento e Painel de TV com chamada',
            ],
            extra: [
                'Dupla comprovação de presença vinculada às guias TISS',
                'Autorizações prévias e controle de saldo de sessões',
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
                'O treinamento é 100% autônomo pelo Guia de Uso integrado nativamente ao sistema (/dashboard/help) e pelos ícones de ajuda contextual em cada tela, filtrado automaticamente conforme o perfil de cada usuário.',
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
                'O WhatsApp integrado (a partir do Avançado) envia lembretes e processa respostas de confirmação diretamente na agenda. O módulo TISS completo (no Professional) cobre guias, lotes XML no padrão ANS, controle de glosas, recursos e biometria facial de presença.',
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
