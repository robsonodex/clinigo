import type { HelpRole } from '@/lib/help/knowledge-base'

export type AcademyTrackId = 'recepcao' | 'terapeutas' | 'administracao'

export type AcademyStationId =
    | 'pre-cadastro'
    | 'agenda-recorrente'
    | 'biometria-checkin'
    | 'evolucao-especialidade'
    | 'planos-faltas'
    | 'escudo-tiss'
    | 'glosas-dossie'
    | 'repasse-financeiro'

export interface FounderDemoScript {
    pitch30s: string
    goldenQuestion: string
    objection: string
    objectionAnswer: string
}

export interface AcademyStation {
    id: AcademyStationId
    order: number
    shortTitle: string
    title: string
    subtitle: string
    trackId: AcademyTrackId
    ownerBadge: string
    allowedRoles: HelpRole[]
    comesFrom: string
    goesTo: string
    whatHappens: string
    keyBullets: string[]
    targetRoute: string
    targetRouteLabel: string
    manualAnchor: string
    featureKey?: string
    estimatedMinutes: number
    demoScript: FounderDemoScript
}

export interface AcademyLesson {
    id: string
    trackId: AcademyTrackId
    title: string
    summary: string
    estimatedMinutes: number
    linkedStationId: AcademyStationId
    targetRoute: string
    manualAnchor: string
    featureKey?: string
    quickClicks: string[]
}

export interface AcademyTrackMeta {
    id: AcademyTrackId
    title: string
    audienceLabel: string
    tagline: string
    description: string
    allowedRoles: HelpRole[]
}

export const ACADEMY_TRACKS: AcademyTrackMeta[] = [
    {
        id: 'recepcao',
        title: 'Recepção e Atendimento',
        audienceLabel: 'Recepcionistas e Equipe de Balcão',
        tagline: 'Do primeiro contato ao check-in sem fila',
        description:
            'Domine o fluxo diário da recepção em clínicas de terapias: pré-cadastro pelo WhatsApp, agenda recorrente com co-terapia, check-in biométrico e controle de faltas.',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
    },
    {
        id: 'terapeutas',
        title: 'Terapeutas (Corpo Clínico)',
        audienceLabel: 'Psicologia, ABA, Fono, TO, Psicomotricidade e Fisio',
        tagline: 'Evoluir em 60 segundos com sigilo e praticidade',
        description:
            'Veja na prática como consultar sua agenda no computador ou celular, registrar evoluções isoladas por especialidade, acompanhar planos ABA e conferir seus repasses.',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'NURSE'],
    },
    {
        id: 'administracao',
        title: 'Administração, Faturamento e TISS / Glosas',
        audienceLabel: 'Gestores, Faturistas e Financeiro',
        tagline: 'Glosa zero, XML ANS validado e repasse automático',
        description:
            'Entenda de ponta a ponta como o Escudo Anti-Glosa, as Remessas XML, o Controle de Glosas em 3 Níveis, o Dossiê em 1 Clique e a Folha de Repasses protegem o faturamento da clínica.',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    },
]

export const ACADEMY_STATIONS: AcademyStation[] = [
    {
        id: 'pre-cadastro',
        order: 1,
        shortTitle: 'Pré-Cadastro QR',
        title: 'Pré-Cadastro Remoto e Termos LGPD',
        subtitle: 'O responsável preenche os dados pelo celular antes mesmo de chegar na clínica.',
        trackId: 'recepcao',
        ownerBadge: 'Recepção',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
        comesFrom: 'Primeiro contato pelo WhatsApp ou balcão da clínica',
        goesTo: 'Cadastro completo do paciente, termo assinado e liberação para agenda',
        whatHappens:
            'Em vez de entregar prancheta de papel na recepção, a equipe gera um link ou QR Code exclusivo. Os pais preenchem os dados do paciente, carteirinha do convênio e assinam o termo LGPD direto do celular.',
        keyBullets: [
            'Elimina erros de digitação de CPF e número de carteirinha do convênio.',
            'Anexa foto da carteirinha e documento antes da primeira sessão.',
            'Gera registro auditável de consentimento LGPD e contrato eletrônico.',
        ],
        targetRoute: '/dashboard/pre-cadastros',
        targetRouteLabel: 'Abrir Pré-Cadastros',
        manualAnchor: 'pre-cadastro-remoto-pacientes',
        estimatedMinutes: 2,
        demoScript: {
            pitch30s:
                'Em clínica de terapias, a recepção trava quando chegam 5 pais ao mesmo tempo com ficha de papel. No CliniGo, antes da avaliação você manda um link no WhatsApp: o responsável preenche tudo, envia a carteirinha do convênio e assina o termo LGPD no celular. Quando chega na clínica, já está pronto.',
            goldenQuestion:
                'Hoje na sua recepção, quantas fichas ainda são preenchidas no papel e redigitadas depois?',
            objection: 'E se o pai não preencher em casa antes de chegar?',
            objectionAnswer:
                'Sem problema: na recepção existe o QR Code de balcão e o cadastro rápido em 15 segundos. O link prévio só tira 80% do volume repetitivo das costas da recepcionista.',
        },
    },
    {
        id: 'agenda-recorrente',
        order: 2,
        shortTitle: 'Agenda e Co-terapia',
        title: 'Agenda Recorrente, Co-terapia e Salas Sensoriais',
        subtitle: 'Agende meses inteiros de sessões fixas e co-terapia sem digitar um horário por vez.',
        trackId: 'recepcao',
        ownerBadge: 'Recepção',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF', 'DOCTOR'],
        comesFrom: 'Paciente cadastrado + Grade de horários dos terapeutas',
        goesTo: 'Confirmação automática no WhatsApp + Fila do dia na Recepção',
        whatHappens:
            'Pacientes de terapia têm rotina fixa (ex.: toda terça e quinta por 6 meses) e muitas vezes passam com 2 terapeutas na mesma sessão (co-terapia). O CliniGo cria toda a série recorrente de uma vez, bloqueando a sala sensorial para evitar conflito.',
        keyBullets: [
            'Cria séries semanais ou quinzenais em segundos com bloqueio de sala.',
            'Suporte nativo a co-terapia (Psicóloga + TO ou ABA na mesma sessão).',
            'Disparo automático de confirmação no WhatsApp para derrubar faltas.',
        ],
        targetRoute: '/dashboard/agenda',
        targetRouteLabel: 'Abrir Agenda',
        manualAnchor: 'agenda-agendamento-atendimento',
        estimatedMinutes: 3,
        demoScript: {
            pitch30s:
                'Sistema médico comum foi feito para consulta avulsa. Em clínica de terapias, uma criança faz Psicologia, Fono, TO e ABA toda semana por meses. Aqui você cria a série recorrente inteira em 15 segundos, vincula co-terapia quando há dois profissionais juntos e o sistema já evita choque de sala sensorial.',
            goldenQuestion:
                'Quanto tempo sua recepção gasta hoje renovando agenda fixa no começo de cada mês?',
            objection: 'E quando o paciente precisa remarcar só um dia da série?',
            objectionAnswer:
                'Você edita ou remarca apenas aquela sessão isolada ou daquela data em diante, sem precisar apagar a série inteira.',
        },
    },
    {
        id: 'biometria-checkin',
        order: 3,
        shortTitle: 'Biometria e Recepção',
        title: 'Check-in por Biometria Facial, QR Code e Painel de TV',
        subtitle: 'Comprovação irrefutável de presença na chegada — sua primeira defesa contra glosas.',
        trackId: 'recepcao',
        ownerBadge: 'Recepção',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
        comesFrom: 'Sessão agendada do dia na Agenda',
        goesTo: 'Fila do Terapeuta + Selo de Presença no Escudo Anti-Glosa (TISS)',
        whatHappens:
            'Ao chegar na clínica, o paciente ou responsável confirma presença por reconhecimento facial (no balcão ou totem) ou QR Code. O painel de TV chama o paciente com voz e o sistema grava data, hora e prova biométrica vinculados à sessão.',
        keyBullets: [
            'Check-in facial em 2 segundos que elimina filas e planilhas manuais de presença.',
            'Painel de TV com chamada sonora e fila organizada por sala.',
            'A prova biométrica vai automaticamente para o Dossiê de Recurso de Glosa.',
        ],
        targetRoute: '/dashboard/recepcao',
        targetRouteLabel: 'Abrir Recepção',
        manualAnchor: 'recepcao-checkin-painel-tv',
        estimatedMinutes: 3,
        demoScript: {
            pitch30s:
                'Aqui está um dos maiores diferenciais do CliniGo para clínicas com convênio: quando o paciente chega, a recepção faz o check-in facial em 2 segundos. Além de chamar automaticamente na TV, essa biometria fica colada na sessão. Se a operadora disser lá na frente que a sessão não aconteceu, você já tem a prova pronta.',
            goldenQuestion:
                'Você já teve operadora glosando sessão alegando falta de comprovação de presença ou guia sem assinatura legível?',
            objection: 'Precisa comprar algum aparelho caro de biometria?',
            objectionAnswer:
                'Não. Funciona com a webcam comum do computador da recepção ou qualquer tablet simples usando o navegador.',
        },
    },
    {
        id: 'evolucao-especialidade',
        order: 4,
        shortTitle: 'Evolução e Sigilo',
        title: 'Evoluções por Especialidade, Sigilo Clínico e Assinatura',
        subtitle: 'Cada especialidade vê e registra apenas o que lhe compete, com validade jurídica.',
        trackId: 'terapeutas',
        ownerBadge: 'Terapeutas',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'NURSE'],
        comesFrom: 'Check-in confirmado na Recepção ou Minha Agenda (Web / App PWA)',
        goesTo: 'Prontuário isolado por especialidade + Liberação para Faturamento TISS',
        whatHappens:
            'O terapeuta abre o atendimento no computador ou celular, escolhe o modelo da sua área (SOAP, CIF, DAP, ABA ou Livre), registra a evolução e assina eletronicamente conforme a Lei 14.063/2020. O sigilo entre áreas é protegido por perfil.',
        keyBullets: [
            'Isolamento de sigilo: prontuário de Psicologia protegido conforme normas do CRP.',
            'Modelos prontos para Psicologia, ABA, Fono, TO, Psicomotricidade e Fisioterapia.',
            'Assinatura eletrônica com carimbo de data/hora que blinda auditorias e convênios.',
        ],
        targetRoute: '/dashboard/evolucoes',
        targetRouteLabel: 'Abrir Evoluções',
        manualAnchor: 'prontuario-eletronico-evolucao',
        estimatedMinutes: 3,
        demoScript: {
            pitch30s:
                'As terapeutas adoram porque não precisam caçar telas: entram em Minha Agenda no computador ou celular, preenchem a evolução no modelo da sua especialidade e assinam eletronicamente dentro da Lei 14.063. E o melhor: o prontuário da Psicologia fica isolado de outras áreas, respeitando o sigilo do CRP e a LGPD.',
            goldenQuestion:
                'Hoje suas terapeutas atrasam evoluções por acharem o sistema atual lento ou complicado no celular?',
            objection: 'Minha equipe tem terapeutas de 5 áreas diferentes, todas usam a mesma ficha?',
            objectionAnswer:
                'Não. Cada especialidade trabalha com seu próprio template clínico (SOAP, CIF, DAP, ABA ou personalizado), tudo organizado na mesma linha do tempo.',
        },
    },
    {
        id: 'planos-faltas',
        order: 5,
        shortTitle: 'Planos ABA e Faltas',
        title: 'Planos Terapêuticos, Gráficos Evolutivos e Faltas',
        subtitle: 'Metas mensuráveis para pais e convênios + controle rigoroso de faltas e reposições.',
        trackId: 'terapeutas',
        ownerBadge: 'Terapeutas e Coordenação',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
        comesFrom: 'Avaliação clínica e sessões registradas',
        goesTo: 'Relatórios evolutivos para famílias/operadoras e gestão de pacotes',
        whatHappens:
            'A equipe cadastra objetivos terapêuticos (ex.: metas ABA, comunicação, psicomotricidade) e acompanha o percentual de avanço sessão a sessão. Paralelamente, o Controle de Faltas contabiliza ausências e reposições sem planilhas paralelas.',
        keyBullets: [
            'Gráficos de evolução claros para apresentar aos pais e auditorias de convênios.',
            'Biblioteca de objetivos e metas estruturadas para TEA e neurodesenvolvimento.',
            'Controle automático de faltas, justificativas e créditos de reposição.',
        ],
        targetRoute: '/dashboard/planos-terapeuticos',
        targetRouteLabel: 'Abrir Planos Terapêuticos',
        manualAnchor: 'planos-terapeuticos',
        estimatedMinutes: 3,
        demoScript: {
            pitch30s:
                'Em clínicas de TEA e neurodesenvolvimento, convênios e pais cobram resultado concreto. Nos Planos Terapêuticos você registra metas objetivas e o sistema gera a curva de progresso automaticamente. E no Controle de Faltas você enxerga quem faltou e controla reposições sem briga no WhatsApp.',
            goldenQuestion:
                'Quando um pai ou convênio pede um relatório de evolução da criança, quanto tempo a terapeuta leva para montar?',
            objection: 'A coordenação clínica consegue acompanhar se as terapeutas estão evoluindo no prazo?',
            objectionAnswer:
                'Sim. A clínica tem o painel de Conformidade de Evoluções, exclusivo da gestão e coordenação, mostrando exatamente quais atendimentos ainda estão sem evolução assinada.',
        },
    },
    {
        id: 'escudo-tiss',
        order: 6,
        shortTitle: 'Escudo TISS e XML',
        title: 'Elaboração de Contas, Escudo Anti-Glosa (Ctrl+L) e XML',
        subtitle: 'Trave erros antes de enviar para a operadora e gere lotes XML no padrão ANS.',
        trackId: 'administracao',
        ownerBadge: 'Faturamento / Admin',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
        comesFrom: 'Sessões realizadas com Check-in Biométrico + Evolução Assinada',
        goesTo: 'Remessa XML enviada à operadora + Controle de Glosas',
        whatHappens:
            'Antes de faturar, o Escudo Anti-Glosa verifica automaticamente 4 itens: carteirinha, senha/autorização, presença biométrica e evolução assinada. Com tudo verde, o faturista libera a conta com Ctrl+L, agrupa na Remessa e gera o XML ENVIO_LOTE_GUIAS validado.',
        keyBullets: [
            'Escudo Anti-Glosa avisa pendências antes do faturamento (evita glosa boba).',
            'Atalho Ctrl+L libera contas conferidas em lote com rapidez industrial.',
            'Gera arquivo XML padrão TISS-ANS pronto para envio no portal da operadora.',
        ],
        targetRoute: '/dashboard/tiss',
        targetRouteLabel: 'Abrir Faturamento TISS',
        manualAnchor: 'tiss-elaboracao-contas',
        featureKey: 'faturamento_tiss',
        estimatedMinutes: 4,
        demoScript: {
            pitch30s:
                'O segredo de não tomar glosa é barrar o erro antes do envio. Aqui na Elaboração de Contas, o Escudo Anti-Glosa acende 4 luzes para cada sessão: carteirinha, senha de autorização, biometria facial e evolução assinada. Se estiver tudo verde, você aperta Ctrl+L, libera a conta e gera o XML TISS padrão ANS em segundos.',
            goldenQuestion:
                'Hoje vocês descobrem que faltava uma senha ou assinatura antes de faturar, ou só 45 dias depois quando a glosa chega?',
            objection: 'O arquivo XML funciona nos portais das operadoras (Unimed, Bradesco, SulAmérica, Amil)?',
            objectionAnswer:
                'Sim, segue a estrutura oficial TISS-ANS com validação prévia de campos obrigatórios e registro do número de protocolo da remessa.',
        },
    },
    {
        id: 'glosas-dossie',
        order: 7,
        shortTitle: 'Glosas e Dossiê',
        title: 'Controle de Glosas em 3 Níveis e Dossiê em 1 Clique',
        subtitle: 'Identifique exatamente o que foi glosado, separe o recuperável e recorra com provas prontas.',
        trackId: 'administracao',
        ownerBadge: 'Faturamento / Admin',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
        comesFrom: 'Retorno de pagamento/glosa da Operadora sobre uma Remessa XML',
        goesTo: 'Recurso de Glosa enviado + Recuperação financeira no Caixa e Repasse',
        whatHappens:
            'O sistema organiza a conferência em 3 níveis (Remessa → Contas → Itens com motivo ANS Tabela 38). Para glosas recuperáveis, o botão de Dossiê Probatório reúne automaticamente em 1 clique o espelho da guia, o check-in biométrico e a evolução assinada para enviar no recurso.',
        keyBullets: [
            'Conferência estruturada: Nível 1 (Remessa), Nível 2 (Contas) e Nível 3 (Itens ANS).',
            'Separa glosa recuperável de glosa irrecuperável com batimento contábil exato.',
            'Dossiê Probatório em 1 clique compila Guia + Biometria + Evolução Assinada.',
        ],
        targetRoute: '/dashboard/tiss/glosas',
        targetRouteLabel: 'Abrir Controle de Glosas',
        manualAnchor: 'tiss-controle-glosas',
        featureKey: 'faturamento_tiss',
        estimatedMinutes: 4,
        demoScript: {
            pitch30s:
                'Quando volta um demonstrativo com glosa, a maioria das clínicas desiste de recorrer porque dá trabalho demais juntar prova. No CliniGo você abre a remessa em 3 níveis, vê exatamente qual item foi glosado pelo código ANS, e com 1 clique o sistema monta o Dossiê Probatório completo: espelho da guia + biometria facial + evolução assinada. É só enviar o recurso e acompanhar o pagamento.',
            goldenQuestion:
                'Quanto valor fica parado ou perdido por ano na sua clínica porque ninguém consegue dar conta de recorrer de todas as glosas?',
            objection: 'Minha equipe de faturamento precisa de semanas de curso para usar isso?',
            objectionAnswer:
                'Não. O próprio CliniGo Academy traz o Simulador Glosa Zero aqui embaixo: em 5 minutos a faturista treina na prática os 4 passos sem risco de errar em guia real.',
        },
    },
    {
        id: 'repasse-financeiro',
        order: 8,
        shortTitle: 'Repasse e DRE',
        title: 'Repasse por Terapeuta, DRE e Exportação Excel LGPD',
        subtitle: 'Feche a folha de cada terapeuta automaticamente e acompanhe o lucro real da clínica.',
        trackId: 'administracao',
        ownerBadge: 'Gestão e Terapeutas',
        allowedRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'DOCTOR'],
        comesFrom: 'Sessões realizadas (Particular ou Convênio) e regras de contrato',
        goesTo: 'Folha de Repasse fechada, visão do terapeuta e DRE consolidada',
        whatHappens:
            'Cada terapeuta pode ter uma regra específica por convênio, especialidade ou paciente. O sistema soma automaticamente a produção do mês, gera o demonstrativo individual para o profissional em "Meu Financeiro" e alimenta a DRE da clínica.',
        keyBullets: [
            'Calcula repasse por valor fixo ou percentual por convênio, terapia ou paciente.',
            'Terapeuta consulta seus próprios atendimentos em "Meu Financeiro" (zero atrito).',
            'Exportação de evoluções em Excel com auditoria LGPD e fechamento financeiro/DRE.',
        ],
        targetRoute: '/dashboard/financial/payroll',
        targetRouteLabel: 'Abrir Repasses',
        manualAnchor: 'financeiro-repasses-medicos',
        featureKey: 'repasse_medico',
        estimatedMinutes: 3,
        demoScript: {
            pitch30s:
                'No fim do mês, fechar repasse de 10 ou 20 terapeutas com regras diferentes por convênio costuma virar um pesadelo. No CliniGo o cálculo nasce pronto das sessões realizadas: você revisa, fecha a folha e cada terapeuta vê o próprio extrato transparente no painel dela — enquanto você acompanha a DRE real da clínica.',
            goldenQuestion:
                'Quantos dias do mês você ou seu financeiro perdem hoje conferindo planilha de repasse de terapeutas?',
            objection: 'E se uma terapeuta ganhar um valor diferente em um convênio específico?',
            objectionAnswer:
                'O CliniGo suporta regra específica por profissional, por convênio e até valor diferenciado por paciente, com histórico de vigência.',
        },
    },
]

export const ACADEMY_LESSONS: AcademyLesson[] = [
    // TRILHA 1: RECEPÇÃO
    {
        id: 'rec-pre-cadastro',
        trackId: 'recepcao',
        title: 'Enviar Pré-Cadastro por QR Code ou WhatsApp',
        summary: 'Receba os dados do paciente, foto da carteirinha e termo LGPD assinado antes da chegada.',
        estimatedMinutes: 2,
        linkedStationId: 'pre-cadastro',
        targetRoute: '/dashboard/pre-cadastros',
        manualAnchor: 'pre-cadastro-remoto-pacientes',
        quickClicks: ['Menu Equipe > Pré-Cadastros', 'Gerar Link / QR Code', 'Enviar no WhatsApp do responsável', 'Aprovar e converter em paciente'],
    },
    {
        id: 'rec-agenda-recorrente',
        trackId: 'recepcao',
        title: 'Criar Agenda Recorrente e Sessão em Co-terapia',
        summary: 'Programe sessões semanais de vários meses de uma só vez e vincule 2 terapeutas na mesma sala.',
        estimatedMinutes: 3,
        linkedStationId: 'agenda-recorrente',
        targetRoute: '/dashboard/agenda',
        manualAnchor: 'agenda-agendamento-atendimento',
        quickClicks: ['Menu Agendamento > Agenda', 'Novo Agendamento', 'Ativar Recorrência / Co-terapia', 'Selecionar Sala e Confirmar'],
    },
    {
        id: 'rec-biometria-tv',
        trackId: 'recepcao',
        title: 'Fazer Check-in Biométrico Facial e Chamar no Painel de TV',
        summary: 'Valide a chegada do paciente com prova biométrica que protege contra glosas e organize a sala de espera.',
        estimatedMinutes: 3,
        linkedStationId: 'biometria-checkin',
        targetRoute: '/dashboard/recepcao',
        manualAnchor: 'recepcao-checkin-painel-tv',
        quickClicks: ['Menu Agendamento > Recepção', 'Selecionar paciente do dia', 'Confirmar Biometria Facial ou QR', 'Chamar na TV'],
    },
    {
        id: 'rec-whatsapp-faltas',
        trackId: 'recepcao',
        title: 'Confirmar Sessões no WhatsApp e Controlar Faltas / Reposições',
        summary: 'Reduza faltas com lembretes automáticos e registre ausências ou reposições sem perder o controle de pacotes.',
        estimatedMinutes: 3,
        linkedStationId: 'planos-faltas',
        targetRoute: '/dashboard/controle-faltas',
        manualAnchor: 'controle-faltas-pacotes',
        quickClicks: ['Agenda > Marcar Falta ou Remarcar', 'Prontuário > Controle de Faltas', 'Acompanhar reposições pendentes'],
    },
    {
        id: 'rec-busca-global-ctrl-k',
        trackId: 'recepcao',
        title: 'Usar a Busca Global (Ctrl+K) e Ações Rápidas na Lista de Pacientes',
        summary: 'Localize pacientes em 2 segundos de qualquer tela com botões diretos (Abrir Ficha, Contratos e WhatsApp) respeitando estritamente o perfil da recepção.',
        estimatedMinutes: 2,
        linkedStationId: 'pre-cadastro',
        targetRoute: '/dashboard/pacientes',
        manualAnchor: 'busca-global-acoes-rapidas',
        featureKey: 'pacientes',
        quickClicks: ['Pressionar Ctrl+K ou clicar na busca do topo', 'Digitar 2+ letras do paciente', 'Acionar Abrir Ficha, Contratos ou WhatsApp em 1 clique'],
    },
    {
        id: 'rec-clinigo-familia-renovacao',
        trackId: 'recepcao',
        title: 'Enviar Boletim CliniGo Família e Relatório de Renovação de Convênio',
        summary: 'Compartilhe links LGPD sem aplicativo para responsáveis/escola e gere o PDF institucional de renovação com frequência e biometria em 1 clique.',
        estimatedMinutes: 2,
        linkedStationId: 'biometria-checkin',
        targetRoute: '/dashboard/pacientes',
        manualAnchor: 'relatorio-renovacao-convenio-1-clique',
        featureKey: 'pacientes',
        quickClicks: ['Equipe > Pacientes > Abrir Ficha', 'Clicar em CliniGo Família ou Relatório Renovação', 'Enviar pelo WhatsApp ou baixar PDF institucional'],
    },

    // TRILHA 2: TERAPEUTAS
    {
        id: 'ter-meu-dia-clonar',
        trackId: 'terapeutas',
        title: 'Operar Meu Dia Clínico e Clonar Última Sessão em 1 Clique',
        summary: 'Veja sua fila do dia em uma única tela com acesso direto a Evoluir/Assinar, Tatame e Ficha, e clone metas/estratégias da sessão anterior sem copiar resultados antigos.',
        estimatedMinutes: 2,
        linkedStationId: 'evolucao-especialidade',
        targetRoute: '/dashboard/meu-dia',
        manualAnchor: 'meu-dia-clinico-clonar-sessao',
        featureKey: 'agenda',
        quickClicks: ['Agendamento > Meu Dia Clínico (ou Ctrl+K)', 'Filtrar Pendentes ou Assinadas', 'No Plano de Sessão, clicar em Clonar Última Sessão'],
    },
    {
        id: 'ter-tatame-curvas-biblioteca',
        trackId: 'terapeutas',
        title: 'Coletar no Modo Tatame DTT/NET, Curvas ABA e Biblioteca de Psicomotricidade',
        summary: 'Registre tentativas com 1 toque em tablet/celular, acompanhe a regra de domínio (>=80% x 3) e consulte os 55 objetivos visuais (A-K) antes de vincular.',
        estimatedMinutes: 3,
        linkedStationId: 'planos-faltas',
        targetRoute: '/dashboard/pacientes',
        manualAnchor: 'modo-tatame-curvas-aprendizagem-aba',
        featureKey: 'prontuarios',
        quickClicks: ['Ficha do Paciente > Planos de Sessão', 'Ativar Modo Tatame DTT/NET para coleta 1-toque', 'Conferir Curva de Aprendizagem e Biblioteca (55)'],
    },
    {
        id: 'ter-supervisao-aba-multidisciplinar',
        trackId: 'terapeutas',
        title: 'Mesa de Supervisão ABA/PEI e Integração Multidisciplinar (7 dias)',
        summary: 'Monitore estagnação, metas prontas para promoção, calibração entre aplicadores (>=25 p.p.) e registros recentes de outras especialidades do mesmo paciente.',
        estimatedMinutes: 3,
        linkedStationId: 'planos-faltas',
        targetRoute: '/dashboard/terapia/supervisao',
        manualAnchor: 'mesa-supervisao-aba-pei',
        featureKey: 'supervisao',
        quickClicks: ['Terapia > Supervisão Clínica', 'Alternar janelas 30/60/90d e abas Estagnação/Promoção/Calibração', 'Conferir card Integração Multidisciplinar no Plano de Sessão'],
    },
    {
        id: 'ter-clinigo-familia-2',
        trackId: 'terapeutas',
        title: 'CliniGo Família 2.0: Mural de Conquistas, Termômetro e Retorno da Escola',
        summary: 'Correlacione rotina de casa com evolução clínica, envie links temporários de 7 dias para escola/neuropediatra e receba micro-retorno estruturado sem chat aberto.',
        estimatedMinutes: 2,
        linkedStationId: 'planos-faltas',
        targetRoute: '/dashboard/pacientes',
        manualAnchor: 'clinigo-familia-2-escola-antichurn',
        featureKey: 'prontuarios',
        quickClicks: ['Ficha do Paciente ou Plano de Sessão > CliniGo Família', 'Escolher modo Família ou Escola (7 dias)', 'Acompanhar Correlação Casa x Clínica nas curvas'],
    },
    {
        id: 'ter-minha-agenda',
        trackId: 'terapeutas',
        title: 'Usar Minha Agenda no Computador e no App Celular (PWA)',
        summary: 'Veja apenas seus atendimentos do dia, confirme quem já chegou na recepção e inicie a sessão com 1 clique.',
        estimatedMinutes: 2,
        linkedStationId: 'agenda-recorrente',
        targetRoute: '/dashboard/minha-agenda',
        manualAnchor: 'minha-agenda-profissional',
        quickClicks: ['Menu Agendamento > Minha Agenda', 'Visualizar status "Aguardando"', 'Clicar em Iniciar Atendimento'],
    },
    {
        id: 'ter-evolucao-sigilo',
        trackId: 'terapeutas',
        title: 'Registrar Evolução por Especialidade com Sigilo Protegido',
        summary: 'Preencha fichas SOAP, CIF, DAP, ABA ou Livre com isolamento entre áreas e assinatura eletrônica válida.',
        estimatedMinutes: 3,
        linkedStationId: 'evolucao-especialidade',
        targetRoute: '/dashboard/evolucoes',
        manualAnchor: 'prontuario-eletronico-evolucao',
        quickClicks: ['Prontuário > Evoluções', 'Selecionar modelo da especialidade', 'Preencher e clicar em Assinar (Lei 14.063)'],
    },
    {
        id: 'ter-planos-aba',
        trackId: 'terapeutas',
        title: 'Montar Planos Terapêuticos, Metas ABA e Gráficos Evolutivos',
        summary: 'Estruture objetivos individuais, acompanhe indicadores de desempenho e compartilhe evolução real.',
        estimatedMinutes: 3,
        linkedStationId: 'planos-faltas',
        targetRoute: '/dashboard/planos-terapeuticos',
        manualAnchor: 'planos-terapeuticos',
        quickClicks: ['Prontuário > Planos Terapêuticos', 'Novo Plano / Selecionar Paciente', 'Definir metas e registrar avanço'],
    },
    {
        id: 'ter-meu-financeiro',
        trackId: 'terapeutas',
        title: 'Acompanhar Minha Produção e Repasses em Meu Financeiro',
        summary: 'Consulte todas as sessões realizadas, demonstrativos mensais e previsões de repasse com total transparência.',
        estimatedMinutes: 2,
        linkedStationId: 'repasse-financeiro',
        targetRoute: '/dashboard/meu-financeiro',
        manualAnchor: 'meu-financeiro-profissional',
        quickClicks: ['Menu Financeiro > Meu Financeiro', 'Filtrar mês de competência', 'Conferir produção e demonstrativo'],
    },

    // TRILHA 3: ADMINISTRAÇÃO, FATURAMENTO E TISS/GLOSAS
    {
        id: 'adm-convenios-regras',
        trackId: 'administracao',
        title: 'Configurar Convênios, Tabelas TUSS e Regras de Repasse',
        summary: 'Cadastre operadoras, códigos de terapia TUSS e o valor de repasse de cada profissional uma única vez.',
        estimatedMinutes: 3,
        linkedStationId: 'escudo-tiss',
        targetRoute: '/dashboard/convenios',
        manualAnchor: 'tiss-configuracao-convenios',
        quickClicks: ['Financeiro > Convênios', 'Cadastrar Operadora e Tabela TUSS', 'Definir repasse em Contratos/Profissionais'],
    },
    {
        id: 'adm-escudo-ctrl-l',
        trackId: 'administracao',
        title: 'Revisar Escudo Anti-Glosa e Liberar Contas (Ctrl+L)',
        summary: 'Conferir carteirinha, senha, biometria e evolução antes do faturamento e liberar contas em segundos.',
        estimatedMinutes: 4,
        linkedStationId: 'escudo-tiss',
        targetRoute: '/dashboard/tiss',
        manualAnchor: 'tiss-elaboracao-contas',
        featureKey: 'faturamento_tiss',
        quickClicks: ['Financeiro > Faturamento TISS', 'Aba Elaboração de Contas', 'Conferir 4 itens verdes do Escudo', 'Pressionar Ctrl+L (Encerrar e Liberar)'],
    },
    {
        id: 'adm-remessa-xml',
        trackId: 'administracao',
        title: 'Agrupar Contas Liberadas e Gerar Remessa XML TISS-ANS',
        summary: 'Crie a remessa da competência, vincule contas liberadas, valide regras ANS e baixe o XML de envio.',
        estimatedMinutes: 3,
        linkedStationId: 'escudo-tiss',
        targetRoute: '/dashboard/tiss/batches',
        manualAnchor: 'tiss-remessas-xml',
        featureKey: 'faturamento_tiss',
        quickClicks: ['Faturamento TISS > Lotes / Remessas', 'Nova Remessa', 'Selecionar Contas Liberadas', 'Fechar Remessa e Baixar XML'],
    },
    {
        id: 'adm-glosas-dossie',
        trackId: 'administracao',
        title: 'Operar Glosas em 3 Níveis e Gerar Dossiê Probatório em 1 Clique',
        summary: 'Separe glosas recuperáveis de irrecuperáveis e recorra com guia, biometria e evolução compiladas automaticamente.',
        estimatedMinutes: 4,
        linkedStationId: 'glosas-dossie',
        targetRoute: '/dashboard/tiss/glosas',
        manualAnchor: 'tiss-controle-glosas',
        featureKey: 'faturamento_tiss',
        quickClicks: ['Faturamento TISS > Glosas e Recursos', 'Nível 1 (Remessa) > Nível 2 (Contas) > Nível 3 (Itens ANS)', 'Criar Recurso e Gerar Dossiê em 1 Clique'],
    },
    {
        id: 'adm-repasse-dre-excel',
        trackId: 'administracao',
        title: 'Fechar Folha de Repasses, DRE e Exportar Evoluções em Excel',
        summary: 'Apure o repasse exato de toda a equipe terapêutica, acompanhe a DRE e extraia planilhas auditadas LGPD.',
        estimatedMinutes: 3,
        linkedStationId: 'repasse-financeiro',
        targetRoute: '/dashboard/financial/payroll',
        manualAnchor: 'financeiro-repasses-medicos',
        featureKey: 'repasse_medico',
        quickClicks: ['Financeiro > Folha de Repasse', 'Selecionar competência', 'Revisar e aprovar folha', 'Consultar DRE Consolidada'],
    },
    {
        id: 'adm-raiox-operadoras-memoria-antiglosa',
        trackId: 'administracao',
        title: 'Raio-X de Operadoras (DSO e Margem), Score do Lote e Memória Anti-Glosa',
        summary: 'Compare rentabilidade e prazo de retorno por convênio, previna motivos recorrentes antes de fechar o XML e exporte o Dossiê PDF em 1 clique.',
        estimatedMinutes: 3,
        linkedStationId: 'glosas-dossie',
        targetRoute: '/dashboard/tiss/reports/loss-analysis',
        manualAnchor: 'tiss-operadoras-dossie-probatorio',
        featureKey: 'faturamento_tiss',
        quickClicks: ['Faturamento TISS > Perdas (BI) > Raio-X por Operadora', 'Conferir Score 0-100% e Memória Anti-Glosa antes do XML', 'Em Glosas (Nível 2), clicar em Dossiê PDF'],
    },
    {
        id: 'adm-modulos-clinicos-radar-antichurn',
        trackId: 'administracao',
        title: 'Gerenciar Central de Módulos Clínicos e Radar Operacional Anti-Churn',
        summary: 'Ative ou desative módulos (Contratos, Teleconsulta, Planos de Sessão) com autonomia e monitore alertas silenciosos de baixa confiança das famílias no Dashboard.',
        estimatedMinutes: 2,
        linkedStationId: 'pre-cadastro',
        targetRoute: '/dashboard/configuracoes',
        manualAnchor: 'configuracoes-modulos-clinicos',
        featureKey: 'minha_clinica',
        quickClicks: ['Configurações > Minha Clínica > Módulos Clínicos', 'Ativar ou desativar módulos da clínica', 'Acompanhar Radar Operacional no Painel Principal'],
    },
]

