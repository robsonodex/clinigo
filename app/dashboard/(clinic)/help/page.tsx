'use client'

import { useState } from 'react'
import {
    Search,
    BookOpen,
    HelpCircle,
    Calendar,
    Users,
    Clock,
    CreditCard,
    Settings,
    Building2,
    Video,
    Stethoscope,
    FileText,
    Key,
    Shield,
    BarChart3,
    MessageCircle,
    Package,
    DollarSign,
    Receipt,
    Wallet,
    TrendingUp,
    TrendingDown,
    ShieldAlert,
    Target,
    Bot,
    MessagesSquare,
    ChevronDown,
    ChevronUp,
    Scale,
    Crown,
    ArrowLeft,
    Globe,
    Megaphone,
    Activity,
    Send,
    HeartPulse,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface HelpItem {
    id: string
    title: string
    category: string
    icon: React.ComponentType<{ className?: string }>
    whatIsIt: string
    whenToUse: string
    minPlan: 'Básico' | 'Avançado' | 'Professional' | 'Enterprise'
    roles: string[]
    tags: string[]
}

const helpItems: HelpItem[] = [
    // Principal
    {
        id: 'dashboard',
        title: 'Dashboard',
        category: 'Principal',
        icon: BarChart3,
        whatIsIt: 'Painel principal consolidado que apresenta um resumo em tempo real da saúde da clínica. Exibe indicadores rápidos de consultas do dia, aniversariantes, volume de faturamento básico e notificações urgentes.',
        whenToUse: 'Sempre ao iniciar o dia de trabalho para ter uma visão geral e panorâmica do andamento operacional e financeiro da clínica.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
        tags: ['resumo', 'indicadores', ' kpis']
    },
    {
        id: 'checklist-inicial-onboarding',
        title: 'Checklist Inicial',
        category: 'Principal',
        icon: Target,
        whatIsIt: 'Guia passo a passo interativo de configuração inicial (Onboarding). Ajuda o gestor a cadastrar seu primeiro profissional, primeiro paciente e agendar a primeira consulta para validar a plataforma.',
        whenToUse: 'Durante os primeiros 30 dias de uso da plataforma ou até que todos os cadastros essenciais de configuração básica estejam concluídos.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['onboarding', 'configuração', 'passo a passo']
    },
    // Agendamento
    {
        id: 'agenda',
        title: 'Agenda',
        category: 'Agendamento',
        icon: Calendar,
        whatIsIt: 'Calendário unificado interativo com visão diária, semanal e mensal. Permite agendar atendimentos, arrastar blocos para reagendar (drag and drop), gerenciar conflitos e visualizar disponibilidades por salas ou terapeutas.',
        whenToUse: 'Sempre que precisar agendar uma nova consulta, visualizar horários livres de profissionais ou reagendar atendimentos a pedido de pacientes.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
        tags: ['calendário', 'marcação', 'grade', 'overbooking']
    },
    {
        id: 'minha-agenda',
        title: 'Minha Agenda',
        category: 'Agendamento',
        icon: Clock,
        whatIsIt: 'Uma visão de calendário focada e simplificada, exclusiva para o profissional de saúde logado. Restringe a exibição apenas às consultas do próprio profissional para garantir privacidade e foco.',
        whenToUse: 'Uso diário pelo médico ou terapeuta para acompanhar a sua própria lista de sessões do dia sem interferência da agenda geral.',
        minPlan: 'Básico',
        roles: ['DOCTOR'],
        tags: ['agenda pessoal', 'privacidade', 'médico', 'terapeuta']
    },
    {
        id: 'consultas',
        title: 'Consultas',
        category: 'Agendamento',
        icon: Video,
        whatIsIt: 'Painel de controle focado nos atendimentos do dia. Integra ferramentas para iniciar chamadas de vídeo, abrir prontuários instantaneamente e realizar triagem.',
        whenToUse: 'No momento do atendimento da teleconsulta do paciente.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['telemedicina', 'vídeo', 'atendimento', 'sala de espera']
    },
    {
        id: 'recepcao',
        title: 'Recepção',
        category: 'Agendamento',
        icon: Users,
        whatIsIt: 'Painel de controle operacional da recepção. Gerencia o fluxo de pacientes na fila de espera presencial, registra a chegada do paciente e integra-se diretamente com o Painel de TV e Totem de autoatendimento.',
        whenToUse: 'Para registrar quando um paciente chega fisicamente à clínica, atualizando seu status para "Aguardando Atendimento" e notificando o profissional de saúde.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
        tags: ['totem', 'painel tv', 'presencial', 'fila de espera']
    },
    {
        id: 'horarios',
        title: 'Horários',
        category: 'Agendamento',
        icon: Clock,
        whatIsIt: 'Configuração avançada das grades de horários e turnos disponíveis de cada profissional de saúde. Define dias da semana, janelas de atendimento, pausas para almoço e bloqueios (recessos/férias).',
        whenToUse: 'Sempre que um profissional alterar seu expediente regular de trabalho ou precisar criar uma nova escala de disponibilidade.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['escala', 'turnos', 'grade', 'bloqueio']
    },
    // Equipe
    {
        id: 'profissionais',
        title: 'Profissionais',
        category: 'Equipe',
        icon: Stethoscope,
        whatIsIt: 'Cadastro central de profissionais de saúde da clínica (labels adaptativos de "Médicos" ou "Terapeutas"). Gerencia dados do conselho profissional (CRM/CREFITO), especialidades, contratos de trabalho e taxas de comissão.',
        whenToUse: 'Ao contratar ou desligar um profissional na clínica, ou ao redefinir a comissão de repasse contratual.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['médicos', 'terapeutas', 'equipe', 'cadastro', 'comissão']
    },
    {
        id: 'pacientes',
        title: 'Pacientes',
        category: 'Equipe',
        icon: Users,
        whatIsIt: 'Cadastro unificado de pacientes com prontuário unificado, histórico de contatos, dados de faturamento, documentos anexados e termos de consentimento LGPD assinados.',
        whenToUse: 'Para cadastrar um novo paciente que iniciará tratamento ou para atualizar dados de endereço, contato e operadoras de saúde.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
        tags: ['cadastro', 'prontuário', 'dados pessoais', 'lgpd']
    },
    // Prontuário
    {
        id: 'prontuarios',
        title: 'Prontuários',
        category: 'Prontuário',
        icon: FileText,
        whatIsIt: 'Prontuário eletrônico do paciente, reunindo todo o histórico clínico de atendimentos, notas de evolução, laudos médicos e termos emitidos de forma vitalícia e inalterável.',
        whenToUse: 'Para revisar o histórico de saúde do paciente antes de iniciar a sessão ou ao emitir um laudo/atestado médico.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['histórico', 'laudos', 'atestados', 'anamnese']
    },
    {
        id: 'prescricoes',
        title: 'Prescrições',
        category: 'Prontuário',
        icon: FileText,
        whatIsIt: 'Emissor digital de receitas e prescrições médicas de medicamentos de forma integrada e em conformidade regulatória.',
        whenToUse: 'Durante ou ao final de uma consulta médica para prescrever medicamentos a serem tomados pelo paciente.',
        minPlan: 'Professional',
        roles: ['DOCTOR'],
        tags: ['receitas', 'remédios', 'prescrição digital']
    },
    {
        id: 'documentos',
        title: 'Documentos',
        category: 'Prontuário',
        icon: Shield,
        whatIsIt: 'Central de arquivos e laudos externos anexados à ficha do paciente. Permite o armazenamento seguro de exames laboratoriais, de imagem ou relatórios externos.',
        whenToUse: 'Quando o paciente traz um exame de fora ou laudo anterior que precisa ficar anexado ao histórico clínico para consulta futura.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['exames', 'laudos externos', 'anexos', 'pdf']
    },
    {
        id: 'templates-prontuario',
        title: 'Templates Prontuário',
        category: 'Prontuário',
        icon: Settings,
        whatIsIt: 'Criação e edição de modelos estruturados para anotações de evolução clínica. Oferece suporte a padrões de mercado como SOAP (Subjetivo, Objetivo, Avaliação, Plano), CIF e DAP.',
        whenToUse: 'Para padronizar as notas de sessões de todos os terapeutas/médicos da clínica, economizando tempo no preenchimento de evoluções.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['soap', 'cif', 'dap', 'modelos', 'padronização']
    },
    {
        id: 'template-multidisciplinar',
        title: 'Template Multidisciplinar',
        category: 'Prontuário',
        icon: FileText,
        whatIsIt: 'Modelo de evolução estruturado especificamente para clínicas de terapia integrada e multidisciplinar. Contém 6 campos essenciais: Data/Horário, Objetivo Terapêutico, Estratégias Utilizadas, Desempenho do Paciente, Intercorrências e Orientações aos Responsáveis.',
        whenToUse: 'Sempre que registrar o progresso de atendimentos de fonoaudiologia, terapia ocupacional, psicopedagogia, fisioterapia ou psicologia com foco na comunicação e orientações claras à família.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['multidisciplinar', 'evolução', 'terapias', 'campos integrados']
    },
    {
        id: 'planos-terapeuticos',
        title: 'Planos Terapêuticos',
        category: 'Prontuário',
        icon: Target,
        whatIsIt: 'Definição estruturada de objetivos terapêuticos e metas quantificáveis a curto, médio e longo prazo para o paciente.',
        whenToUse: 'No início de um tratamento de reabilitação ou acompanhamento de longo prazo para registrar as metas do paciente.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['reabilitação', 'metas', 'objetivos', 'evolução']
    },
    {
        id: 'evolucoes',
        title: 'Evoluções',
        category: 'Prontuário',
        icon: TrendingUp,
        whatIsIt: 'Registro clínico diário obrigatório das sessões realizadas. Permite registrar a evolução física e neurológica detalhada usando os templates padronizados da clínica.',
        whenToUse: 'Imediatamente após a conclusão de cada sessão de atendimento com o paciente para documentar o progresso dele.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['diário', 'notas de sessão', 'prontuário digital', 'soap']
    },
    {
        id: 'controle-de-faltas',
        title: 'Controle de Faltas',
        category: 'Prontuário',
        icon: ShieldAlert,
        whatIsIt: 'Painel inteligente que monitora o índice de absenteísmo e faltas frequentes na clínica, permitindo automação de alertas e reposição rápida de faltas.',
        whenToUse: 'Para reduzir o índice de faltas na clínica, disparando alertas preventivos ou identificando pacientes em risco de abandono por faltas.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['faltas', 'absenteísmo', 'reposição', 'whatsapp']
    },
    // Terapia
    {
        id: 'fila-de-espera',
        title: 'Fila de Espera',
        category: 'Terapia',
        icon: Clock,
        whatIsIt: 'Gestão de pacientes que aguardam por vagas ou horários fixos indisponíveis no momento na clínica. Permite gerenciar prioridades clínicas e preferências de horário.',
        whenToUse: 'Quando a agenda de um determinado profissional ou especialidade está lotada e um paciente novo deseja aguardar por desistências.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['leads', 'lista de espera', 'escassez', 'agendamento']
    },
    {
        id: 'encaminhamentos',
        title: 'Encaminhamentos',
        category: 'Terapia',
        icon: Send,
        whatIsIt: 'Registro interno de encaminhamento de pacientes para outras especialidades ou profissionais dentro do próprio espaço clínico ou externamente.',
        whenToUse: 'Quando o terapeuta atual identifica que o paciente necessita de avaliação de outra área (ex: Psicólogo encaminha para Fonoaudiólogo).',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['interconsultas', 'especialidades', 'interno']
    },
    {
        id: 'supervisao',
        title: 'Supervisão',
        category: 'Terapia',
        icon: Stethoscope,
        whatIsIt: 'Módulo acadêmico e de governança clínica. Permite registrar discussões de casos clínicos complexos e supervisões entre terapeutas sêniores e juniores.',
        whenToUse: 'Durante reuniões de equipe ou discussões de caso clínico para registrar a supervisão técnica da evolução de um paciente.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['caso clínico', 'mentoria', 'sênior', 'governança']
    },
    {
        id: 'retencao',
        title: 'Retenção',
        category: 'Terapia',
        icon: Users,
        whatIsIt: 'Módulo estatístico que mede o tempo de permanência ativa de pacientes em tratamento antes de receber alta ou abandonar o processo.',
        whenToUse: 'Para analisar a eficiência dos tratamentos e identificar gargalos na permanência dos pacientes na clínica.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['permanência', 'lifespan', 'alta clínica', 'gráficos']
    },
    {
        id: 'risco-de-evasao',
        title: 'Risco de Evasão',
        category: 'Terapia',
        icon: ShieldAlert,
        whatIsIt: 'Algoritmo preditivo de BI que analisa padrões de comportamento (como faltas consecutivas, atraso de pagamentos ou desengajamento) e sinaliza pacientes que podem abandonar o tratamento.',
        whenToUse: 'Para agir de forma preventiva, entrando em contato com pacientes sinalizados em risco alto para reengajá-los antes da evasão física.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['inteligência artificial', 'prevenção', 'abandono', 'churn']
    },
    {
        id: 'aderencia',
        title: 'Aderência',
        category: 'Terapia',
        icon: Activity,
        whatIsIt: 'Módulo que mede a assiduidade e pontualidade do paciente nos atendimentos em relação ao plano terapêutico originalmente contratado.',
        whenToUse: 'Para avaliar se o paciente está seguindo corretamente a frequência terapêutica mínima recomendada para obter resultados de reabilitação.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['presença', 'assiduidade', 'sucesso do cliente']
    },
    {
        id: 'desfechos',
        title: 'Desfechos',
        category: 'Terapia',
        icon: Target,
        whatIsIt: 'Módulo que registra e metrifica o encerramento de ciclos terapêuticos, separando em altas clínicas, encaminhamentos ou interrupções voluntárias.',
        whenToUse: 'Ao dar alta para um paciente ou concluir um ciclo de reabilitação para gerar estatísticas de sucesso de tratamento na clínica.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['alta médica', 'sucesso', 'ciclo concluído']
    },
    {
        id: 'carga-de-trabalho',
        title: 'Carga de Trabalho',
        category: 'Terapia',
        icon: BarChart3,
        whatIsIt: 'Análise de capacidade operacional da equipe. Demonstra a taxa de ocupação de horários e salas de atendimento por profissional.',
        whenToUse: 'Para balancear a distribuição de pacientes e salas, evitando profissionais sobrecarregados e outros ociosos.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['capacidade', 'ociosidade', 'salas', 'escala']
    },
    {
        id: 'nps-satisfacao',
        title: 'NPS / Satisfação',
        category: 'Terapia',
        icon: HeartPulse,
        whatIsIt: 'Mapeamento de pesquisas de satisfação e qualidade enviadas via WhatsApp/E-mail após as sessões. Calcula o índice NPS da clínica de forma automatizada.',
        whenToUse: 'Para medir a qualidade do atendimento da recepção, dos terapeutas e do ambiente da clínica através do feedback direto de pacientes.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN'],
        tags: ['satisfação', 'pesquisa', 'feedback', 'net promoter score']
    },
    // Financeiro
    {
        id: 'lancamentos',
        title: 'Lançamentos',
        category: 'Financeiro',
        icon: DollarSign,
        whatIsIt: 'Fluxo de registro manual e categorizado de receitas (INCOME) e despesas (EXPENSE) operacionais do caixa da clínica.',
        whenToUse: 'Sempre que houver uma transação financeira direta na clínica (pagamento de fornecedor, aluguel, recebimento de Pix particular).',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['receitas', 'despesas', 'fluxo de caixa', 'plano de contas']
    },
    {
        id: 'pagamentos',
        title: 'Pagamentos',
        category: 'Financeiro',
        icon: CreditCard,
        whatIsIt: 'Conciliação e controle de cobranças de pacotes ou sessões enviadas online aos pacientes via Pix/Cartão integrado.',
        whenToUse: 'Para auditar faturas que foram enviadas por e-mail ou WhatsApp aos pacientes para ver se foram liquidadas.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['pix', 'cartão', 'faturas', 'gateway']
    },
    {
        id: 'fechamentos-de-caixa',
        title: 'Fechamentos de Caixa',
        category: 'Financeiro',
        icon: FileText,
        whatIsIt: 'Módulo de conciliação diária de caixa físico. Confirma se o dinheiro/cartões recebidos fisicamente na gaveta bate com o registrado.',
        whenToUse: 'Ao final de cada dia de expediente operacional pela recepção para travar e auditar o caixa diário da clínica.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['caixa diário', 'gaveta', 'conciliação', 'recepção']
    },
    {
        id: 'folha-de-repasse',
        title: 'Folha de Repasse',
        category: 'Financeiro',
        icon: Users,
        whatIsIt: 'Mecanismo de comissionamento automático de profissionais de saúde. Calcula o valor devido a cada profissional com base no contrato ativo (taxa fixa ou percentual da consulta).',
        whenToUse: 'No período de fechamento contábil mensal (ex: no dia de corte da clínica) para gerar a folha de pagamento de comissão da equipe.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['repasses', 'comissões', 'pagamentos médicos', 'terapeutas']
    },
    {
        id: 'dre-consolidada',
        title: 'DRE Consolidada',
        category: 'Financeiro',
        icon: TrendingUp,
        whatIsIt: 'Demonstração de Resultados do Exercício consolidada. Apresenta o resultado financeiro líquido real do período (Faturamento - Despesas - Repasses = Lucro/Prejuízo).',
        whenToUse: 'Ao fim do mês contábil para analisar o lucro real e a margem de rentabilidade da clínica de forma macro.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['lucro', 'dre', 'contabilidade', 'bi']
    },
    {
        id: 'analise-de-ltv',
        title: 'Análise de LTV',
        category: 'Financeiro',
        icon: Target,
        whatIsIt: 'Lifetime Value. Painel analítico que calcula o valor monetário total histórico gerado por um único paciente ao longo do tempo ativo na clínica.',
        whenToUse: 'Para avaliar o retorno financeiro por paciente e orientar estratégias comerciais de investimento em captação.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN'],
        tags: ['ltv', 'paciente valioso', 'retorno de investimento', 'cac']
    },
    {
        id: 'tiss-guias-e-lotes',
        title: 'Faturamento TISS',
        category: 'Financeiro',
        icon: Receipt,
        whatIsIt: 'Sistema industrial de faturamento no padrão obrigatório TISS (ANS 3.05.00) para convênios. Cria guias SP/SADT, organiza em lotes XML, realiza validações contra regras da ANS e exporta arquivos de envio.',
        whenToUse: 'Sempre ao fechar o lote de guias clínicas para enviar para faturamento e pagamento das operadoras de saúde credenciadas.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN'],
        tags: ['tiss', 'ans', 'guias', 'lotes xml', 'planos de saúde']
    },
    {
        id: 'meu-financeiro',
        title: 'Meu Financeiro',
        category: 'Financeiro',
        icon: Wallet,
        whatIsIt: 'Portal financeiro exclusivo para médicos e terapeutas parceiros. Mostra o painel pessoal de recebimentos devidos, histórico de repasses anteriores e a produção mensal própria.',
        whenToUse: 'Para o profissional de saúde auditar e conferir suas sessões faturadas e as comissões a receber de forma independente.',
        minPlan: 'Avançado',
        roles: ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
        tags: ['minha comissão', 'repassado', 'painel do médico']
    },
    {
        id: 'convenios',
        title: 'Convênios',
        category: 'Financeiro',
        icon: Shield,
        whatIsIt: 'Módulo de cadastro das operadoras de saúde parceiras e as tabelas contratuais de valores repassados para cada tipo de procedimento clínico.',
        whenToUse: 'Ao credenciar um novo plano de saúde na clínica ou redefinir a tabela de repasse de um convênio existente.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['planos de saúde', 'credenciados', 'procedimentos', 'tabela de preços']
    },
    // Comunicação
    {
        id: 'chat-interno',
        title: 'Chat Interno',
        category: 'Comunicação',
        icon: MessagesSquare,
        whatIsIt: 'Comunicador corporativo integrado à clínica, com canais específicos para conversas internas entre a equipe, canais com suporte da plataforma e impersonation log.',
        whenToUse: 'Para comunicação instantânea e segura entre recepção e profissionais de saúde sem necessidade de ferramentas pessoais externas.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
        tags: ['comunicação', 'equipe', 'chat interno', 'seguro']
    },
    {
        id: 'whatsapp',
        title: 'WhatsApp',
        category: 'Comunicação',
        icon: MessageCircle,
        whatIsIt: 'Módulo de conexão e parametrização do canal oficial de WhatsApp da clínica via Baileys API. Permite emitir QR Code de conexão e monitorar o status do canal.',
        whenToUse: 'Para ativar ou reautenticar o WhatsApp da clínica responsável por disparar lembretes automáticos e receber confirmações.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
        tags: ['qr code', 'baileys', 'lembrete automático', 'confirmação']
    },
    {
        id: 'fluxomed-crm',
        title: 'FluxoMed (CRM)',
        category: 'Comunicação',
        icon: Megaphone,
        whatIsIt: 'Pipeline e funil de marketing e captação de clientes. Permite gerenciar automações de e-mail e mensageria para nutrir leads e engajar pacientes inativos.',
        whenToUse: 'Para criar automações de boas-vindas a novos pacientes ou disparar campanhas direcionadas para pacientes antigos.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['marketing', 'crm', 'leads', 'captação', 'funil']
    },
    // Gestão
    {
        id: 'estoque',
        title: 'Estoque',
        category: 'Gestão',
        icon: Package,
        whatIsIt: 'Gerenciamento FEFO (First-Expired, First-Out) de produtos e insumos médicos de estoque da clínica, registrando lotes, datas de vencimento e movimentações de entrada/saída.',
        whenToUse: 'Ao receber novos materiais médicos para cadastrar datas de validade ou ao consumir materiais clínicos durante o atendimento do paciente.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['fefo', 'insumos', 'validade', 'materiais', 'produtos']
    },
    {
        id: 'relatorios',
        title: 'Relatórios',
        category: 'Gestão',
        icon: BarChart3,
        whatIsIt: 'Motor de geração de relatórios consolidados em Excel ou PDF. Reúne filtros avançados para exportar dados operacionais, de faturamento, clínicos ou demográficos.',
        whenToUse: 'Para auditar dados no fim do mês contábil ou gerar listagens físicas para reuniões de sócios da clínica.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['pdf', 'excel', 'exportação', 'auditoria']
    },
    {
        id: 'importacao',
        title: 'Importação',
        category: 'Gestão',
        icon: Settings,
        whatIsIt: 'Assistente automatizado de migração de sistemas legados. Permite importar planilhas de pacientes, profissionais ou agendas em massa via Excel/CSV com logs de erro de mapeamento.',
        whenToUse: 'Durante a implantação inicial da clínica na plataforma para migrar dados históricos de forma rápida.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['csv', 'excel', 'migração', 'importação em lote']
    },
    {
        id: 'automacao',
        title: 'Automação',
        category: 'Gestão',
        icon: Bot,
        whatIsIt: 'Módulo de configuração de triggers (gatilhos) e regras operacionais automatizadas (ex: ao faltar 3 vezes seguidas, notificar recepção).',
        whenToUse: 'Para otimizar processos repetitivos da clínica, programando regras inteligentes de pós-consulta, reengajamento ou alertas.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['gatilhos', 'workflow', 'inteligência', 'robô']
    },
    {
        id: 'auditoria',
        title: 'Auditoria',
        category: 'Gestão',
        icon: Shield,
        whatIsIt: 'Trilha de auditoria (Audit Log) inviolável de conformidade de segurança exigida por regulações de saúde. Registra quem acessou, modificou, baixou prontuários ou excluiu transações.',
        whenToUse: 'Para investigar divergências ou auditar alterações sensíveis em prontuários ou financeiros.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['trilha', 'segurança', 'audit log', 'conformidade', 'lgpd']
    },
    // Configurações
    {
        id: 'minha-clinica',
        title: 'Minha Clínica',
        category: 'Configurações',
        icon: Settings,
        whatIsIt: 'Painel com dados institucionais da clínica: razão social, CNPJ, logotipos coloridos/brancos, endereço e detalhes de contato.',
        whenToUse: 'Ao configurar o sistema ou atualizar dados jurídicos da clínica.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['cnpj', 'logo', 'endereço', 'dados fiscais']
    },
    {
        id: 'pagina-publica',
        title: 'Página Pública',
        category: 'Configurações',
        icon: Globe,
        whatIsIt: 'Gerenciador da página de agendamento online público. Permite definir cores, banners e configurar quais especialidades e terapeutas ficarão disponíveis para agendamento direto por pacientes.',
        whenToUse: 'Para ativar o agendamento online pelo site próprio da clínica ou link de redes sociais, gerando novas consultas de forma automatizada.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['site próprio', 'agendamento online', 'publicidade', 'marketing']
    },
    {
        id: 'usuarios',
        title: 'Usuários',
        category: 'Configurações',
        icon: Users,
        whatIsIt: 'Controle de acesso granular baseado em papéis (RBAC). Permite criar contas de recepção, médicos, terapeutas e configurar permissões customizadas para coordenadores técnicos.',
        whenToUse: 'Sempre que contratar um novo funcionário ou alterar o nível de acesso e permissão de alguém da equipe.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['permissões', 'rbac', 'adicionar usuário', 'segurança']
    },
]

// Helper function to normalize titles for anchors (matches sidebars)
function getHelpAnchor(title: string) {
    return title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-z0-9]+/g, '-') // substitui caracteres nao alfa por hifen
        .replace(/(^-|-$)+/g, '') // limpa hifens no inicio/fim
}

export default function HelpPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos')

    const categories = ['Todos', 'Principal', 'Agendamento', 'Equipe', 'Prontuário', 'Terapia', 'Financeiro', 'Comunicação', 'Gestão', 'Configurações']

    const filteredItems = helpItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.whatIsIt.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.whenToUse.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory

        return matchesSearch && matchesCategory
    })

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8 animate-fadeIn">
            {/* Header com botão de voltar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                        <HelpCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Guia de Ajuda Integrado</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Aprenda tudo sobre as funcionalidades e módulos reais do CliniGo. Para que serve e quando usar.
                        </p>
                    </div>
                </div>
                <Link href="/dashboard">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-600 active:bg-slate-100">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao Painel
                    </button>
                </Link>
            </div>

            {/* Barra de Pesquisa e Filtros */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="O que você está procurando? (Ex: DRE, soap, overbooking, fila de espera...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 placeholder-slate-400 outline-none focus:border-emerald-300 focus:bg-white transition shadow-inner"
                    />
                </div>

                {/* Categorias (Scrollable horizontal em Mobile) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition",
                                selectedCategory === cat
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de Cards de Ajuda */}
            {filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredItems.map(item => {
                        const Icon = item.icon
                        const anchorId = getHelpAnchor(item.title)
                        return (
                            <div
                                key={item.id}
                                id={anchorId}
                                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all flex flex-col justify-between scroll-mt-24 group relative"
                            >
                                {/* Categoria e Plano Tag */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] uppercase font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                        {item.category}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                            "text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border",
                                            item.minPlan === 'Básico' ? "bg-slate-50 text-slate-600 border-slate-100" :
                                            item.minPlan === 'Avançado' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                            "bg-indigo-50 text-indigo-700 border-indigo-100"
                                        )}>
                                            <Crown className="w-3 h-3" />
                                            {item.minPlan}
                                        </span>
                                    </div>
                                </div>

                                {/* Titulo e Icone */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-emerald-50 group-hover:text-emerald-600 transition">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                                    </div>

                                    {/* Perguntas & Respostas */}
                                    <div className="space-y-3 pt-2">
                                        <div className="space-y-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                Para que serve?
                                            </h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">{item.whatIsIt}</p>
                                        </div>

                                        <div className="space-y-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                Quando usar?
                                            </h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">{item.whenToUse}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Detalhes Adicionais (Acesso) */}
                                <div className="border-t border-slate-100 mt-6 pt-4 flex flex-wrap gap-2 items-center justify-between">
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.roles.map(role => (
                                            <span key={role} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                {role.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">#{anchorId}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm space-y-4">
                    <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-700">Nenhum recurso encontrado</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            Tente pesquisar por outros termos como "agenda", "dre", "soap" ou mude a categoria de filtro.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
