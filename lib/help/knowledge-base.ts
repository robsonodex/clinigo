export type HelpModuleId =
    | 'tiss-glosas'
    | 'agenda'
    | 'recepcao'
    | 'prontuario'
    | 'financeiro'
    | 'crm-whatsapp'
    | 'configuracoes';

export type HelpRole = 'CLINIC_ADMIN' | 'RECEPTIONIST' | 'FINANCIAL' | 'DOCTOR';

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
        shortDescription: 'Trilha mestre completa: Convênios, Autorizações, Elaboração (Ctrl+L), Remessas XML, Glosas 3 Níveis e Recursos.',
        featured: true,
    },
    {
        id: 'agenda',
        label: 'Agendamento e Telemedicina',
        shortDescription: 'Agenda geral, séries recorrentes, atendimento multidisciplinar conjunto, lista de espera e sala virtual.',
    },
    {
        id: 'recepcao',
        label: 'Recepção, Check-in e Triagem',
        shortDescription: 'Painel de recepção, chamada em TV, check-in biométrico facial/QR e pré-cadastro digital.',
    },
    {
        id: 'prontuario',
        label: 'Prontuário e Relatórios Clínicos',
        shortDescription: 'Evoluções clínicas, assinatura ICP-Brasil, exportação de evoluções em Excel (.xlsx), prescrições e planos.',
    },
    {
        id: 'financeiro',
        label: 'Financeiro e Repasses Médicos',
        shortDescription: 'Fechamento de repasses, regras por paciente, glosas mantidas no repasse e conciliação.',
    },
    {
        id: 'crm-whatsapp',
        label: 'Comunicação, CRM e NPS',
        shortDescription: 'Central WhatsApp automática, funil Kanban, campanhas e pesquisas de satisfação.',
    },
    {
        id: 'configuracoes',
        label: 'Configurações, RBAC e Governança',
        shortDescription: 'Equipe, permissões por perfil, trilha de auditoria, contratos e conformidade LGPD.',
    },
];

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeArticle[] = [
    // =========================================================================
    // TRILHA MESTRE: TISS e CONTROLE DE GLOSAS (8+ GUIAS PASSO A PASSO)
    // =========================================================================
    {
        id: 'tiss-configuracao-convenios',
        anchor: 'tiss-configuracao-convenios',
        module: 'tiss-glosas',
        title: '1. Configurando Operadoras, Planos, Tabelas de Preços e TUSS',
        subtitle: 'Base cadastral obrigatória para cálculo automático de valores e alertas de autorização.',
        objective: 'Cadastrar corretamente operadoras (registro ANS), planos aceitos, códigos TUSS contratados e regras de repasse para eliminar glosas de tabela.',
        whenToUse: 'Antes de iniciar agendamentos de convênio ou sempre que houver reajuste contratual de valores TUSS.',
        estimatedMinutes: 6,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/convenios',
        prerequisites: [
            'Estar logado como CLINIC_ADMIN (Administradores) ou FINANCIAL (para consulta).',
            'Ter em mãos o número do Registro ANS (6 dígitos) e a tabela contratada da operadora.',
        ],
        steps: [
            {
                number: 1,
                title: 'Cadastrar a Operadora de Saúde',
                description: 'Acesse o menu Convênios no painel esquerdo, clique na aba Operadoras e pressione o botão Nova Operadora. Informe nome, registro ANS e dia de fechamento/prazo de recurso.',
                uiPathBadges: ['Menu -> Convênios', 'Aba Operadoras', 'Botão Nova Operadora'],
            },
            {
                number: 2,
                title: 'Vincular Planos da Operadora',
                description: 'Troque para a aba Planos, selecione a operadora criada e cadastre os planos comerciais aceitos pela clínica (Individual, Empresarial ou Coletivo).',
                uiPathBadges: ['Aba Planos', 'Botão Novo Plano'],
            },
            {
                number: 3,
                title: 'Importar ou Cadastrar Tabela de Preços TUSS',
                description: 'Acesse a aba Tabela de Preços e TUSS. Informe o código TUSS oficial (ex.: 10101012 para consulta ou 20104090 para terapia ocupacional), o valor contratado e marque se exige autorização prévia.',
                uiPathBadges: ['Aba Tabela de Preços e TUSS', 'Botão Adicionar / Importar CSV'],
            },
            {
                number: 4,
                title: 'Configurar Política de Repasse e Glosas',
                description: 'Na aba Regras e Repasse, defina se o repasse aos profissionais ocorre por Produção ou Recebimento e qual a política padrão em caso de glosa.',
                uiPathBadges: ['Aba Regras e Repasse', 'Botão Salvar Configurações'],
            },
        ],
        tips: [
            'Cadastre sempre o código TUSS exato negociado no contrato da operadora para impedir a glosa ANS 1801 ou 2001.',
            'Habilite o campo Exige Autorização Prévia em terapias seriadas para que a recepção seja alertada automaticamente.',
        ],
        faqs: [
            {
                question: 'Por que médicos (perfil DOCTOR) não veem a tela Convênios?',
                answer: 'Por regra de sigilo operacional e proteção contratual (RBAC), perfis DOCTOR e READONLY são bloqueados de acessar valores negociados, operadoras e telas TISS.',
            },
            {
                question: 'Posso configurar tabela diferente por plano dentro da mesma operadora?',
                answer: 'Sim. Ao inserir o item na Tabela de Preços e TUSS, selecione o plano específico ou deixe em branco para aplicar a todos os planos da operadora.',
            },
        ],
        tags: ['convenios', 'operadora', 'ans', 'tuss', 'tabela de preços', 'planos', 'tiss'],
        aliases: ['cadastrar plano de saude', 'configurar valor tuss', 'cadastrar operadora', 'convenio'],
    },
    {
        id: 'tiss-recepcao-autorizacoes',
        anchor: 'tiss-recepcao-autorizacoes',
        module: 'tiss-glosas',
        title: '2. Recepção de Convênios, Carteirinha e Controle de Saldo de Autorizações',
        subtitle: 'Valide elegibilidade, acompanhe sessões restantes e alterne Particular/Convênio no balcão.',
        objective: 'Impedir atendimentos com carteirinha vencida, senha expirada ou saldo zerado antes que o paciente entre no consultório.',
        whenToUse: 'Durante o check-in do paciente na recepção ou ao confirmar atendimentos do dia.',
        estimatedMinutes: 4,
        roles: ['RECEPTIONIST', 'CLINIC_ADMIN'],
        minPlan: 'Avançado',
        route: '/dashboard/recepcao',
        prerequisites: [
            'Agendamento criado no dia para o paciente.',
            'Autorização registrada em Solicitações de Autorização quando o procedimento exigir senha prévia.',
        ],
        steps: [
            {
                number: 1,
                title: 'Conferir o Card de Convênio na Fila de Recepção',
                description: 'No menu Recepção, localize o card do paciente. Quando o atendimento for Convênio, o card exibe o nome da operadora, número da guia/senha, validade e o contador Autorizadas | Utilizadas | Saldo.',
                uiPathBadges: ['Menu -> Recepção', 'Painel Aguardando / Check-in'],
            },
            {
                number: 2,
                title: 'Tratar Alertas Vermelhos de Impedimento',
                description: 'Se surgir alerta de Carteirinha expirada, Senha vencida ou Sem saldo na autorização, regularize antes de concluir o atendimento para evitar glosas ANS 1001, 1401 ou 1402.',
                uiPathBadges: ['Alerta Vermelho no Card', 'Convênios -> Elegibilidade'],
            },
            {
                number: 3,
                title: 'Alternar Categoria no Balcão (Particular / Convênio)',
                description: 'Caso o paciente mude a forma de atendimento na chegada, clique diretamente no botão Alternar Categoria (Particular / Convênio) no card da recepção ou nos detalhes do agendamento.',
                uiPathBadges: ['Botão Alternar Categoria (Particular / Convênio)'],
            },
            {
                number: 4,
                title: 'Concluir Atendimento e Disparar Conta em Elaboração',
                description: 'Ao finalizar o atendimento (Concluir), a ponte automática gera a guia TISS correspondente no estágio Em Elaboração sem necessidade de redigitação.',
                uiPathBadges: ['Botão Concluir', 'Faturamento TISS -> Elaboração de Contas'],
            },
        ],
        tips: [
            'Sempre verifique se o número da carteirinha do atendimento corresponde ao cadastro atualizado do beneficiário.',
            'Em terapias contínuas, solicite nova prorrogação assim que o saldo atingir 2 sessões restantes.',
        ],
        faqs: [
            {
                question: 'O que acontece se eu clicar em Alternar Categoria de Convênio para Particular?',
                answer: 'O agendamento passa a ser tratado como atendimento particular imediatamente, preservando a trilha de auditoria sem gerar guia TISS automática na conclusão.',
            },
        ],
        tags: ['recepcao', 'elegibilidade', 'carteirinha', 'saldo autorizacao', 'particular convenio', 'checkin'],
        aliases: ['trocar particular convenio', 'saldo de sessoes', 'carteirinha vencida', 'autorizacao tiss'],
    },
    {
        id: 'tiss-elaboracao-contas',
        anchor: 'tiss-elaboracao-contas',
        module: 'tiss-glosas',
        title: '3. Elaboração e Liberação de Contas Médicas (Atalho Ctrl+L)',
        subtitle: 'Auditoria pré-envio com Escudo Anti-Glosa, inclusão/estorno de itens nos 4 grupos e liberação.',
        objective: 'Revisar contas geradas automaticamente pelos atendimentos, validar biometria/evolução e liberar somente contas 100% conformes para faturamento.',
        whenToUse: 'Diariamente ou semanalmente antes da montagem das remessas XML.',
        estimatedMinutes: 5,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/tiss',
        prerequisites: [
            'Atendimentos de convênio concluídos ou guias criadas manualmente.',
            'Acesso administrativo ou financeiro (perfil CLINIC_ADMIN ou FINANCIAL).',
        ],
        steps: [
            {
                number: 1,
                title: 'Filtrar Contas na Aba Elaboração de Contas',
                description: 'Acesse Faturamento TISS no menu lateral e permaneça na aba Elaboração de Contas. Utilize os filtros de Período, Convênio, Profissional, Status ou a caixa Pesquisa Atendimento / Paciente.',
                uiPathBadges: ['Menu -> Faturamento TISS', 'Aba Elaboração de Contas', 'Pesquisa Atendimento / Paciente'],
            },
            {
                number: 2,
                title: 'Conferir a Coluna Escudo Anti-Glosa',
                description: 'Analise o selo de cada linha. Contas com selo Apta estão prontas; contas com Atenção ou Bloqueio exibem pendências como carteirinha vencida, valor zerado, biometria ou evolução clínica pendente.',
                uiPathBadges: ['Coluna Escudo Anti-Glosa'],
            },
            {
                number: 3,
                title: 'Abrir Conta, Incluir ou Estornar Itens por Grupo',
                description: 'Clique em Abrir / Editar Conta. Navegue entre as abas Honorários / Sessões, Taxas e Serviços, Materiais e Medicamentos, Diagnose e Terapia e Resumo Parcial / Total. Use + Incluir Item ou Estorno conforme necessário e salve com Grava.',
                uiPathBadges: ['Botão Abrir / Editar Conta', 'Botão + Incluir Item', 'Botão Estorno', 'Botão Grava'],
            },
            {
                number: 4,
                title: 'Conferir Evidências e Liberar para Faturamento (Ctrl+L)',
                description: 'Clique em Dados Atend. para validar check-in biométrico e evolução do prontuário. Estando tudo correto, pressione Ctrl+L no teclado (ou clique em Encerrar e Liberar Conta). Para várias contas de uma vez, marque os checkboxes e clique em Liberar Selecionadas em Lote.',
                uiPathBadges: ['Botão Dados Atend.', 'Atalho Ctrl+L', 'Botão Liberar Selecionadas em Lote'],
            },
        ],
        tips: [
            'Precisa ajustar uma conta já liberada que ainda não entrou em remessa? Clique no botão Estornar Liberação na linha da conta.',
            'Nunca libere contas com valor zerado; cadastre o procedimento na Tabela de Preços e atualize o item antes de liberar.',
        ],
        faqs: [
            {
                question: 'Por que uma conta liberada não aparece para edição de itens?',
                answer: 'Contas no estágio Liberada para Faturamento ficam protegidas contra alterações acidentais. Clique em Estornar Liberação para retorná-la a Em Elaboração.',
            },
        ],
        tags: ['elaboracao de contas', 'liberar conta', 'ctrl+l', 'escudo anti-glosa', 'estorno', 'incluir item'],
        aliases: ['abrir conta medica', 'liberar faturamento', 'estornar liberacao', 'dados atend'],
    },
    {
        id: 'tiss-remessas-xml',
        anchor: 'tiss-remessas-xml',
        module: 'tiss-glosas',
        title: '4. Montagem de Remessas XML TISS-ANS, Protocolo e Anexos',
        subtitle: 'Agrupe contas liberadas em lotes, valide XSD/ANS, gere o XML de cobrança e acompanhe os 4 anexos.',
        objective: 'Montar a remessa oficial sem erros estruturais ANS, transmitir no portal da operadora e registrar protocolo e comprovante.',
        whenToUse: 'Na data de corte de fechamento configurada para cada operadora de saúde.',
        estimatedMinutes: 6,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/tiss/batches',
        prerequisites: [
            'Contas médicas já encerradas e com status Liberada para Faturamento.',
        ],
        steps: [
            {
                number: 1,
                title: 'Iniciar o Wizard Nova Remessa',
                description: 'Em Faturamento TISS, clique em Remessas / Lotes (/dashboard/tiss/batches) e depois no botão Nova Remessa. No Passo 1, escolha a Operadora, Competência (Mês/Ano) e Tipo de Atendimento e clique em Avançar.',
                uiPathBadges: ['Remessas / Lotes', 'Botão Nova Remessa', 'Avançar'],
            },
            {
                number: 2,
                title: 'Processos: Selecionar Contas Liberadas',
                description: 'No Passo 2 (ou via menu Ações -> Processos: Selecionar Contas Liberadas em lotes Rascunho), marque as contas desejadas ou clique em Selecionar Todas, conferindo o totalizador financeiro ao vivo, e clique em Salvar Remessa.',
                uiPathBadges: ['Processos: Selecionar Contas Liberadas', 'Selecionar Todas', 'Salvar Remessa'],
            },
            {
                number: 3,
                title: 'Fechar Remessa e Gerar XML Cobrança',
                description: 'No menu de ações da linha (ou dentro dos detalhes da remessa), execute Fechar Remessa e Validar e depois Gerar XML Cobrança (ENVIO_LOTE_GUIAS). Faça o download do XML com hash verificado.',
                uiPathBadges: ['Fechar Remessa e Validar', 'Gerar XML Cobrança', 'Baixar XML'],
            },
            {
                number: 4,
                title: 'Registrar Protocolo e Anexos TISS-ANS',
                description: 'Após enviar o XML no portal da operadora, clique em Registrar Envio / Protocolo para informar data, canal e protocolo. Nos detalhes da remessa, acompanhe e anexe os arquivos no painel Anexos TISS-ANS.',
                uiPathBadges: ['Registrar Envio / Protocolo', 'Painel Anexos TISS-ANS'],
            },
        ],
        tips: [
            'Precisa ajustar uma guia depois de fechar a remessa (antes do envio)? Use a opção Reabrir Remessa informando o motivo formal.',
            'Mantenha anexado o Recibo/Protocolo e os XMLs de Demonstrativo de Análise e Pagamento para blindagem em auditorias.',
        ],
        faqs: [
            {
                question: 'Por que não encontro uma conta ao selecionar para a remessa?',
                answer: 'Por segurança, o filtro padrão mostra somente contas da mesma operadora que já estejam no status Liberada para Faturamento e não vinculadas a outro lote.',
            },
        ],
        tags: ['remessa', 'lote', 'xml tiss', 'envio_lote_guias', 'anexos tiss-ans', 'protocolo', 'xsd'],
        aliases: ['gerar xml tiss', 'criar lote convenio', 'fechar remessa', 'registrar protocolo'],
    },
    {
        id: 'tiss-retorno-dryrun',
        anchor: 'tiss-retorno-dryrun',
        module: 'tiss-glosas',
        title: '5. Importação de Retorno XML em 2 Etapas (Dry-Run + Confirmação)',
        subtitle: 'Simule a leitura do demonstrativo de retorno sem risco de duplicação e faça vínculo manual se necessário.',
        objective: 'Processar demonstrativos de retorno XML ou CSV da operadora com pré-visualização segura de pagamentos e glosas antes de gravar no banco.',
        whenToUse: 'Ao receber o arquivo de retorno de análise ou pagamento no portal da operadora.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/tiss/glosas',
        prerequisites: [
            'Remessa enviada e arquivo de retorno (.xml ou .csv) baixado do portal da operadora.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir Importar Retorno XML (Dry-Run)',
                description: 'Acesse Faturamento TISS -> Glosas (/dashboard/tiss/glosas). Na aba Controle de Glosas (3 Níveis), clique no botão Importar Retorno XML (Dry-Run).',
                uiPathBadges: ['Faturamento TISS -> Glosas', 'Botão Importar Retorno XML (Dry-Run)'],
            },
            {
                number: 2,
                title: 'Analisar a Prévia (Dry-Run)',
                description: 'Selecione o lote correspondente e envie o arquivo. O CliniGo calcula um hash criptográfico para evitar reimportação duplicada e exibe quantas guias deram match, valor aprovado e glosas detectadas.',
                uiPathBadges: ['Etapa 1: Simulação Dry-Run'],
            },
            {
                number: 3,
                title: 'Vincular Guias Não Casadas e Confirmar',
                description: 'Se alguma guia do arquivo tiver numeração divergente, vincule manualmente à guia interna na lista e clique em Confirmar Importação para registrar pagamentos e glosas.',
                uiPathBadges: ['Vínculo Manual', 'Botão Confirmar Importação'],
            },
        ],
        tips: [
            'Se importar o arquivo errado em um lote, administradores podem usar Desfazer Importação dentro dos detalhes do lote (bloqueado apenas se já houver recurso acatado ou repasse liquidado).',
        ],
        faqs: [
            {
                question: 'O sistema permite importar o mesmo XML duas vezes?',
                answer: 'Não. A trava por hash do arquivo bloqueia duplicidades, a menos que o retorno anterior tenha sido formalmente estornado via Desfazer.',
            },
        ],
        tags: ['retorno xml', 'dry-run', 'demonstrativo retorno', 'conciliacao', 'desfazer retorno'],
        aliases: ['importar retorno convenio', 'ler xml retorno', 'conciliar retorno tiss'],
    },
    {
        id: 'tiss-controle-glosas',
        anchor: 'tiss-controle-glosas',
        module: 'tiss-glosas',
        title: '6. Controle de Glosas em 3 Níveis (Lote → Contas → Item/Grupo e Batimento)',
        subtitle: 'Auditoria completa padrão hospitalar/ambulatorial com glosa parcial, irrecuperável e batimento contábil.',
        objective: 'Conferir remessa por remessa, tratar glosas parciais ou totais por item/grupo, classificar perdas irrecuperáveis e validar o batimento contábil.',
        whenToUse: 'Após o retorno da operadora ou auditoria manual de divergências em faturas enviadas.',
        estimatedMinutes: 8,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/tiss/glosas',
        prerequisites: [
            'Remessa criada/enviada com contas vinculadas.',
        ],
        steps: [
            {
                number: 1,
                title: 'Nível 1: Selecionar e Iniciar Revisão da Remessa',
                description: 'Na aba Controle de Glosas (3 Níveis), observe a legenda de cores (Não Iniciada, Em Andamento, Já Finalizada, Retornadas para Correção). Selecione a remessa e clique em Iniciar / Revisar Remessa (ou use Pesquisa Conta / Paciente para busca global).',
                uiPathBadges: ['Nível 1: Remessas', 'Botão Iniciar / Revisar Remessa', 'Pesquisa Conta / Paciente'],
            },
            {
                number: 2,
                title: 'Nível 2: Filtrar e Operar Contas da Remessa em Massa',
                description: 'Confira os 4 cards financeiros e use os filtros com contadores em tempo real (Pendentes, Pagas, Glosas Parciais, Glosa Total, Sem Informação). Use Liberação Automática para contas pagas integralmente, Glosa Total Automática ou Retornar para Revisão para corrigir uma conta na Elaboração.',
                uiPathBadges: ['Nível 2: Contas da Remessa', 'Selecionar TODAS as contas', 'Liberação Automática', 'Abrir Conta'],
            },
            {
                number: 3,
                title: 'Nível 3: Registrar Glosa Parcial ou Irrecuperável por Item/Grupo',
                description: 'Clique em Abrir Conta para entrar no Nível 3. Na aba do grupo (Honorários, Taxas, Materiais ou Diagnose), clique em Glosa Parcial / Item, informe Qtde. Aprovada, Valor Unitário Aprovado, Tipo da Glosa e Motivo ANS (Tabela 38). Se não couber contestação, marque Glosa Irrecuperável.',
                uiPathBadges: ['Nível 3: Abrir Conta', 'Glosa Parcial / Item', 'Checkbox Glosa Irrecuperável', 'Motivo ANS Tabela 38'],
            },
            {
                number: 4,
                title: 'Usar Resumo por Grupo, Estornos e Concluir com Batimento Contábil',
                description: 'Na aba Resumo por Grupo, utilize Glosar Grupo, Estornar Glosas Grupos ou Estornar Glosa Valor Total quando aplicável. Salve com Grava ou clique em Conclui para abrir o Batimento Contábil (Glosa Prevista vs Glosa Digitada vs Recebimento a Maior). Após concluir todas as contas, finalize a remessa no Nível 1 com Contas Revisadas.',
                uiPathBadges: ['Aba Resumo por Grupo', 'Botão Grava', 'Botão Conclui', 'Contas Revisadas (Finalizar Remessa)'],
            },
        ],
        tips: [
            'Toda glosa marcada com Glosa Irrecuperável bloqueia automaticamente a criação de recurso e sinaliza perda definitiva.',
            'Sempre confira a diferença no Batimento Contábil antes de clicar em Contas Revisadas (Finalizar Remessa).',
        ],
        faqs: [
            {
                question: 'Como devolvo uma única conta com erro para a equipe corrigir em Elaboração?',
                answer: 'No Nível 2 (Contas da Remessa), marque o checkbox da conta e clique em Retornar para Revisão. A remessa receberá a sinalização âmbar Remessa com Contas Retornadas para Correção.',
            },
        ],
        tags: ['controle de glosa', '3 niveis', 'glosa parcial', 'glosa irrecuperavel', 'batimento contabil', 'tabela 38 ans'],
        aliases: ['totvs controle de glosa', 'revisar remessa', 'estornar glosa', 'concluir revisao glosa'],
    },
    {
        id: 'tiss-recursos-dossie',
        anchor: 'tiss-recursos-dossie',
        module: 'tiss-glosas',
        title: '7. Recursos de Glosa (C1–C8), Dossiê Probatório Automático e XML ANS',
        subtitle: 'Conteste apenas glosas recuperáveis com evidência clínica automática e exportação TISS.',
        objective: 'Recuperar receitas glosadas indevidamente reunindo prova de comparecimento, evolução assinada e XML oficial de recurso de glosa.',
        whenToUse: 'Após identificar glosas recuperáveis em aberto dentro do prazo legal configurado para a operadora.',
        estimatedMinutes: 5,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/tiss/glosas',
        prerequisites: [
            'Existência de glosas em aberto com can_appeal = true e is_irrecoverable = false.',
        ],
        steps: [
            {
                number: 1,
                title: 'Criar Lote de Recurso por Operadora (C1)',
                description: 'Na tela Glosas e Recursos TISS (/dashboard/tiss/glosas), acesse a aba Recursos de Glosa (C1 - C8) e clique em Novo Lote de Recurso (C1). Selecione a operadora e marque somente as glosas recuperáveis desejadas.',
                uiPathBadges: ['Aba Recursos de Glosa (C1 - C8)', 'Botão Novo Lote de Recurso (C1)'],
            },
            {
                number: 2,
                title: 'Gerar Dossiê Probatório Automático',
                description: 'Na tabela de recursos, clique em Dossiê Probatório. O CliniGo compila automaticamente o espelho da guia, status do check-in biométrico/presença e resumo da evolução clínica assinada no prontuário.',
                uiPathBadges: ['Botão Dossiê Probatório'],
            },
            {
                number: 3,
                title: 'Exportar XML de Recurso ANS, Anexar e Enviar (C4–C7)',
                description: 'Clique em XML Recurso para baixar o arquivo no padrão ANS (RECURSO_GLOSA), anexe laudos complementares pelo botão Anexos, clique em Liberar e, após protocolar na operadora, clique em Registrar Envio.',
                uiPathBadges: ['Botão XML Recurso', 'Botão Anexos', 'Liberar', 'Registrar Envio'],
            },
            {
                number: 4,
                title: 'Liquidar Resultado do Recurso (C8)',
                description: 'Quando a operadora responder, clique em Registrar Resultado e informe por item se foi Acatado, Parcial ou Negado. Valores recuperados geram ajuste automático.',
                uiPathBadges: ['Botão Registrar Resultado'],
            },
        ],
        tips: [
            'Se uma glosa estiver marcada como Glosa Irrecuperável no Nível 3, o sistema bloqueará qualquer tentativa de incluí-la em um recurso.',
        ],
        faqs: [
            {
                question: 'Posso misturar glosas de duas operadoras diferentes no mesmo Lote de Recurso?',
                answer: 'Não. No padrão TISS-ANS cada Lote de Recurso pertence exclusivamente a uma operadora para validação do Registro ANS de destino.',
            },
        ],
        tags: ['recurso de glosa', 'dossie probatorio', 'xml recurso', 'c1 c8', 'biometria', 'contestacao'],
        aliases: ['contestar glosa', 'gerar xml recurso glosa', 'recuperar glosa'],
    },
    {
        id: 'tiss-repasse-glosas',
        anchor: 'tiss-repasse-glosas',
        module: 'tiss-glosas',
        title: '8. Impacto das Glosas no Repasse Profissional (Produção vs Recebimento)',
        subtitle: 'Entenda como a política de glosas e recursos deferidos/irrecuperáveis afetam a folha médica.',
        objective: 'Alinhar exatamente o cálculo automático do repasse profissional à regra contratual da clínica para atendimentos por convênio.',
        whenToUse: 'Na apuração mensal de produção e fechamento da folha de repasse médico.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/financeiro',
        prerequisites: [
            'Regime de Repasse e Política de Glosa configurados em Convênios -> Regras e Repasse.',
        ],
        steps: [
            {
                number: 1,
                title: 'Escolher o Regime de Repasse da Clínica',
                description: 'Em Convênios -> Regras e Repasse, defina entre PRODUCAO (repassa pela realização do atendimento) ou RECEBIMENTO (retém o repasse do convênio até a liquidação/pagamento da guia pela operadora).',
                uiPathBadges: ['Convênios -> Regras e Repasse', 'Regime de Repasse'],
            },
            {
                number: 2,
                title: 'Definir Política de Glosas para o Profissional',
                description: 'Escolha entre CLINICA_ABSORVE (profissional recebe 100% independente da glosa), DESCONTA_PROFISSIONAL (estorna proporcionalmente na glosa) ou DESCONTA_SE_MANTIDA (desconta apenas se o recurso for indeferido ou se a glosa for Irrecuperável).',
                uiPathBadges: ['Política de Glosa'],
            },
            {
                number: 3,
                title: 'Conferir Reflexo Automático na Produção Médica',
                description: 'Ao fechar ou consultar o resumo de produção (/dashboard/financeiro), o motor calcula automaticamente descontos de glosas irrecuperáveis e libera créditos assim que um recurso é acatado (C8).',
                uiPathBadges: ['Menu -> Financeiro', 'Produção / Repasse'],
            },
        ],
        tips: [
            'Médicos continuam visualizando seus próprios valores em Meu Financeiro sem nunca acessar dados sigilosos da operadora ou tabelas contratuais TISS.',
        ],
        faqs: [
            {
                question: 'Atendimentos particulares são afetados pela política de glosas?',
                answer: 'Nunca. Atendimentos particulares seguem integralmente as regras de repasse fixo ou percentual sem retenções TISS.',
            },
        ],
        tags: ['repasse medico', 'regime recebimento', 'politica de glosa', 'folha pagamento', 'irrecuperavel'],
        aliases: ['desconto de glosa no repasse', 'repasse por recebimento', 'glosa mantida'],
    },

    // =========================================================================
    // PRONTUÁRIO e RELATÓRIOS CLÍNICOS (INCLUINDO EXPORTAÇÃO EXCEL EXPLÍCITA)
    // =========================================================================
    {
        id: 'prontuarios-relatorio-evolucao-excel',
        anchor: 'prontuarios-relatorio-evolucao-excel',
        module: 'prontuario',
        title: 'Como tirar Relatório de Evolução por Paciente / Período em Excel (.xlsx)',
        subtitle: 'Passo a passo oficial para filtrar e exportar evoluções clínicas consolidadas para auditorias, planos de saúde ou acompanhamento clínico.',
        objective: 'Gerar e baixar uma planilha Excel (.xlsx) completa com o histórico de evoluções filtrado por paciente específico, profissional e intervalo de datas.',
        whenToUse: 'Quando a clínica precisar enviar histórico clínico para operadoras, auditorias de recurso de glosa, supervisão multidisciplinar ou conferência de sessões realizadas no mês.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Profissional',
        route: '/dashboard/prontuarios',
        prerequisites: [
            'Perfil de Administrador da Clínica (CLINIC_ADMIN) — por sigilo LGPD e segurança de dados em lote, somente administradores visualizam o botão Exportar Excel.',
            'Evoluções clínicas registradas nos atendimentos do período.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar o Menu Prontuários',
                description: 'No menu lateral esquerdo do painel administrativo, clique em Prontuários para abrir a listagem central de evoluções clínicas da clínica.',
                uiPathBadges: ['Menu Lateral -> Prontuários'],
            },
            {
                number: 2,
                title: 'Aplicar os Filtros Desejados na Tela',
                description: 'Preencha o campo de busca pelo nome do Paciente, escolha o Mês de Referência ou defina Data Inicial e Data Final personalizadas e, se quiser restringir a um terapeuta/médico, selecione o Profissional e clique em Buscar.',
                uiPathBadges: ['Campo Paciente', 'Mês de Referência / Data Inicial e Final', 'Profissional', 'Botão Buscar'],
            },
            {
                number: 3,
                title: 'Clicar no Botão Exportar Excel',
                description: 'No topo da página de Prontuários, clique no botão Exportar Excel. Um modal de confirmação de exportação será exibido mantendo os filtros da tela.',
                uiPathBadges: ['Botão Exportar Excel'],
            },
            {
                number: 4,
                title: 'Refinar Paciente ou Período no Modal e Baixar .xlsx',
                description: 'Dentro do modal de exportação, confirme ou ajuste o Mês/Período, Profissional ou selecione um Paciente específico e clique em Baixar Planilha Excel. O arquivo (.xlsx) será gerado e baixado automaticamente.',
                uiPathBadges: ['Modal Exportar Evoluções', 'Botão Baixar Planilha Excel'],
            },
        ],
        tips: [
            'Para auditar glosas técnicas (ANS 2501 ou 2503), filtre pelo paciente e pelo mês exato da guia antes de clicar em Exportar Excel.',
            'Se precisar do documento individual em PDF assinado, abra o prontuário do paciente e utilize o botão Exportar PDF.',
        ],
        faqs: [
            {
                question: 'Por que o botão Exportar Excel não aparece para médicos ou recepção?',
                answer: 'Por conformidade rigorosa com a LGPD e sigilo de prontuário em massa, a exportação em lote (.xlsx) é restrita ao perfil CLINIC_ADMIN.',
            },
        ],
        tags: ['exportar excel', 'relatorio evolucao', 'prontuario excel', 'xlsx', 'historico clinico', 'paciente periodo'],
        aliases: ['baixar evolucoes em excel', 'relatorio de evolucao por paciente', 'planilha prontuario'],
    },
    {
        id: 'prontuario-eletronico-evolucao',
        anchor: 'prontuario-eletronico-evolucao',
        module: 'prontuario',
        title: 'Preenchimento de Evolução Clínica, Templates e Assinatura ICP-Brasil',
        subtitle: 'Registro diário estruturado (SOAP, CIF, DAP e modelos institucionais) com assinatura digital e PDF.',
        objective: 'Padronizar o registro clínico garantindo rastreabilidade médica/terapêutica e prova documental contra glosas.',
        whenToUse: 'Durante ou imediatamente após cada consulta ou sessão terapêutica.',
        estimatedMinutes: 5,
        roles: ['DOCTOR', 'CLINIC_ADMIN'],
        minPlan: 'Profissional',
        route: '/dashboard/evolucoes',
        prerequisites: [
            'Atendimento vinculado ao paciente.',
            'Certificado digital A1 configurado caso deseje assinatura ICP-Brasil.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir o Prontuário pelo Atendimento ou Menu Evolução',
                description: 'Na Minha Agenda ou em Prontuários / Evolução por Sessão, clique em Abrir Prontuário ou Nova Evolução.',
                uiPathBadges: ['Minha Agenda -> Abrir Prontuário', 'Menu -> Evolução por Sessão'],
            },
            {
                number: 2,
                title: 'Selecionar o Modelo Clínico da Especialidade',
                description: 'Escolha entre SOAP, CIF, DAP ou template customizado da clínica e preencha os campos clínicos objetivos, conduta e metas.',
                uiPathBadges: ['Seletor Modelo (SOAP / CIF / DAP)'],
            },
            {
                number: 3,
                title: 'Salvar, Finalizar ou Assinar Digitalmente',
                description: 'Clique em Salvar para manter em edição ou em Finalizar / Assinar com Certificado ICP-Brasil para travar alterações e validar juridicamente o documento.',
                uiPathBadges: ['Botão Salvar', 'Botão Finalizar Evolução', 'Assinar ICP-Brasil'],
            },
        ],
        tips: [
            'Evoluções finalizadas não podem ser editadas retroativamente, garantindo integridade legal e auditoria TISS.',
        ],
        faqs: [
            {
                question: 'Posso exportar uma evolução individual em PDF?',
                answer: 'Sim. Na listagem de Evolução por Sessão ou dentro do Prontuário, utilize o botão Imprimir / Exportar PDF.',
            },
        ],
        tags: ['prontuario', 'pep', 'soap', 'cif', 'icp-brasil', 'assinatura digital', 'evolucao'],
        aliases: ['assinar prontuario', 'preencher evolucao', 'modelo soap'],
    },
    {
        id: 'prescricoes-documentos-clinicos',
        anchor: 'prescricoes-documentos-clinicos',
        module: 'prontuario',
        title: 'Prescrições Digitais, Anexos de Exames e Documentos Clínicos',
        subtitle: 'Emissão de receitas, atestados e upload de laudos diretamente vinculados ao histórico do paciente.',
        objective: 'Centralizar anexos e receitas para envio ao paciente e comprovação de exames/procedimentos junto a convênios.',
        whenToUse: 'Sempre que houver emissão de receita, solicitação de exame ou necessidade de anexar laudo externo.',
        estimatedMinutes: 3,
        roles: ['DOCTOR', 'CLINIC_ADMIN'],
        minPlan: 'Profissional',
        route: '/dashboard/prescricoes',
        prerequisites: [
            'Paciente cadastrado na clínica.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar Prescrições ou Documentos dentro do Prontuário',
                description: 'No prontuário do paciente ou no menu Prescrições, clique em Nova Prescrição ou Anexar Documento.',
                uiPathBadges: ['Menu -> Prescrições', 'Botão Nova Prescrição'],
            },
            {
                number: 2,
                title: 'Preencher Itens, Posologia ou Enviar Arquivo',
                description: 'Adicione medicamentos e orientações (ou faça upload do PDF/imagem do exame) e salve para gerar o PDF validado.',
                uiPathBadges: ['Adicionar Item', 'Salvar e Gerar PDF'],
            },
        ],
        tips: [
            'Laudos anexados ao prontuário podem ser vinculados em 1 clique como evidência nos Recursos de Glosa (aba Anexos -> Prontuário).',
        ],
        faqs: [
            {
                question: 'Os anexos do prontuário são visíveis entre clínicas diferentes?',
                answer: 'Não. Todos os buckets e registros são isolados estritamente pelo clinic_id da clínica.',
            },
        ],
        tags: ['prescricoes', 'receita digital', 'atestados', 'anexos clinicos', 'laudos'],
        aliases: ['emitir receita', 'anexar exame paciente'],
    },

    // =========================================================================
    // AGENDAMENTO e TELEMEDICINA
    // =========================================================================
    {
        id: 'agenda-agendamento-atendimento',
        anchor: 'agenda-agendamento-atendimento',
        module: 'agenda',
        title: 'Agendamento, Séries Recorrentes e Co-Terapia Multidisciplinar',
        subtitle: 'Organize horários únicos, pacotes terapêuticos contínuos e sessões conjuntas sem falso conflito.',
        objective: 'Agendar consultas e terapias seriadas com vínculo direto a particular ou convênio e otimização de salas.',
        whenToUse: 'Na marcação inicial do paciente ou montagem da grade recorrente semanal.',
        estimatedMinutes: 4,
        roles: ['RECEPTIONIST', 'CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/agenda',
        prerequisites: [
            'Profissional com grade de horários configurada em Horários.',
        ],
        steps: [
            {
                number: 1,
                title: 'Abrir o Agendamento na Agenda Geral',
                description: 'Acesse o menu Agenda, escolha a data/profissional e clique em Novo Agendamento ou diretamente no horário livre da grade.',
                uiPathBadges: ['Menu -> Agenda', 'Botão Novo Agendamento'],
            },
            {
                number: 2,
                title: 'Definir Paciente, Modalidade e Categoria (Particular / Convênio)',
                description: 'Selecione o paciente, defina se o atendimento é Presencial ou Telemedicina, escolha Particular ou Convênio (com plano e carteirinha) e, se aplicável, ative Recorrência ou Co-Terapeuta.',
                uiPathBadges: ['Categoria Particular / Convênio', 'Recorrência Semanal'],
            },
            {
                number: 3,
                title: 'Confirmar e Acompanhar Status na Grade',
                description: 'Salve o agendamento. Nos detalhes do card, é possível reenviar confirmação via WhatsApp ou usar Alternar Categoria caso o pagamento mude na recepção.',
                uiPathBadges: ['Salvar Agendamento', 'Alternar Categoria'],
            },
        ],
        tips: [
            'Atendimentos multidisciplinares com Co-Terapeuta aparecem na agenda dos dois profissionais permitindo evoluções independentes.',
        ],
        faqs: [
            {
                question: 'Médicos veem a Agenda Geral de todos os colegas?',
                answer: 'Não. Por padrão de sigilo, médicos acessam exclusivamente Minha Agenda com seus próprios atendimentos.',
            },
        ],
        tags: ['agenda', 'agendamento', 'recorrencia', 'co-terapia', 'telemedicina', 'horarios'],
        aliases: ['agendar paciente', 'serie recorrente', 'marcar consulta'],
    },
    {
        id: 'fila-espera-horarios',
        anchor: 'fila-espera-horarios',
        module: 'agenda',
        title: 'Gestão de Horários, Bloqueios e Lista de Espera Inteligente',
        subtitle: 'Evite ociosidade na grade preenchendo cancelamentos rapidamente.',
        objective: 'Configurar turnos de atendimento dos profissionais, bloquear feriados/férias e acionar pacientes da fila de espera.',
        whenToUse: 'Ao cadastrar novo profissional ou sempre que surgir vaga por desmarcação.',
        estimatedMinutes: 3,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        minPlan: 'Básico',
        route: '/dashboard/horarios',
        prerequisites: [
            'Profissional cadastrado no corpo clínico.',
        ],
        steps: [
            {
                number: 1,
                title: 'Configurar Turnos em Horários',
                description: 'Acesse Horários, selecione o profissional, defina dias da semana, início/fim e duração padrão do atendimento e salve.',
                uiPathBadges: ['Menu -> Horários', 'Salvar Grade'],
            },
            {
                number: 2,
                title: 'Registrar Pacientes na Lista de Espera',
                description: 'Quando não houver vaga imediata, inclua o paciente na Lista de Espera informando preferência de turno e profissional para encaixe prioritário.',
                uiPathBadges: ['Agenda -> Lista de Espera'],
            },
        ],
        tips: [
            'Mantenha os horários de intervalo e reuniões de equipe devidamente bloqueados para impedir agendamentos pelo portal público.',
        ],
        faqs: [
            {
                question: 'Bloqueios de agenda cancelam atendimentos já marcados?',
                answer: 'Não automaticamente; o sistema preserva compromissos existentes e impede novas marcações na faixa bloqueada.',
            },
        ],
        tags: ['horarios', 'bloqueio agenda', 'lista de espera', 'encaixe'],
        aliases: ['configurar horario medico', 'bloquear dia'],
    },

    // =========================================================================
    // RECEPÇÃO, CHECK-IN e TRIAGEM
    // =========================================================================
    {
        id: 'recepcao-checkin-painel-tv',
        anchor: 'recepcao-checkin-painel-tv',
        module: 'recepcao',
        title: 'Painel de Recepção, Chamada em TV e Check-in Biométrico / QR Code',
        subtitle: 'Fluxo ágil de chegada com comprovação biométrica antifraude.',
        objective: 'Gerenciar fila de espera em 3 colunas (Aguardando, Em Atendimento, Concluídos), acionar painel de TV e registrar presença comprovada.',
        whenToUse: 'Continuamente na recepção durante todo o expediente da clínica.',
        estimatedMinutes: 4,
        roles: ['RECEPTIONIST', 'CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/recepcao',
        prerequisites: [
            'Agenda do dia populada e paciente chegando à recepção.',
        ],
        steps: [
            {
                number: 1,
                title: 'Realizar Check-in ou Validar Biometria / QR Code',
                description: 'Na tela Recepção, localize o paciente em Aguardando e clique em Check-in (ou realize reconhecimento facial / leitura de QR Code de pré-check-in).',
                uiPathBadges: ['Menu -> Recepção', 'Botão Check-in / Scanner QR'],
            },
            {
                number: 2,
                title: 'Chamar Paciente no Painel de TV',
                description: 'Se o Painel de TV estiver ativo para a clínica, clique em Chamar ou Re-chamar para anunciar o nome e consultório na tela da sala de espera.',
                uiPathBadges: ['Botão Chamar / Re-chamar'],
            },
            {
                number: 3,
                title: 'Iniciar e Concluir Atendimento',
                description: 'Quando o profissional iniciar o atendimento, avance para Em Atendimento e, ao término, clique em Concluir (acionando automaticamente a conta TISS quando Convênio).',
                uiPathBadges: ['Botão Em Atendimento', 'Botão Concluir'],
            },
        ],
        tips: [
            'A confirmação biométrica ou por QR Code registrada na recepção fortalece o Dossiê Probatório em recursos de glosa contra contestações de presença.',
        ],
        faqs: [
            {
                question: 'Posso marcar falta (No-Show) ou encaixe rápido pela recepção?',
                answer: 'Sim. Utilize o ícone de ausência no card para registrar falta ou o botão Novo Encaixe no topo da tela Recepção.',
            },
        ],
        tags: ['recepcao', 'painel tv', 'biometria facial', 'qr code', 'fila de espera'],
        aliases: ['chamar paciente tv', 'confirmar chegada', 'reconhecimento facial'],
    },
    {
        id: 'pre-cadastro-remoto-pacientes',
        anchor: 'pre-cadastro-remoto-pacientes',
        module: 'recepcao',
        title: 'Pré-Cadastro Remoto e Diretório de Pacientes',
        subtitle: 'Coleta antecipada de dados cadastrais e foto da carteirinha pelo celular do paciente.',
        objective: 'Reduzir filas na recepção enviando link seguro de preenchimento prévio antes da primeira consulta.',
        whenToUse: 'No agendamento de novos pacientes ou atualização periódica de carteirinhas.',
        estimatedMinutes: 3,
        roles: ['RECEPTIONIST', 'CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/pre-cadastros',
        prerequisites: [
            'Telefone ou e-mail do paciente para envio do link.',
        ],
        steps: [
            {
                number: 1,
                title: 'Gerar Link de Pré-Cadastro',
                description: 'Acesse Pré-Cadastros no menu lateral, clique em Novo Link de Pré-Cadastro e copie ou envie o link para o paciente.',
                uiPathBadges: ['Menu -> Pré-Cadastros', 'Gerar Link'],
            },
            {
                number: 2,
                title: 'Revisar Submissão e Aprovar para Cadastro',
                description: 'Quando o paciente enviar os dados e foto da carteirinha, confira as informações na tela Pré-Cadastros e aprove para criar ou atualizar o prontuário cadastral sem digitação manual.',
                uiPathBadges: ['Revisar Ficha', 'Aprovar Cadastro'],
            },
        ],
        tips: [
            'O diretório de Pacientes também permite filtrar de A-Z e exportar a base cadastral em Excel (.xlsx) ou CSV.',
        ],
        faqs: [
            {
                question: 'O link de pré-cadastro possui prazo de validade?',
                answer: 'Sim, os links são temporários e auditados em conformidade com a LGPD.',
            },
        ],
        tags: ['pre-cadastro', 'pacientes', 'carteirinha foto', 'cadastro remoto'],
        aliases: ['enviar ficha paciente', 'lista de pacientes'],
    },

    // =========================================================================
    // FINANCEIRO e REPASSES MÉDICOS
    // =========================================================================
    {
        id: 'financeiro-repasses-medicos',
        anchor: 'financeiro-repasses-medicos',
        module: 'financeiro',
        title: 'Gestão de Repasses Médicos, Taxas por Paciente e Folha de Produção',
        subtitle: 'Apuração transparente de honorários considerando contratos padrão, taxas diferenciadas e regras de convênio.',
        objective: 'Consolidar exatamente quanto cada profissional tem a receber no período, com trilha detalhada por paciente e atendimento.',
        whenToUse: 'Semanalmente para conferência gerencial e no fechamento mensal da folha médica.',
        estimatedMinutes: 5,
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        minPlan: 'Avançado',
        route: '/dashboard/financeiro',
        prerequisites: [
            'Contratos dos profissionais e/ou taxas específicas por paciente cadastrados.',
        ],
        steps: [
            {
                number: 1,
                title: 'Acessar o Módulo Financeiro e Repasses',
                description: 'No menu lateral, entre em Financeiro e selecione o período e o profissional desejado para carregar a prévia de produção e repasse.',
                uiPathBadges: ['Menu -> Financeiro', 'Filtro Profissional / Período'],
            },
            {
                number: 2,
                title: 'Conferir Regras Aplicadas e Retenções TISS',
                description: 'Verifique se o atendimento utilizou Contrato Padrão ou Taxa Específica por Paciente e confira eventuais retenções por regime de recebimento ou descontos por glosa mantida/irrecuperável.',
                uiPathBadges: ['Detalhamento por Atendimento', 'Coluna Desconto / Retenção'],
            },
            {
                number: 3,
                title: 'Aprovar e Fechar Lote de Repasse',
                description: 'Com todos os itens conferidos, gere o fechamento do repasse para disponibilizar o extrato detalhado na visão individual Meu Financeiro do profissional.',
                uiPathBadges: ['Fechar Repasse'],
            },
        ],
        tips: [
            'Perfis médicos visualizam apenas os próprios recebíveis em Meu Financeiro, preservando o sigilo de repasses de outros colegas e dados comerciais de operadoras.',
        ],
        faqs: [
            {
                question: 'Faltas não justificadas entram no repasse?',
                answer: 'Apenas atendimentos válidos (concluídos ou com status clínico Presente / Reposição) são elegíveis ao repasse.',
            },
        ],
        tags: ['financeiro', 'repasse', 'folha medica', 'honorarios', 'producao medica'],
        aliases: ['calcular repasse medico', 'fechar folha terapeuta', 'meu financeiro'],
    },

    // =========================================================================
    // COMUNICAÇÃO, CRM e NPS
    // =========================================================================
    {
        id: 'crm-whatsapp-automacoes',
        anchor: 'crm-whatsapp-automacoes',
        module: 'crm-whatsapp',
        title: 'Central WhatsApp, Confirmações Automáticas e Funil CRM Kanban',
        subtitle: 'Reduza faltas com lembretes automáticos e acompanhe interessados até o agendamento efetivo.',
        objective: 'Automatizar lembretes de consultas/sessões e organizar leads comerciais ou retornos clínicos no quadro Kanban.',
        whenToUse: 'Na configuração inicial da comunicação da clínica e no acompanhamento diário da recepção/comercial.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        minPlan: 'Avançado',
        route: '/dashboard/whatsapp',
        prerequisites: [
            'Sessão WhatsApp conectada ou provedor configurado em WhatsApp / Integrações.',
        ],
        steps: [
            {
                number: 1,
                title: 'Conectar Instância e Configurar Lembretes',
                description: 'Acesse WhatsApp no menu lateral, faça a leitura do QR Code de pareamento e ative as réguas de confirmação automática de agendamentos.',
                uiPathBadges: ['Menu -> WhatsApp', 'Parear Dispositivo', 'Regras Automáticas'],
            },
            {
                number: 2,
                title: 'Gerenciar Cards no CRM e Pesquisas NPS',
                description: 'No módulo CRM / Campanhas, mova leads entre etapas do funil Kanban e acompanhe as respostas das pesquisas de satisfação NPS enviadas após atendimentos concluídos.',
                uiPathBadges: ['Menu -> CRM / Tarefas', 'Pesquisas NPS'],
            },
        ],
        tips: [
            'Mantenha mensagens de confirmação objetivas pedindo resposta simples para o paciente confirmar presença.',
        ],
        faqs: [
            {
                question: 'O sistema grava histórico de mensagens enviadas?',
                answer: 'Sim. Todos os disparos ficam registrados na trilha de logs de comunicação da clínica.',
            },
        ],
        tags: ['whatsapp', 'crm', 'kanban', 'nps', 'lembretes', 'campanhas'],
        aliases: ['conectar whatsapp', 'confirmacao automatica', 'funil de vendas clinica'],
    },

    // =========================================================================
    // CONFIGURAÇÕES, RBAC e GOVERNANÇA LGPD
    // =========================================================================
    {
        id: 'configuracoes-rbac-lgpd',
        anchor: 'configuracoes-rbac-lgpd',
        module: 'configuracoes',
        title: 'Perfis de Acesso (RBAC), Contratos, Auditoria e Governança LGPD',
        subtitle: 'Controle rigoroso de quem acessa prontuários, faturamento TISS, repasses e logs de segurança.',
        objective: 'Garantir o princípio do menor privilégio entre Administradores, Financeiro, Recepção e Corpo Clínico.',
        whenToUse: 'Ao convidar novos colaboradores ou revisar políticas de privacidade e acesso da clínica.',
        estimatedMinutes: 4,
        roles: ['CLINIC_ADMIN'],
        minPlan: 'Básico',
        route: '/dashboard/configuracoes',
        prerequisites: [
            'Acesso exclusivo do perfil CLINIC_ADMIN.',
        ],
        steps: [
            {
                number: 1,
                title: 'Gerenciar Equipe e Perfis em Configurações',
                description: 'Acesse Configurações (ou Médicos / Terapeutas) e atribua o papel exato de cada usuário: CLINIC_ADMIN, FINANCIAL, RECEPTIONIST ou DOCTOR.',
                uiPathBadges: ['Menu -> Configurações', 'Permissões e Equipe'],
            },
            {
                number: 2,
                title: 'Compreender as Barreiras de Sigilo Automáticas',
                description: 'Perfis DOCTOR acessam somente Minha Agenda, Prontuários e Meu Financeiro (nunca Convênios, TISS ou Glosas). Perfis RECEPTIONIST operam Recepção, Elegibilidade e Rascunhos sem acessar prontuário médico completo ou recursos/glosas. Perfis READONLY são bloqueados de todo o módulo TISS/Convênios.',
                uiPathBadges: ['Matriz RBAC Multi-Tenant'],
            },
            {
                number: 3,
                title: 'Auditar Contratos, Termos e Trilha de Logs',
                description: 'Consulte Contratos, Documentos e o histórico de auditoria (Audit Logs) em cada guia, lote ou prontuário para evidenciar conformidade perante a LGPD.',
                uiPathBadges: ['Contratos', 'Gaveta Histórico / Auditoria'],
            },
        ],
        tips: [
            'Nunca compartilhe logins administrativos entre recepcionistas; crie usuários nominais para manter a rastreabilidade por usuário nos logs.',
        ],
        faqs: [
            {
                question: 'O que acontece se um médico ou usuário READONLY tentar acessar /dashboard/tiss pela URL?',
                answer: 'O middleware e os guards de API bloqueiam imediatamente a requisição com status 403 e redirecionamento seguro.',
            },
        ],
        tags: ['rbac', 'permissoes', 'lgpd', 'auditoria', 'contratos', 'sigilo medico', 'readonly'],
        aliases: ['criar usuario', 'alterar permissao', 'politica de acesso', 'logs de auditoria'],
    },
];

export function searchKnowledgeArticles(params: {
    query?: string;
    module?: HelpModuleId | 'all';
    role?: HelpRole | 'ALL';
}): KnowledgeArticle[] {
    const q = (params.query || '').trim().toLowerCase();
    const mod = params.module || 'all';
    const role = params.role || 'ALL';

    return KNOWLEDGE_BASE_ARTICLES.filter((article) => {
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

