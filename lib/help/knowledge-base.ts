export type HelpModuleId =
    | 'principal'
    | 'tiss-glosas'
    | 'agenda'
    | 'recepcao'
    | 'prontuario'
    | 'terapia'
    | 'financeiro'
    | 'crm-whatsapp'
    | 'gestao'
    | 'configuracoes'
    | 'plataforma';

export type HelpRole =
    | 'SUPER_ADMIN'
    | 'CLINIC_ADMIN'
    | 'RECEPTIONIST'
    | 'FINANCIAL'
    | 'DOCTOR'
    | 'NURSE'
    | 'STAFF'
    | 'READONLY';

export interface HelpStep {
    number: number;
    title: string;
    description: string;
    uiPathBadges: string[];
}

export interface HelpFaqItem {
    question: string;
    answer: string;
}

export interface KnowledgeArticle {
    id: string;
    anchor: string;
    module: HelpModuleId;
    title: string;
    subtitle: string;
    objective: string;
    whenToUse: string;
    estimatedMinutes: number;
    roles: HelpRole[];
    minPlan: 'Básico' | 'Avançado' | 'Profissional' | 'Enterprise';
    route: string;
    featureKey?: string;
    prerequisites: string[];
    steps: HelpStep[];
    tips: string[];
    faqs: HelpFaqItem[];
    tags: string[];
    aliases: string[];
}

export interface HelpModuleMeta {
    id: HelpModuleId;
    label: string;
    shortDescription: string;
    featured?: boolean;
}

export const HELP_MODULES: HelpModuleMeta[] = [
    {
        id: 'principal',
        label: 'Painel Inicial e Tarefas',
        shortDescription: 'Visão geral do Dashboard, mural de recados, gestão de tarefas e checklist inicial da clínica.',
    },
    {
        id: 'agenda',
        label: 'Agendamento, Teleconsulta e Horários',
        shortDescription: 'Agenda geral, Minha Agenda, salas de Teleconsulta, séries recorrentes e grade de horários.',
    },
    {
        id: 'recepcao',
        label: 'Recepção, Equipe e Pacientes',
        shortDescription: 'Fila de recepção, Painel de TV, QR Code, pré-cadastro remoto, diretório de pacientes e equipe.',
    },
    {
        id: 'prontuario',
        label: 'Prontuário, Evoluções e Planos',
        shortDescription: 'Evoluções clínicas (SOAP, CIF, DAP), Planos Terapêuticos e ABA, templates, documentos e Excel.',
    },
    {
        id: 'terapia',
        label: 'Terapia e Fluxo Clínico',
        shortDescription: 'Fila de espera, encaminhamentos e supervisão clínica.',
    },
    {
        id: 'financeiro',
        label: 'Financeiro, Repasses e Reembolsos',
        shortDescription: 'Lançamentos, pagamentos, fechamentos, créditos, DRE, metas, repasses, reembolsos e Meu Financeiro.',
    },
    {
        id: 'tiss-glosas',
        label: 'Faturamento TISS e Controle de Glosas',
        shortDescription: 'Convênios, recepção de convênios, Elaboração (Ctrl+L), Remessas XML, Glosas 3 Níveis, Recursos e Perdas (BI).',
        featured: true,
    },
    {
        id: 'crm-whatsapp',
        label: 'Comunicação e FluxoMed CRM',
        shortDescription: 'Chat interno, conexões WhatsApp por setor via QR Code, notificações e funil Kanban FluxoMed.',
    },
    {
        id: 'gestao',
        label: 'Gestão, Estoque e Auditoria',
        shortDescription: 'Estoque, relatórios gerenciais, termos legais, importação de dados, automação e auditoria LGPD.',
    },
    {
        id: 'configuracoes',
        label: 'Configurações, Usuários e Segurança',
        shortDescription: 'Minha Clínica, página pública, teleconsulta, usuários e perfis (RBAC), terapias, assinatura e dispositivos.',
    },
    {
        id: 'plataforma',
        label: 'Administração da Plataforma',
        shortDescription: 'Master Hub, gestão global de clínicas, planos, cobranças, grupos, chaves de API e monitoramento.',
    },
];

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeArticle[] = [
    // =========================================================================
    // PRINCIPAL: DASHBOARD, TAREFAS E CHECKLIST INICIAL
    // =========================================================================
    {
        id: 'painel-principal-dashboard',
        anchor: 'painel-principal-dashboard',
        module: 'principal',
        title: 'Painel Principal (Dashboard) e Mural de Recados',
        subtitle: 'Acompanhe os indicadores resumidos do seu perfil e comunicados internos da equipe.',
        objective: 'Oferecer uma visão imediata do dia com atalhos rápidos para as telas liberadas ao seu perfil.',
        whenToUse: 'Ao iniciar o expediente ou sempre que desejar consultar recados e indicadores do dia.',
        estimatedMinutes: 2,
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'FINANCIAL', 'NURSE', 'STAFF', 'READONLY'],
        minPlan: 'Básico',
        route: '/dashboard',
        featureKey: 'dashboard',
        prerequisites: [
            'Conta ativa no CliniGo com sessão autenticada.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar o Dashboard pelo Menu Principal',
                description: 'Clique em Dashboard no topo do menu lateral esquerdo para visualizar os cartões resumidos correspondentes ao seu perfil. Terapeutas visualizam diretamente o painel Meu Dia Clínico e o cartão Meu Repasse Ao Vivo.',
                uiPathBadges: ['Menu -> Dashboard', 'Meu Dia Clínico', 'Meu Repasse Ao Vivo'],
            },
            {
                number: 2,
                title: 'Monitorar o Radar Operacional da Clínica (Administração / Coordenação)',
                description: 'Acompanhe no Radar Operacional os alertas priorizados do dia: pendências de check-in, evoluções aguardando assinatura e alertas preventivos Anti-Churn quando uma família registrar confiança <= 2/5 no CliniGo Família.',
                uiPathBadges: ['Radar Operacional', 'Alertas do Dia', 'Termômetro Anti-Churn'],
            },
            {
                number: 3,
                title: 'Consultar e Gerenciar o Mural de Recados',
                description: 'Leia os avisos publicados pela equipe no painel inicial. Perfis autorizados podem criar ou editar recados diretamente no mural.',
                uiPathBadges: ['Mural de Recados'],
            },
        ],
        tips: [
            'Cada perfil visualiza no Dashboard somente os números e atalhos pertinentes às suas permissões.',
        ],
        faqs: [
            {
                question: 'Por que alguns cartões do Dashboard aparecem para o administrador e não para outros perfis?',
                answer: 'O painel respeita o controle de permissões (RBAC) para proteger indicadores financeiros e administrativos.',
            },
        ],
        tags: ['dashboard', 'painel inicial', 'mural de recados', 'inicio'],
        aliases: ['dashboard', 'inicio', 'mural-de-recados'],
    },
    {
        id: 'tarefas-projetos-equipe',
        anchor: 'tarefas-projetos-equipe',
        module: 'principal',
        title: 'Tarefas e Projetos Internos da Equipe',
        subtitle: 'Organize demandas operacionais, projetos da clínica e prazos por responsável.',
        objective: 'Centralizar o acompanhamento de tarefas diárias e projetos entre administração, recepção e corpo clínico.',
        whenToUse: 'Para delegar atividades administrativas, acompanhar pendências de pacientes ou gerenciar projetos internos.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
        minPlan: 'Básico',
        route: '/dashboard/tarefas',
        prerequisites: [
            'Perfil autorizado ao módulo Tarefas (Administrador, Corpo Clínico, Recepção ou Equipe).',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir o Módulo Tarefas',
                description: 'No menu lateral principal, clique em Tarefas para listar projetos e pendências atribuídas.',
                uiPathBadges: ['Menu -> Tarefas'],
            },
            {
                number: 2,
                title: 'Criar Nova Tarefa ou Novo Projeto',
                description: 'Utilize os botões de criação para cadastrar uma nova tarefa ou um novo projeto, definindo título, responsável, prioridade e status.',
                uiPathBadges: ['Nova Tarefa', 'Novo Projeto'],
            },
            {
                number: 3,
                title: 'Atualizar Status e Editar Detalhes',
                description: 'Abra uma tarefa existente para atualizar seu andamento, editar informações ou marcar como concluída.',
                uiPathBadges: ['Editar Tarefa', 'Concluir'],
            },
        ],
        tips: [
            'Agrupe tarefas relacionadas dentro de projetos para facilitar o acompanhamento semanal da equipe.',
        ],
        faqs: [
            {
                question: 'Perfis financeiros ou somente leitura acessam o módulo Tarefas?',
                answer: 'Não. O acesso ao módulo Tarefas é restrito a Administradores, Corpo Clínico, Recepção e Equipe.',
            },
        ],
        tags: ['tarefas', 'projetos', 'demandas', 'pendencias', 'equipe'],
        aliases: ['tarefas', 'nova tarefa', 'projetos clinica'],
    },
    {
        id: 'checklist-inicial-onboarding',
        anchor: 'checklist-inicial-onboarding',
        module: 'principal',
        title: 'Checklist Inicial de Implantação da Clínica',
        subtitle: 'Roteiro guiado para configurar horários, pacientes, WhatsApp e primeiros agendamentos.',
        objective: 'Ajudar o administrador a concluir as etapas essenciais de configuração inicial da clínica sem esquecer nenhum passo.',
        whenToUse: 'Nos primeiros dias de uso do CliniGo ou ao revisar a configuração base da clínica.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/onboarding',
        prerequisites: [
            'Perfil exclusivo de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Checklist Inicial no Menu Principal',
                description: 'Clique em Checklist Inicial no menu lateral para visualizar o progresso de implantação da clínica.',
                uiPathBadges: ['Menu -> Checklist Inicial'],
            },
            {
                number: 2,
                title: 'Concluir Cada Etapa Guiada',
                description: 'Siga os botões de ação direta de cada item — Configurar Horários, cadastrar primeiro paciente em Equipe -> Pacientes, Conectar WhatsApp e Criar Agendamento.',
                uiPathBadges: ['Configurar Horários', 'Conectar WhatsApp', 'Criar Agendamento'],
            },
        ],
        tips: [
            'Utilize os links diretos de cada item do checklist para ir imediatamente à tela correspondente.',
        ],
        faqs: [
            {
                question: 'Quem visualiza o Checklist Inicial no menu?',
                answer: 'Apenas o perfil Administrador da Clínica (CLINIC_ADMIN).',
            },
        ],
        tags: ['checklist inicial', 'onboarding', 'primeiros passos', 'configuracao inicial'],
        aliases: ['checklist-inicial', 'onboarding', 'implantacao'],
    },

    // =========================================================================
    // TRILHA MESTRE: TISS E CONTROLE DE GLOSAS (8+ GUIAS VERIFICADOS NO CÓDIGO)
    // =========================================================================
    {
        id: 'tiss-configuracao-convenios',
        anchor: 'tiss-configuracao-convenios',
        module: 'tiss-glosas',
        title: '1. Configurando Operadoras, Planos, Tabelas de Preços e TUSS',
        subtitle: 'Base cadastral para cálculo automático de valores e regras de repasse por convênio.',
        objective: 'Cadastrar corretamente operadoras (registro ANS), planos aceitos, códigos TUSS contratados e regras de repasse para eliminar glosas de tabela.',
        whenToUse: 'Antes de iniciar agendamentos de convênio ou sempre que houver reajuste contratual de valores TUSS.',
        estimatedMinutes: 6,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Básico',
        route: '/dashboard/convenios',
        featureKey: 'convenios',
        prerequisites: [
            'Perfil de Administrador (CLINIC_ADMIN) ou Financeiro (FINANCIAL).',
            'Número do Registro ANS (6 dígitos) e tabela contratada da operadora.',
        ],
        steps: [
            {
                number: 1,
                title: 'Cadastrar a Operadora de Saúde',
                description: 'Acesse Financeiro -> Convênios e Reembolsos -> Convênios no menu lateral, permaneça na aba Operadoras e clique em Nova Operadora. Informe nome, registro ANS e dados contratuais.',
                uiPathBadges: ['Menu -> Financeiro -> Convênios', 'Aba Operadoras', 'Botão Nova Operadora'],
            },
            {
                number: 2,
                title: 'Vincular Planos da Operadora',
                description: 'Troque para a aba Planos, selecione a operadora cadastrada e clique em Novo Plano para cadastrar os planos aceitos pela clínica.',
                uiPathBadges: ['Aba Planos', 'Botão Novo Plano'],
            },
            {
                number: 3,
                title: 'Cadastrar Tabela de Preços e TUSS',
                description: 'Acesse a aba Tabela de Preços e TUSS. Informe o código TUSS contratado, o valor acordado e marque se o procedimento exige autorização prévia.',
                uiPathBadges: ['Aba Tabela de Preços e TUSS'],
            },
            {
                number: 4,
                title: 'Configurar Política de Repasse e Glosas',
                description: 'Na aba Regras e Repasse, defina o regime de repasse aos profissionais (Produção ou Recebimento) e a política padrão em caso de glosa.',
                uiPathBadges: ['Aba Regras e Repasse'],
            },
        ],
        tips: [
            'Cadastre o código TUSS exato negociado no contrato da operadora para evitar glosas por divergência de tabela.',
            'Habilite autorização prévia para terapias seriadas a fim de reforçar o controle na conferência.',
        ],
        faqs: [
            {
                question: 'Por que médicos, recepção e usuários somente leitura não veem a tela Convênios?',
                answer: 'Por regra de sigilo operacional e proteção contratual (RBAC), apenas perfis Administradores e Financeiro têm acesso às operadoras, valores negociados e telas de faturamento.',
            },
            {
                question: 'Posso configurar tabela diferente por plano dentro da mesma operadora?',
                answer: 'Sim. Na aba Tabela de Preços e TUSS é possível vincular valores específicos por operadora e plano.',
            },
        ],
        tags: ['convenios', 'operadora', 'ans', 'tuss', 'tabela de preços', 'planos', 'tiss'],
        aliases: ['cadastrar plano de saude', 'configurar valor tuss', 'cadastrar operadora', 'convenio'],
    },
    {
        id: 'tiss-recepcao-autorizacoes',
        anchor: 'tiss-recepcao-autorizacoes',
        module: 'tiss-glosas',
        title: '2. Recepção de Convênios: Check-in e Alternar Particular / Convênio',
        subtitle: 'Confira dados do atendimento no balcão, alterne Particular ou Convênio e conclua o atendimento corretamente.',
        objective: 'Garantir que a classificação do atendimento (Particular ou Convênio) e a presença do paciente sejam registradas corretamente na recepção antes da conclusão.',
        whenToUse: 'Durante o check-in do paciente na recepção ou ao confirmar atendimentos do dia.',
        estimatedMinutes: 4,
        roles: ['RECEPTIONIST', 'CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/recepcao',
        featureKey: 'recepcao',
        prerequisites: [
            'Agendamento criado no dia para o paciente.',
            'Acesso ao perfil Recepção ou Administrador.',
        ],
        steps: [
            {
                number: 1,
                title: 'Localizar o Paciente na Fila da Recepção',
                description: 'Acesse Agendamento -> Recepção no menu lateral e localize o card do paciente na fila do dia para conferir a operadora e o status de chegada.',
                uiPathBadges: ['Menu -> Agendamento -> Recepção', 'Painel de Atendimento do Dia'],
            },
            {
                number: 2,
                title: 'Realizar Check-in ou Ler QR Code',
                description: 'Confirme a chegada do paciente clicando em Check-in no card ou utilize o leitor Escanear QR Code para registrar presença com rastreabilidade.',
                uiPathBadges: ['Botão Check-in', 'Escanear QR Code'],
            },
            {
                number: 3,
                title: 'Alternar Categoria no Balcão (Particular / Convênio)',
                description: 'Caso o paciente altere a forma de atendimento na chegada, utilize a opção de alternar categoria entre Particular e Convênio diretamente no atendimento.',
                uiPathBadges: ['Alternar Categoria (Particular / Convênio)'],
            },
            {
                number: 4,
                title: 'Concluir Atendimento ao Término',
                description: 'Após o atendimento, clique em Concluir. Para atendimentos de convênio em clínicas com Faturamento TISS ativo, a conta fica disponível para conferência do setor Financeiro.',
                uiPathBadges: ['Botão Concluir'],
            },
        ],
        tips: [
            'Confira sempre os dados da carteirinha do paciente antes do início do atendimento para reduzir rejeições no faturamento.',
            'Se precisar desfazer uma movimentação feita por engano no card, utilize o botão Desfazer.',
        ],
        faqs: [
            {
                question: 'O que acontece ao alternar um atendimento de Convênio para Particular?',
                answer: 'O agendamento passa a ser tratado como atendimento particular imediatamente, sem seguir para a fila de guias de convênio.',
            },
        ],
        tags: ['recepcao', 'elegibilidade', 'carteirinha', 'particular convenio', 'checkin'],
        aliases: ['trocar particular convenio', 'alternar categoria', 'check-in convenio'],
    },
    {
        id: 'tiss-elaboracao-contas',
        anchor: 'tiss-elaboracao-contas',
        module: 'tiss-glosas',
        title: '3. Elaboração e Liberação de Contas Médicas (Atalho Ctrl+L)',
        subtitle: 'Auditoria pré-envio com Escudo Anti-Glosa, inclusão/estorno de itens nos 4 grupos e liberação.',
        objective: 'Revisar contas geradas pelos atendimentos, validar pendências no Escudo Anti-Glosa e liberar somente contas conformes para remessa XML.',
        whenToUse: 'Antes da montagem das remessas XML para envio às operadoras.',
        estimatedMinutes: 5,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/tiss',
        featureKey: 'faturamento_tiss',
        prerequisites: [
            'Plano Profissional (ou módulo Faturamento TISS liberado) e perfil CLINIC_ADMIN ou FINANCIAL.',
            'Atendimentos de convênio concluídos ou guias registradas.',
        ],
        steps: [
            {
                number: 1,
                title: 'Filtrar Contas na Aba Elaboração de Contas',
                description: 'Acesse Financeiro -> Faturamento TISS -> Guias e Lotes e permaneça na aba Elaboração de Contas. Filtre por período, convênio, profissional ou paciente.',
                uiPathBadges: ['Menu -> Financeiro -> Faturamento TISS', 'Aba Elaboração de Contas'],
            },
            {
                number: 2,
                title: 'Conferir a Coluna Escudo Anti-Glosa',
                description: 'Verifique os indicadores na coluna Escudo Anti-Glosa para identificar pendências de carteirinha, valor zerado, biometria ou evolução clínica antes do envio.',
                uiPathBadges: ['Coluna Escudo Anti-Glosa'],
            },
            {
                number: 3,
                title: 'Abrir / Editar Conta e Conferir Itens nos 4 Grupos',
                description: 'Clique em Abrir / Editar na linha da conta para revisar Honorários, Taxas, Materiais e Diagnose. Inclua ou estorne itens conforme necessário e salve.',
                uiPathBadges: ['Botão Abrir / Editar', 'Dados Atend.'],
            },
            {
                number: 4,
                title: 'Liberar Conta para Faturamento (Ctrl+L ou Lote)',
                description: 'Com tudo conferido, pressione Ctrl+L no editor aberto ou clique em Liberar Conta na tabela. Para liberar várias contas de uma vez, marque as caixas de seleção e clique em Liberar Selecionadas em Lote.',
                uiPathBadges: ['Atalho Ctrl+L', 'Botão Liberar Conta', 'Liberar Selecionadas em Lote'],
            },
        ],
        tips: [
            'Precisa ajustar uma conta já liberada que ainda não entrou em remessa? Clique em Estornar Liberação na linha da conta.',
            'Verifique o botão Dados Atend. dentro do editor para conferir presença e evolução vinculada.',
        ],
        faqs: [
            {
                question: 'Por que uma conta liberada não permite edição direta de itens?',
                answer: 'Contas liberadas ficam travadas para preservar a integridade antes do lote. Use Estornar Liberação para retorná-la ao estágio Em Elaboração.',
            },
        ],
        tags: ['elaboracao de contas', 'liberar conta', 'ctrl+l', 'escudo anti-glosa', 'estorno', 'tiss'],
        aliases: ['abrir conta medica', 'liberar faturamento', 'estornar liberacao', 'dados atend', 'guias-e-lotes'],
    },
    {
        id: 'tiss-remessas-xml',
        anchor: 'tiss-remessas-xml',
        module: 'tiss-glosas',
        title: '4. Montagem de Remessas XML TISS-ANS, Protocolo e Anexos',
        subtitle: 'Agrupe contas liberadas em lotes, feche e valide a remessa, gere o XML de cobrança e registre o protocolo.',
        objective: 'Montar a remessa oficial no padrão TISS-ANS, gerar o arquivo XML para transmissão no portal da operadora e registrar o protocolo de envio.',
        whenToUse: 'No fechamento de faturamento definido para cada operadora de saúde.',
        estimatedMinutes: 6,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/tiss/batches',
        featureKey: 'faturamento_tiss',
        prerequisites: [
            'Contas médicas já encerradas e liberadas na tela Elaboração de Contas.',
        ],
        steps: [
            {
                number: 1,
                title: 'Criar Nova Remessa em Lotes TISS',
                description: 'Em Faturamento TISS, clique no botão Remessas / Lotes e depois em Nova Remessa. Informe a Operadora, Competência e dados iniciais e avance.',
                uiPathBadges: ['Faturamento TISS -> Remessas / Lotes', 'Botão Nova Remessa'],
            },
            {
                number: 2,
                title: 'Selecionar Contas Liberadas para a Remessa',
                description: 'No passo de seleção do assistente ou via menu de ações da remessa (Processos: Selecionar Contas Liberadas), marque as contas liberadas da operadora e salve.',
                uiPathBadges: ['Processos: Selecionar Contas Liberadas'],
            },
            {
                number: 3,
                title: 'Auditar o Score de Saúde do Lote (0–100%) e Memória Anti-Glosa',
                description: 'Antes de fechar a remessa, confira o cartão Score de Saúde do Lote (0–100%): o sistema verifica automaticamente carteirinha, validade, códigos TUSS, senhas e exibe alertas da Memória Anti-Glosa com base nos motivos ANS mais recorrentes daquela mesma operadora.',
                uiPathBadges: ['Score de Saúde (0–100%)', 'Memória Anti-Glosa'],
            },
            {
                number: 4,
                title: 'Fechar Remessa e Gerar XML Cobrança',
                description: 'No menu de ações do lote, execute Fechar Remessa e Validar e em seguida Gerar XML Cobrança para baixar o arquivo XML TISS.',
                uiPathBadges: ['Fechar Remessa e Validar', 'Gerar XML Cobrança'],
            },
            {
                number: 5,
                title: 'Registrar Envio / Protocolo e Acompanhar Anexos',
                description: 'Após transmitir o XML no portal da operadora, clique em Registrar Envio / Protocolo para gravar data e número do protocolo. Nos detalhes da remessa, acompanhe os anexos TISS-ANS.',
                uiPathBadges: ['Registrar Envio / Protocolo', 'Reabrir Remessa'],
            },
        ],
        tips: [
            'Antes do envio definitivo, caso precise corrigir uma guia em lote fechado, utilize Reabrir Remessa no menu de ações.',
            'Guarde sempre o protocolo e os demonstrativos da operadora vinculados à remessa para facilitar eventuais recursos.',
        ],
        faqs: [
            {
                question: 'Por que uma conta não aparece disponível ao selecionar para a remessa?',
                answer: 'Somente contas da mesma operadora que já estejam liberadas para faturamento e ainda não vinculadas a outro lote aparecem para seleção.',
            },
        ],
        tags: ['remessa', 'lote', 'xml tiss', 'envio_lote_guias', 'anexos tiss-ans', 'protocolo'],
        aliases: ['gerar xml tiss', 'criar lote convenio', 'fechar remessa', 'registrar protocolo'],
    },
    {
        id: 'tiss-retorno-dryrun',
        anchor: 'tiss-retorno-dryrun',
        module: 'tiss-glosas',
        title: '5. Importação de Retorno XML em 2 Etapas (Dry-Run e Confirmação)',
        subtitle: 'Simule a leitura do demonstrativo de retorno antes de gravar no banco e evite importação duplicada.',
        objective: 'Processar demonstrativos de retorno XML ou CSV da operadora com pré-visualização segura de pagamentos e glosas antes da confirmação.',
        whenToUse: 'Ao receber o arquivo de retorno de análise ou pagamento no portal da operadora.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/tiss/glosas',
        featureKey: 'faturamento_tiss',
        prerequisites: [
            'Remessa enviada e arquivo de retorno (.xml ou .csv) obtido no portal da operadora.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Importar Retorno XML (Dry-Run)',
                description: 'Acesse Financeiro -> Faturamento TISS -> Gestão de Glosas e clique no botão Importar Retorno XML (Dry-Run).',
                uiPathBadges: ['Menu -> Faturamento TISS -> Gestão de Glosas', 'Botão Importar Retorno XML (Dry-Run)'],
            },
            {
                number: 2,
                title: 'Conferir a Simulação (Dry-Run)',
                description: 'Selecione o lote correspondente e carregue o arquivo. O sistema valida o hash do arquivo contra duplicidade e exibe a prévia de guias encontradas, valores aprovados e glosas.',
                uiPathBadges: ['Pré-visualização Dry-Run'],
            },
            {
                number: 3,
                title: 'Confirmar a Importação',
                description: 'Revise as divergências exibidas na prévia e confirme a importação para registrar os valores aprovados e glosas nas contas do lote.',
                uiPathBadges: ['Confirmar Importação'],
            },
        ],
        tips: [
            'Sempre valide os totais da etapa de simulação antes de confirmar a importação definitiva.',
        ],
        faqs: [
            {
                question: 'O sistema permite importar o mesmo arquivo XML duas vezes no mesmo lote?',
                answer: 'Não. O controle por hash do arquivo bloqueia duplicidades para evitar lançamentos repetidos.',
            },
        ],
        tags: ['retorno xml', 'dry-run', 'demonstrativo retorno', 'conciliacao'],
        aliases: ['importar retorno convenio', 'ler xml retorno', 'conciliar retorno tiss'],
    },
    {
        id: 'tiss-controle-glosas',
        anchor: 'tiss-controle-glosas',
        module: 'tiss-glosas',
        title: '6. Controle de Glosas em 3 Níveis (Lote, Contas e Itens)',
        subtitle: 'Auditoria estruturada por remessa, conta e item com classificação de glosa parcial ou irrecuperável.',
        objective: 'Conferir remessa por remessa, registrar glosas parciais ou totais por item/grupo, marcar perdas irrecuperáveis e finalizar a revisão.',
        whenToUse: 'Após o retorno da operadora ou auditoria de divergências nas contas faturadas.',
        estimatedMinutes: 8,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/tiss/glosas',
        featureKey: 'faturamento_tiss',
        prerequisites: [
            'Remessa criada com contas vinculadas na tela Lotes TISS.',
        ],
        steps: [
            {
                number: 1,
                title: 'Nível 1: Selecionar e Iniciar Revisão da Remessa',
                description: 'Em Gestão de Glosas, visualize as remessas, selecione a remessa desejada e clique em Iniciar / Revisar Remessa.',
                uiPathBadges: ['Nível 1: Remessas', 'Botão Iniciar / Revisar Remessa'],
            },
            {
                number: 2,
                title: 'Nível 2: Revisar Contas da Remessa',
                description: 'Acompanhe os totalizadores e filtros das contas da remessa. Utilize Liberação Automática para contas pagas integralmente, abra uma conta específica ou devolva contas com pendência para revisão.',
                uiPathBadges: ['Nível 2: Contas da Remessa', 'Abrir Conta'],
            },
            {
                number: 3,
                title: 'Nível 3: Registrar Glosa Parcial ou Irrecuperável',
                description: 'Dentro da conta aberta, registre quantidade e valor aprovado por item/grupo com o motivo ANS (Tabela 38). Se não couber contestação, marque Classificar como Glosa Irrecuperável.',
                uiPathBadges: ['Nível 3: Itens da Conta', 'Classificar como Glosa Irrecuperável'],
            },
            {
                number: 4,
                title: 'Concluir Conta e Finalizar Remessa',
                description: 'Salve e conclua a revisão de cada conta validando o batimento e, ao terminar todas as contas, finalize no Nível 1 com Contas Revisadas (Finalizar Remessa).',
                uiPathBadges: ['Contas Revisadas (Finalizar Remessa)'],
            },
        ],
        tips: [
            'Glosas marcadas como Irrecuperáveis são bloqueadas automaticamente na criação de lotes de recurso.',
            'Acompanhe também o painel analítico de perdas em Financeiro -> Faturamento TISS -> Perdas (BI).',
        ],
        faqs: [
            {
                question: 'Como devolver uma conta específica do lote para ajuste em Elaboração?',
                answer: 'No Nível 2 (Contas da Remessa), selecione a conta e acione o retorno para revisão; ela voltará para Em Elaboração na tela /dashboard/tiss.',
            },
        ],
        tags: ['controle de glosa', '3 niveis', 'glosa parcial', 'glosa irrecuperavel', 'batimento contabil', 'tabela 38 ans'],
        aliases: ['revisar remessa', 'estornar glosa', 'concluir revisao glosa', 'gestao-de-glosas'],
    },
    {
        id: 'tiss-recursos-dossie',
        anchor: 'tiss-recursos-dossie',
        module: 'tiss-glosas',
        title: '7. Recursos de Glosa (C1 a C8), Dossiê Probatório e XML ANS',
        subtitle: 'Conteste apenas glosas recuperáveis com Dossiê Probatório Automático e XML oficial de recurso.',
        objective: 'Agrupar glosas contestáveis por operadora, gerar o Dossiê Probatório, exportar o XML de Recurso ANS e registrar o resultado da operadora.',
        whenToUse: 'Quando houver glosas recuperáveis em aberto dentro do prazo de recurso da operadora.',
        estimatedMinutes: 5,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/tiss/glosas',
        featureKey: 'faturamento_tiss',
        prerequisites: [
            'Glosas em aberto classificadas como recuperáveis (não marcadas como Irrecuperáveis).',
        ],
        steps: [
            {
                number: 1,
                title: 'Criar Novo Lote de Recurso (C1)',
                description: 'Em Glosas e Recursos TISS, abra a aba de recursos e clique em Novo Lote de Recurso (C1). Selecione a operadora e marque apenas as glosas recuperáveis.',
                uiPathBadges: ['Botão Novo Lote de Recurso (C1)'],
            },
            {
                number: 2,
                title: 'Compilar Dossiê Probatório Automático',
                description: 'Na linha do recurso criado, clique em Dossiê Probatório para compilar automaticamente o espelho da guia e os dados comprobatórios do atendimento.',
                uiPathBadges: ['Botão Dossiê Probatório'],
            },
            {
                number: 3,
                title: 'Baixar XML Recurso ANS e Protocolar',
                description: 'Clique em XML Recurso (ou Baixar XML Recurso ANS no modal do dossiê) para gerar o arquivo no padrão ANS e enviar no portal da operadora.',
                uiPathBadges: ['Botão XML Recurso', 'Baixar XML Recurso ANS'],
            },
            {
                number: 4,
                title: 'Registrar Resultado do Recurso (C8)',
                description: 'Após o retorno da operadora, clique em Registrar Resultado para informar os valores deferidos, parciais ou indeferidos.',
                uiPathBadges: ['Botão Registrar Resultado'],
            },
        ],
        tips: [
            'Glosas classificadas como Irrecuperáveis não aparecem como selecionáveis no modal Novo Lote de Recurso (C1).',
        ],
        faqs: [
            {
                question: 'Posso misturar glosas de duas operadoras diferentes no mesmo lote de recurso?',
                answer: 'Não. Cada lote de recurso no padrão TISS-ANS pertence a uma única operadora.',
            },
        ],
        tags: ['recurso de glosa', 'dossie probatorio', 'xml recurso', 'c1 c8', 'contestacao'],
        aliases: ['contestar glosa', 'gerar xml recurso glosa', 'recuperar glosa'],
    },
    {
        id: 'tiss-repasse-glosas',
        anchor: 'tiss-repasse-glosas',
        module: 'tiss-glosas',
        title: '8. Impacto das Glosas no Repasse Profissional (Produção vs Recebimento)',
        subtitle: 'Configure a política de glosas em Convênios e acompanhe o reflexo na Folha de Repasse.',
        objective: 'Alinhar a apuração da folha de repasse dos profissionais às regras contratuais definidas para atendimentos de convênio.',
        whenToUse: 'Ao configurar regras comerciais da clínica e no fechamento mensal da folha de repasses.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/financial/payroll',
        featureKey: 'repasse_medico',
        prerequisites: [
            'Regras de repasse configuradas em Convênios -> Regras e Repasse.',
            'Plano Avançado ou superior (módulo Repasse Médico).',
        ],
        steps: [
            {
                number: 1,
                title: 'Definir o Regime de Repasse em Convênios',
                description: 'Em Financeiro -> Convênios -> aba Regras e Repasse, configure o regime de repasse da clínica para atendimentos de convênio (Produção ou Recebimento).',
                uiPathBadges: ['Convênios -> Aba Regras e Repasse'],
            },
            {
                number: 2,
                title: 'Definir a Política de Glosa Aplicável',
                description: 'Escolha como eventuais glosas impactam o repasse profissional de acordo com o contrato da clínica.',
                uiPathBadges: ['Política de Glosa'],
            },
            {
                number: 3,
                title: 'Conferir e Fechar a Folha de Repasse',
                description: 'Acesse Financeiro -> Repasses e Produção -> Folha de Repasse, selecione o mês de referência e confira os cálculos consolidados de cada profissional.',
                uiPathBadges: ['Menu -> Financeiro -> Folha de Repasse'],
            },
        ],
        tips: [
            'Profissionais visualizam somente seus próprios valores em Meu Financeiro, sem acesso a tabelas de operadoras ou repasses de colegas.',
        ],
        faqs: [
            {
                question: 'Atendimentos particulares sofrem retenção por regras de glosa TISS?',
                answer: 'Não. Atendimentos particulares seguem as regras normais de repasse sem retenções de convênio.',
            },
        ],
        tags: ['repasse medico', 'regime recebimento', 'politica de glosa', 'folha pagamento'],
        aliases: ['desconto de glosa no repasse', 'repasse por recebimento', 'glosa mantida'],
    },
    {
        id: 'tiss-perdas-bi',
        anchor: 'tiss-perdas-bi',
        module: 'tiss-glosas',
        title: '9. Análise de Perdas TISS (BI de Glosas)',
        subtitle: 'Monitore faturamento, taxa de glosa, valores recuperados e ranking de motivos ANS com exportação CSV.',
        objective: 'Dar visibilidade gerencial sobre onde a clínica perde receita com operadoras para corrigir causas raiz.',
        whenToUse: 'Nas reuniões mensais de faturamento e auditoria de performance por convênio.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/tiss/reports/loss-analysis',
        featureKey: 'faturamento_tiss',
        prerequisites: [
            'Plano Profissional (Faturamento TISS) e perfil CLINIC_ADMIN ou FINANCIAL.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Perdas (BI) em Faturamento TISS',
                description: 'No menu lateral, acesse Financeiro -> Faturamento TISS -> Perdas (BI) e selecione o período desejado.',
                uiPathBadges: ['Menu -> Financeiro -> Faturamento TISS -> Perdas (BI)'],
            },
            {
                number: 2,
                title: 'Analisar Indicadores e Exportar CSV',
                description: 'Consulte faturamento total, valor pago, valor glosado, taxa de glosa e motivos recorrentes. Clique em Exportar CSV quando precisar compartilhar a análise.',
                uiPathBadges: ['Indicadores de Glosa', 'Botão Exportar CSV'],
            },
        ],
        tips: [
            'Combine a leitura de Perdas (BI) com a tela Gestão de Glosas para priorizar recursos de maior impacto financeiro.',
        ],
        faqs: [
            {
                question: 'Perfis médicos ou recepção conseguem acessar Perdas (BI)?',
                answer: 'Não. O BI de Perdas TISS é exclusivo de Administradores e Financeiro.',
            },
        ],
        tags: ['perdas bi', 'loss analysis', 'analise de perdas', 'taxa de glosa', 'csv tiss'],
        aliases: ['perdas-bi', 'bi de perdas', 'relatorio glosas'],
    },

    // =========================================================================
    // PRONTUÁRIO, EVOLUÇÕES, PLANOS TERAPÊUTICOS, TEMPLATES, DOCUMENTOS E FALTAS
    // =========================================================================
    {
        id: 'prontuarios-relatorio-evolucao-excel',
        anchor: 'prontuarios-relatorio-evolucao-excel',
        module: 'prontuario',
        title: 'Como tirar Relatório de Evolução por Paciente / Período em Excel (.xlsx)',
        subtitle: 'Passo a passo oficial exclusivo para administradores filtrarem e exportarem evoluções clínicas em planilha Excel.',
        objective: 'Gerar e baixar uma planilha Excel (.xlsx) consolidada com o histórico de evoluções filtrado por paciente, profissional e intervalo de datas.',
        whenToUse: 'Quando a administração precisar enviar histórico de evoluções para auditorias, conferência de sessões ou acompanhamento gerencial.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/prontuarios',
        featureKey: 'prontuarios',
        prerequisites: [
            'Perfil de Administrador da Clínica (CLINIC_ADMIN) — por sigilo LGPD, somente administradores visualizam o botão Exportar Excel.',
            'Evoluções clínicas registradas no período consultado.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar o Menu Prontuários',
                description: 'No menu lateral esquerdo, clique em Prontuário -> Prontuários para abrir a listagem central de registros clínicos da clínica.',
                uiPathBadges: ['Menu -> Prontuário -> Prontuários'],
            },
            {
                number: 2,
                title: 'Aplicar os Filtros Desejados na Tela',
                description: 'Informe o nome do Paciente, escolha o Mês de Referência ou defina Data Inicial e Data Final e, se desejar, selecione um Profissional específico.',
                uiPathBadges: ['Filtro Paciente', 'Período (Data Inicial e Final)', 'Profissional'],
            },
            {
                number: 3,
                title: 'Clicar no Botão Exportar Excel',
                description: 'No topo da página Prontuários, clique no botão Exportar Excel para abrir o modal de confirmação mantendo os filtros aplicados.',
                uiPathBadges: ['Botão Exportar Excel'],
            },
            {
                number: 4,
                title: 'Confirmar os Filtros no Modal e Baixar o Arquivo .xlsx',
                description: 'Revise paciente, profissional e datas no modal e acione o download da planilha Excel. O arquivo (.xlsx) é gerado e baixado automaticamente.',
                uiPathBadges: ['Modal Exportar Excel', 'Download .xlsx'],
            },
        ],
        tips: [
            'Certifique-se de que a Data Inicial não seja posterior à Data Final antes de gerar a planilha.',
            'Para consultar um registro específico em tela, clique diretamente no botão de visualização do prontuário na lista.',
        ],
        faqs: [
            {
                question: 'Por que o botão Exportar Excel não aparece para médicos, terapeutas ou recepção?',
                answer: 'Por conformidade com a LGPD e proteção contra exportação em massa de dados clínicos, o recurso Exportar Excel é restrito exclusivamente ao perfil CLINIC_ADMIN.',
            },
        ],
        tags: ['exportar excel', 'relatorio evolucao', 'prontuario excel', 'xlsx', 'historico clinico', 'paciente periodo'],
        aliases: ['baixar evolucoes em excel', 'relatorio de evolucao por paciente', 'planilha prontuario'],
    },
    {
        id: 'prontuario-eletronico-evolucao',
        anchor: 'prontuario-eletronico-evolucao',
        module: 'prontuario',
        title: 'Evolução por Sessão (SOAP, CIF, DAP) e Assinatura ICP-Brasil',
        subtitle: 'Registre notas de evolução pós-atendimento com modelos estruturados e assinatura digital.',
        objective: 'Documentar cada consulta ou sessão terapêutica de forma padronizada, com opção de salvar rascunho, finalizar ou assinar digitalmente.',
        whenToUse: 'Durante ou logo após cada atendimento realizado ao paciente.',
        estimatedMinutes: 4,
        roles: ['DOCTOR', 'CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/evolucoes',
        featureKey: 'evolucoes',
        prerequisites: [
            'Perfil de Corpo Clínico (DOCTOR) ou Administrador (CLINIC_ADMIN).',
            'Paciente cadastrado na clínica (e certificado digital A1 configurado caso utilize assinatura ICP-Brasil).',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir o Módulo Evoluções e Clicar em Nova Evolução',
                description: 'No menu lateral, acesse Prontuário -> Evoluções (título Evolução por Sessão) e clique no botão Nova Evolução.',
                uiPathBadges: ['Menu -> Prontuário -> Evoluções', 'Botão Nova Evolução'],
            },
            {
                number: 2,
                title: 'Escolher o Modelo Clínico',
                description: 'Selecione o formato desejado entre SOAP, CIF, DAP, Multidisciplinar ou Livre e preencha os campos do atendimento e a data da evolução.',
                uiPathBadges: ['Modelos: SOAP / CIF / DAP / Multidisciplinar / Livre'],
            },
            {
                number: 3,
                title: 'Salvar Rascunho, Finalizar ou Assinar com Certificado ICP-Brasil',
                description: 'Salve como rascunho caso ainda vá complementar o texto, finalize sem certificado ou selecione Assinar com Certificado ICP-Brasil para concluir com assinatura digital.',
                uiPathBadges: ['Salvar Rascunho', 'Finalizar', 'Assinar com Certificado ICP-Brasil'],
            },
        ],
        tips: [
            'Utilize o campo Pesquisa rápida em tela na listagem de evoluções para localizar rapidamente registros anteriores.',
        ],
        faqs: [
            {
                question: 'A recepção ou o financeiro conseguem ler as evoluções registradas?',
                answer: 'Não. Por sigilo clínico (CFM/CFP e LGPD), apenas o corpo clínico e o administrador têm acesso às rotas de Evoluções e Prontuários.',
            },
        ],
        tags: ['prontuario', 'pep', 'soap', 'cif', 'dap', 'icp-brasil', 'assinatura digital', 'evolucao'],
        aliases: ['assinar prontuario', 'preencher evolucao', 'modelo soap', 'evolucao por sessao', 'evolucoes'],
    },
    {
        id: 'prontuarios-consulta-historico',
        anchor: 'prontuarios-consulta-historico',
        module: 'prontuario',
        title: 'Consulta de Prontuários e Histórico Clínico do Paciente',
        subtitle: 'Localize prontuários por paciente ou período e abra o histórico completo para registro clínico.',
        objective: 'Permitir que o profissional consulte prontuários anteriores e inicie novos registros vinculados aos atendimentos.',
        whenToUse: 'Antes ou durante o atendimento para revisar histórico clínico e registrar evoluções.',
        estimatedMinutes: 3,
        roles: ['DOCTOR', 'CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/prontuarios',
        featureKey: 'prontuarios',
        prerequisites: [
            'Perfil de Corpo Clínico (DOCTOR) ou Administrador (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Prontuários no Menu Lateral',
                description: 'Clique em Prontuário -> Prontuários para visualizar a lista de prontuários disponíveis ao seu perfil.',
                uiPathBadges: ['Menu -> Prontuário -> Prontuários'],
            },
            {
                number: 2,
                title: 'Filtrar por Paciente ou Período',
                description: 'Digite o nome do paciente na busca ou selecione o período de datas para localizar o atendimento desejado.',
                uiPathBadges: ['Busca por Paciente', 'Filtro de Período'],
            },
            {
                number: 3,
                title: 'Abrir o Prontuário ou Criar Novo Prontuário',
                description: 'Clique no registro da lista para abrir os detalhes do prontuário individual ou clique em Novo Prontuário no topo da tela para iniciar um novo registro.',
                uiPathBadges: ['Abrir Prontuário', 'Botão Novo Prontuário'],
            },
        ],
        tips: [
            'O perfil profissional visualiza apenas os registros clínicos pertinentes ao seu escopo de atendimento.',
        ],
        faqs: [
            {
                question: 'Posso acessar o prontuário diretamente a partir da minha agenda?',
                answer: 'Sim. Ao abrir os detalhes de um agendamento em Minha Agenda, você pode navegar diretamente para o prontuário do paciente.',
            },
        ],
        tags: ['prontuarios', 'historico paciente', 'novo prontuario', 'atendimento clinico'],
        aliases: ['ver prontuario', 'abrir historico paciente', 'buscar prontuario', 'prontuarios'],
    },
    {
        id: 'prescricoes-consulta-medica',
        anchor: 'prescricoes-consulta-medica',
        module: 'prontuario',
        title: 'Prescrições Digitais: Consulta e Listagem por Paciente',
        subtitle: 'Consulte o histórico de prescrições registradas para os pacientes da clínica.',
        objective: 'Permitir que o profissional visualize e filtre rapidamente prescrições vinculadas aos prontuários.',
        whenToUse: 'Quando precisar consultar medicações e posologias já prescritas para um paciente.',
        estimatedMinutes: 2,
        roles: ['DOCTOR', 'CLINIC_ADMIN'],
        minPlan: 'Profissional',
        route: '/dashboard/prescricoes',
        featureKey: 'prescricoes',
        prerequisites: [
            'Plano Profissional (módulo Prescrições) e perfil de Corpo Clínico (DOCTOR) ou Administrador.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Prescrições no Menu Prontuário',
                description: 'Clique em Prontuário -> Prescrições no menu lateral para abrir o resumo total de prescrições e a listagem por paciente.',
                uiPathBadges: ['Menu -> Prontuário -> Prescrições'],
            },
            {
                number: 2,
                title: 'Filtrar por Nome do Paciente',
                description: 'Utilize o campo Buscar por paciente para localizar rapidamente prescrições anteriores e conferir medicamentos, dosagem, frequência e duração.',
                uiPathBadges: ['Campo Buscar por paciente'],
            },
        ],
        tips: [
            'Para o registro completo de conduta e evolução clínica vinculada à sessão, utilize também Prontuários e Evoluções.',
        ],
        faqs: [
            {
                question: 'Recepção ou financeiro têm acesso à tela Prescrições?',
                answer: 'Não. Por sigilo médico, apenas profissionais autorizados e administração acessam esta rota.',
            },
        ],
        tags: ['prescricoes', 'medicamentos', 'posologia', 'historico prescricoes'],
        aliases: ['prescricoes', 'receitas'],
    },
    {
        id: 'planos-terapeuticos',
        anchor: 'planos-terapeuticos',
        module: 'prontuario',
        title: 'Planos Terapêuticos e ABA (Metas e Folhas de Registro)',
        subtitle: 'Monte planos individuais com diagnóstico, CID, metas com progresso percentual, folhas ABA e impressão em PDF.',
        objective: 'Estruturar o planejamento terapêutico de cada paciente, acompanhar a evolução das metas e registrar sessões ABA.',
        whenToUse: 'Na elaboração do plano inicial de tratamento multidisciplinar, revisões periódicas ou preenchimento de folhas de registro ABA.',
        estimatedMinutes: 5,
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        minPlan: 'Básico',
        route: '/dashboard/planos-terapeuticos',
        featureKey: 'planos_terapeuticos',
        prerequisites: [
            'Perfil de Corpo Clínico (DOCTOR) ou Administrador (CLINIC_ADMIN) e paciente cadastrado.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Planos Terapêuticos e Criar Novo Plano',
                description: 'No menu lateral, clique em Prontuário -> Planos Terapêuticos e pressione Novo Plano. Selecione o Paciente, o Profissional, informe o Título, Diagnóstico, CID, Objetivos, Metodologia, Frequência e datas.',
                uiPathBadges: ['Menu -> Prontuário -> Planos Terapêuticos', 'Botão Novo Plano', 'Aba Informações'],
            },
            {
                number: 2,
                title: 'Cadastrar Metas e Acompanhar o Progresso (%)',
                description: 'Na aba Metas dentro do modal, clique em Adicionar Meta para definir prioridade, status (Pendente, Em Andamento, Alcançado) e percentual de progresso (0 a 100%).',
                uiPathBadges: ['Aba Metas', 'Botão Adicionar Meta'],
            },
            {
                number: 3,
                title: 'Usar Folhas de Registro e ABA ou Imprimir PDF',
                description: 'Alterne para a aba Folhas de Registro e ABA no topo da tela para aplicar folhas clínicas estruturadas. Na listagem de planos, use o ícone de impressora para abrir/exportar o plano em PDF.',
                uiPathBadges: ['Aba Folhas de Registro e ABA', 'Imprimir / Exportar PDF'],
            },
        ],
        tips: [
            'Use o filtro de status (Ativo, Pausado, Concluído, Cancelado) e a busca por paciente ou título para localizar planos rapidamente.',
        ],
        faqs: [
            {
                question: 'Um profissional (DOCTOR) consegue criar plano vinculando outro colega?',
                answer: 'Para o perfil DOCTOR, o sistema já seleciona automaticamente o próprio profissional logado e filtra pacientes da sua agenda.',
            },
        ],
        tags: ['planos terapeuticos', 'aba', 'metas', 'folhas de registro', 'cid', 'pdf plano'],
        aliases: ['planos-terapeuticos', 'plano terapeutico', 'folhas aba', 'metas terapeuticas'],
    },
    {
        id: 'templates-prontuario-clinico',
        anchor: 'templates-prontuario-clinico',
        module: 'prontuario',
        title: 'Templates de Prontuário Personalizados',
        subtitle: 'Padronize modelos de ficha e anamnese para agilizar o preenchimento clínico.',
        objective: 'Criar e manter templates reutilizáveis de prontuário alinhados às especialidades atendidas na clínica.',
        whenToUse: 'Quando desejar criar novos roteiros clínicos padronizados ou editar modelos existentes.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes/templates-prontuario',
        featureKey: 'templates_prontuario',
        prerequisites: [
            'Perfil de Administrador (CLINIC_ADMIN) ou Corpo Clínico (DOCTOR).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Templates Prontuário',
                description: 'No menu lateral, clique em Prontuário -> Templates Prontuário para visualizar os Templates Ativos.',
                uiPathBadges: ['Menu -> Prontuário -> Templates Prontuário'],
            },
            {
                number: 2,
                title: 'Criar ou Editar um Template',
                description: 'Clique em Novo Template, informe nome e estrutura de campos do modelo e salve para disponibilizar no atendimento clínico.',
                uiPathBadges: ['Botão Novo Template', 'Salvar Template'],
            },
        ],
        tips: [
            'Crie templates curtos e objetivos por especialidade para reduzir o tempo de digitação durante as sessões.',
        ],
        faqs: [
            {
                question: 'Recepção ou financeiro podem editar templates de prontuário?',
                answer: 'Não. Apenas Administradores e Corpo Clínico têm permissão para esta tela.',
            },
        ],
        tags: ['templates prontuario', 'modelo anamnese', 'ficha clinica'],
        aliases: ['templates-prontuario', 'modelo prontuario'],
    },
    {
        id: 'documentos-clinica-upload',
        anchor: 'documentos-clinica-upload',
        module: 'prontuario',
        title: 'Gestão de Documentos da Clínica (Upload e Organização)',
        subtitle: 'Envie, organize e edite metadados de documentos administrativos e de pacientes.',
        objective: 'Manter um repositório organizado de documentos enviados pela recepção ou administração com visualização de informações e texto extraído.',
        whenToUse: 'Ao digitalizar fichas, comprovantes ou documentos administrativos que precisam ficar armazenados na clínica.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        minPlan: 'Básico',
        route: '/dashboard/documentos',
        featureKey: 'documentos',
        prerequisites: [
            'Perfil de Administrador (CLINIC_ADMIN) ou Recepção (RECEPTIONIST).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Gestão de Documentos',
                description: 'No menu lateral, clique em Prontuário -> Documentos para listar os arquivos armazenados na clínica.',
                uiPathBadges: ['Menu -> Prontuário -> Documentos'],
            },
            {
                number: 2,
                title: 'Enviar Arquivo em Novo Upload',
                description: 'Clique em Novo Upload para selecionar o arquivo, preencher categoria e informações e salvar no repositório.',
                uiPathBadges: ['Botão Novo Upload'],
            },
            {
                number: 3,
                title: 'Consultar Informações e Texto Extraído',
                description: 'Abra qualquer documento listado para visualizar ou editar os dados na aba Informações e consultar a aba Texto Extraído.',
                uiPathBadges: ['Aba Informações', 'Aba Texto Extraído', 'Botão Salvar'],
            },
        ],
        tips: [
            'Nomeie os documentos com padrão claro (ex.: tipo + nome do paciente + data) para agilizar buscas futuras.',
        ],
        faqs: [
            {
                question: 'Médicos ou financeiro acessam a tela Gestão de Documentos?',
                answer: 'Não. Por definição operacional da plataforma, a tela Documentos é exclusiva de Administradores e Recepção.',
            },
        ],
        tags: ['documentos', 'upload arquivo', 'ocr', 'gestao de documentos'],
        aliases: ['documentos', 'enviar documento'],
    },
    {
        id: 'contratos-assinaturas-modelos',
        anchor: 'contratos-assinaturas-modelos',
        module: 'prontuario',
        title: 'Contratos, Assinaturas Eletrônicas e Modelos Contratuais',
        subtitle: 'Cadastre modelos de contrato, emita contratos para assinatura e acompanhe pendências e assinados.',
        objective: 'Controlar todo o ciclo de contratos da clínica com modelos padronizados e acompanhamento de assinaturas.',
        whenToUse: 'Ao cadastrar novos modelos contratuais ou emitir contratos para assinatura de pacientes e responsáveis.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        minPlan: 'Básico',
        route: '/dashboard/contratos',
        prerequisites: [
            'Clínica autorizada ao módulo de Contratos e perfil CLINIC_ADMIN ou RECEPTIONIST.',
        ],
        steps: [
            {
                number: 1,
                title: 'Cadastrar Modelos de Contratos',
                description: 'Acesse Prontuário -> Modelos de Contratos e clique em Criar Novo Modelo para cadastrar os textos contratuais padrão da clínica.',
                uiPathBadges: ['Menu -> Prontuário -> Modelos de Contratos', 'Botão Criar Novo Modelo'],
            },
            {
                number: 2,
                title: 'Emitir Novo Contrato e Acompanhar Assinaturas',
                description: 'Em Prontuário -> Contratos e Assinaturas, clique em Emitir Novo Contrato e monitore pelos indicadores quantos contratos estão pendentes ou assinados.',
                uiPathBadges: ['Menu -> Prontuário -> Contratos', 'Botão Emitir Novo Contrato'],
            },
        ],
        tips: [
            'Mantenha modelos revisados antes de emitir novos contratos em lote.',
        ],
        faqs: [
            {
                question: 'Médicos ou financeiro podem emitir ou editar contratos?',
                answer: 'Não. Apenas Administradores e Recepção nas clínicas habilitadas têm acesso a Contratos e Modelos.',
            },
        ],
        tags: ['contratos', 'assinatura eletronica', 'modelos de contratos'],
        aliases: ['contratos-assinaturas', 'modelos-de-contratos', 'contratos'],
    },
    {
        id: 'controle-faltas-pacotes',
        anchor: 'controle-faltas-pacotes',
        module: 'prontuario',
        title: 'Controle de Faltas, Reposições e Pacotes',
        subtitle: 'Configure regras de faltas, monitore reposições pendentes, pacotes ativos e sinais de alerta.',
        objective: 'Reduzir o impacto de faltas recorrentes gerenciando pacotes de sessões e regras claras de reposição.',
        whenToUse: 'Para configurar a política de faltas da clínica e acompanhar pacotes com alertas de ausência.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/controle-faltas',
        featureKey: 'controle_faltas',
        prerequisites: [
            'Perfil exclusivo de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Controle de Faltas',
                description: 'No menu lateral, clique em Prontuário -> Controle de Faltas para visualizar os cartões de Reposições Pendentes, Pacotes Ativos, Regras Ativas e Sinal de Alerta.',
                uiPathBadges: ['Menu -> Prontuário -> Controle de Faltas'],
            },
            {
                number: 2,
                title: 'Configurar Regras de Faltas e Criar Pacotes',
                description: 'Navegue pelas abas da tela para cadastrar novas regras de ausência/reposição e acompanhar os pacotes de sessões dos pacientes.',
                uiPathBadges: ['Regras Ativas', 'Pacotes Ativos', 'Reposições Pendentes'],
            },
        ],
        tips: [
            'Revise semanalmente os cartões de Sinal de Alerta para acionar a família antes da evasão do paciente.',
        ],
        faqs: [
            {
                question: 'Outros perfis além do Administrador acessam Controle de Faltas?',
                answer: 'Não. A gestão de regras e pacotes em Controle de Faltas é restrita ao perfil CLINIC_ADMIN.',
            },
        ],
        tags: ['controle de faltas', 'reposicoes', 'pacotes', 'no-show'],
        aliases: ['controle-de-faltas', 'faltas e pacotes'],
    },

    // =========================================================================
    // AGENDAMENTO, TELECONSULTA E HORÁRIOS
    // =========================================================================
    {
        id: 'minha-agenda-profissional',
        anchor: 'minha-agenda-profissional',
        module: 'agenda',
        title: 'Minha Agenda: Consulta Diária e Semanal do Profissional',
        subtitle: 'Acompanhe exclusivamente seus próprios atendimentos, pacientes do dia e sessões em co-terapia.',
        objective: 'Dar ao médico ou terapeuta visão clara dos horários marcados, status de chegada e acesso rápido ao atendimento.',
        whenToUse: 'No início do expediente e ao longo do dia de atendimentos.',
        estimatedMinutes: 3,
        roles: ['DOCTOR'],
        minPlan: 'Básico',
        route: '/dashboard/minha-agenda',
        featureKey: 'agenda',
        prerequisites: [
            'Perfil de Profissional / Terapeuta (DOCTOR) com grade de horários ativa.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Minha Agenda',
                description: 'No menu lateral, clique em Agendamento -> Minha Agenda para abrir sua grade individual de atendimentos.',
                uiPathBadges: ['Menu -> Agendamento -> Minha Agenda'],
            },
            {
                number: 2,
                title: 'Navegar entre Dias ou Semanas',
                description: 'Utilize os controles de data no topo da grade para alternar entre a agenda do dia e os próximos dias, conferindo atendimentos individuais e em Co-Terapia.',
                uiPathBadges: ['Seletor de Data', 'Visualização da Grade'],
            },
            {
                number: 3,
                title: 'Abrir Detalhes do Agendamento',
                description: 'Clique sobre o cartão do paciente para visualizar horário, status de check-in, observações e seguir para o prontuário ou evolução.',
                uiPathBadges: ['Card do Atendimento'],
            },
        ],
        tips: [
            'Atendimentos multidisciplinares configurados com Co-Terapeuta aparecem automaticamente na sua grade.',
        ],
        faqs: [
            {
                question: 'Por que vejo apenas meus atendimentos e não a agenda completa de todos os colegas?',
                answer: 'Por política de privacidade clínica (RBAC), profissionais acessam exclusivamente Minha Agenda com seus próprios atendimentos.',
            },
        ],
        tags: ['minha agenda', 'profissional', 'terapeuta', 'medico', 'horarios do dia', 'co-terapia'],
        aliases: ['agenda do medico', 'meus atendimentos', 'agenda do terapeuta', 'minha-agenda'],
    },
    {
        id: 'agenda-agendamento-atendimento',
        anchor: 'agenda-agendamento-atendimento',
        module: 'agenda',
        title: 'Agendamento Geral, Séries Recorrentes e Co-Terapia',
        subtitle: 'Marque atendimentos individuais, pacotes recorrentes semanais e sessões multidisciplinares.',
        objective: 'Organizar a agenda da clínica por profissional, data e horário com suporte a recorrência e co-terapeuta.',
        whenToUse: 'Na marcação de consultas, terapias recorrentes ou gestão diária da grade da clínica.',
        estimatedMinutes: 4,
        roles: ['RECEPTIONIST', 'CLINIC_ADMIN', 'STAFF'],
        minPlan: 'Básico',
        route: '/dashboard/agenda',
        featureKey: 'agenda',
        prerequisites: [
            'Profissional com grade de horários configurada em Agendamento -> Horários.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir a Agenda Geral e Clicar em Novo Agendamento',
                description: 'Acesse Agendamento -> Agenda no menu lateral, selecione o profissional/data desejada e clique em Novo Agendamento ou diretamente sobre um horário livre.',
                uiPathBadges: ['Menu -> Agendamento -> Agenda', 'Botão Novo Agendamento'],
            },
            {
                number: 2,
                title: 'Definir Paciente, Categoria, Recorrência ou Co-Terapeuta',
                description: 'Escolha o paciente, informe se é Particular ou Convênio e, quando necessário, ative a opção Recorrente para gerar uma série semanal ou selecione um Co-Terapeuta.',
                uiPathBadges: ['Particular / Convênio', 'Recorrente', 'Co-Terapeuta'],
            },
            {
                number: 3,
                title: 'Gerenciar Agendamentos e Séries Recorrentes',
                description: 'Salve o agendamento. Ao clicar em um card na grade, é possível atualizar status, bloquear horários ou utilizar Cancelar Série Recorrente quando toda a sequência precisar ser cancelada.',
                uiPathBadges: ['Salvar Agendamento', 'Cancelar Série Recorrente'],
            },
        ],
        tips: [
            'Atendimentos com Co-Terapeuta ficam visíveis na grade dos dois profissionais envolvidos.',
        ],
        faqs: [
            {
                question: 'O que acontece ao cancelar uma série recorrente?',
                answer: 'O sistema solicita confirmação dupla antes de cancelar todos os agendamentos futuros vinculados àquela série.',
            },
        ],
        tags: ['agenda', 'agendamento', 'recorrencia', 'co-terapia', 'horarios'],
        aliases: ['agendar paciente', 'serie recorrente', 'marcar consulta', 'agenda'],
    },
    {
        id: 'teleconsulta',
        anchor: 'teleconsulta',
        module: 'agenda',
        title: 'Teleconsulta: Salas Virtuais de Atendimento e Sala Instantânea',
        subtitle: 'Gerencie agendamentos online de Hoje, Próximos e gere links seguros para paciente e profissional.',
        objective: 'Conduzir atendimentos por vídeo diretamente pelo CliniGo, enviando o link da sala virtual para o paciente com segurança.',
        whenToUse: 'Para consultar atendimentos online agendados ou abrir uma sala virtual avulsa imediata.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
        minPlan: 'Básico',
        route: '/dashboard/teleconsulta',
        prerequisites: [
            'Clínica habilitada para o módulo Teleconsulta e perfil CLINIC_ADMIN, DOCTOR ou RECEPTIONIST.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar o Painel de Teleconsulta',
                description: 'No menu lateral, clique em Agendamento -> Teleconsulta e alterne entre as abas Hoje, Próximos ou Todos para visualizar os agendamentos online.',
                uiPathBadges: ['Menu -> Agendamento -> Teleconsulta', 'Abas Hoje / Próximos / Todos'],
            },
            {
                number: 2,
                title: 'Gerar ou Copiar Link da Sala de um Agendamento',
                description: 'No card do paciente, gere a sala virtual (caso ainda não tenha sido criada), copie o link exclusivo do paciente ou envie pelo WhatsApp e entre na sala como profissional.',
                uiPathBadges: ['Copiar Link do Paciente', 'Entrar na Sala'],
            },
            {
                number: 3,
                title: 'Criar uma Sala Rápida com Gerar Sala Instantânea',
                description: 'Para atendimentos online avulsos, clique em Gerar Sala Instantânea no topo, informe o nome e telefone do paciente e receba imediatamente o link do paciente e o link do profissional.',
                uiPathBadges: ['Botão Gerar Sala Instantânea'],
            },
        ],
        tips: [
            'Envie o link da sala virtual ao paciente alguns minutos antes do horário para garantir teste prévio de câmera e microfone.',
        ],
        faqs: [
            {
                question: 'O paciente precisa criar conta ou senha para entrar na Teleconsulta?',
                answer: 'Não. O paciente acessa a sala virtual diretamente pelo link seguro com token único gerado para aquele atendimento.',
            },
        ],
        tags: ['teleconsulta', 'videochamada', 'sala virtual', 'sala instantanea', 'atendimento online'],
        aliases: ['teleconsulta', 'telemedicina', 'gerar sala instantanea', 'video consulta'],
    },
    {
        id: 'fila-espera-horarios',
        anchor: 'fila-espera-horarios',
        module: 'agenda',
        title: 'Configurar Horários Semanais e Turnos dos Profissionais',
        subtitle: 'Defina dias de atendimento, múltiplos turnos por dia e duração padrão das sessões.',
        objective: 'Manter a grade semanal de cada profissional atualizada para liberar horários corretos na Agenda.',
        whenToUse: 'Ao cadastrar um novo profissional ou ajustar dias e turnos de atendimento.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
        minPlan: 'Básico',
        route: '/dashboard/horarios',
        featureKey: 'horarios',
        prerequisites: [
            'Profissional cadastrado na clínica.',
        ],
        steps: [
            {
                number: 1,
                title: 'Selecionar o Profissional em Configurar Horários',
                description: 'No menu lateral, acesse Agendamento -> Horários e escolha o profissional no cartão Seleção.',
                uiPathBadges: ['Menu -> Agendamento -> Horários', 'Card Seleção'],
            },
            {
                number: 2,
                title: 'Configurar os Turnos na Agenda Semanal',
                description: 'No painel Configurar Agenda Semanal, ative os dias de trabalho, informe hora de início e fim (com suporte a múltiplos turnos no mesmo dia) e salve as alterações.',
                uiPathBadges: ['Configurar Agenda Semanal', 'Salvar Grade'],
            },
        ],
        tips: [
            'Clínicas com perfil de terapia também dispõem da tela Terapia -> Fluxo e Clínico -> Fila de Espera para organizar pacientes aguardando vaga.',
        ],
        faqs: [
            {
                question: 'Alterar a grade de horários apaga agendamentos já marcados?',
                answer: 'Não. Agendamentos existentes permanecem registrados na agenda; a nova grade orienta os próximos horários livres.',
            },
        ],
        tags: ['horarios', 'grade semanal', 'turnos', 'disponibilidade'],
        aliases: ['configurar horario medico', 'turnos profissional', 'grade de horarios', 'horarios'],
    },

    // =========================================================================
    // RECEPÇÃO, CHECK-IN, EQUIPE, PRÉ-CADASTRO E DIRETÓRIO DE PACIENTES
    // =========================================================================
    {
        id: 'recepcao-checkin-painel-tv',
        anchor: 'recepcao-checkin-painel-tv',
        module: 'recepcao',
        title: 'Painel de Recepção, Chamada em TV, QR Code e Walk-in',
        subtitle: 'Controle a chegada de pacientes, faça check-in, chame no Painel de TV e registre encaixes rápidos.',
        objective: 'Organizar o fluxo presencial da sala de espera desde a chegada (Check-in) até a conclusão do atendimento.',
        whenToUse: 'Continuamente na recepção durante todo o horário de funcionamento da clínica.',
        estimatedMinutes: 4,
        roles: ['RECEPTIONIST', 'CLINIC_ADMIN', 'STAFF'],
        minPlan: 'Básico',
        route: '/dashboard/recepcao',
        featureKey: 'recepcao',
        prerequisites: [
            'Agenda do dia com agendamentos ou paciente chegando para atendimento avulso (Walk-in).',
        ],
        steps: [
            {
                number: 1,
                title: 'Registrar Check-in ou Escanear QR Code',
                description: 'Em Agendamento -> Recepção, localize o paciente aguardando e clique em Check-in (ou use Escanear QR Code para pré-check-in).',
                uiPathBadges: ['Menu -> Agendamento -> Recepção', 'Check-in / Escanear QR Code'],
            },
            {
                number: 2,
                title: 'Chamar Paciente no Painel de TV',
                description: 'Quando o Painel de TV estiver habilitado na clínica, clique em Chamar no cartão do paciente para anunciar a chamada na sala de espera.',
                uiPathBadges: ['Painel de TV -> Chamar'],
            },
            {
                number: 3,
                title: 'Avançar para Em Atendimento, Concluir ou Criar Walk-in',
                description: 'Atualize o cartão para Em Atendimento quando o paciente entrar e clique em Concluir ao finalizar. Para atendimentos sem agendamento prévio, clique em Novo Atendimento (Walk-in).',
                uiPathBadges: ['Em Atendimento', 'Concluir', 'Novo Atendimento (Walk-in)'],
            },
        ],
        tips: [
            'Caso mova o status de um paciente por engano, clique no botão Desfazer no cartão.',
            'Também é possível registrar falta (No-Show) diretamente pelo cartão do paciente.',
        ],
        faqs: [
            {
                question: 'Posso cadastrar um paciente novo na hora de um encaixe Walk-in?',
                answer: 'Sim. Dentro do modal Novo Atendimento (Walk-in), há a opção Novo Paciente para cadastrar rapidamente sem sair da recepção.',
            },
        ],
        tags: ['recepcao', 'painel tv', 'qr code', 'walk-in', 'check-in', 'fila'],
        aliases: ['chamar paciente tv', 'confirmar chegada', 'novo atendimento walk-in', 'encaixe', 'recepcao'],
    },
    {
        id: 'equipe-profissionais-medicos',
        anchor: 'equipe-profissionais-medicos',
        module: 'recepcao',
        title: 'Gestão de Profissionais (Médicos / Terapeutas)',
        subtitle: 'Cadastre profissionais da clínica, configure especialidades e exporte a listagem em Excel ou CSV.',
        objective: 'Manter o cadastro atualizado do corpo clínico com conselho de classe, especialidade e dados de atendimento.',
        whenToUse: 'Ao integrar novos profissionais à equipe, atualizar dados cadastrais ou exportar a relação da equipe.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/medicos',
        featureKey: 'medicos',
        prerequisites: [
            'Perfil de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar o Cadastro de Profissionais em Equipe',
                description: 'No menu lateral, clique em Equipe -> Médicos (ou Terapeutas, conforme o termo configurado pela clínica) para visualizar todos os profissionais cadastrados.',
                uiPathBadges: ['Menu -> Equipe -> Profissionais'],
            },
            {
                number: 2,
                title: 'Cadastrar, Editar ou Exportar a Lista',
                description: 'Cadastre ou edite o perfil de um profissional clicando sobre ele e utilize o botão Exportar para baixar a base em Excel (.xlsx) ou CSV (.csv).',
                uiPathBadges: ['Botão Exportar', 'Exportar Excel (.xlsx) / CSV'],
            },
        ],
        tips: [
            'Após cadastrar um profissional, configure sua grade semanal em Agendamento -> Horários para liberá-lo na Agenda.',
        ],
        faqs: [
            {
                question: 'Posso mudar o nome do menu de Médicos para Terapeutas ou Psicólogos?',
                answer: 'Sim. A terminologia dos profissionais pode ser personalizada em Configurações -> Minha Clínica.',
            },
        ],
        tags: ['medicos', 'terapeutas', 'profissionais', 'corpo clinico', 'equipe'],
        aliases: ['medicos', 'terapeutas', 'profissionais', 'cadastrar medico', 'cadastrar terapeuta'],
    },
    {
        id: 'pre-cadastro-remoto-pacientes',
        anchor: 'pre-cadastro-remoto-pacientes',
        module: 'recepcao',
        title: 'Pré-Cadastro Remoto de Pacientes (Link e QR Code)',
        subtitle: 'Envie links ou imprima QR Code para o paciente preencher seus dados antes do atendimento.',
        objective: 'Agilizar a recepção coletando os dados cadastrais antecipadamente pelo celular do paciente.',
        whenToUse: 'Antes da primeira consulta de novos pacientes ou para disponibilizar QR Code fixo na recepção.',
        estimatedMinutes: 3,
        roles: ['RECEPTIONIST', 'CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/pre-cadastros',
        featureKey: 'pre_cadastros',
        prerequisites: [
            'Perfil Recepção (RECEPTIONIST) ou Administrador (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Gerar Novo Link ou QR Code de Pré-Cadastro',
                description: 'No menu lateral, acesse Equipe -> Pre-cadastros e clique em Novo link. Você pode copiar o link, enviar pelo WhatsApp Web ou gerar o QR Code para uso na recepção.',
                uiPathBadges: ['Menu -> Equipe -> Pre-cadastros', 'Botão Novo link', 'QR Code'],
            },
            {
                number: 2,
                title: 'Revisar Submissão e Aprovar para a Base de Pacientes',
                description: 'Assim que o paciente preencher o formulário remoto, confira os dados recebidos na tela de Pré-cadastros e aprove para incluir ou atualizar o cadastro definitivo.',
                uiPathBadges: ['Revisar Dados', 'Aprovar Pré-cadastro'],
            },
        ],
        tips: [
            'O QR Code de link geral pode ser impresso e deixado no balcão da recepção para múltiplos pacientes.',
        ],
        faqs: [
            {
                question: 'Os dados do pré-cadastro vão direto para a lista de pacientes sem conferência?',
                answer: 'Não. A recepção ou administração revisa a ficha recebida antes de aprovar o cadastro definitivo.',
            },
        ],
        tags: ['pre-cadastro', 'qr code', 'link paciente', 'cadastro remoto'],
        aliases: ['enviar ficha paciente', 'gerar link pre cadastro', 'pre-cadastros'],
    },
    {
        id: 'diretorio-pacientes-cadastro',
        anchor: 'diretorio-pacientes-cadastro',
        module: 'recepcao',
        title: 'Diretório de Pacientes (Busca A-Z, Cadastro e Exportação)',
        subtitle: 'Localize pacientes rapidamente pelo índice alfabético, atualize fichas cadastrais e exporte listas.',
        objective: 'Centralizar a busca cadastral de pacientes para recepção, equipe multidisciplinar e administração.',
        whenToUse: 'Ao cadastrar novos pacientes, consultar dados de contato ou localizar fichas rapidamente.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF'],
        minPlan: 'Básico',
        route: '/dashboard/pacientes',
        featureKey: 'pacientes',
        prerequisites: [
            'Acesso ao perfil autorizado para o menu Equipe -> Pacientes.',
        ],
        steps: [
            {
                number: 1,
                title: 'Localizar Pacientes por Busca ou Diretório A-Z',
                description: 'Acesse Equipe -> Pacientes no menu lateral. Utilize o campo de busca ou a barra alfabética A-Z para filtrar rapidamente.',
                uiPathBadges: ['Menu -> Equipe -> Pacientes', 'Diretório A-Z'],
            },
            {
                number: 2,
                title: 'Usar Ações Rápidas Visíveis por Perfil (Tabela e Cartões)',
                description: 'Clique em qualquer linha para abrir a ficha completa ou utilize os botões sempre visíveis: Abrir Ficha, Prontuário (restrito a Corpo Clínico e Administração), Contratos (restrito a Recepção e Administração quando módulo ativo) e WhatsApp. Na Ficha 360º, as abas Evoluções, Planos de Sessão, Psicomotricidade e Contratos também seguem estritamente o perfil logado.',
                uiPathBadges: ['Abrir Ficha', 'Prontuário', 'Contratos', 'WhatsApp'],
            },
            {
                number: 3,
                title: 'Exportar Lista (Excel / CSV)',
                description: 'Quando necessário, utilize o menu Exportar para baixar a listagem filtrada em Excel (.xlsx) ou CSV, preservando o isolamento de dados por perfil.',
                uiPathBadges: ['Botão Exportar', 'Exportar Excel (.xlsx) / CSV'],
            },
        ],
        tips: [
            'Mantenha telefone e e-mail do paciente atualizados para facilitar confirmações e envio de links.',
        ],
        faqs: [
            {
                question: 'Perfis financeiros ou somente leitura acessam o diretório de pacientes?',
                answer: 'Não. O menu Pacientes é restrito aos perfis assistenciais, recepção e administração.',
            },
        ],
        tags: ['pacientes', 'diretorio a-z', 'cadastro paciente', 'exportar excel csv'],
        aliases: ['lista de pacientes', 'buscar paciente', 'cadastrar paciente', 'pacientes'],
    },

    // =========================================================================
    // TERAPIA: FLUXO CLÍNICO E BI / INDICADORES
    // =========================================================================
    {
        id: 'terapia-fila-espera',
        anchor: 'terapia-fila-espera',
        module: 'terapia',
        title: 'Terapia: Fila de Espera Inteligente',
        subtitle: 'Gerencie pacientes aguardando vaga com contadores (Na Fila, Contatados, Agendados) e planilha modelo.',
        objective: 'Evitar perda de pacientes por falta de horário imediato organizando a fila de espera por especialidade e status.',
        whenToUse: 'Quando a agenda estiver cheia e houver pacientes interessados aguardando abertura de vaga.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
        minPlan: 'Básico',
        route: '/dashboard/terapia/fila-espera',
        featureKey: 'fila_espera',
        prerequisites: [
            'Perfil de Administrador, Recepção ou Corpo Clínico.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Terapia -> Fluxo e Clínico -> Fila de Espera',
                description: 'Abra o menu Terapia -> Fluxo e Clínico -> Fila de Espera para conferir os cartões Na Fila, Contatados e Agendados.',
                uiPathBadges: ['Menu -> Terapia -> Fila de Espera'],
            },
            {
                number: 2,
                title: 'Incluir Pacientes e Atualizar o Andamento',
                description: 'Adicione pacientes interessados manualmente ou utilize a planilha modelo Excel e atualize o status conforme a equipe realiza o contato e efetiva o agendamento.',
                uiPathBadges: ['Adicionar à Fila', 'Contatados / Agendados'],
            },
        ],
        tips: [
            'Sempre que um paciente desmarcar uma série recorrente, consulte a Fila de Espera para preencher o horário rapidamente.',
        ],
        faqs: [
            {
                question: 'Perfis financeiros ou somente leitura visualizam a Fila de Espera?',
                answer: 'Não. A Fila de Espera é restrita a Administradores, Recepção e Corpo Clínico.',
            },
        ],
        tags: ['fila de espera', 'terapia', 'vagas', 'fluxo clinico'],
        aliases: ['fila-de-espera', 'fluxo-e-clinico'],
    },
    {
        id: 'terapia-encaminhamentos',
        anchor: 'terapia-encaminhamentos',
        module: 'terapia',
        title: 'Terapia: Gestão de Encaminhamentos',
        subtitle: 'Registre encaminhamentos internos e externos e acompanhe a taxa de conversão e principais referenciadores.',
        objective: 'Controlar a origem e a conversão de pacientes encaminhados entre especialidades ou por parceiros externos.',
        whenToUse: 'Ao encaminhar um paciente para outra terapia ou registrar indicações recebidas de parceiros.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
        minPlan: 'Avançado',
        route: '/dashboard/terapia/encaminhamentos',
        featureKey: 'encaminhamentos',
        prerequisites: [
            'Plano Avançado ou superior e perfil CLINIC_ADMIN, RECEPTIONIST ou DOCTOR.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Encaminhamentos e Clicar em Novo Encaminhamento',
                description: 'No menu lateral, acesse Terapia -> Fluxo e Clínico -> Encaminhamentos e clique em Novo Encaminhamento.',
                uiPathBadges: ['Menu -> Terapia -> Encaminhamentos', 'Botão Novo Encaminhamento'],
            },
            {
                number: 2,
                title: 'Monitorar Conversão e Top Referenciadores',
                description: 'Acompanhe os indicadores de Total, Convertidos, Taxa de Conversão, Pendentes e o ranking Top Referenciadores.',
                uiPathBadges: ['Taxa Conversão', 'Top Referenciadores'],
            },
        ],
        tips: [
            'Acompanhe encaminhamentos com status Pendente semanalmente para evitar que o paciente deixe de agendar a nova especialidade.',
        ],
        faqs: [
            {
                question: 'Posso registrar encaminhamentos tanto internos quanto externos?',
                answer: 'Sim. O módulo suporta encaminhamentos internos entre profissionais da clínica e indicações externas.',
            },
        ],
        tags: ['encaminhamentos', 'referenciadores', 'conversao terapia'],
        aliases: ['encaminhamentos'],
    },
    {
        id: 'terapia-supervisao-clinica',
        anchor: 'terapia-supervisao-clinica',
        module: 'terapia',
        title: 'Terapia: Controle de Supervisão Clínica',
        subtitle: 'Registre sessões de supervisão e acompanhe o cumprimento das horas por profissional.',
        objective: 'Documentar horas de supervisão clínica comparando o realizado contra a meta de horas de cada terapeuta.',
        whenToUse: 'Após reuniões ou sessões de supervisão técnica da equipe terapêutica.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
        minPlan: 'Avançado',
        route: '/dashboard/terapia/supervisao',
        featureKey: 'supervisao',
        prerequisites: [
            'Plano Avançado ou superior e perfil CLINIC_ADMIN, RECEPTIONIST ou DOCTOR.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Supervisão Clínica',
                description: 'No menu lateral, entre em Terapia -> Fluxo e Clínico -> Supervisão para consultar o resumo de sessões e horas cumpridas por profissional.',
                uiPathBadges: ['Menu -> Terapia -> Supervisão'],
            },
            {
                number: 2,
                title: 'Registrar Nova Supervisão',
                description: 'Clique em Registrar Supervisão, informe terapeuta, carga horária e observações e salve o registro no histórico.',
                uiPathBadges: ['Botão Registrar Supervisão', 'Registros'],
            },
        ],
        tips: [
            'Acompanhe o indicador de horas realizadas frente à meta mensal de cada profissional diretamente nos cartões superiores.',
        ],
        faqs: [
            {
                question: 'Posso editar um registro de supervisão salvo anteriormente?',
                answer: 'Sim. Basta abrir o registro listado e utilizar Salvar Alterações.',
            },
        ],
        tags: ['supervisao', 'supervisao clinica', 'horas terapeuta'],
        aliases: ['supervisao'],
    },

    // =========================================================================
    // FINANCEIRO COMPLETO, REPASSES, REEMBOLSOS E MEU FINANCEIRO
    // =========================================================================
    {
        id: 'financeiro-lancamentos-caixa',
        anchor: 'financeiro-lancamentos-caixa',
        module: 'financeiro',
        title: 'Lançamentos Financeiros, Receitas e Indicadores da Clínica',
        subtitle: 'Registre entradas e saídas, acompanhe Receita do Mês, valores em aberto e resultado líquido.',
        objective: 'Controlar o fluxo financeiro diário da clínica com visão consolidada de receitas, despesas, inadimplência e metas.',
        whenToUse: 'No registro diário de movimentações financeiras e conferência gerencial mensal.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Básico',
        route: '/dashboard/financeiro',
        featureKey: 'financeiro',
        prerequisites: [
            'Perfil Administrador (CLINIC_ADMIN) ou Financeiro (FINANCIAL).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Lançamentos em Financeiro',
                description: 'No menu lateral, clique em Financeiro -> Transações e Caixa -> Lançamentos para abrir o painel com os indicadores do mês.',
                uiPathBadges: ['Menu -> Financeiro -> Transações e Caixa -> Lançamentos'],
            },
            {
                number: 2,
                title: 'Registrar Novo Lançamento',
                description: 'Clique no botão Novo Lançamento no topo direito, informe tipo (receita ou despesa), categoria, valor e status, e salve o registro.',
                uiPathBadges: ['Botão Novo Lançamento'],
            },
            {
                number: 3,
                title: 'Acompanhar Indicadores e Módulos Relacionados',
                description: 'Analise os cartões de Receita do Mês, Em Aberto/A Receber, Resultado Líquido, Meta de Faturamento e Inadimplência, além dos atalhos para DRE Gerencial e Glosas TISS.',
                uiPathBadges: ['Indicadores Financeiros', 'DRE Gerencial'],
            },
        ],
        tips: [
            'Utilize o botão Atualizar no topo da tela sempre que precisar recarregar os totalizadores após novos lançamentos.',
        ],
        faqs: [
            {
                question: 'Médicos, terapeutas ou recepção têm acesso ao Financeiro da clínica?',
                answer: 'Não. O módulo Financeiro geral é bloqueado tanto no menu quanto na barra de endereço para esses perfis.',
            },
        ],
        tags: ['financeiro', 'lancamentos', 'receita', 'despesa', 'inadimplencia', 'dre'],
        aliases: ['novo lancamento financeiro', 'ver receita do mes', 'transacoes financeiras', 'transacoes-e-caixa', 'lancamentos'],
    },
    {
        id: 'financeiro-pagamentos',
        anchor: 'financeiro-pagamentos',
        module: 'financeiro',
        title: 'Pagamentos e Histórico de Transações',
        subtitle: 'Consulte Receita Total, Ticket Médio, histórico de transações recebidas e exporte relatórios.',
        objective: 'Acompanhar de forma centralizada todos os pagamentos registrados na clínica por período.',
        whenToUse: 'Para conciliar recebimentos diários, verificar ticket médio e exportar o histórico de transações.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Básico',
        route: '/dashboard/pagamentos',
        featureKey: 'pagamentos',
        prerequisites: [
            'Perfil Administrador (CLINIC_ADMIN) ou Financeiro (FINANCIAL).',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Pagamentos no Menu Financeiro',
                description: 'Acesse Financeiro -> Transações e Caixa -> Pagamentos para visualizar os cartões de Receita Total, Ticket Médio e Transações.',
                uiPathBadges: ['Menu -> Financeiro -> Pagamentos'],
            },
            {
                number: 2,
                title: 'Consultar e Exportar o Histórico de Transações',
                description: 'Filtre o período desejado na lista Histórico de Transações e clique em Exportar quando precisar baixar os dados.',
                uiPathBadges: ['Histórico de Transações', 'Botão Exportar'],
            },
        ],
        tips: [
            'Confira regularmente os pagamentos pendentes para reduzir a inadimplência mensal.',
        ],
        faqs: [
            {
                question: 'Outros perfis conseguem abrir /dashboard/pagamentos?',
                answer: 'Não. Apenas Administradores e Financeiro têm permissão para visualizar transações e pagamentos.',
            },
        ],
        tags: ['pagamentos', 'transacoes', 'ticket medio', 'receita total'],
        aliases: ['pagamentos'],
    },
    {
        id: 'financeiro-fechamentos',
        anchor: 'financeiro-fechamentos',
        module: 'financeiro',
        title: 'Fechamentos Financeiros por Período',
        subtitle: 'Consolide Receitas, Despesas, Resultado Líquido, Sessões, Ticket Médio e Pendências do período.',
        objective: 'Revisar o fechamento financeiro periódico da clínica comparando sessões realizadas, receitas e pendências.',
        whenToUse: 'No encerramento diário, semanal ou mensal do movimento financeiro da clínica.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Básico',
        route: '/dashboard/financeiro/fechamento',
        featureKey: 'fechamento_caixa',
        prerequisites: [
            'Perfil Administrador (CLINIC_ADMIN) ou Financeiro (FINANCIAL).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Fechamentos em Financeiro',
                description: 'No menu lateral, entre em Financeiro -> Transações e Caixa -> Fechamentos de Caixa e selecione o período para conferência.',
                uiPathBadges: ['Menu -> Financeiro -> Fechamentos'],
            },
            {
                number: 2,
                title: 'Conferir Totais e Pendências',
                description: 'Valide os indicadores de Receitas, Despesas, Resultado Líquido, Sessões, Ticket Médio e Pendências antes de encerrar o fechamento do período.',
                uiPathBadges: ['Receitas / Despesas', 'Resultado Líquido', 'Pendências'],
            },
        ],
        tips: [
            'Verifique o indicador Pendências antes do fechamento para garantir que nenhum atendimento faturável ficou sem lançamento.',
        ],
        faqs: [
            {
                question: 'Quem pode acessar a tela de fechamentos financeiros?',
                answer: 'Somente os perfis Administrador (CLINIC_ADMIN) e Financeiro (FINANCIAL).',
            },
        ],
        tags: ['fechamento', 'fechamento financeiro', 'resultado liquido', 'pendencias'],
        aliases: ['fechamentos-de-caixa'],
    },
    {
        id: 'financeiro-creditos-pacientes',
        anchor: 'financeiro-creditos-pacientes',
        module: 'financeiro',
        title: 'Créditos de Pacientes (Saldos e Exportação)',
        subtitle: 'Controle saldos pré-pagos ou créditos disponíveis por paciente com exportação em Excel e PDF.',
        objective: 'Acompanhar créditos financeiros acumulados ou pagos antecipadamente por pacientes com rastreabilidade.',
        whenToUse: 'Quando pacientes efetuam pagamentos antecipados de pacotes ou possuem saldo de crédito na clínica.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/financial/credits',
        featureKey: 'creditos_pacientes',
        prerequisites: [
            'Plano Profissional ou superior e perfil CLINIC_ADMIN ou FINANCIAL.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Créditos de Pacientes',
                description: 'No menu lateral, clique em Financeiro -> Transações e Caixa -> Créditos de Pacientes para listar todos os saldos ativos.',
                uiPathBadges: ['Menu -> Financeiro -> Créditos de Pacientes'],
            },
            {
                number: 2,
                title: 'Exportar Relatório de Créditos',
                description: 'Utilize os botões Exportar Excel ou Exportar PDF no topo da página para emitir o extrato consolidado de créditos.',
                uiPathBadges: ['Botão Exportar Excel', 'Botão Exportar PDF'],
            },
        ],
        tips: [
            'Mantenha o extrato de créditos conferido antes do fechamento mensal para evitar divergências de saldo.',
        ],
        faqs: [
            {
                question: 'A recepção ou profissionais conseguem editar créditos financeiros de pacientes?',
                answer: 'Não. A gestão de Créditos de Pacientes é exclusiva de Administradores e Financeiro.',
            },
        ],
        tags: ['creditos pacientes', 'saldo paciente', 'pacote pre-pago'],
        aliases: ['creditos-de-pacientes'],
    },
    {
        id: 'financeiro-repasses-medicos',
        anchor: 'financeiro-repasses-medicos',
        module: 'financeiro',
        title: 'Gestão de Repasses Médicos, Produção e Demonstrativos',
        subtitle: 'Apure a produção do mês, gere folhas de repasse, consulte o histórico e emita notas de fechamento.',
        objective: 'Consolidar exatamente quanto cada profissional tem a receber no período com histórico de fechamentos e produção detalhada.',
        whenToUse: 'Na conferência periódica de produção e no fechamento mensal dos repasses.',
        estimatedMinutes: 5,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/financial/payroll',
        featureKey: 'repasse_medico',
        prerequisites: [
            'Plano Avançado ou superior (módulo Repasse Médico) e perfil CLINIC_ADMIN ou FINANCIAL.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar a Folha de Repasse',
                description: 'No menu lateral, entre em Financeiro -> Repasses e Produção -> Folha de Repasse e selecione o mês desejado.',
                uiPathBadges: ['Menu -> Financeiro -> Repasses e Produção -> Folha de Repasse'],
            },
            {
                number: 2,
                title: 'Conferir Produção por Profissional e Histórico',
                description: 'Revise os valores consolidados em Folhas de Pagamento e consulte detalhes nos submenus Produção por Profissional, Histórico de Repasses e Notas e Demonstrativos.',
                uiPathBadges: ['Folhas de Pagamento', 'Produção por Profissional', 'Histórico de Repasses'],
            },
            {
                number: 3,
                title: 'Fechar Repasse e Emitir Demonstrativo',
                description: 'Realize o fechamento do período para disponibilizar o extrato e a nota de repasse ao profissional em Meu Financeiro.',
                uiPathBadges: ['Fechar Repasse', 'Notas e Demonstrativos'],
            },
        ],
        tips: [
            'Cada profissional enxerga exclusivamente seus próprios repasses na tela Meu Financeiro.',
        ],
        faqs: [
            {
                question: 'Onde consulto fechamentos de meses anteriores?',
                answer: 'Acesse Financeiro -> Repasses e Produção -> Histórico de Repasses no menu lateral.',
            },
        ],
        tags: ['financeiro', 'repasse', 'folha medica', 'honorarios', 'producao medica', 'demonstrativos'],
        aliases: ['calcular repasse medico', 'fechar folha terapeuta', 'folha de repasse', 'repasses-producao', 'folha-de-repasse', 'historico-de-repasses', 'producao-por-profissional', 'notas-demonstrativos'],
    },
    {
        id: 'financeiro-dre-consolidada',
        anchor: 'financeiro-dre-consolidada',
        module: 'financeiro',
        title: 'Controladoria: DRE Consolidada (Demonstração de Resultados)',
        subtitle: 'Gere a DRE mensal consolidando receitas, despesas, atendimentos e ticket médio.',
        objective: 'Avaliar a rentabilidade operacional da clínica mês a mês por meio da Demonstração de Resultados do Exercício.',
        whenToUse: 'No fechamento contábil e gerencial de cada competência mensal.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/financial/dre',
        featureKey: 'dre',
        prerequisites: [
            'Plano Avançado ou superior e perfil CLINIC_ADMIN ou FINANCIAL.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar DRE Consolidada em Controladoria',
                description: 'No menu lateral, clique em Financeiro -> Controladoria e BI -> DRE Consolidada.',
                uiPathBadges: ['Menu -> Financeiro -> Controladoria -> DRE Consolidada'],
            },
            {
                number: 2,
                title: 'Selecionar o Mês e Clicar em Gerar DRE',
                description: 'Escolha a competência mensal desejada e clique em Gerar DRE para consolidar Receitas, Despesas, total de atendimentos e Ticket Médio.',
                uiPathBadges: ['Botão Gerar DRE', 'Receitas / Despesas'],
            },
        ],
        tips: [
            'Mantenha todas as despesas e receitas categorizadas corretamente nos Lançamentos para uma DRE fiel.',
        ],
        faqs: [
            {
                question: 'Médicos ou recepção conseguem visualizar a DRE da clínica?',
                answer: 'Não. A DRE Consolidada é restrita a Administradores e Financeiro.',
            },
        ],
        tags: ['dre', 'controladoria', 'demonstracao de resultados', 'rentabilidade'],
        aliases: ['controladoria-bi', 'dre-consolidada', 'dre'],
    },
    {
        id: 'financeiro-metas-projecao',
        anchor: 'financeiro-metas-projecao',
        module: 'financeiro',
        title: 'Controladoria: Metas e Projeção de Faturamento',
        subtitle: 'Defina metas financeiras mensais, acompanhe projeções e exporte os dados em Excel.',
        objective: 'Planejar metas de faturamento e monitorar o ritmo de atingimento ao longo do mês.',
        whenToUse: 'No planejamento mensal de receita da clínica e acompanhamento de desempenho financeiro.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/financial/goals',
        featureKey: 'dre',
        prerequisites: [
            'Plano Profissional ou superior e perfil CLINIC_ADMIN ou FINANCIAL.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Metas e Projeção',
                description: 'No menu lateral, clique em Financeiro -> Controladoria e BI -> Metas e Projeção.',
                uiPathBadges: ['Menu -> Financeiro -> Controladoria -> Metas e Projeção'],
            },
            {
                number: 2,
                title: 'Definir Metas e Salvar ou Exportar Excel',
                description: 'Informe os valores-alvo do período, clique em Salvar para gravar as metas e utilize a exportação em Excel sempre que precisar compartilhar o relatório.',
                uiPathBadges: ['Botão Salvar', 'Exportar Excel'],
            },
        ],
        tips: [
            'Compare a projeção semanal com a Receita do Mês para ajustar campanhas ou ocupação de agenda a tempo.',
        ],
        faqs: [
            {
                question: 'Quem pode definir metas de faturamento?',
                answer: 'Apenas Administradores (CLINIC_ADMIN) e Financeiro (FINANCIAL).',
            },
        ],
        tags: ['metas', 'projecao faturamento', 'planejamento financeiro'],
        aliases: ['metas-e-projecao'],
    },
    {
        id: 'financeiro-regras-reembolso',
        anchor: 'financeiro-regras-reembolso',
        module: 'financeiro',
        title: 'Regras de Reembolso e Reembolso por Paciente',
        subtitle: 'Configure regras gerais por terapia e regras personalizadas por paciente para guias e recibos de reembolso.',
        objective: 'Automatizar a conversão de sessões reais em quantidades, durações e valores de reembolso de acordo com cada terapia ou paciente.',
        whenToUse: 'Quando a clínica realiza atendimentos com emissão de documentos para reembolso de plano de saúde.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes/reembolso',
        featureKey: 'convenios',
        prerequisites: [
            'Perfil Administrador (CLINIC_ADMIN) ou Financeiro (FINANCIAL).',
        ],
        steps: [
            {
                number: 1,
                title: 'Configurar Regras Gerais por Terapia',
                description: 'No menu lateral, acesse Financeiro -> Convênios e Reembolsos -> Regras de Reembolso e clique em Nova Configuração para definir guias por sessão, valores e durações padrão.',
                uiPathBadges: ['Menu -> Financeiro -> Regras de Reembolso', 'Botão Nova Configuração'],
            },
            {
                number: 2,
                title: 'Personalizar Regras Específicas em Reembolso por Paciente',
                description: 'Quando um paciente possuir condição diferenciada, acesse Reembolso por Paciente e clique em Nova Regra para definir terapia real, terapia para faturamento, valor cobrado e valor de reembolso.',
                uiPathBadges: ['Menu -> Financeiro -> Reembolso por Paciente', 'Botão Nova Regra'],
            },
        ],
        tips: [
            'Regras específicas em Reembolso por Paciente têm prioridade sobre a regra geral da terapia.',
        ],
        faqs: [
            {
                question: 'Médicos ou recepção conseguem alterar regras de reembolso?',
                answer: 'Não. Tanto Regras de Reembolso quanto Reembolso por Paciente são exclusivas de Administradores e Financeiro.',
            },
        ],
        tags: ['reembolso', 'regras de reembolso', 'reembolso por paciente', 'terapia reembolso'],
        aliases: ['regras-de-reembolso', 'reembolso-por-paciente', 'convenios-e-reembolsos'],
    },
    {
        id: 'meu-financeiro-profissional',
        anchor: 'meu-financeiro-profissional',
        module: 'financeiro',
        title: 'Meu Financeiro: Acompanhamento Individual de Repasses',
        subtitle: 'Consulte seus repasses do ano, baixe planilhas em Excel, emita notas de fechamento e acompanhe sua produção.',
        objective: 'Dar transparência total ao médico ou terapeuta sobre seus próprios recebíveis, histórico e demonstrativos.',
        whenToUse: 'Sempre que o profissional desejar acompanhar seus repasses mensais, produção ou baixar demonstrativos.',
        estimatedMinutes: 3,
        roles: ['DOCTOR'],
        minPlan: 'Avançado',
        route: '/dashboard/meu-financeiro',
        featureKey: 'meu_financeiro',
        prerequisites: [
            'Perfil de Profissional / Terapeuta (DOCTOR) em clínica com módulo Meu Financeiro ativo.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Meu Painel em Meu Financeiro',
                description: 'No menu lateral, clique em Financeiro -> Meu Financeiro -> Meu Painel para visualizar seus repasses registrados no ano.',
                uiPathBadges: ['Menu -> Financeiro -> Meu Financeiro -> Meu Painel'],
            },
            {
                number: 2,
                title: 'Acompanhar Meu Repasse Ao Vivo (Liberado vs Aguardando Evolução)',
                description: 'Verifique em tempo real quanto da sua produção já está liberado para repasse e quais atendimentos aguardam evolução assinada para liberação imediata, além dos comparativos anuais e exportação Excel.',
                uiPathBadges: ['Meu Repasse Ao Vivo', 'Botão Excel', 'Indicadores Anuais'],
            },
            {
                number: 3,
                title: 'Baixar Nota de Repasse, Histórico e Produção',
                description: 'Nos meses fechados, utilize o botão de Nota de Repasse na linha do período ou navegue nos submenus Meu Histórico, Minha Produção e Notas e Demonstrativos.',
                uiPathBadges: ['Nota de Repasse', 'Meu Histórico', 'Minha Produção'],
            },
        ],
        tips: [
            'Os valores apresentados em Meu Financeiro são estritamente individuais do profissional logado.',
        ],
        faqs: [
            {
                question: 'Por que um mês ainda aparece sem repasse registrado?',
                answer: 'O extrato aparece após o fechamento da folha de repasse realizado pela administração ou setor financeiro da clínica.',
            },
        ],
        tags: ['meu financeiro', 'repasse profissional', 'nota de repasse', 'excel', 'minha producao', 'meu historico'],
        aliases: ['ver meus repasses', 'extrato medico', 'meu historico financeiro', 'meu-financeiro', 'meu-painel', 'meu-historico', 'minha-producao'],
    },

    // =========================================================================
    // COMUNICAÇÃO: CHAT INTERNO, WHATSAPP, NOTIFICAÇÕES E FLUXOMED CRM
    // =========================================================================
    {
        id: 'comunicacao-chat-interno',
        anchor: 'comunicacao-chat-interno',
        module: 'crm-whatsapp',
        title: 'Chat Interno da Equipe da Clínica',
        subtitle: 'Converse em tempo real com colegas da recepção, corpo clínico, financeiro e administração.',
        objective: 'Agilizar recados operacionais entre salas e setores da clínica sem depender de aplicativos externos.',
        whenToUse: 'Durante o expediente para avisos rápidos entre recepção, profissionais e administração.',
        estimatedMinutes: 2,
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/chat',
        featureKey: 'chat',
        prerequisites: [
            'Plano Avançado ou superior e conta ativa na clínica.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Chat Interno no Menu Comunicação',
                description: 'No menu lateral, clique em Comunicação -> Chat Interno para listar as conversas e membros ativos da clínica.',
                uiPathBadges: ['Menu -> Comunicação -> Chat Interno'],
            },
            {
                number: 2,
                title: 'Enviar Mensagens com Segurança Multi-Tenant',
                description: 'Selecione o colega ou conversa desejada, digite a mensagem e envie. As conversas ficam restritas exclusivamente aos usuários da sua clínica.',
                uiPathBadges: ['Selecionar Conversa', 'Enviar Mensagem'],
            },
        ],
        tips: [
            'Evite compartilhar senhas ou dados bancários pelo chat; use-o para comunicação operacional rápida do dia a dia.',
        ],
        faqs: [
            {
                question: 'Usuários de outras clínicas podem aparecer no meu Chat Interno?',
                answer: 'Nunca. O Chat Interno é isolado estritamente pelo identificador (clinic_id) da sua clínica.',
            },
        ],
        tags: ['chat', 'chat interno', 'mensagens equipe', 'comunicacao'],
        aliases: ['chat-interno', 'chat'],
    },
    {
        id: 'crm-whatsapp-automacoes',
        anchor: 'crm-whatsapp-automacoes',
        module: 'crm-whatsapp',
        title: 'Conexão de WhatsApp por Setor (QR Code e Sessões)',
        subtitle: 'Conecte e gerencie os números de WhatsApp da clínica separados por setor.',
        objective: 'Parear sessões do WhatsApp por setor (Principal, Recepção, Comercial, Clínico, etc.) e monitorar o status de conexão.',
        whenToUse: 'Ao conectar um número de WhatsApp pela primeira vez ou reconectar após expiração de sessão.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        minPlan: 'Avançado',
        route: '/dashboard/whatsapp',
        featureKey: 'whatsapp',
        prerequisites: [
            'Plano Avançado ou superior (módulo WhatsApp) e perfil CLINIC_ADMIN ou RECEPTIONIST.',
            'Aparelho celular com WhatsApp aberto na opção Dispositivos Conectados.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar o Módulo WhatsApp e Adicionar Conexão',
                description: 'No menu lateral, clique em Comunicação -> WhatsApp. Para criar um novo canal setorial, clique em Adicionar Conexão e informe o setor desejado.',
                uiPathBadges: ['Menu -> Comunicação -> WhatsApp', 'Botão Adicionar Conexão'],
            },
            {
                number: 2,
                title: 'Escanear o QR Code de Pareamento',
                description: 'Ao iniciar a conexão, o modal exibe o QR Code do setor. Aponte a câmera do WhatsApp no celular para concluir o pareamento (caso expire, clique em Gerar novo QR Code).',
                uiPathBadges: ['QR Code de Pareamento', 'Gerar novo QR Code'],
            },
            {
                number: 3,
                title: 'Monitorar Status ou Desconectar Setor',
                description: 'Use o botão Atualizar no topo para sincronizar o status dos setores conectados e, quando necessário, desconecte um aparelho diretamente pelo cartão do setor.',
                uiPathBadges: ['Botão Atualizar', 'Desconectar'],
            },
        ],
        tips: [
            'Cada setor da clínica (ex.: Recepção e Comercial) pode manter sua própria conexão identificada separadamente.',
        ],
        faqs: [
            {
                question: 'Médicos ou perfil financeiro podem desconectar o WhatsApp da clínica?',
                answer: 'Não. A tela de gerenciamento de conexões WhatsApp é restrita exclusivamente a Administradores e Recepção.',
            },
        ],
        tags: ['whatsapp', 'qr code', 'setor', 'conexao whatsapp', 'pareamento'],
        aliases: ['conectar whatsapp', 'parear whatsapp', 'whatsapp setor', 'whatsapp'],
    },
    {
        id: 'comunicacao-notificacoes',
        anchor: 'comunicacao-notificacoes',
        module: 'crm-whatsapp',
        title: 'Central de Notificações e Histórico de Envios',
        subtitle: 'Consulte o histórico de avisos e notificações disparados pela clínica.',
        objective: 'Permitir à administração e ao setor financeiro auditar o histórico de notificações enviadas pelo sistema.',
        whenToUse: 'Para confirmar se avisos importantes foram disparados e consultar o histórico de notificações.',
        estimatedMinutes: 2,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Básico',
        route: '/dashboard/notificacoes',
        featureKey: 'notificacoes',
        prerequisites: [
            'Perfil Administrador (CLINIC_ADMIN) ou Financeiro (FINANCIAL).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Notificações em Comunicação',
                description: 'No menu lateral, clique em Comunicação -> Notificações para abrir o painel de Histórico de notificações.',
                uiPathBadges: ['Menu -> Comunicação -> Notificações', 'Histórico'],
            },
        ],
        tips: [
            'Acompanhe também o sininho no canto superior direito para alertas recentes da sua sessão.',
        ],
        faqs: [
            {
                question: 'Quais perfis têm acesso ao menu Notificações?',
                answer: 'O menu Notificações é liberado para Administradores (CLINIC_ADMIN) e Financeiro (FINANCIAL).',
            },
        ],
        tags: ['notificacoes', 'avisos', 'historico envios', 'email'],
        aliases: ['notificacoes'],
    },
    {
        id: 'fluxomed-crm-pipeline',
        anchor: 'fluxomed-crm-pipeline',
        module: 'crm-whatsapp',
        title: 'FluxoMed CRM: Automações e Pipeline Kanban',
        subtitle: 'Organize pacientes e interessados em funis personalizados com etapas, cards e notas internas.',
        objective: 'Permitir à administração gerenciar funis comerciais ou de acompanhamento clínico no quadro Kanban do FluxoMed.',
        whenToUse: 'Para acompanhar leads, retornos de pacientes e organizar etapas de conversão no CRM da clínica.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Avançado',
        route: '/dashboard/crm',
        featureKey: 'fluxomed',
        prerequisites: [
            'Plano Avançado ou superior (módulo FluxoMed) e perfil exclusivo de Administrador (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar FluxoMed no Menu Comunicação',
                description: 'No menu lateral, clique em Comunicação -> FluxoMed e escolha entre Automações ou Pipeline.',
                uiPathBadges: ['Menu -> Comunicação -> FluxoMed', 'Automações / Pipeline'],
            },
            {
                number: 2,
                title: 'Criar Funis, Etapas e Cards no Pipeline Kanban',
                description: 'Na tela Pipeline, gerencie seus funis personalizados, adicione etapas e mova os cards dos pacientes conforme avançam no atendimento.',
                uiPathBadges: ['Pipeline Kanban', 'Novo Card / Funil'],
            },
            {
                number: 3,
                title: 'Registrar Notas e Acompanhar Métricas',
                description: 'Abra um card ou ficha de relacionamento no FluxoMed para registrar notas internas da equipe e acompanhar indicadores do funil.',
                uiPathBadges: ['Notas do Paciente', 'Métricas CRM'],
            },
        ],
        tips: [
            'Use funis separados no Pipeline para diferenciar captação de novos pacientes e acompanhamento de retornos.',
        ],
        faqs: [
            {
                question: 'Outros perfis conseguem acessar o FluxoMed CRM digitando a URL?',
                answer: 'Não. As rotas /dashboard/crm e /dashboard/crm/pipeline são bloqueadas no servidor exclusivamente para Administradores.',
            },
        ],
        tags: ['fluxomed', 'crm', 'pipeline', 'kanban', 'funil', 'leads'],
        aliases: ['funil de vendas clinica', 'crm kanban', 'pipeline pacientes', 'fluxomed', 'automacoes', 'pipeline'],
    },

    // =========================================================================
    // GESTÃO: ESTOQUE, RELATÓRIOS, TERMOS, IMPORTAÇÃO, AUTOMAÇÃO E AUDITORIA
    // =========================================================================
    {
        id: 'gestao-estoque',
        anchor: 'gestao-estoque',
        module: 'gestao',
        title: 'Gestão de Estoque e Controle de Insumos',
        subtitle: 'Cadastre produtos, configure estoque mínimo e ponto de reposição e acompanhe movimentações.',
        objective: 'Evitar falta de materiais clínicos e insumos monitorando quantidades mínimas e entradas/saídas.',
        whenToUse: 'Ao cadastrar novos insumos, registrar reposições ou conferir itens próximos do estoque mínimo.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        minPlan: 'Básico',
        route: '/dashboard/estoque',
        featureKey: 'estoque',
        prerequisites: [
            'Perfil Administrador (CLINIC_ADMIN) ou Recepção (RECEPTIONIST).',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Estoque e Cadastrar Novo Produto',
                description: 'No menu lateral, clique em Gestão -> Estoque e pressione Novo Produto para informar nome, categoria, quantidade inicial, estoque mínimo e ponto de reposição.',
                uiPathBadges: ['Menu -> Gestão -> Estoque', 'Botão Novo Produto'],
            },
            {
                number: 2,
                title: 'Acompanhar Alertas e Movimentações',
                description: 'Acompanhe os indicadores de status de cada item e registre entradas ou saídas diretamente na listagem.',
                uiPathBadges: ['Estoque Mínimo', 'Ponto de Reposição'],
            },
        ],
        tips: [
            'Preencha Estoque Mínimo e Ponto de Reposição ao cadastrar cada produto para receber sinalização visual antes que acabe.',
        ],
        faqs: [
            {
                question: 'Médicos ou financeiro alteram o estoque da clínica?',
                answer: 'Não. O módulo Estoque é restrito a Administradores e Recepção.',
            },
        ],
        tags: ['estoque', 'insumos', 'produtos', 'reposicao'],
        aliases: ['estoque', 'novo produto'],
    },
    {
        id: 'gestao-relatorios-analytics',
        anchor: 'gestao-relatorios-analytics',
        module: 'gestao',
        title: 'Relatórios Gerenciais e Analytics',
        subtitle: 'Analise Receita Total, Agendamentos, Taxa de No-Show, frequência e exporte relatórios.',
        objective: 'Fornecer visão consolidada de desempenho operacional e financeiro da clínica com exportação.',
        whenToUse: 'No fechamento semanal ou mensal para acompanhar volume de agendamentos, faltas e receita.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Básico',
        route: '/dashboard/relatorios',
        featureKey: 'relatorios',
        prerequisites: [
            'Perfil Administrador (CLINIC_ADMIN) ou Financeiro (FINANCIAL).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Relatórios e Analytics',
                description: 'No menu lateral, clique em Gestão -> Relatórios para consultar os indicadores de Receita Total, Agendamentos e No-Show Rate.',
                uiPathBadges: ['Menu -> Gestão -> Relatórios'],
            },
            {
                number: 2,
                title: 'Filtrar Abas e Exportar Dados',
                description: 'Alterne entre as abas disponíveis (como frequência e sessões) e utilize os botões de exportação para baixar os relatórios.',
                uiPathBadges: ['Filtros de Período', 'Exportar Relatório'],
            },
        ],
        tips: [
            'Monitore a taxa de No-Show por período para avaliar o resultado das confirmações de agenda.',
        ],
        faqs: [
            {
                question: 'Recepção ou médicos conseguem abrir Relatórios Gerenciais?',
                answer: 'Não. A rota /dashboard/relatorios é restrita a Administradores e Financeiro.',
            },
        ],
        tags: ['relatorios', 'analytics', 'no-show', 'frequencia', 'sessoes'],
        aliases: ['relatorios'],
    },
    {
        id: 'gestao-termos-legais',
        anchor: 'gestao-termos-legais',
        module: 'gestao',
        title: 'Termos Legais e Gestão de Assinaturas',
        subtitle: 'Cadastre termos de consentimento e documentos legais, monitore assinaturas e configure regras.',
        objective: 'Garantir conformidade jurídica e LGPD mantendo termos assinados organizados por versão.',
        whenToUse: 'Ao criar ou atualizar termos de consentimento, políticas da clínica ou conferir assinaturas pendentes.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/termos',
        featureKey: 'termos_legais',
        prerequisites: [
            'Perfil exclusivo de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Termos Legais e Criar Novo Termo',
                description: 'No menu lateral, clique em Gestão -> Termos Legais e pressione Novo Termo (ou Criar Primeiro Documento) para cadastrar o texto legal.',
                uiPathBadges: ['Menu -> Gestão -> Termos Legais', 'Botão Novo Termo'],
            },
            {
                number: 2,
                title: 'Acompanhar Documentos, Assinaturas e Configurações',
                description: 'Navegue entre as abas Documentos, Assinaturas e Configurações para acompanhar quem já aceitou cada termo.',
                uiPathBadges: ['Aba Documentos', 'Aba Assinaturas', 'Aba Configurações'],
            },
        ],
        tips: [
            'Sempre mantenha uma versão clara do termo de consentimento LGPD ativa para pacientes e equipe.',
        ],
        faqs: [
            {
                question: 'Outros perfis podem editar Termos Legais?',
                answer: 'Não. Apenas Administradores da Clínica (CLINIC_ADMIN) acessam Termos Legais.',
            },
        ],
        tags: ['termos legais', 'consentimento', 'assinaturas', 'lgpd'],
        aliases: ['termos-legais', 'termos'],
    },
    {
        id: 'gestao-importacao-dados',
        anchor: 'gestao-importacao-dados',
        module: 'gestao',
        title: 'Importação de Dados em Lote (Planilhas)',
        subtitle: 'Importe cadastros em massa para o CliniGo acompanhando o status de cada lote importado.',
        objective: 'Acelerar a migração de dados de outros sistemas ou planilhas para a base da clínica.',
        whenToUse: 'Durante a implantação da clínica ou ao trazer novos lotes de cadastros via planilha.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        minPlan: 'Avançado',
        route: '/dashboard/importacao',
        featureKey: 'importacao',
        prerequisites: [
            'Plano Avançado ou superior e perfil CLINIC_ADMIN ou RECEPTIONIST.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Importação de Dados e Iniciar Nova Importação',
                description: 'No menu lateral, clique em Gestão -> Importação e clique no botão Nova Importação.',
                uiPathBadges: ['Menu -> Gestão -> Importação', 'Botão Nova Importação'],
            },
            {
                number: 2,
                title: 'Acompanhar o Histórico e Resultado do Lote',
                description: 'Após enviar o arquivo, acompanhe o progresso e o detalhamento de registros importados ou eventuais linhas com erro.',
                uiPathBadges: ['Histórico de Importações'],
            },
        ],
        tips: [
            'Revise previamente colunas obrigatórias (como nome e telefone/CPF) na planilha antes de subir o arquivo.',
        ],
        faqs: [
            {
                question: 'Médicos ou perfil financeiro podem importar arquivos em lote?',
                answer: 'Não. A tela de Importação de Dados é restrita a Administradores e Recepção.',
            },
        ],
        tags: ['importacao', 'migrar dados', 'planilha', 'csv excel'],
        aliases: ['importacao'],
    },
    {
        id: 'gestao-automacao',
        anchor: 'gestao-automacao',
        module: 'gestao',
        title: 'Automação Operacional e Configurações de Réguas',
        subtitle: 'Acompanhe o painel de automações da clínica e ajuste suas configurações operacionais.',
        objective: 'Automatizar rotinas repetitivas de lembretes e acompanhamento de agendamentos da clínica.',
        whenToUse: 'Para ativar, ajustar ou monitorar as automações executadas na clínica.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Avançado',
        route: '/dashboard/automacao',
        featureKey: 'automacao',
        prerequisites: [
            'Plano Avançado ou superior e perfil exclusivo de Administrador (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir o Painel de Automação',
                description: 'No menu lateral, acesse Gestão -> Automação -> Painel para visualizar as rotinas automatizadas ativas.',
                uiPathBadges: ['Menu -> Gestão -> Automação -> Painel'],
            },
            {
                number: 2,
                title: 'Ajustar Parâmetros em Configurações de Automação',
                description: 'Acesse Gestão -> Automação -> Configurações para habilitar, desabilitar ou personalizar os gatilhos de disparo.',
                uiPathBadges: ['Menu -> Gestão -> Automação -> Configurações'],
            },
        ],
        tips: [
            'Revise as configurações de automação sempre que alterar horários de funcionamento ou canais de WhatsApp.',
        ],
        faqs: [
            {
                question: 'Outros perfis conseguem alterar as automações da clínica?',
                answer: 'Não. O módulo Automação é exclusivo do perfil CLINIC_ADMIN.',
            },
        ],
        tags: ['automacao', 'rotinas automaticas', 'painel automacao'],
        aliases: ['automacao', 'painel', 'automacao-configuracoes'],
    },
    {
        id: 'gestao-logs-auditoria',
        anchor: 'gestao-logs-auditoria',
        module: 'gestao',
        title: 'Logs de Auditoria e Rastreabilidade LGPD',
        subtitle: 'Consulte registros de ações sensíveis com filtros avançados e exportação em CSV.',
        objective: 'Permitir à administração auditar quem acessou, editou ou exportou dados da clínica para conformidade LGPD.',
        whenToUse: 'Em auditorias internas, verificação de alterações de cadastro/prontuário ou demandas de governança.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/logs-auditoria',
        featureKey: 'logs_auditoria',
        prerequisites: [
            'Perfil exclusivo de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Auditoria no Menu Gestão',
                description: 'No menu lateral, clique em Gestão -> Auditoria para abrir a tela de Registros de Auditoria.',
                uiPathBadges: ['Menu -> Gestão -> Auditoria'],
            },
            {
                number: 2,
                title: 'Aplicar Filtros e Exportar CSV',
                description: 'Use o cartão Filtros para pesquisar por ação, usuário ou período e clique em Exportar CSV quando precisar gerar evidência formal de auditoria.',
                uiPathBadges: ['Filtros', 'Botão Exportar CSV'],
            },
        ],
        tips: [
            'Mantenha logins nominais individuais para que cada linha dos Logs de Auditoria identifique exatamente o autor da ação.',
        ],
        faqs: [
            {
                question: 'Os registros de auditoria podem ser apagados por usuários comuns?',
                answer: 'Não. Os logs são imutáveis para fins de rastreabilidade e restritos ao perfil CLINIC_ADMIN.',
            },
        ],
        tags: ['auditoria', 'logs', 'lgpd', 'rastreabilidade', 'exportar csv'],
        aliases: ['auditoria', 'logs-auditoria'],
    },

    // =========================================================================
    // CONFIGURAÇÕES: MINHA CLÍNICA, PÁGINA PÚBLICA, TELECONSULTA, USUÁRIOS, TERAPIAS, ASSINATURA, SEGURANÇA, INTEGRAÇÕES, DISPOSITIVOS
    // =========================================================================
    {
        id: 'configuracoes-minha-clinica',
        anchor: 'configuracoes-minha-clinica',
        module: 'configuracoes',
        title: 'Configurações: Minha Clínica, Consultórios e Terminologia',
        subtitle: 'Atualize dados gerais, logotipo, salas/consultórios e a nomenclatura dos profissionais.',
        objective: 'Manter a identidade institucional, consultórios e informações cadastrais da clínica atualizados em todo o sistema.',
        whenToUse: 'Ao configurar logotipo, endereço, salas de atendimento ou personalizar termos (ex.: Médicos ou Terapeutas).',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes',
        featureKey: 'minha_clinica',
        prerequisites: [
            'Perfil Administrador (CLINIC_ADMIN) ou Recepção (RECEPTIONIST).',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Configurações -> Minha Clínica',
                description: 'No menu lateral, clique em Configurações -> Minha Clínica para acessar as abas Minha Clínica, Consultórios, Plano e Assinatura e SMTP.',
                uiPathBadges: ['Menu -> Configurações -> Minha Clínica', 'Aba Minha Clínica'],
            },
            {
                number: 2,
                title: 'Atualizar Informações Gerais, Logo e Consultórios',
                description: 'Edite os dados institucionais, personalize a terminologia de profissionais no cartão Informações Gerais ou cadastre salas na aba Consultórios e salve.',
                uiPathBadges: ['Informações Gerais', 'Aba Consultórios', 'Salvar'],
            },
        ],
        tips: [
            'Ao cadastrar o logotipo da clínica, ele passa a aparecer automaticamente no cabeçalho do menu lateral.',
        ],
        faqs: [
            {
                question: 'Médicos ou financeiro conseguem alterar dados cadastrais da clínica?',
                answer: 'Não. A tela Configurações -> Minha Clínica é restrita a Administradores e Recepção.',
            },
        ],
        tags: ['minha clinica', 'consultorios', 'logo', 'smtp', 'dados da clinica'],
        aliases: ['minha-clinica', 'configuracoes'],
    },
    {
        id: 'configuracoes-pagina-publica',
        anchor: 'configuracoes-pagina-publica',
        module: 'configuracoes',
        title: 'Configurações: Página Pública de Agendamento Online',
        subtitle: 'Personalize o tema, visual e informações públicas do link de agendamento da sua clínica.',
        objective: 'Configurar a vitrine online onde pacientes consultam informações da clínica e solicitam agendamentos.',
        whenToUse: 'Ao publicar ou atualizar a aparência e textos da página pública da clínica.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes/pagina-publica',
        featureKey: 'pagina_publica',
        prerequisites: [
            'Perfil exclusivo de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Configurações -> Página Pública',
                description: 'No menu lateral, clique em Configurações -> Página Pública e navegue entre as abas de template e identidade visual.',
                uiPathBadges: ['Menu -> Configurações -> Página Pública'],
            },
            {
                number: 2,
                title: 'Personalizar e Clicar em Salvar e Publicar',
                description: 'Ajuste o layout, cores e textos institucionais desejados e clique em Salvar e Publicar para aplicar imediatamente.',
                uiPathBadges: ['Botão Salvar e Publicar'],
            },
        ],
        tips: [
            'Mantenha os horários dos profissionais atualizados em Agendamento -> Horários para que os slots apareçam corretamente na página pública.',
        ],
        faqs: [
            {
                question: 'Outros perfis podem publicar alterações na Página Pública?',
                answer: 'Não. Apenas o perfil CLINIC_ADMIN pode editar e publicar a Página Pública.',
            },
        ],
        tags: ['pagina publica', 'agendamento online', 'tema visual', 'link publico'],
        aliases: ['pagina-publica'],
    },
    {
        id: 'configuracoes-rbac-lgpd',
        anchor: 'configuracoes-rbac-lgpd',
        module: 'configuracoes',
        title: 'Usuários, Perfis de Acesso (RBAC) e Governança LGPD',
        subtitle: 'Convide colaboradores com o perfil exato, redefina senhas e garanta sigilo clínico e financeiro.',
        objective: 'Aplicar o princípio do menor privilégio entre Administradores, Financeiro, Recepção e Corpo Clínico com rastreabilidade.',
        whenToUse: 'Ao cadastrar novos membros da equipe, revisar permissões ou forçar troca de senha.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes/usuarios',
        featureKey: 'usuarios',
        prerequisites: [
            'Acesso exclusivo do perfil CLINIC_ADMIN.',
        ],
        steps: [
            {
                number: 1,
                title: 'Convidar e Gerenciar Usuários por Perfil',
                description: 'Acesse Configurações -> Usuários no menu lateral. Clique em Convidar Novo Usuário, informe os dados e atribua o papel correto (CLINIC_ADMIN, FINANCIAL, RECEPTIONIST, DOCTOR, NURSE ou STAFF).',
                uiPathBadges: ['Menu -> Configurações -> Usuários', 'Convidar Novo Usuário', 'Abas Usuários / Perfis'],
            },
            {
                number: 2,
                title: 'Compreender a Blindagem Global por Perfil em Todo o Sistema',
                description: 'Menus laterais, Busca Global (Ctrl+K), Lista e Ficha de Pacientes, Planos de Sessão, APIs clínicas e a própria Central de Ajuda utilizam a mesma Fonte Única de RBAC. Cada colaborador visualiza e abre exclusivamente o que pertence à modalidade do seu perfil, e o servidor bloqueia acessos diretos pela URL. Exceções pontuais homologadas para clínicas ou usuários específicos permanecem estritamente isoladas e nunca se propagam para outras clínicas.',
                uiPathBadges: ['Fonte Única RBAC', 'Ctrl+K Filtrado', 'Proteção no Servidor'],
            },
            {
                number: 3,
                title: 'Redefinir Senhas com Segurança',
                description: 'No menu de ações do usuário na lista Usuários da Clínica, utilize Forçar Nova Senha quando precisar redefinir o acesso de um colaborador.',
                uiPathBadges: ['Usuários da Clínica', 'Forçar Nova Senha'],
            },
        ],
        tips: [
            'Crie sempre logins nominais individuais; nunca compartilhe contas administrativas com recepção ou profissionais.',
        ],
        faqs: [
            {
                question: 'O que acontece se um médico ou recepcionista digitar uma URL administrativa na barra de endereço?',
                answer: 'O middleware do servidor bloqueia imediatamente o acesso antes de carregar a tela e redireciona o usuário de volta ao painel com aviso de acesso restrito.',
            },
        ],
        tags: ['rbac', 'permissoes', 'usuarios', 'lgpd', 'sigilo medico', 'readonly'],
        aliases: ['criar usuario', 'alterar permissao', 'politica de acesso', 'convidar usuario', 'usuarios'],
    },
    {
        id: 'configuracoes-terapias',
        anchor: 'configuracoes-terapias',
        module: 'configuracoes',
        title: 'Configurações: Terapias e Especialidades da Clínica',
        subtitle: 'Cadastre, organize e atualize a lista de terapias oferecidas nos agendamentos e reembolsos.',
        objective: 'Manter padronizados os tipos de terapia usados na agenda, nos planos terapêuticos e nas regras de reembolso.',
        whenToUse: 'Ao incluir uma nova especialidade/terapia na clínica ou ajustar nomes existentes.',
        estimatedMinutes: 2,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes/terapias',
        featureKey: 'terapias_config',
        prerequisites: [
            'Perfil exclusivo de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Configurações -> Terapias',
                description: 'No menu lateral, clique em Configurações -> Terapias para visualizar o cartão Terapias Cadastradas.',
                uiPathBadges: ['Menu -> Configurações -> Terapias'],
            },
            {
                number: 2,
                title: 'Adicionar Nova Terapia e Salvar',
                description: 'Digite o nome no campo Nome da nova terapia, adicione à lista e clique no botão Salvar no topo para gravar as alterações.',
                uiPathBadges: ['Nome da nova terapia', 'Botão Salvar'],
            },
        ],
        tips: [
            'Sempre clique em Salvar ao concluir suas alterações para que as novas terapias apareçam na Agenda e em Reembolsos.',
        ],
        faqs: [
            {
                question: 'Terapeutas ou recepção podem editar a lista de terapias?',
                answer: 'Não. Apenas Administradores da Clínica (CLINIC_ADMIN) gerenciam Configurações -> Terapias.',
            },
        ],
        tags: ['terapias', 'especialidades', 'tipos de terapia'],
        aliases: ['terapias'],
    },
    {
        id: 'configuracoes-assinatura',
        anchor: 'configuracoes-assinatura',
        module: 'configuracoes',
        title: 'Assinatura, Plano Contratado e Boletos',
        subtitle: 'Consulte o plano ativo da clínica, gere boleto da assinatura e acompanhe detalhes contratuais.',
        objective: 'Dar transparência ao administrador sobre o plano contratado, status de cobrança e emissão de boleto.',
        whenToUse: 'Para consultar o plano atual da clínica, emitir boleto ou gerenciar a assinatura.',
        estimatedMinutes: 2,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes/assinatura',
        featureKey: 'assinatura',
        prerequisites: [
            'Perfil exclusivo de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Configurações -> Assinatura',
                description: 'No menu lateral, clique em Configurações -> Assinatura para visualizar os detalhes do seu plano atual.',
                uiPathBadges: ['Menu -> Configurações -> Assinatura'],
            },
            {
                number: 2,
                title: 'Emitir Boleto ou Consultar Opções do Plano',
                description: 'Utilize o botão Gerar Boleto do Plano quando precisar emitir a cobrança ou consulte a seção Cancelamento de Assinatura.',
                uiPathBadges: ['Gerar Boleto do Plano'],
            },
        ],
        tips: [
            'Apenas o administrador da clínica visualiza dados financeiros da assinatura CliniGo.',
        ],
        faqs: [
            {
                question: 'Médicos, recepção ou financeiro conseguem cancelar a assinatura da clínica?',
                answer: 'Não. A tela Configurações -> Assinatura é bloqueada exclusivamente para o perfil CLINIC_ADMIN.',
            },
        ],
        tags: ['assinatura', 'plano', 'boleto', 'mensalidade'],
        aliases: ['assinatura'],
    },
    {
        id: 'configuracoes-seguranca',
        anchor: 'configuracoes-seguranca',
        module: 'configuracoes',
        title: 'Configurações de Segurança e Alteração de Senha',
        subtitle: 'Atualize sua senha com requisitos mínimos de segurança e proteja o acesso administrativo.',
        objective: 'Manter a conta administrativa protegida com senhas fortes e controle de credenciais.',
        whenToUse: 'Sempre que desejar trocar sua senha periodicamente ou reforçar a segurança da conta.',
        estimatedMinutes: 2,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/seguranca',
        featureKey: 'seguranca',
        prerequisites: [
            'Perfil exclusivo de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Configurações -> Segurança',
                description: 'No menu lateral, clique em Configurações -> Segurança para abrir o painel Configurações de Segurança.',
                uiPathBadges: ['Menu -> Configurações -> Segurança'],
            },
            {
                number: 2,
                title: 'Definir e Confirmar a Nova Senha',
                description: 'Informe uma nova senha com no mínimo 8 caracteres, confirme-a no campo seguinte e salve a alteração.',
                uiPathBadges: ['Nova Senha (mínimo 8 caracteres)'],
            },
        ],
        tips: [
            'Evite reutilizar senhas antigas e nunca compartilhe o acesso administrativo entre dois dispositivos simultaneamente.',
        ],
        faqs: [
            {
                question: 'Qual o tamanho mínimo aceito para a nova senha?',
                answer: 'O sistema exige no mínimo 8 caracteres com confirmação idêntica.',
            },
        ],
        tags: ['seguranca', 'trocar senha', 'alterar senha'],
        aliases: ['seguranca'],
    },
    {
        id: 'configuracoes-dispositivos-pareados',
        anchor: 'configuracoes-dispositivos-pareados',
        module: 'configuracoes',
        title: 'Dispositivos Pareados, Painel de TV e PIN da Recepção',
        subtitle: 'Pareie totens, tablets ou TVs de chamada por código e gerencie o PIN temporário da recepção.',
        objective: 'Controlar todos os terminais físicos pareados na clínica com revogação rápida e código seguro.',
        whenToUse: 'Ao conectar uma nova TV na sala de espera, parear um tablet de check-in ou redefinir o PIN da recepção.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes/dispositivos',
        prerequisites: [
            'Perfil exclusivo de Administrador da Clínica (CLINIC_ADMIN).',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Configurações -> Dispositivos Pareados',
                description: 'No menu lateral, clique em Configurações -> Dispositivos Pareados para visualizar dispositivos vinculados e o controle de PIN da recepção.',
                uiPathBadges: ['Menu -> Configurações -> Dispositivos Pareados'],
            },
            {
                number: 2,
                title: 'Criar / Parear Novo Dispositivo ou Gerar Novo Código',
                description: 'Cadastre um novo dispositivo para gerar o código de pareamento, ajuste a sala associada quando necessário ou atualize o PIN da recepção.',
                uiPathBadges: ['Parear Novo Dispositivo', 'Gerar Código', 'PIN da Recepção'],
            },
        ],
        tips: [
            'Se um tablet ou TV for substituído na recepção, gere um novo código ou remova o dispositivo antigo por segurança.',
        ],
        faqs: [
            {
                question: 'A recepção pode alterar o PIN administrativo ou parear dispositivos sozinha?',
                answer: 'Não. O gerenciamento de Dispositivos Pareados e PIN é exclusivo do perfil CLINIC_ADMIN.',
            },
        ],
        tags: ['dispositivos pareados', 'painel tv', 'totem', 'pin recepcao'],
        aliases: ['dispositivos-pareados', 'dispositivos'],
    },

    // =========================================================================
    // ADMINISTRAÇÃO DA PLATAFORMA (EXCLUSIVO SUPER_ADMIN — INVISÍVEL PARA CLÍNICAS)
    // =========================================================================
    {
        id: 'admin-plataforma-super-admin',
        anchor: 'admin-plataforma-super-admin',
        module: 'plataforma',
        title: 'Administração Global da Plataforma (Master Hub e Super Admin)',
        subtitle: 'Gestão centralizada de clínicas, planos, cobrança, grupos, relatórios globais, API keys, auditoria e health check.',
        objective: 'Permitir à equipe Super Admin operar o Master Hub, liberar permissões customizadas por clínica e monitorar a saúde global da plataforma.',
        whenToUse: 'Na administração multi-tenant de clínicas, assinaturas, impersonação e monitoramento global.',
        estimatedMinutes: 5,
        roles: ['SUPER_ADMIN'],
        minPlan: 'Enterprise',
        route: '/system-master-hub',
        prerequisites: [
            'Perfil exclusivo de Super Admin (SUPER_ADMIN) — todas as rotas desta seção retornam 404 Not Found para qualquer outro perfil.',
        ],
        steps: [
            {
                number: 1,
                title: 'Operar pelo Master Hub e Gestão de Clínicas',
                description: 'Acesse Administração -> Master Hub ou Clínicas para gerenciar status, planos, permissões customizadas por módulo (feature flags) e impersonação segura.',
                uiPathBadges: ['Administração -> Master Hub', 'Clínicas', 'Planos e Cobrança'],
            },
            {
                number: 2,
                title: 'Monitorar Grupos, Relatórios Globais, API Keys, Auditoria e Health Check',
                description: 'Utilize os subitens da seção Administração para acompanhar relatórios consolidados, chaves de API, logs globais de auditoria, Health Check e contas Super Admins.',
                uiPathBadges: ['Relatórios Globais', 'API Keys', 'Health Check', 'Super Admins'],
            },
        ],
        tips: [
            'Todas as rotas desta seção são protegidas por segmentação exata no middleware e completamente ocultas de qualquer perfil de clínica.',
        ],
        faqs: [
            {
                question: 'Um administrador de clínica consegue ver este guia ou acessar /system-master-hub?',
                answer: 'Nunca. O guia é restrito ao papel SUPER_ADMIN e qualquer acesso às rotas de plataforma retorna HTTP 404 Not Found.',
            },
        ],
        tags: ['super admin', 'master hub', 'clinicas', 'planos', 'cobranca', 'grupos', 'relatorios globais', 'api keys', 'health check'],
        aliases: ['master-hub', 'clinicas', 'planos', 'cobranca', 'grupos', 'relatorios-globais', 'api-keys', 'health-check', 'super-admins'],
    },
    {
        id: 'busca-global-acoes-rapidas',
        anchor: 'busca-global-acoes-rapidas',
        module: 'principal',
        title: 'Busca Global e Ações Rápidas (Ctrl+K)',
        subtitle: 'Encontre pacientes e navegue exclusivamente pelos módulos do seu perfil em segundos, sem passar por múltiplos menus.',
        objective: 'Reduzir cliques na rotina diária da clínica permitindo localizar pacientes e acionar ações diretas respeitando integralmente a matriz de permissões (RBAC) e os módulos ativos da clínica.',
        whenToUse: 'Sempre que precisar localizar um paciente rapidamente ou pular entre telas autorizadas do seu perfil de qualquer lugar do sistema.',
        estimatedMinutes: 1,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'FINANCIAL', 'DOCTOR', 'NURSE', 'STAFF'],
        minPlan: 'Básico',
        route: '/dashboard',
        featureKey: 'dashboard',
        prerequisites: ['Estar autenticado em qualquer página do painel da clínica.'],
        steps: [
            {
                number: 1,
                title: 'Abrir a Busca Global',
                description: 'Pressione Ctrl+K (Windows/Linux) ou Cmd+K (Mac), ou clique no botão "Buscar paciente ou módulo..." no cabeçalho superior (ou no ícone de lupa no celular).',
                uiPathBadges: ['Cabeçalho Superior', 'Buscar paciente ou módulo...', 'Ctrl+K'],
            },
            {
                number: 2,
                title: 'Localizar paciente com ações imediatas filtradas por perfil',
                description: 'Para perfis com acesso ao diretório de pacientes, digite ao menos 2 letras do nome ou CPF. Na própria linha do resultado, acione Abrir Ficha, Prontuário (somente Corpo Clínico e Administração), Contratos (somente Recepção e Administração quando módulo ativo) ou WhatsApp.',
                uiPathBadges: ['Abrir Ficha', 'Prontuário', 'Contratos', 'WhatsApp'],
            },
            {
                number: 3,
                title: 'Pular direto para módulos da sua modalidade',
                description: 'Os atalhos exibidos seguem exatamente o seu perfil: Terapeutas veem Meu Dia Clínico, Minha Agenda, Prontuários, Supervisão e Meu Financeiro; Recepção vê Agenda, Recepção, Pacientes, Fila de Espera e Contratos; Financeiro vê TISS, Raio-X de Operadoras e Financeiro Geral (sem busca de pacientes).',
                uiPathBadges: ['Atalhos Rápidos por Perfil', 'Enter'],
            },
        ],
        tips: [
            'A Busca Global aplica dupla validação de permissão (na exibição e antes de navegar) usando a mesma Fonte Única de RBAC do servidor, respeitando também módulos desativados e exceções pontuais isoladas por clínica.',
        ],
        faqs: [
            {
                question: 'Por que um módulo que existe no sistema não aparece para mim no Ctrl+K?',
                answer: 'Por segurança e conformidade LGPD, o Ctrl+K exibe somente módulos, buscas e botões permitidos à modalidade do seu perfil e ativos para a sua clínica.',
            },
            {
                question: 'O atalho funciona no celular ou tablet?',
                answer: 'Sim. Em telas móveis, basta tocar no ícone de lupa no cabeçalho superior para abrir a busca rápida adaptada para toque.',
            },
        ],
        tags: ['busca global', 'atalho', 'ctrl+k', 'pesquisa rapida', 'pacientes', 'produtividade', 'rbac'],
        aliases: ['busca-global', 'ctrl-k', 'command-palette', 'acoes-rapidas'],
    },
    {
        id: 'biblioteca-objetivos-psicomotricidade',
        anchor: 'biblioteca-objetivos-psicomotricidade',
        module: 'prontuario',
        title: 'Biblioteca Visual de Objetivos de Psicomotricidade',
        subtitle: 'Consulte, pesquise, imprima em PDF white-label e vincule os 55 objetivos estruturados (A–K) vendo a descrição completa antes de escolher.',
        objective: 'Permitir que o profissional visualize o conteúdo completo de cada objetivo de Psicomotricidade antes de vinculá-lo ao paciente, com autopreenchimento do critério e zero vazamento de marcas de terceiros.',
        whenToUse: 'Ao planejar metas terapêuticas de Psicomotricidade ou consultar o catálogo completo da equipe.',
        estimatedMinutes: 2,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'],
        minPlan: 'Básico',
        route: '/dashboard/pacientes',
        featureKey: 'prontuarios',
        prerequisites: ['Módulo de Psicomotricidade habilitado em Configurações → Módulos Clínicos.'],
        steps: [
            {
                number: 1,
                title: 'Abrir a Biblioteca Completa (55 Objetivos)',
                description: 'Na ficha do paciente, abra a aba Psicomotricidade (ou Gerenciar Objetivos) e clique em "Ver Biblioteca (55)".',
                uiPathBadges: ['Pacientes', 'Abrir Ficha', 'Psicomotricidade', 'Ver Biblioteca (55)'],
            },
            {
                number: 2,
                title: 'Pesquisar, filtrar por categoria (A–K) ou imprimir PDF',
                description: 'Use a barra de busca por código (ex.: ATR01) ou palavra-chave, filtre pelas categorias A a K, copie a descrição ou clique em "Imprimir / Salvar PDF" para gerar o catálogo white-label com o nome da sua clínica.',
                uiPathBadges: ['Buscar', 'Categorias A–K', 'Copiar', 'Imprimir / Salvar PDF'],
            },
            {
                number: 3,
                title: 'Vincular com autopreenchimento do critério',
                description: 'Clique em "Usar este objetivo" ou em "Adicionar Objetivo". O texto-modelo já preenche automaticamente o campo de critério — basta substituir os espaços ___ pelos parâmetros do paciente e salvar.',
                uiPathBadges: ['Adicionar Objetivo', 'Usar este objetivo', 'Salvar Objetivo'],
            },
        ],
        tips: [
            'Se a clínica ativou Psicomotricidade recentemente, os 55 objetivos padrão são carregados automaticamente na biblioteca da clínica no primeiro acesso com isolamento multi-tenant.',
        ],
        faqs: [
            {
                question: 'Posso consultar os objetivos antes de escolher qual vincular?',
                answer: 'Sim. Tanto o botão "Ver Biblioteca (55)" quanto o seletor dentro de "Vincular Novo Objetivo" exibem código, categoria e descrição completa antes do clique.',
            },
        ],
        tags: ['psicomotricidade', 'objetivos', 'biblioteca', 'catalogo', 'pdf', 'criterio', 'white-label'],
        aliases: ['psicomotricidade-objetivos', 'biblioteca-psicomotricidade', 'catalogo-objetivos'],
    },
    {
        id: 'meu-dia-clinico-clonar-sessao',
        anchor: 'meu-dia-clinico-clonar-sessao',
        module: 'agenda',
        title: 'Meu Dia Clínico e Clonagem de Sessão em 1 Clique',
        subtitle: 'Veja todos os seus atendimentos de hoje em uma única fila e reaproveite metas e estratégias da última sessão.',
        objective: 'Reduzir cliques na rotina clínica do terapeuta com acesso direto a Evoluir/Assinar, Planos/Tatame e Ficha do paciente.',
        whenToUse: 'No início e ao longo do expediente diário do terapeuta ou ao abrir uma nova folha de Plano de Sessão.',
        estimatedMinutes: 2,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'],
        minPlan: 'Básico',
        route: '/dashboard/meu-dia',
        featureKey: 'agenda',
        prerequisites: ['Possuir agendamentos vinculados ao seu perfil profissional no dia.'],
        steps: [
            {
                number: 1,
                title: 'Abrir Meu Dia Clínico pelo Menu Lateral, Dashboard ou Ctrl+K',
                description: 'No menu lateral esquerdo, clique em Agendamento → Meu Dia Clínico (também disponível diretamente no Painel Principal do terapeuta ou via atalho Ctrl+K).',
                uiPathBadges: ['Menu -> Agendamento -> Meu Dia Clínico', 'Painel Principal', 'Ctrl+K'],
            },
            {
                number: 2,
                title: 'Acionar Prontuário, Tatame ou Ficha em 1 clique',
                description: 'Em cada card de sessão do dia, acompanhe os indicadores de biometria facial e assinatura e clique diretamente em "Evoluir / Assinar", "Planos / Tatame" ou "Ficha".',
                uiPathBadges: ['Evoluir / Assinar', 'Planos / Tatame', 'Ficha'],
            },
            {
                number: 3,
                title: 'Clonar estrutura da sessão anterior',
                description: 'Ao abrir um novo Plano de Sessão, clique em "Clonar Última Sessão" para importar automaticamente metas, parâmetros e estratégias mantendo os contadores do dia limpos.',
                uiPathBadges: ['Plano de Sessão', 'Clonar Última Sessão'],
            },
        ],
        tips: [
            'Use os filtros Todas, Pendentes e Assinadas no topo do Meu Dia Clínico para fechar o expediente com 100% das evoluções assinadas.',
            'Esta tela é protegida por RBAC no servidor e restrita ao corpo clínico e administração.',
        ],
        faqs: [
            {
                question: 'Clonar a última sessão copia as notas e acertos antigos?',
                answer: 'Não. Apenas as metas, parâmetros e estratégias são copiados; os resultados e tentativas do dia ficam zerados para a coleta atual.',
            },
        ],
        tags: ['meu dia', 'terapeuta', 'clonar sessao', 'tatame', 'produtividade'],
        aliases: ['meu-dia', 'meu-dia-clinico', 'clonar-sessao'],
    },
    {
        id: 'mesa-supervisao-aba-pei',
        anchor: 'mesa-supervisao-aba-pei',
        module: 'terapia',
        title: 'Mesa de Supervisão Clínica ABA/PEI e Integração Multidisciplinar',
        subtitle: 'Identifique estagnação, metas prontas para promoção, divergência entre aplicadores e registros recentes de outras especialidades.',
        objective: 'Dar visão gerencial e técnica ao supervisor sobre todos os programas ativos sem precisar abrir prontuários individualmente.',
        whenToUse: 'Em reuniões semanais de supervisão clínica, auditorias de PEI e revisões de programa terapêutico.',
        estimatedMinutes: 3,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'],
        minPlan: 'Avançado',
        route: '/dashboard/terapia/supervisao',
        featureKey: 'supervisao',
        prerequisites: ['Sessões registradas em Planos de Sessão (ABA, Psicologia, Fono, TO ou Fisioterapia).'],
        steps: [
            {
                number: 1,
                title: 'Abrir a Mesa de Supervisão Clínica',
                description: 'Acesse Terapia → Fluxo e Clínico → Supervisão (ou via Ctrl+K) e escolha a janela de análise (30, 60 ou 90 dias). Administradores e coordenadores enxergam toda a equipe; terapeutas individuais visualizam suas próprias sessões.',
                uiPathBadges: ['Menu -> Terapia -> Supervisão', '30 / 60 / 90 dias'],
            },
            {
                number: 2,
                title: 'Alternar entre Estagnação, Promoção e Calibração',
                description: 'Clique nos cartões do topo para inspecionar metas em platô/regressão, metas com domínio >=80% em 3 sessões consecutivas, evolução do nível de suporte (Prompt Fading) e divergências >=25 p.p. entre aplicadores.',
                uiPathBadges: ['Estagnação / Regressão', 'Prontas p/ Promoção', 'Calibração de Equipe'],
            },
            {
                number: 3,
                title: 'Copiar rascunho técnico e revisar a integração 7 dias',
                description: 'Copie o rascunho de apoio para seu registro de supervisão e consulte, dentro de cada plano de sessão, o bloco de Integração Multidisciplinar com os registros dos últimos 7 dias de outras especialidades do mesmo paciente.',
                uiPathBadges: ['Copiar texto', 'Integração Multidisciplinar (7 dias)'],
            },
        ],
        tips: [
            'A síntese gerada é um apoio estatístico baseado nos registros reais da clínica; toda decisão de ajuste ou promoção permanece sob critério exclusivo do supervisor.',
        ],
        faqs: [
            {
                question: 'Como funciona o Detector de Descalibração entre Aplicadores?',
                answer: 'Quando dois profissionais diferentes aplicam o mesmo objetivo no mesmo paciente e a média de independência diverge em 25 pontos percentuais ou mais, o sistema destaca o caso para calibração.',
            },
        ],
        tags: ['supervisao', 'aba', 'pei', 'estagnacao', 'calibracao', 'prompt fading', 'multidisciplinar'],
        aliases: ['mesa-supervisao', 'radar-aba', 'calibracao-equipe'],
    },
    {
        id: 'tiss-operadoras-dossie-probatorio',
        anchor: 'tiss-operadoras-dossie-probatorio',
        module: 'tiss-glosas',
        title: 'Raio-X de Operadoras, Score do Lote, Memória Anti-Glosa e Dossiê PDF (1 Clique)',
        subtitle: 'Compare rentabilidade e prazo de retorno por convênio, previna erros recorrentes antes do XML e gere PDF probatório com Biometria e Evolução.',
        objective: 'Reduzir glosas recorrentes por operadora e acelerar recursos com documentação auditável.',
        whenToUse: 'Antes de fechar remessas XML, ao revisar contas glosadas e na análise mensal de rentabilidade de convênios.',
        estimatedMinutes: 3,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/tiss/reports/loss-analysis',
        featureKey: 'faturamento_tiss',
        prerequisites: ['Lotes TISS e retornos/glosas registrados na clínica.'],
        steps: [
            {
                number: 1,
                title: 'Consultar o Raio-X de Operadoras e Memória Anti-Glosa',
                description: 'Acesse Faturamento TISS → Perdas (BI) e role até "Raio-X de Rentabilidade por Operadora" para comparar taxa real de glosa, prazo de retorno (DSO em dias), margem retida, top motivos ANS e exportar CSV.',
                uiPathBadges: ['Faturamento TISS', 'Perdas (BI)', 'Raio-X por Operadora', 'Exportar CSV'],
            },
            {
                number: 2,
                title: 'Conferir Score de Saúde (0–100%) e alertas aprendidos no Lote',
                description: 'Ao abrir qualquer lote TISS antes de fechar o XML, o Score de Saúde (0–100%) audita automaticamente carteirinhas, validades e TUSS e injeta os padrões históricos da Memória Anti-Glosa daquela operadora.',
                uiPathBadges: ['Lotes TISS', 'Score de Saúde (0–100%)', 'Memória Anti-Glosa'],
            },
            {
                number: 3,
                title: 'Emitir Dossiê Probatório em 1 clique',
                description: 'Em Controle de Glosas (Nível 2 — Contas da Remessa), clique em "Dossiê PDF" em qualquer guia glosada para gerar o PDF pronto com Guia TISS, trilha de check-in, Biometria Facial, Evolução Assinada com hash e índice de força probatória (0–100%).',
                uiPathBadges: ['Controle de Glosas', 'Contas da Remessa', 'Dossiê PDF'],
            },
        ],
        tips: [
            'Manter biometria facial ativa na recepção e evoluções assinadas eleva a força probatória do dossiê para até 100%.',
        ],
        faqs: [
            {
                question: 'O Dossiê Probatório expõe dados sensíveis desnecessários?',
                answer: 'Não. A carteirinha é mascarada e o prontuário traz apenas a síntese técnica minimizada com hash de assinatura, em conformidade com a LGPD.',
            },
        ],
        tags: ['tiss', 'operadoras', 'glosa', 'dossie', 'biometria', 'anti-glosa', 'dso', 'score lote'],
        aliases: ['raio-x-operadoras', 'memoria-anti-glosa', 'dossie-probatorio', 'score-lote-tiss'],
    },
    {
        id: 'clinigo-familia-2-escola-antichurn',
        anchor: 'clinigo-familia-2-escola-antichurn',
        module: 'prontuario',
        title: 'CliniGo Família 2.0: Mural de Conquistas, Termômetro e Retorno da Escola',
        subtitle: 'Correlacione rotina de casa com evolução clínica, receba micro-retorno estruturado da escola e previna evasão.',
        objective: 'Engajar responsáveis e escola com segurança LGPD, sem aplicativo e sem abrir chat livre fora do horário.',
        whenToUse: 'No envio semanal de boletins para a família ou no compartilhamento temporário de 7 dias com escola/neuropediatra.',
        estimatedMinutes: 2,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
        minPlan: 'Básico',
        route: '/dashboard/pacientes',
        featureKey: 'pacientes',
        prerequisites: ['Link gerado pelo botão "CliniGo Família" na ficha do paciente ou no Plano de Sessão.'],
        steps: [
            {
                number: 1,
                title: 'Gerar boletim da família ou link temporário da escola (7 dias)',
                description: 'Na ficha do paciente ou no Plano de Sessão, clique em "CliniGo Família", escolha o modo (Família ou Escola/Neuropediatra com validade de 7 dias), confirme o consentimento LGPD e envie pelo WhatsApp.',
                uiPathBadges: ['Ficha do Paciente', 'CliniGo Família', 'Família / Escola (7 dias)', 'Gerar Link'],
            },
            {
                number: 2,
                title: 'Acompanhar Mural de Conquistas, Correlação Casa × Clínica e Retorno da Escola',
                description: 'Os pais visualizam o Mural de Conquistas, marcam atividades realizadas, tags de contexto semanal e nota de confiança (1 a 5); a escola pode enviar 3 campos estruturados em 15 segundos. Tudo aparece automaticamente na Correlação Casa × Clínica.',
                uiPathBadges: ['Mural de Conquistas', 'Correlação Casa × Clínica', 'Retorno da Escola'],
            },
            {
                number: 3,
                title: 'Agir preventivamente no Radar Anti-Churn e revogar links quando precisar',
                description: 'Quando uma família registrar confiança <= 2/5, a coordenação recebe alerta silencioso no Radar Operacional do Dashboard para contato proativo. Qualquer link pode ser revogado em 1 clique no histórico.',
                uiPathBadges: ['Dashboard', 'Radar Operacional', 'Revogar Link'],
            },
        ],
        tips: [
            'Todo link é individual, sem senha, protegido pela LGPD, white-label com o nome da clínica e revogável a qualquer momento.',
        ],
        faqs: [
            {
                question: 'O retorno da escola abre um chat livre com os terapeutas?',
                answer: 'Não. É um formulário fechado e objetivo de 3 campos (participação, regulação e observação breve) para manter o alinhamento sem sobrecarregar a equipe.',
            },
        ],
        tags: ['clinigo familia', 'escola', 'conquistas', 'termometro', 'anti-churn', 'casa clinica', 'neuropediatra'],
        aliases: ['clinigo-familia-2', 'clinigo-familia', 'retorno-escola', 'termometro-familia'],
    },
    {
        id: 'configuracoes-modulos-clinicos',
        anchor: 'configuracoes-modulos-clinicos',
        module: 'configuracoes',
        title: 'Central de Módulos Clínicos Configuráveis por Clínica (7 Módulos)',
        subtitle: 'Ative ou desative Contratos Digitais, Teleconsulta, Planos de Sessão (6 especialidades) e Manual de Evolução com autonomia.',
        objective: 'Permitir que cada clínica personalize quais módulos clínicos e operacionais ficam ativos no seu ambiente com isolamento multi-tenant.',
        whenToUse: 'Na implantação inicial ou sempre que a clínica desejar habilitar/ocultar um módulo ou especialidade de Plano de Sessão.',
        estimatedMinutes: 2,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes',
        featureKey: 'minha_clinica',
        prerequisites: ['Perfil Administrador da Clínica (CLINIC_ADMIN).'],
        steps: [
            {
                number: 1,
                title: 'Acessar Configurações → Minha Clínica → Módulos Clínicos',
                description: 'No menu lateral, clique em Configurações → Minha Clínica e abra a seção ou aba de Módulos Clínicos.',
                uiPathBadges: ['Menu -> Configurações -> Minha Clínica', 'Módulos Clínicos'],
            },
            {
                number: 2,
                title: 'Ativar ou desativar módulos e especialidades',
                description: 'Marque ou desmarque Contratos e Assinaturas, Teleconsulta Nativa, Manual de Evolução e cada uma das 6 especialidades de Planos de Sessão (Psicomotricidade, Fisioterapia, Fonoaudiologia, Intervenção Precoce ABA, Psicologia e Terapia Ocupacional).',
                uiPathBadges: ['Contratos', 'Teleconsulta', 'Planos de Sessão (6 áreas)'],
            },
            {
                number: 3,
                title: 'Salvar e refletir automaticamente nos menus e no Ctrl+K',
                description: 'Ao salvar, a alteração é aplicada imediatamente para os usuários da sua clínica no menu lateral, na Busca Global (Ctrl+K), na Ficha do Paciente e na Central de Ajuda, sem afetar nenhuma outra clínica.',
                uiPathBadges: ['Salvar Módulos'],
            },
        ],
        tips: [
            'Módulos desativados somem automaticamente da barra lateral, do Ctrl+K e da Central de Ajuda para evitar ruído visual na equipe.',
        ],
        faqs: [
            {
                question: 'Desativar um módulo apaga os dados já registrados?',
                answer: 'Não. Os registros permanecem preservados com segurança no banco de dados e voltam a ficar visíveis caso o módulo seja reativado.',
            },
        ],
        tags: ['modulos clinicos', 'configuracoes', 'contratos', 'teleconsulta', 'planos de sessao', 'psicomotricidade'],
        aliases: ['modulos-clinicos', 'ativar-modulos', 'configurar-modulos-clinicos'],
    },
    {
        id: 'modo-tatame-curvas-aprendizagem-aba',
        anchor: 'modo-tatame-curvas-aprendizagem-aba',
        module: 'prontuario',
        title: 'Modo Tatame DTT/NET (1-Toque) e Curvas de Aprendizagem PEI/ABA',
        subtitle: 'Coleta tátil rápida durante a sessão em tablet ou celular com gráfico longitudinal automático e critério de domínio (>=80% × 3).',
        objective: 'Permitir que o terapeuta registre tentativas de ensino estruturado (DTT/NET) sem digitação longa e acompanhe automaticamente a evolução de cada meta.',
        whenToUse: 'Durante atendimentos de ABA, Terapia Ocupacional, Fonoaudiologia, Psicologia ou Fisioterapia com metas quantitativas.',
        estimatedMinutes: 3,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'],
        minPlan: 'Básico',
        route: '/dashboard/pacientes',
        featureKey: 'prontuarios',
        prerequisites: ['Perfil de Corpo Clínico ou Administração e especialidade ativa em Módulos Clínicos.'],
        steps: [
            {
                number: 1,
                title: 'Abrir os Planos de Sessão do Paciente',
                description: 'Na Ficha do Paciente (ou diretamente pelo botão Planos / Tatame no Meu Dia Clínico), abra o menu Planos de Sessão e selecione a especialidade desejada.',
                uiPathBadges: ['Ficha do Paciente', 'Planos de Sessão', 'Especialidade'],
            },
            {
                number: 2,
                title: 'Ativar o Modo Tatame DTT/NET durante a sessão',
                description: 'Dentro da sessão, acione o coletor Modo Tatame para registrar tentativas com 1 toque (Independente, Ajuda Verbal/Gestual/Física, Erro e comportamentos interferentes) com botões grandes otimizados para tablet e celular.',
                uiPathBadges: ['Modo Tatame DTT/NET', 'Coleta 1-Toque', 'Salvar Sessão'],
            },
            {
                number: 3,
                title: 'Acompanhar Curvas de Aprendizagem e Critério de Domínio',
                description: 'No painel da especialidade, consulte as curvas de independência por objetivo e o selo automático de domínio quando a meta atingir >= 80% de independência em 3 sessões consecutivas.',
                uiPathBadges: ['Curvas de Aprendizagem', 'Domínio >=80% × 3', 'Nível de Suporte'],
            },
        ],
        tips: [
            'Combine o Modo Tatame com o botão Clonar Última Sessão para iniciar cada atendimento em segundos mantendo o histórico limpo.',
        ],
        faqs: [
            {
                question: 'A recepção consegue abrir os Planos de Sessão ou o Modo Tatame?',
                answer: 'Não. Planos de Sessão, Modo Tatame e Curvas de Aprendizagem são exclusivos do corpo clínico e administração (sigilo clínico CFM/CFP).',
            },
        ],
        tags: ['tatame', 'dtt', 'net', 'curvas de aprendizagem', 'aba', 'pei', 'dominio', 'tablet'],
        aliases: ['modo-tatame', 'curvas-aprendizagem', 'coleta-dtt-net'],
    },
    {
        id: 'relatorio-renovacao-convenio-1-clique',
        anchor: 'relatorio-renovacao-convenio-1-clique',
        module: 'prontuario',
        title: 'Relatório de Renovação de Convênio em 1 Clique (PDF White-Label)',
        subtitle: 'Consolide evolução do PEI, assiduidade, comprovação biométrica e evoluções assinadas em um PDF pronto para auditoria da operadora.',
        objective: 'Eliminar horas de montagem manual de relatórios de renovação de guias terapêuticas para operadoras de saúde.',
        whenToUse: 'Sempre que a operadora ou os responsáveis solicitarem laudo de frequência e evolução para renovação de pacote de sessões.',
        estimatedMinutes: 2,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
        minPlan: 'Básico',
        route: '/dashboard/pacientes',
        featureKey: 'pacientes',
        prerequisites: ['Paciente com atendimentos e evoluções registrados no período escolhido (30, 60, 90 ou 180 dias).'],
        steps: [
            {
                number: 1,
                title: 'Abrir o botão Relatório Renovação na Ficha do Paciente',
                description: 'Acesse Equipe → Pacientes → Abrir Ficha do paciente e clique no botão "Relatório Renovação" no topo da tela.',
                uiPathBadges: ['Pacientes', 'Abrir Ficha', 'Relatório Renovação'],
            },
            {
                number: 2,
                title: 'Escolher período e revisar justificativa clínica',
                description: 'Selecione o período (30, 60, 90 ou 180 dias), confira o resumo de sessões concluídas, check-ins biométricos, metas do PEI e evoluções assinadas, e ajuste o texto de justificativa e o nome do responsável pela assinatura.',
                uiPathBadges: ['Período 30/60/90/180d', 'Justificativa Clínica'],
            },
            {
                number: 3,
                title: 'Gerar PDF de Renovação',
                description: 'Clique em "Gerar PDF de Renovação" para baixar o documento institucional white-label com o nome, CNPJ e dados da sua clínica.',
                uiPathBadges: ['Gerar PDF de Renovação'],
            },
        ],
        tips: [
            'Os dados de check-in facial e evoluções assinadas aumentam a taxa de aprovação na renovação de terapias contínuas junto às operadoras.',
        ],
        faqs: [
            {
                question: 'O PDF sai com a marca da minha clínica?',
                answer: 'Sim. O cabeçalho e o rodapé LGPD utilizam exclusivamente os dados institucionais da clínica logada.',
            },
        ],
        tags: ['relatorio renovacao', 'convenio', 'pdf', 'pei', 'frequencia', 'biometria', 'auditoria'],
        aliases: ['renovacao-convenio', 'relatorio-renovacao'],
    },
    {
        id: 'radar-operacional-meu-repasse-ao-vivo',
        anchor: 'radar-operacional-meu-repasse-ao-vivo',
        module: 'principal',
        title: 'Radar Operacional da Clínica (Anti-Churn) e Meu Repasse Ao Vivo',
        subtitle: 'Antecipe riscos operacionais, quedas de confiança das famílias e pendências de evolução que travam repasses.',
        objective: 'Dar visibilidade imediata de gargalos diários para gestores e transparência em tempo real de repasses para terapeutas.',
        whenToUse: 'Diariamente no Painel Principal para acompanhar alertas críticos sem abrir vários relatórios.',
        estimatedMinutes: 2,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'],
        minPlan: 'Básico',
        route: '/dashboard',
        featureKey: 'dashboard',
        prerequisites: ['Acesso ao Painel Principal (/dashboard).'],
        steps: [
            {
                number: 1,
                title: 'Acompanhar o Radar Operacional (Gestão / Administração)',
                description: 'No Dashboard do Administrador, visualize alertas consolidados de check-ins pendentes, evoluções sem assinatura e alertas silenciosos Anti-Churn gerados pelo Termômetro do CliniGo Família (confiança <= 2/5).',
                uiPathBadges: ['Dashboard', 'Radar Operacional', 'Alertas Anti-Churn'],
            },
            {
                number: 2,
                title: 'Conferir Meu Repasse Ao Vivo (Terapeutas)',
                description: 'No Dashboard do profissional, visualize em tempo real o valor já liberado com evolução assinada versus o valor aguardando assinatura de evolução, com atalho direto para assinar pendências.',
                uiPathBadges: ['Dashboard do Terapeuta', 'Meu Repasse Ao Vivo', 'Liberado vs Pendente'],
            },
        ],
        tips: [
            'Assinar as evoluções no mesmo dia libera o repasse automaticamente e mantém o Escudo Anti-Glosa verde para o faturamento.',
        ],
        faqs: [
            {
                question: 'O terapeuta vê o Radar Operacional financeiro da clínica inteira?',
                answer: 'Não. O terapeuta visualiza apenas o seu próprio Meu Dia Clínico e o seu cartão individual Meu Repasse Ao Vivo.',
            },
        ],
        tags: ['radar operacional', 'anti-churn', 'meu repasse ao vivo', 'evolucoes pendentes', 'dashboard'],
        aliases: ['radar-operacional', 'meu-repasse-ao-vivo'],
    },
    {
        id: 'clinigo-ia-escudo-lgpd-trio-ouro',
        anchor: 'clinigo-ia-escudo-lgpd-trio-ouro',
        module: 'prontuario',
        title: 'CliniGo IA com Escudo LGPD: Estruturador de Evolução, Boletim Família e Laudos em 3 Tons',
        subtitle: 'Transforme tópicos rápidos em evoluções clínicas prontas contra glosa, gere boletins acolhedores para os pais e redija laudos multidisciplinares em 1 clique.',
        objective: 'Reduzir o tempo de documentação clínica com anonimização LGPD obrigatória antes de qualquer processamento externo e validação final exclusiva do profissional.',
        whenToUse: 'Ao evoluir atendimentos no Prontuário ou Plano de Sessão, ao publicar o boletim CliniGo Família ou ao emitir laudos para convênio, médico ou escola.',
        estimatedMinutes: 3,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'],
        minPlan: 'Básico',
        route: '/dashboard/prontuarios',
        featureKey: 'prontuarios',
        prerequisites: [
            'Perfil clínico (Médico / Terapeuta) ou Administrador.',
            'Paciente com atendimento ou plano de sessão aberto no sistema.',
        ],
        steps: [
            {
                number: 1,
                title: 'Estruturar Evolução + Check Anti-Glosa (Prontuário e Planos de Sessão)',
                description: 'Na tela de evolução do prontuário (/dashboard/prontuarios/[id]) ou dentro do Plano de Sessão, abra o painel CliniGo IA — Estruturador de Evolução, escolha o formato (Terapia/ABA, SOAP, Psicologia CRP ou Eixos CIF), informe tópicos rápidos da sessão e clique em Estruturar com IA. Revise o texto técnico, confira o semáforo dos 4 critérios Anti-Glosa e clique em Aplicar no prontuário.',
                uiPathBadges: ['Prontuário / Plano de Sessão', 'CliniGo IA', 'Estruturar com IA', 'Aplicar no prontuário'],
            },
            {
                number: 2,
                title: 'Gerar Boletim Acolhedor no CliniGo Família em 1 Clique',
                description: 'Na ficha do paciente ou no Plano de Sessão, abra CliniGo Família e clique em Gerar Boletim Acolhedor (IA) (ou Redigir Síntese (IA) no modo Escola/Médico). O motor lê as evoluções recentes da clínica, traduz os avanços sem jargões técnicos e sugere uma atividade prática para casa pronta para revisão e envio.',
                uiPathBadges: ['CliniGo Família', 'Gerar Boletim Acolhedor (IA)'],
            },
            {
                number: 3,
                title: 'Redigir Laudo Multidisciplinar em 3 Tons (Convênio, Neuropediatra ou Escola)',
                description: 'Na ficha do paciente, abra Relatório de Renovação de Convênio, escolha o público-alvo do parecer (Convênio/Auditoria, Neuropediatra/Médico ou Escola/Família) e clique em Redigir com IA. O sistema compila frequência real, biometria facial, curvas PEI/ABA e evoluções assinadas em um texto profissional pronto para copiar ou imprimir.',
                uiPathBadges: ['Ficha do Paciente', 'Relatório de Renovação', 'Redigir com IA (3 Tons)'],
            },
        ],
        tips: [
            'Escudo LGPD nativo: nome completo, CPF, telefone, e-mail, carteirinha e endereço são substituídos por tokens neutros no servidor antes de qualquer envio e restaurados apenas localmente após a resposta.',
            'A IA nunca substitui o julgamento clínico: revise sempre o texto antes de aplicar, enviar à família ou assinar eletronicamente.',
        ],
        faqs: [
            {
                question: 'Dados identificáveis dos pacientes saem do CliniGo quando uso a IA?',
                answer: 'Não. O Escudo LGPD anonimiza automaticamente nomes, CPF, telefone, e-mail, endereço e carteirinha antes do processamento e registra apenas metadados anonimizados na auditoria.',
            },
            {
                question: 'O que acontece se um provedor de IA externo estiver lento ou fora do ar?',
                answer: 'O CliniGo utiliza cascata automática de múltiplos modelos com cache inteligente e fallback estruturado local, garantindo que a tela clínica nunca trave.',
            },
        ],
        tags: ['clinigo ia', 'ia clinica', 'escudo lgpd', 'estruturador evolucao', 'check anti-glosa', 'boletim familia', 'laudo multidisciplinar'],
        aliases: ['clinigo-ia', 'ia-clinica', 'estruturador-evolucao'],
    },
    {
        id: 'clinigo-ia-advogado-antiglosa-tiss',
        anchor: 'clinigo-ia-advogado-antiglosa-tiss',
        module: 'tiss-glosas',
        title: 'Advogado Anti-Glosa TISS (IA): Carta Técnica de Recurso ANS em 1 Clique',
        subtitle: 'Redija automaticamente a fundamentação técnica de contestação de glosa usando exclusivamente as provas reais vinculadas à guia.',
        objective: 'Acelerar a recuperação de receita em glosas TISS gerando cartas formais alinhadas às normas da ANS prontas para revisão e anexação ao Dossiê Probatório PDF.',
        whenToUse: 'Sempre que uma guia apresentar glosa recuperável na tela de Glosas e Recursos (Nível 2) e exigir justificativa formal à auditoria da operadora.',
        estimatedMinutes: 2,
        roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Profissional',
        route: '/dashboard/tiss/glosas',
        featureKey: 'faturamento_tiss',
        prerequisites: [
            'Perfil Administrador (CLINIC_ADMIN) ou Financeiro (FINANCIAL) com módulo Faturamento TISS ativo.',
            'Guia com glosa registrada no Nível 2 de Glosas e Recursos.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir o Dossiê Probatório da Guia Glosada',
                description: 'Acesse Financeiro -> Faturamento TISS -> Glosas e Recursos, navegue até o Nível 2 (Contas da Remessa) e clique em Dossiê PDF na guia desejada.',
                uiPathBadges: ['Faturamento TISS', 'Glosas e Recursos', 'Botão Dossiê PDF'],
            },
            {
                number: 2,
                title: 'Gerar Carta Técnica de Recurso ANS com IA',
                description: 'No modal do Dossiê Probatório, confira a força probatória (evolução assinada, hash, biometria facial e senha) e clique em Redigir Recurso com IA na Seção 4. O motor redige a contestação formal citando apenas provas realmente presentes na guia, com proteção LGPD prévia.',
                uiPathBadges: ['Modal Dossiê Probatório', 'Seção 4', 'Redigir Recurso com IA'],
            },
            {
                number: 3,
                title: 'Revisar, Copiar ou Imprimir no Dossiê PDF',
                description: 'Ajuste o texto livremente se desejar, clique em Copiar para colar no portal da operadora ou clique em Imprimir / Salvar Dossiê PDF para emitir o documento completo com a carta já incorporada.',
                uiPathBadges: ['Botão Copiar', 'Imprimir / Salvar Dossiê PDF'],
            },
        ],
        tips: [
            'O Advogado Anti-Glosa nunca inventa provas ausentes: se a biometria ou a evolução assinada não constarem na guia, a carta concentra a argumentação exclusivamente nos registros comprovados.',
        ],
        faqs: [
            {
                question: 'Terapeutas ou recepcionistas podem acionar o Advogado Anti-Glosa TISS?',
                answer: 'Não. A rota é protegida por RBAC estrito do TISS (requireTissAction) e liberada apenas para Administração e Financeiro.',
            },
        ],
        tags: ['advogado anti-glosa', 'recurso glosa ia', 'carta tecnica ans', 'dossie probatorio', 'tiss ia'],
        aliases: ['advogado-antiglosa', 'recurso-glosa-ia'],
    },
];

export function searchKnowledgeArticles(params: {
    query?: string;
    module?: HelpModuleId | 'all';
    role?: HelpRole | 'ALL';
    articles?: KnowledgeArticle[];
}): KnowledgeArticle[] {
    const q = (params.query || '').trim().toLowerCase();
    const mod = params.module || 'all';
    const role = params.role || 'ALL';
    const source = params.articles || KNOWLEDGE_BASE_ARTICLES;

    return source.filter((article) => {
        if (mod !== 'all' && article.module !== mod) return false;
        if (role !== 'ALL' && !article.roles.includes(role)) return false;
        if (!q) return true;

        const haystack = [
            article.title,
            article.subtitle,
            article.objective,
            article.whenToUse,
            ...article.tags,
            ...article.aliases,
            ...article.steps.map((s) => `${s.title} ${s.description} ${s.uiPathBadges.join(' ')}`),
            ...article.faqs.map((f) => `${f.question} ${f.answer}`),
        ]
            .join(' ')
            .toLowerCase();

        const tokens = q.split(/\s+/).filter(Boolean);
        return tokens.every((t) => haystack.includes(t));
    });
}
