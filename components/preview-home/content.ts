export const WHATSAPP_URL =
    'https://wa.me/5521975129005?text=Ol%C3%A1!%20Gostaria%20de%20conhecer%20o%20CliniGo%20para%20nossa%20cl%C3%ADnica%20de%20terapias'

export const MOCKUP_DISCLAIMER = 'Prévia ilustrativa com dados fictícios'

export const SEO_CONTENT = {
    title: 'CliniGo | Sistema com IA LGPD para Clínicas de Terapias Multidisciplinares',
    description:
        'Plataforma completa para clínicas de terapias multidisciplinares (Psicologia, ABA, Fonoaudiologia, TO, Psicomotricidade e Fisioterapia): CliniGo IA com Escudo LGPD, CliniGo Família 2.0, Modo Tatame DTT/NET, agenda recorrente, WhatsApp, TISS, biometria facial e repasse.',
} as const

export const NAV_CONTENT = {
    links: [
        { href: '#operacao', label: 'Operação' },
        { href: '#clinigo-ia', label: 'CliniGo IA' },
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
        'Agenda recorrente com co-terapia, prontuário por especialidade com CliniGo IA protegida pela LGPD, portal da família sem app, WhatsApp automático e presença biométrica em um único sistema auditável.',
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

export interface PainChapter {
    id: string
    number: string
    tabLabel: string
    tabHint: string
    eyebrow: string
    painQuote: string
    headlineBefore: string
    headlineAccent: string
    headlineAfter: string
    story: string
    beforeLabel: string
    beforeText: string
    afterLabel: string
    afterText: string
    capabilities: string[]
    imageSrc: string
    imageAlt: string
    imagePosition?: string
    overlayBadge: string
    overlayTitle: string
    overlayMetrics: { label: string; value: string }[]
}

export const PAIN_CHAPTERS_CONTENT = {
    kicker: 'DORES REAIS DE QUEM TOCA UMA CLÍNICA DE TERAPIAS',
    headlineBefore: 'Sua equipe cuida de pessoas — não deveria perder a noite brigando com ',
    headlineAccent: 'planilhas, glosas e WhatsApp',
    headlineAfter: '.',
    subtitle:
        'Quem dirige uma clínica multidisciplinar sabe exatamente onde a receita vaza e onde a equipe esgota. O CliniGo foi construído dentro da rotina real das terapias para encerrar cada gargalo na raiz.',
    chapters: [
        {
            id: 'evolucao-tatame',
            number: '01',
            tabLabel: 'Evolução até meia-noite',
            tabHint: 'Terapeutas esgotadas',
            eyebrow: 'PRODUTIVIDADE CLÍNICA · PRONTUÁRIO E MODO TATAME',
            painQuote: '“Minhas terapeutas saem às 19h e ficam até meia-noite escrevendo evoluções atrasadas.”',
            headlineBefore: 'Sessão encerrada com evolução ',
            headlineAccent: 'pronta em segundos',
            headlineAfter: '.',
            story:
                'No CliniGo, a profissional abre o Meu Dia Clínico, coleta tentativas no Modo Tatame em 1 toque sem tirar os olhos da criança, clona a estrutura da sessão anterior e aciona a CliniGo IA para transformar tópicos rápidos em uma evolução técnica completa e auditável.',
            beforeLabel: 'Sem o CliniGo',
            beforeText:
                'Evoluções acumuladas por semanas, folhas soltas de ABA no tatame, supervisão no escuro e risco de glosa por texto genérico.',
            afterLabel: 'Com o CliniGo 2.0 + IA',
            afterText:
                '456+ objetivos em 6 especialidades, Modo Tatame DTT/NET, Curvas de Aprendizagem automáticas e revisão técnica com CliniGo IA antes de assinar.',
            capabilities: [
                'Meu Dia Clínico com fila do dia',
                'Modo Tatame DTT/NET 1-toque',
                'Clonar Última Sessão',
                'Curva de Domínio (>=80% x 3)',
            ],
            imageSrc: '/images/landing/sessao-terapia-clinica.jpg',
            imageAlt: 'Terapeuta em atendimento clínico acolhedor com paciente em sala iluminada',
            imagePosition: 'object-center',
            overlayBadge: 'MODO TATAME + CLINIGO IA',
            overlayTitle: 'Evolução auditada antes de assinar',
            overlayMetrics: [
                { label: 'Critérios clínicos', value: '4/4 OK' },
                { label: 'Tempo médio', value: '45 seg' },
            ],
        },
        {
            id: 'familia-antichurn',
            number: '02',
            tabLabel: 'Pais cancelando a terapia',
            tabHint: 'Família sem enxergar evolução',
            eyebrow: 'RETENÇÃO DE PACIENTES · CLINIGO FAMÍLIA 2.0',
            painQuote: '“Os pais cancelaram depois de 3 meses dizendo que não conseguiam enxergar a evolução.”',
            headlineBefore: 'Famílias encantadas que ',
            headlineAccent: 'enxergam cada conquista',
            headlineAfter: '.',
            story:
                'Pais não entendem termos técnicos de prontuário, mas valorizam profundamente saber o que o filho conquistou na semana. O CliniGo Família 2.0 entrega um boletim acolhedor no celular sem exigir aplicativo nem senha, traduzido pela CliniGo IA, com atividades lúdicas em casa e canal direto de retorno da escola.',
            beforeLabel: 'Sem o CliniGo',
            beforeText:
                'Família desinformada, conversas perdidas no WhatsApp pessoal das terapeutas e cancelamentos inesperados sem aviso prévio.',
            afterLabel: 'Com o CliniGo Família 2.0',
            afterText:
                'Mural de Conquistas, Tradutor Empático da IA, atividades em casa confirmadas pelos pais, retorno estruturado da escola e Radar de Retenção no painel.',
            capabilities: [
                'Portal sem app e sem senha',
                'Tradutor Empático CliniGo IA',
                'Mural de Conquistas e Atividades em Casa',
                'Retorno da Escola por link de 7 dias',
            ],
            imageSrc: '/images/landing/familia-portal-celular.jpg',
            imageAlt: 'Mãe sorrindo com tablet ao lado da filha acompanhando o progresso terapêutico em casa',
            imagePosition: 'object-top',
            overlayBadge: 'CLINIGO FAMÍLIA 2.0',
            overlayTitle: 'Boletim da semana recebido pela família',
            overlayMetrics: [
                { label: 'Conquistas', value: '3 marcos' },
                { label: 'Escola', value: 'Alinhada' },
            ],
        },
        {
            id: 'convenios-tiss',
            number: '03',
            tabLabel: 'Glosas sem prova',
            tabHint: 'Receita perdida nos convênios',
            eyebrow: 'DOMÍNIO DE CONVÊNIOS TISS · RECEITA BLINDADA',
            painQuote: '“Faturamos o mês inteiro e só 60 dias depois descobrimos milhares de reais glosados sem prova.”',
            headlineBefore: 'Cada sessão faturada com ',
            headlineAccent: 'prova irrefutável',
            headlineAfter: '.',
            story:
                'Antes mesmo de enviar o lote XML para a operadora, o CliniGo calcula o Score de Saúde (0 a 100%) e consulta a Memória de Glosas de cada convênio. Se houver glosa, o Dossiê Probatório reúne Biometria Facial, Evolução Assinada e Guia TISS em 1 clique — e a CliniGo IA redige a carta técnica ANS na hora.',
            beforeLabel: 'Sem o CliniGo',
            beforeText:
                'Guias vencendo sem aviso, lotes enviados com erro de digitação, horas catando papéis para recurso e operadoras pagando quando querem.',
            afterLabel: 'Com o Domínio TISS CliniGo',
            afterText:
                'Score de Saúde do Lote, Raio-X de Operadoras (DSO e Margem), Glosas em 3 Níveis, Dossiê Probatório em 1 clique e Carta de Recurso ANS com IA.',
            capabilities: [
                'Score de Saúde do Lote (0 a 100%)',
                'Raio-X de Operadoras (DSO e Margem)',
                'Glosas em 3 Níveis + Ajuda Interativa',
                'Dossiê Probatório + Carta ANS IA',
            ],
            imageSrc: '/images/landing/gestora-clinica-notebook.jpg',
            imageAlt: 'Gestora de clínica analisando indicadores de faturamento e operação no notebook com tranquilidade',
            imagePosition: 'object-center',
            overlayBadge: 'DOMÍNIO TISS + RAIO-X',
            overlayTitle: 'Lote auditado antes do envio ANS',
            overlayMetrics: [
                { label: 'Saúde do lote', value: '98/100' },
                { label: 'Dossiê PDF', value: '1 clique' },
            ],
        },
        {
            id: 'recepcao-repasse',
            number: '04',
            tabLabel: 'Recepção no caos',
            tabHint: 'Papel, faltas e briga no repasse',
            eyebrow: 'RECEPÇÃO ACOLHEDORA · REPASSE SEM ATRITO',
            painQuote: '“A recepção vive no caos de papéis, faltas de última hora e brigas todo dia 5 no repasse.”',
            headlineBefore: 'Chegada serena na recepção e ',
            headlineAccent: 'repasse transparente',
            headlineAfter: ' ao vivo.',
            story:
                'A família preenche o pré-cadastro e assina o contrato no celular antes de sair de casa. Na chegada, faz check-in facial ou por QR Code no Totem 100% digital enquanto o Painel de TV Editorial chama sem estresse sensorial. E cada terapeuta acompanha o Meu Repasse Ao Vivo — liberado automaticamente quando assina a evolução.',
            beforeLabel: 'Sem o CliniGo',
            beforeText:
                'Pranchetas na recepção, filas de espera esquecidas, faltas não repostas e conferência manual de dezenas de planilhas de repasse.',
            afterLabel: 'Com o CliniGo na Recepção',
            afterText:
                'Contratos Lei 14.063/2020 no celular, Totem digital, Painel TV Sensorial, WhatsApp por setores e Meu Repasse Ao Vivo travado na evolução assinada.',
            capabilities: [
                'Totem 100% Digital + Biometria Facial',
                'Painel de TV Editorial Sensorial',
                'WhatsApp Automático por setores',
                'Meu Repasse Ao Vivo auditável',
            ],
            imageSrc: '/images/landing/recepcao-acolhedora.jpg',
            imageAlt: 'Recepção acolhedora em madeira natural com plantas, luz do dia e totem digital de check-in',
            imagePosition: 'object-center',
            overlayBadge: 'RECEPÇÃO SENSORIAL + REPASSE',
            overlayTitle: 'Fluxo sem papel do check-in ao repasse',
            overlayMetrics: [
                { label: 'Check-in', value: 'Facial / QR' },
                { label: 'Repasse', value: 'Ao vivo' },
            ],
        },
    ] as PainChapter[],
}

export type ClinigoAiTabId = 'evolucao' | 'familia' | 'laudos' | 'recurso'
export type ReportToneId = 'convenio' | 'medico' | 'escola'

export const CLINIGO_AI_CONTENT = {
    kicker: 'NOVIDADE · CLINIGO IA COM ESCUDO LGPD NATIVO',
    headlineBefore: 'Inteligência clínica que trabalha pela equipe — ',
    headlineAccent: 'sem nunca expor um paciente',
    headlineAfter: '.',
    subtitle:
        'Diferente de ferramentas genéricas onde você cola dados sensíveis em chats públicos, o CliniGo aplica o Escudo LGPD no servidor: nomes, CPFs, telefones e e-mails são anonimizados antes da IA processar e restaurados somente dentro da sua clínica.',
    shieldSteps: [
        { code: '01', label: 'Prontuário na clínica', detail: 'Lucas M. · CPF 000.000.000-00' },
        { code: '02', label: 'Escudo LGPD no servidor', detail: 'Troca determinística de PII' },
        { code: '03', label: 'Motor CliniGo IA', detail: 'Recebe apenas [PACIENTE] + clínica' },
        { code: '04', label: 'Entrega auditada', detail: 'Documento pronto sem retenção externa' },
    ],
    tabs: [
        {
            id: 'evolucao' as ClinigoAiTabId,
            badge: 'Fluxo 01',
            label: 'Estruturador de Evolução',
            shortDesc: 'Tópicos rápidos viram evolução clínica completa com checagem de auditoria.',
            inputTitle: 'O que a terapeuta anota em 15 segundos',
            inputMeta: 'Rascunho livre pós-sessão · ABA / 50 min',
            inputText:
                'Paciente manteve contato visual por 8s nos blocos de madeira, cumpriu 9/10 tentativas no alvo COM03 com dica gestual leve, regulou bem na troca de sala sem esquiva. Responsável relatou melhora na rotina de dormir.',
            outputTitle: 'Evolução Estruturada CliniGo IA',
            outputMeta: 'Anonimizado pelo Escudo LGPD · 4/4 critérios aprovados',
            outputSections: [
                {
                    heading: 'Desempenho e Resposta Terapêutica',
                    body: 'Sessão de Intervenção Comportamental (50 min) com engajamento sustentado em atividade estruturada de pareamento e comunicação funcional. Paciente manteve contato visual funcional por 8 segundos consecutivos e atingiu 90% de acerto (9/10 tentativas) no alvo COM03 sob esbatimento para dica gestual leve.',
                },
                {
                    heading: 'Regulação e Contexto Familiar',
                    body: 'Transição entre ambientes realizada com autorregulação adequada e ausência de comportamentos de esquiva. Responsável reportou melhora progressiva na rotina noturna de sono, favorecendo prontidão atencional.',
                },
                {
                    heading: 'Conduta para a Próxima Sessão',
                    body: 'Iniciar esbatimento completo da dica gestual em COM03 visando resposta independente (critério >=80% em 3 sessões consecutivas) e generalizar demanda em contexto naturalista.',
                },
            ],
            auditChecks: [
                'Objetivo terapêutico e taxa de acerto quantificados',
                'Nível de ajuda (prompt fading) especificado',
                'Tempo de sessão e conduta futura compatíveis com TISS',
                'Escudo LGPD: zero nome civil ou CPF enviado ao modelo',
            ],
        },
        {
            id: 'familia' as ClinigoAiTabId,
            badge: 'Fluxo 02',
            label: 'Tradutor CliniGo Família',
            shortDesc: 'Transforma jargão técnico de prontuário em boletim acolhedor para os pais.',
            inputTitle: 'Registro técnico no prontuário',
            inputMeta: 'Linguagem clínica interna · Supervisão ABA',
            inputText:
                'Alvo COM03 (mando vocal/gestual funcional) atingiu 88% em 3 sessões consecutivas com esbatimento de ajuda física parcial para dica gestual leve. Critério de aquisição atingido; iniciar generalização em ambiente natural.',
            outputTitle: 'Boletim Empático pronto para o CliniGo Família 2.0',
            outputMeta: 'Tom acolhedor · Publicação em 1 clique sem app',
            outputSections: [
                {
                    heading: 'Grande conquista desta semana',
                    body: 'Que alegria compartilhar este avanço com vocês: esta semana observamos muita autonomia na hora de pedir os brinquedos favoritos, quase sem precisar da nossa ajuda com gestos. Esse passo mostra que a comunicação está ficando cada vez mais natural e espontânea.',
                },
                {
                    heading: 'Brincadeira de 5 minutos para fazer em casa',
                    body: 'Deixe dois brinquedos preferidos ao alcance dos olhos (mas fora das mãos) durante o momento de brincadeira. Espere 5 segundos com um sorriso acolhedor para dar espaço ao pedido antes de entregar, celebrando muito cada tentativa.',
                },
            ],
            auditChecks: [
                'Termos técnicos convertidos em linguagem calorosa e clara',
                'Sugestão prática de continuidade em casa incluída',
                'Pronto para publicar no link privado da família',
                'Mantém sigilo integral do prontuário clínico',
            ],
        },
        {
            id: 'laudos' as ClinigoAiTabId,
            badge: 'Fluxo 03',
            label: 'Laudos em 3 Tons',
            shortDesc: 'O mesmo histórico gera relatório para Convênio, Neuropediatra ou Escola.',
            inputTitle: 'Dados consolidados do paciente no CliniGo',
            inputMeta: 'Curvas ABA + Frequência 94% + 3 especialidades integradas',
            inputText:
                'Base real do período (90 dias): 36 sessões realizadas (ABA, Fonoaudiologia e Terapia Ocupacional), 4 metas dominadas (>=80% x 3), 2 metas em evolução de esbatimento de ajuda e recomendação de continuidade de carga horária semanal.',
            outputTitle: 'Redator Multidisciplinar Adaptativo',
            outputMeta: 'Alterne o destinatário abaixo e veja o tom se adaptar',
            outputSections: [],
            auditChecks: [
                'Altera vocabulário e estrutura conforme o destinatário',
                'Consolida dados reais de todas as especialidades ativas',
                'Pronto para revisão, assinatura do profissional e PDF com logo',
                'Escudo LGPD ativo durante toda a geração',
            ],
        },
        {
            id: 'recurso' as ClinigoAiTabId,
            badge: 'Fluxo 04',
            label: 'Advogado de Glosa TISS',
            shortDesc: 'Monta carta formal ANS usando as provas reais já gravadas no CliniGo.',
            inputTitle: 'Glosa recebida + Provas automáticas do CliniGo',
            inputMeta: 'Código ANS 1706 · Guia #84920 · Valor glosado: R$ 1.240,00',
            inputText:
                'Motivo informado pela operadora: 1706 (Ausência de comprovação da realização do atendimento). Provas vinculadas automaticamente no sistema: Check-in biométrico facial (08:02 UTC), Evolução assinada com registro de conselho e Guia TISS autorizada.',
            outputTitle: 'Carta Técnica de Recurso de Glosa (Padrão ANS)',
            outputMeta: 'Pronta para anexar ao Dossiê Probatório em 1 clique',
            outputSections: [
                {
                    heading: 'Fundamentação Técnica e Probatória',
                    body: 'Vimos interpor recurso formal referente à glosa aplicada sob código ANS 1706 na Guia nº 84920. Conforme comprovação integral anexa no Dossiê Probatório, todas as sessões faturadas foram regularmente executadas dentro da vigência da autorização prévia.',
                },
                {
                    heading: 'Evidências Auditáveis Anexadas',
                    body: '1) Registro de presença por biometria facial do paciente/responsável com carimbo de data e hora; 2) Evoluções clínicas individualizadas assinadas digitalmente com número de conselho profissional (Lei 14.063/2020); 3) Espelho da guia TISS validada em conformidade com a RN ANS vigente.',
                },
                {
                    heading: 'Requerimento de Reversão',
                    body: 'Diante da documentação comprobatória cabal e inequívoca, requeremos a revisão integral da glosa e o consequente pagamento no próximo ciclo de faturamento da operadora.',
                },
            ],
            auditChecks: [
                'Cita código exato da Tabela 38 ANS e número da guia',
                'Lista automaticamente biometria facial + evolução assinada',
                'Anexável ao Dossiê Probatório PDF em 1 clique',
                'Economiza horas da equipe financeira em cada remessa',
            ],
        },
    ],
    reportTones: {
        convenio: {
            label: 'Para Convênio (Auditoria)',
            audienceBadge: 'Justificativa de Carga Horária · ANS',
            heading: 'Relatório Técnico para Renovação de Autorização',
            body: 'No trimestre avaliado, o beneficiário cumpriu 94% de adesão ao plano terapêutico multidisciplinar (ABA, Fonoaudiologia e Terapia Ocupacional), atingindo critério formal de domínio (>=80% em 3 sessões consecutivas) em 4 objetivos estruturados. Considerando a curva ascendente de aquisição e o risco documentado de regressão funcional em caso de interrupção, recomenda-se a manutenção integral da carga horária semanal autorizada.',
        },
        medico: {
            label: 'Para Neuropediatra',
            audienceBadge: 'Síntese Clínica Objetiva · Conduta',
            heading: 'Evolução Interdisciplinar Trimestral — Síntese Médica',
            body: 'Paciente apresentou ganhos mensuráveis em comunicação funcional expressiva (esbatimento de dica física para gestual leve em 90% das oportunidades), tolerância sensorial em circuito tátil-proprioceptivo e redução de episódios de esquiva nas transições. Mantém boa resposta à rotina estruturada; sugere-se alinhamento conjunto na próxima reavaliação neuropediátrica quanto à generalização em contexto escolar.',
        },
        escola: {
            label: 'Para Escola e Família',
            audienceBadge: 'Linguagem Acessível · Estratégias Práticas',
            heading: 'Guia de Alinhamento Pedagógico e Rotina Diária',
            body: 'Nos últimos meses, notamos avanços importantes na autonomia para se comunicar e na tranquilidade ao mudar de atividade. Em sala de aula e em casa, ajuda muito antecipar visualmente as trocas de tarefa com 2 minutos de aviso e oferecer escolhas simples entre duas opções, valorizando cada iniciativa espontânea de conversa ou pedido.',
        },
    } as Record<ReportToneId, { label: string; audienceBadge: string; heading: string; body: string }>,
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
            solutionTitle: 'Planos de sessão, Modo Tatame e CliniGo IA',
            solutionDetail:
                'Biblioteca pronta para ABA (DTT e NET), Psicologia, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia, com coleta rápida, curvas de aprendizagem e apoio da CliniGo IA com Escudo LGPD.',
            resultHighlight: 'Acompanhamento objetivo por meta em cada especialidade',
        },
        {
            index: '02',
            metricBadge: 'Grade sem conflitos',
            solutionTitle: 'Agenda recorrente, co-terapia e Meu Dia Clínico',
            solutionDetail:
                'Séries semanais, quinzenais e mensais (40, 45, 50 ou 120 min), co-atendimento com dois profissionais, reserva de salas sensoriais, lista de espera, reposições e Clonar Última Sessão.',
            resultHighlight: 'Máxima ocupação de salas e horários da equipe',
        },
        {
            index: '03',
            metricBadge: 'CliniGo Família 2.0',
            solutionTitle: 'Portal da família sem app, Escola e contratos digitais',
            solutionDetail:
                'Mural de Conquistas, Tradutor Empático da IA, atividades em casa, retorno estruturado da escola por link temporário, teleconsulta WebRTC e contratos assinados no celular (Lei 14.063/2020).',
            resultHighlight: 'Famílias engajadas e fluxo jurídico completo sem exigir aplicativo',
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
            solutionTitle: 'Convênios organizados, Dossiê 1-Clique e Meu Repasse Ao Vivo',
            solutionDetail:
                'Score de Saúde do Lote, Raio-X de Operadoras (DSO e Margem), glosas em 3 níveis, Dossiê Probatório em 1 clique, Carta ANS IA e demonstrativo de repasse liberado somente com evolução assinada.',
            resultHighlight: 'Fechamento mensal previsível e auditável de ponta a ponta',
        },
        {
            index: '06',
            metricBadge: 'Supervisão · BI · Academy',
            solutionTitle: 'Mesa de Supervisão ABA/PEI, WhatsApp e CliniGo Academy',
            solutionDetail:
                'Alertas automáticos de estagnação e calibração entre terapeutas, confirmações automáticas no WhatsApp, Busca Global Ctrl+K, Tarefas e CliniGo Academy com ajuda interativa dentro das telas.',
            resultHighlight: 'Equipe produtiva desde a primeira semana de implantação',
        },
    ] as OperationalGap[],
}

export type RoleSpotlightId = 'gestora' | 'coordenacao' | 'terapeuta' | 'recepcao'

export interface RoleSpotlight {
    id: RoleSpotlightId
    roleLabel: string
    tagline: string
    headline: string
    summary: string
    metricNumber: string
    metricLabel: string
    highlights: { title: string; detail: string }[]
}

export const ECOSYSTEM_ROLES_CONTENT = {
    kicker: 'PROJETADO PARA CADA CADEIRA DA CLÍNICA',
    headlineBefore: 'Cada pessoa da equipe entra no CliniGo e vê ',
    headlineAccent: 'exatamente o que precisa',
    headlineAfter: '.',
    subtitle:
        'Sem telas poluídas e sem misturar permissões. Clique no perfil abaixo para inspecionar o que o CliniGo entrega para quem dirige, supervisiona, atende ou recepciona.',
    roles: [
        {
            id: 'gestora',
            roleLabel: 'Diretoria e Gestão',
            tagline: 'Margem, retenção e controle real',
            headline: 'Decisões com números vivos de convênios, ocupação e retenção.',
            summary:
                'Enxergue em segundos qual operadora paga melhor e mais rápido, quais famílias apresentam risco de abandono e quais terapeutas estão com evoluções em aberto.',
            metricNumber: '360°',
            metricLabel: 'Visão operacional, TISS e DRE',
            highlights: [
                {
                    title: 'Raio-X de Operadoras (DSO e Margem)',
                    detail: 'Compare prazo real de recebimento, taxa de aprovação e volume por convênio.',
                },
                {
                    title: 'Score de Saúde do Lote + Dossiê 1-Clique',
                    detail: 'Audite lotes XML antes de transmitir e gere provas completas para recursos ANS.',
                },
                {
                    title: 'Radar de Retenção e CliniGo Família 2.0',
                    detail: 'Acompanhe engajamento das famílias e aja antes de qualquer cancelamento.',
                },
                {
                    title: '7 Módulos Clínicos Configuráveis + Tarefas',
                    detail: 'Ative apenas os recursos da sua clínica e organize projetos internos por equipe.',
                },
            ],
        },
        {
            id: 'coordenacao',
            roleLabel: 'Coordenação e Supervisão',
            tagline: 'Qualidade clínica baseada em evidência',
            headline: 'Mesa de Supervisão ABA/PEI que aponta onde agir antes de atrasar o plano.',
            summary:
                'Chega de folhear dezenas de pastas para descobrir metas estagnadas ou divergências entre duas terapeutas que atendem a mesma criança.',
            metricNumber: '456+',
            metricLabel: 'Objetivos clínicos em 6 áreas',
            highlights: [
                {
                    title: 'Mesa de Supervisão Clínica',
                    detail: 'Detecta automaticamente alvos estagnados, prontos para promoção e divergência de calibração (>=25 p.p.).',
                },
                {
                    title: 'Curvas de Aprendizagem e Prompt Fading',
                    detail: 'Regra automática de domínio (>=80% em 3 sessões) com gráfico evolutivo pronto.',
                },
                {
                    title: 'Relatório de Renovação de Convênio em 1 Clique',
                    detail: 'Consolida todas as especialidades e assina com a identidade visual da clínica.',
                },
                {
                    title: 'Redator Multidisciplinar em 3 Tons (IA)',
                    detail: 'Gera sínteses clínicas adaptadas para Convênio, Neuropediatra ou Escola com Escudo LGPD.',
                },
            ],
        },
        {
            id: 'terapeuta',
            roleLabel: 'Profissional Terapeuta',
            tagline: 'Mais tempo com o paciente, zero burocracia à noite',
            headline: 'Do tatame à evolução assinada em menos de um minuto.',
            summary:
                'Interface calma e protegida por sigilo RBAC: a profissional vê apenas seus próprios pacientes, registra tentativas com um toque e acompanha seu repasse ao vivo.',
            metricNumber: '1 toque',
            metricLabel: 'Coleta DTT/NET no Modo Tatame',
            highlights: [
                {
                    title: 'Meu Dia Clínico + Clonar Última Sessão',
                    detail: 'Agenda do dia em fila limpa, sem precisar procurar paciente por paciente.',
                },
                {
                    title: 'Estruturador CliniGo IA + Check de Auditoria',
                    detail: 'Transforma tópicos curtos em evolução técnica completa e valida critérios antes de assinar.',
                },
                {
                    title: 'Biblioteca Visual de Psicomotricidade (55 objetivos)',
                    detail: 'Fichas ilustradas de A a K com geração de PDF e histórico comparativo.',
                },
                {
                    title: 'Meu Repasse Ao Vivo + Busca Global Ctrl+K',
                    detail: 'Transparência total da produção liberada por evolução assinada e atalhos rápidos.',
                },
            ],
        },
        {
            id: 'recepcao',
            roleLabel: 'Recepção e Atendimento',
            tagline: 'Acolhimento sensorial sem papel e sem fila',
            headline: 'Uma recepção tranquila que impressiona os pais já no primeiro minuto.',
            summary:
                'Pré-cadastro, envio da carteirinha e assinatura de contrato acontecem no celular antes da chegada. Na clínica, tudo flui em silêncio e sem retrabalho.',
            metricNumber: '0 papel',
            metricLabel: 'Totem digital, TV e contratos no celular',
            highlights: [
                {
                    title: 'Totem 100% Digital + Biometria Facial',
                    detail: 'Check-in facial ou por QR Code no totem, webcam ou celular, já vinculado ao TISS.',
                },
                {
                    title: 'Painel de TV Editorial Sensorial (4 layouts)',
                    detail: 'Chamada de pacientes acolhedora com logotipo da clínica, voz neural e sigilo LGPD.',
                },
                {
                    title: 'WhatsApp Integrado por Setores',
                    detail: 'Confirmações automáticas atualizam a agenda em tempo real e reduzem faltas.',
                },
                {
                    title: 'Ajuda Lateral Interativa + CliniGo Academy',
                    detail: 'Passo a passo clicável dentro das telas com destaque visual de onde clicar.',
                },
            ],
        },
    ] as RoleSpotlight[],
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
        'Cada etapa registra o dado uma única vez e alimenta o próximo setor sem retrabalho — da chegada da família ao fechamento do convênio e do repasse.',
    steps: [
        {
            number: '01',
            id: 'pre-sessao',
            stage: 'Antes da sessão',
            title: 'Pré-cadastro e contratos assinados no celular',
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
                'Check-in facial ou por QR Code no Totem 100% digital (sem papel), na webcam da terapeuta ou no celular, integrado ao Painel de TV com layout Editorial Sensorial e logotipo da clínica.',
            tag: 'Recepção e TV',
        },
        {
            number: '03',
            id: 'sessao',
            stage: 'Durante a sessão',
            title: 'Modo Tatame, 456+ objetivos e CliniGo IA',
            description:
                'Coleta rápida em 1 toque no Modo Tatame, Clonar Última Sessão, evolução em 7 seções revisada pela CliniGo IA com Escudo LGPD e assinatura digital com registro de conselho.',
            tag: 'Evolução + IA',
        },
        {
            number: '04',
            id: 'gestao',
            stage: 'Supervisão e Família',
            title: 'Mesa de Supervisão ABA/PEI e CliniGo Família 2.0',
            description:
                'Curvas de aprendizagem com regra automática de domínio (>=80% x 3), alertas de estagnação e calibração, além do boletim semanal traduzido pela IA para a família e a escola.',
            tag: 'CliniGo 2.0',
        },
        {
            number: '05',
            id: 'fechamento',
            stage: 'No fechamento',
            title: 'Domínio TISS, Dossiê 1-Clique e Meu Repasse Ao Vivo',
            description:
                'Score de Saúde do Lote, Raio-X de Operadoras, glosas em 3 níveis com Carta ANS IA e demonstrativo de repasse por profissional liberado automaticamente após evolução assinada.',
            tag: 'TISS e Repasse',
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
        'Estruturas de sessão, coleta rápida e acompanhamento adaptados à terminologia, aos critérios de desempenho e ao conselho de cada área.',
    engineHighlights: [
        'Modo Tatame DTT/NET 1-toque',
        'Regra de Domínio (>=80% em 3 sessões)',
        'Mesa de Supervisão (calibração >=25 p.p.)',
        'Relatório de Renovação de Convênio em 1 clique',
    ],
    specialties: [
        {
            id: 'aba',
            label: 'ABA e Neurodesenvolvimento',
            council: 'ABPMC / Supervisão ABA',
            modelBadge: '106 Objetivos · Modo Tatame DTT/NET',
            summary:
                'Biblioteca completa com 106 objetivos parametrizados de pareamento, comunicação funcional, DTT e ensino naturalista acompanhados pela Mesa de Supervisão.',
            benefits: [
                'Coleta 1-toque no Modo Tatame com níveis de ajuda e Prompt Fading.',
                'Curvas de Aprendizagem com regra automática de domínio (>=80% em 3 sessões).',
                'Mesa de Supervisão com alertas de estagnação e calibração entre terapeutas.',
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
                'Biblioteca clínica de Psicologia com 92 objetivos estruturados, apoio opcional da CliniGo IA com Escudo LGPD e isolamento rigoroso de acesso exigido pelo CRP.',
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
                'Boletim lúdico para a família treinar em casa via CliniGo Família 2.0.',
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
            council: 'Biblioteca Visual A–K e Gráfico',
            modelBadge: '55 Objetivos · Biblioteca PDF',
            summary:
                'Módulo dedicado com Ficha Capa clínica, Biblioteca Visual de 55 objetivos psicomotores (categorias A a K) com exportação em PDF e gráfico evolutivo automático.',
            benefits: [
                'Catálogo visual estruturado de tônus, equilíbrio, lateralidade e organização espacial.',
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
    headlineBefore: 'Sigilo clínico, IA segura e ',
    headlineAccent: 'governança LGPD',
    headlineAfter: ' aplicados no servidor.',
    subtitle:
        'Controles técnicos executados na camada de banco de dados, autenticação e processamento de IA — não apenas ocultados na interface.',
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
        {
            id: 'ai-lgpd',
            code: 'CLINIGO IA · SHIELD',
            title: 'Escudo LGPD na CliniGo IA (Anonimização no Servidor)',
            description:
                'Antes de qualquer assistência da CliniGo IA, o servidor substitui nomes civis, CPFs, telefones e e-mails por marcadores neutros, registra auditoria sem texto sensível e devolve o rascunho pronto exclusivamente para revisão humana.',
        },
    ],
} as const

export const SIMULATOR_CONTENT = {
    kicker: 'DIMENSIONAMENTO E EFICIÊNCIA',
    headlineBefore: 'Simule o ganho operacional da ',
    headlineAccent: 'sua equipe',
    headlineAfter: '.',
    subtitle:
        'Configure o porte da sua clínica para projetar o volume assistencial mensal, as horas administrativas devolvidas à equipe com automações e CliniGo IA e o plano ideal para sua operação.',
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
                'Atendimentos ilimitados, agenda recorrente e Meu Dia Clínico',
                'Planos de sessão (6 áreas · 456+ objetivos), Modo Tatame e evolução em 7 seções',
                'CliniGo IA com Escudo LGPD e CliniGo Família 2.0 (boletins sem app)',
                'Contratos com assinatura digital (Lei 14.063/2020) e Teleconsulta WebRTC',
            ],
            extra: [
                'Check-in por QR Code, pré-cadastro online e Biblioteca de Psicomotricidade (55 objetivos)',
                'Curvas de Aprendizagem automáticas e Manual de Evolução integrado',
                'Busca Global Ctrl+K e agendamento online com logotipo da clínica',
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
                'Mesa de Supervisão ABA/PEI, BI de Terapia e Radar de Retenção',
                'Meu Repasse Ao Vivo por regra individual com sigilo RBAC',
                'WhatsApp integrado por setores, CRM e assinatura ICP-Brasil A1',
            ],
            extra: [
                'Relatório de Renovação em 1 clique e Redator Multidisciplinar IA (3 tons)',
                'DRE gerencial, Tarefas e Projetos internos e auditoria de produção',
                'Assistente de importação em lote via Excel e CSV',
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
                'Domínio TISS completo: Score do Lote, Raio-X de Operadoras e XML ANS',
                'Dossiê Probatório 1-Clique, Glosas em 3 Níveis e Carta ANS com CliniGo IA',
                'Biometria facial multi-superfície, Totem digital e Painel TV Sensorial',
            ],
            extra: [
                'Dupla comprovação de presença vinculada às guias TISS',
                'Memória de glosas por operadora e Ajuda Lateral Interativa passo a passo',
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
            question: 'Como a CliniGo IA funciona sem violar a LGPD ou expor pacientes?',
            answer:
                'Antes de qualquer processamento, o Escudo LGPD no servidor do CliniGo substitui nomes civis, CPFs, telefones e e-mails por marcadores neutros. O modelo recebe apenas o contexto clínico anonimizado, devolve o rascunho para revisão humana do profissional e nenhum dado identificável fica retido fora da sua clínica.',
        },
        {
            question: 'Como funciona a implantação e a taxa única inicial?',
            answer:
                'Toda nova assinatura inclui uma taxa única de implantação e configuração inicial da unidade, cobrindo parametrização de especialidades, perfis de acesso, salas e estrutura de agenda para a clínica iniciar organizada — além de assistente de importação via Excel e CSV a partir do Avançado.',
        },
        {
            question: 'Como a equipe aprende a usar o sistema no dia a dia?',
            answer:
                'O treinamento é 100% visual e interativo pelo Guia de Uso Integrado e CliniGo Academy (/dashboard/help), com trilhas por função (Recepção, Terapeutas e Administração) e ajuda lateral interativa que destaca exatamente onde clicar dentro das telas.',
        },
        {
            question: 'Qual o limite de unidades e como funcionam as licenças extras?',
            answer:
                'Cada assinatura atende 1 única unidade operacional. Quando sua clínica precisar adicionar profissionais além da franquia do plano, basta contratar licenças avulsas adicionais a R$ 49,90/mês por usuário excedente.',
        },
        {
            question: 'Como o sistema garante sigilo entre terapeutas e acesso das famílias?',
            answer:
                'O controle de permissões (RBAC) e o isolamento de dados atuam direto no servidor e no banco de dados. Terapeutas visualizam apenas seus próprios pacientes, sem acesso a convênios ou finanças. Já no CliniGo Família 2.0, os pais acessam somente conquistas e orientações autorizadas pela clínica, sem expor o prontuário técnico.',
        },
        {
            question: 'Como funcionam os convênios TISS, Dossiê Probatório e WhatsApp?',
            answer:
                'O WhatsApp integrado (a partir do Avançado) envia lembretes e atualiza confirmações direto na agenda. O módulo TISS completo (no Professional) inclui Score de Saúde do Lote, Raio-X de Operadoras, glosas em 3 níveis, Dossiê Probatório em 1 clique com biometria facial e Carta de Recurso ANS assistida pela CliniGo IA.',
        },
    ] as FaqEntry[],
}

export const FINAL_CTA_CONTENT = {
    kicker: 'TESTE NA ROTINA REAL',
    title: 'Veja sua clínica funcionando com leveza já nesta semana.',
    subtitle:
        'Crie sua conta de avaliação por 7 dias sem fidelidade, explore a CliniGo IA com Escudo LGPD na prática ou converse pelo WhatsApp com nossa equipe comercial.',
    primaryLabel: 'Começar teste de 7 dias',
    primaryHref: '/trial',
    secondaryLabel: 'Falar no WhatsApp',
    secondaryHref: WHATSAPP_URL,
    trustPoints: [
        '7 dias de teste sem fidelidade',
        'CliniGo IA + Escudo LGPD nativos',
        'Guia Integrado e CliniGo Academy',
    ],
    imageSrc: '/images/landing/gestao-clinica-tiss.jpg',
    imageAlt: 'Ambiente editorial acolhedor de gestão de clínica multidisciplinar iluminado por luz natural',
} as const

export const FOOTER_CONTENT = {
    description:
        'Plataforma operacional e clínica com IA LGPD para clínicas de terapias multidisciplinares: Psicologia, ABA, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia.',
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
