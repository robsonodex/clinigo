export type HelpModuleId =
    | 'tiss-glosas'
    | 'agenda'
    | 'recepcao'
    | 'prontuario'
    | 'financeiro'
    | 'crm-whatsapp'
    | 'configuracoes';

export type HelpRole =
    | 'CLINIC_ADMIN'
    | 'RECEPTIONIST'
    | 'FINANCIAL'
    | 'DOCTOR'
    | 'NURSE'
    | 'STAFF';

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
        id: 'tiss-glosas',
        label: 'Faturamento TISS e Controle de Glosas',
        shortDescription: 'Convênios, Autorizações na Recepção, Elaboração (Ctrl+L), Remessas XML, Glosas 3 Níveis e Recursos.',
        featured: true,
    },
    {
        id: 'agenda',
        label: 'Agendamento e Horários',
        shortDescription: 'Agenda geral, Minha Agenda do profissional, séries recorrentes, co-terapia e grade de horários.',
    },
    {
        id: 'recepcao',
        label: 'Recepção, Check-in e Pacientes',
        shortDescription: 'Fila de recepção, chamada em TV, QR Code, pré-cadastro remoto e diretório de pacientes.',
    },
    {
        id: 'prontuario',
        label: 'Prontuário e Evoluções Clínicas',
        shortDescription: 'Evoluções clínicas (SOAP, CIF, DAP), assinatura ICP-Brasil, prontuários e relatório Excel.',
    },
    {
        id: 'financeiro',
        label: 'Financeiro e Repasses',
        shortDescription: 'Lançamentos financeiros, folha de repasses médicos e painel Meu Financeiro do profissional.',
    },
    {
        id: 'crm-whatsapp',
        label: 'Comunicação e FluxoMed CRM',
        shortDescription: 'Conexão de WhatsApp por setor via QR Code, automações e funil Kanban no FluxoMed.',
    },
    {
        id: 'configuracoes',
        label: 'Configurações, Usuários e LGPD',
        shortDescription: 'Usuários e perfis de acesso (RBAC), dados da clínica e trilha de logs de auditoria.',
    },
];

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeArticle[] = [
    // =========================================================================
    // TRILHA MESTRE: TISS E CONTROLE DE GLOSAS (8 GUIAS VERIFICADOS NO CÓDIGO)
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
        aliases: ['abrir conta medica', 'liberar faturamento', 'estornar liberacao', 'dados atend'],
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
                title: 'Fechar Remessa e Gerar XML Cobrança',
                description: 'No menu de ações do lote, execute Fechar Remessa e Validar e em seguida Gerar XML Cobrança para baixar o arquivo XML TISS.',
                uiPathBadges: ['Fechar Remessa e Validar', 'Gerar XML Cobrança'],
            },
            {
                number: 4,
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
        aliases: ['revisar remessa', 'estornar glosa', 'concluir revisao glosa'],
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

    // =========================================================================
    // PRONTUÁRIO E EVOLUÇÕES CLÍNICAS (100% VERIFICADOS NO CÓDIGO)
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
        aliases: ['assinar prontuario', 'preencher evolucao', 'modelo soap', 'evolucao por sessao'],
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
        aliases: ['ver prontuario', 'abrir historico paciente', 'buscar prontuario'],
    },

    // =========================================================================
    // AGENDAMENTO E HORÁRIOS (INCLUINDO MINHA AGENDA DO CORPO CLÍNICO)
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
        aliases: ['agenda do medico', 'meus atendimentos', 'agenda do terapeuta'],
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
        aliases: ['agendar paciente', 'serie recorrente', 'marcar consulta'],
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
        tags: ['horarios', 'grade semanal', 'turnos', 'disponibilidade', 'fila de espera'],
        aliases: ['configurar horario medico', 'turnos profissional', 'grade de horarios'],
    },

    // =========================================================================
    // RECEPÇÃO, CHECK-IN, PRÉ-CADASTRO E DIRETÓRIO DE PACIENTES
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
        aliases: ['chamar paciente tv', 'confirmar chegada', 'novo atendimento walk-in', 'encaixe'],
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
        aliases: ['enviar ficha paciente', 'gerar link pre cadastro'],
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
                title: 'Abrir Ficha ou Exportar Lista (Excel / CSV)',
                description: 'Clique sobre o paciente para abrir sua ficha cadastral. Quando necessário, utilize o menu Exportar para baixar a listagem em Excel (.xlsx) ou CSV.',
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
        aliases: ['lista de pacientes', 'buscar paciente', 'cadastrar paciente'],
    },

    // =========================================================================
    // FINANCEIRO, REPASSES E MEU FINANCEIRO (SEPARADOS POR PERFIL)
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
        aliases: ['novo lancamento financeiro', 'ver receita do mes', 'transacoes financeiras'],
    },
    {
        id: 'financeiro-repasses-medicos',
        anchor: 'financeiro-repasses-medicos',
        module: 'financeiro',
        title: 'Gestão de Repasses Médicos e Folha de Pagamento Profissional',
        subtitle: 'Apure a produção do mês, gere folhas de repasse e emita notas de fechamento por profissional.',
        objective: 'Consolidar exatamente quanto cada profissional tem a receber no período com histórico de fechamentos.',
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
                title: 'Conferir Folhas e Produção por Profissional',
                description: 'Revise os valores consolidados na listagem Folhas de Pagamento e consulte detalhes em Produção por Profissional ou Histórico de Repasses.',
                uiPathBadges: ['Folhas de Pagamento', 'Produção por Profissional'],
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
        tags: ['financeiro', 'repasse', 'folha medica', 'honorarios', 'producao medica'],
        aliases: ['calcular repasse medico', 'fechar folha terapeuta', 'folha de repasse'],
    },
    {
        id: 'meu-financeiro-profissional',
        anchor: 'meu-financeiro-profissional',
        module: 'financeiro',
        title: 'Meu Financeiro: Acompanhamento Individual de Repasses',
        subtitle: 'Consulte seus repasses do ano, baixe planilhas em Excel e emita suas notas de fechamento.',
        objective: 'Dar transparência total ao médico ou terapeuta sobre seus próprios recebíveis e produção.',
        whenToUse: 'Sempre que o profissional desejar acompanhar seus repasses mensais ou baixar demonstrativos.',
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
                title: 'Consultar Comparativos e Exportar Excel',
                description: 'Acompanhe os indicadores Maior Repasse no Ano e Menor Repasse no Ano e clique no botão Excel no topo para baixar seu extrato em planilha.',
                uiPathBadges: ['Botão Excel', 'Indicadores Anuais'],
            },
            {
                number: 3,
                title: 'Baixar Nota de Repasse e Consultar Produção',
                description: 'Nos meses fechados, utilize o botão de Nota de Repasse na linha do período ou navegue para Meu Histórico e Minha Produção no submenu.',
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
        tags: ['meu financeiro', 'repasse profissional', 'nota de repasse', 'excel', 'minha producao'],
        aliases: ['ver meus repasses', 'extrato medico', 'meu historico financeiro'],
    },

    // =========================================================================
    // COMUNICAÇÃO E FLUXOMED CRM (SEPARADOS POR PERFIL E VERDADE REAL)
    // =========================================================================
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
        aliases: ['conectar whatsapp', 'parear whatsapp', 'whatsapp setor'],
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
        aliases: ['funil de vendas clinica', 'crm kanban', 'pipeline pacientes'],
    },

    // =========================================================================
    // CONFIGURAÇÕES, USUÁRIOS, RBAC E AUDITORIA LGPD
    // =========================================================================
    {
        id: 'configuracoes-rbac-lgpd',
        anchor: 'configuracoes-rbac-lgpd',
        module: 'configuracoes',
        title: 'Usuários, Perfis de Acesso (RBAC), Clínica e Auditoria LGPD',
        subtitle: 'Convide colaboradores com o perfil exato e garanta sigilo clínico e financeiro em toda a plataforma.',
        objective: 'Aplicar o princípio do menor privilégio entre Administradores, Financeiro, Recepção e Corpo Clínico com rastreabilidade.',
        whenToUse: 'Ao cadastrar novos membros da equipe, revisar permissões ou auditar acessos da clínica.',
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
                title: 'Compreender o Bloqueio Automático por Perfil',
                description: 'Cada perfil vê apenas seus próprios menus e guias de ajuda, e o servidor bloqueia tentativas de acesso direto pela barra de endereço (ex.: médicos não acessam Financeiro da clínica, TISS, Convênios ou Configurações; recepção não acessa Prontuários, Evoluções ou Glosas).',
                uiPathBadges: ['Proteção RBAC no Servidor'],
            },
            {
                number: 3,
                title: 'Configurar Dados da Clínica e Consultar Logs de Auditoria',
                description: 'Atualize dados gerais e consultórios em Configurações -> Minha Clínica e acompanhe registros de segurança em Gestão -> Auditoria (/dashboard/logs-auditoria).',
                uiPathBadges: ['Configurações -> Minha Clínica', 'Gestão -> Auditoria', 'Forçar Nova Senha'],
            },
        ],
        tips: [
            'Crie sempre logins nominais individuais; nunca compartilhe contas administrativas com recepção ou profissionais.',
            'Quando necessário, utilize a opção Forçar Nova Senha no menu de ações do usuário em Configurações -> Usuários.',
        ],
        faqs: [
            {
                question: 'O que acontece se um médico ou recepcionista digitar uma URL administrativa na barra de endereço?',
                answer: 'O middleware do servidor bloqueia imediatamente o acesso antes de carregar a tela e redireciona o usuário de volta ao painel com aviso de acesso restrito.',
            },
        ],
        tags: ['rbac', 'permissoes', 'usuarios', 'lgpd', 'auditoria', 'sigilo medico', 'readonly'],
        aliases: ['criar usuario', 'alterar permissao', 'politica de acesso', 'logs de auditoria', 'convidar usuario'],
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
