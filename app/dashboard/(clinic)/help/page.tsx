'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
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
    Cake,
    Repeat,
    Camera,
    ShieldCheck,
    CheckCircle2,
    Lock,
    Upload,
    FileArchive,
    ClipboardList,
    UserX,
    Layers,
    ExternalLink,
    Hash,
    SlidersHorizontal,
    Share2,
    Info,
    LayoutDashboard,
    Clipboard,
    Users2,
    UserPlus,
    X,
    Copy,
    Check,
    ArrowRight,
    Tablet,
    Sparkles as _ForbiddenSparkles, // Not used in UI
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HelpItem {
    id: string
    title: string
    category: 'Principal' | 'Agendamento' | 'Equipe' | 'Prontuário' | 'Terapia' | 'Financeiro' | 'Comunicação' | 'Gestão' | 'Configurações' | 'Administração'
    icon: React.ComponentType<{ className?: string }>
    href: string
    whatIsIt: string
    whenToUse: string
    howToUse: string
    minPlan: 'Básico' | 'Avançado' | 'Professional' | 'Enterprise'
    roles: string[]
    tags: string[]
    aliases?: string[]
}

export function getHelpAnchor(title: string): string {
    return title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
}

export const helpItems: HelpItem[] = [
    // ==========================================
    // 1. PRINCIPAL
    // ==========================================
    {
        id: 'dashboard',
        title: 'Dashboard',
        category: 'Principal',
        icon: LayoutDashboard,
        href: '/dashboard',
        whatIsIt: 'Centro de comando consolidado da clínica. Exibe métricas operacionais instantâneas: volume de atendimentos agendados para o dia, taxas de presença e faltas, aniversariantes recentes, lembretes urgentes e indicadores financeiros básicos.',
        whenToUse: 'No início do expediente para obter um panorama completo da rotina da clínica e monitorar a operação em tempo real.',
        howToUse: 'Consulte os cartões superiores para ver os totais do dia, visualize a lista de atendimentos programados e clique diretamente nos cartões de ação rápida para navegar aos módulos operacionais.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'FINANCIAL'],
        tags: ['painel', 'resumo', 'indicadores', 'kpis', 'visão geral', 'início']
    },
    {
        id: 'checklist-inicial-onboarding',
        title: 'Checklist Inicial',
        category: 'Principal',
        icon: CheckCircle2,
        href: '/dashboard/onboarding',
        whatIsIt: 'Guia assistido de implantação rápida. Estrutura as etapas obrigatórias de configuração para colocar a clínica em operação: cadastro de profissionais, horários de trabalho, primeiro paciente e emissão do primeiro agendamento.',
        whenToUse: 'Durante os primeiros 30 dias de uso da plataforma ou sempre que a administração desejar auditar se todas as etapas recomendadas de configuração foram concluídas.',
        howToUse: 'Acesse o checklist, siga os passos numerados em sequência e clique em cada item para ser direcionado diretamente à tela de configuração correspondente.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['onboarding', 'passo a passo', 'primeiros passos', 'configuração inicial'],
        aliases: ['checklist-inicial', 'onboarding']
    },

    // ==========================================
    // 2. AGENDAMENTO
    // ==========================================
    {
        id: 'agenda',
        title: 'Agenda',
        category: 'Agendamento',
        icon: Calendar,
        href: '/dashboard/agenda',
        whatIsIt: 'Calendário interativo central com visualização por dia, semana e mês. Suporta múltiplos profissionais lado a lado, arrastar-e-soltar (drag-and-drop) para reagendamentos, filtros por status (Confirmados, Pendentes, Cancelados), bloqueios de horário e abertura de prontuário com 1 clique.',
        whenToUse: 'Para agendar consultas, encaixar horários, reagendar pacientes, confirmar comparecimentos e auditar a grade diária.',
        howToUse: 'Selecione a data e o profissional no topo. Clique em um horário livre para abrir o formulário de novo agendamento. Para reagendar, arraste o bloco para um novo horário ou clique no card para ver detalhes completos.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
        tags: ['agenda geral', 'calendário', 'marcação', 'grade', 'reagendar', 'horários', 'consultas']
    },
    {
        id: 'minha-agenda',
        title: 'Minha Agenda',
        category: 'Agendamento',
        icon: Clock,
        href: '/dashboard/minha-agenda',
        whatIsIt: 'Visão individual e restrita da agenda, desenhada especificamente para médicos e terapeutas. Exibe com exclusividade as sessões do próprio profissional conectado, garantindo sigilo entre profissionais da mesma clínica.',
        whenToUse: 'Uso diário pelos profissionais de saúde para acompanhar seus atendimentos do dia, verificar status de chegada na recepção e abrir prontuários rapidamente.',
        howToUse: 'O profissional faz login com seu e-mail próprio e acessa Minha Agenda para visualizar sua sequência de atendimentos, identificar se o paciente já está aguardando e iniciar o atendimento com biometria ou prontuário.',
        minPlan: 'Básico',
        roles: ['DOCTOR'],
        tags: ['agenda pessoal', 'privacidade', 'médico', 'terapeuta', 'meus pacientes']
    },
    {
        id: 'agendamento-recorrente',
        title: 'Central de Agendamentos Recorrentes',
        category: 'Agendamento',
        icon: Repeat,
        href: '/dashboard/agenda',
        whatIsIt: 'Módulo de criação e governança de horários fixos semanais contínuos. Ideal para tratamentos multidisciplinares (ex: Fonoaudiologia, Terapia Ocupacional, Psicologia, Fisioterapia e ABA). Permite definir datas de vigência, pausar séries temporariamente, reativar ou cancelar séries futuras sem afetar atendimentos passados.',
        whenToUse: 'Sempre que um paciente iniciar um tratamento de longo prazo com horários reservados semanais fixos.',
        howToUse: 'No formulário de agendamento, marque a opção "Repetir semanalmente", selecione o número de semanas ou período de vigência e confirme. Na grade da agenda, gerencie a série inteira clicando no botão "Editar Série Recorrente".',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF', 'DOCTOR'],
        tags: ['recorrência', 'horário fixo', 'série semanal', 'terapias continuas', 'aba'],
        aliases: ['agendamentos-recorrentes', 'series-recorrentes']
    },
    {
        id: 'consultas',
        title: 'Consultas',
        category: 'Agendamento',
        icon: Video,
        href: '/dashboard/consultas',
        whatIsIt: 'Painel focado no fluxo de teleatendimento e consultas ativas do dia. Integra ferramentas para iniciar chamadas de vídeo criptografadas pelo navegador, verificar links de acesso do paciente e consultar a sala virtual.',
        whenToUse: 'Para realizar teleconsultas online e monitorar consultas digitais em andamento.',
        howToUse: 'Acesse o painel de Consultas, localize a consulta com tag Telemedicina e clique em "Entrar na Sala". O link da teleconsulta pode ser compartilhado diretamente via WhatsApp para o paciente acessar sem precisar instalar aplicativos.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['teleconsulta', 'vídeo', 'telemedicina', 'sala virtual', 'atendimento remoto']
    },
    {
        id: 'recepcao',
        title: 'Recepção',
        category: 'Agendamento',
        icon: Clipboard,
        href: '/dashboard/recepcao',
        whatIsIt: 'Painel operacional de acolhimento e fila presencial da clínica. Permite registrar a chegada física do paciente (Check-in), validar biometria facial, visualizar tempo de espera na sala, chamar paciente no Painel de TV e direcionar à sala do terapeuta.',
        whenToUse: 'Pela equipe de recepção durante todo o expediente, a cada paciente que se apresenta na clínica.',
        howToUse: 'Ao chegar o paciente, clique em "Check-in" ou use a câmera do tablet/totem com reconhecimento facial. O sistema atualiza o status para "Na Recepção" e notifica imediatamente o profissional de saúde.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
        tags: ['recepção', 'check-in', 'fila presencial', 'totem', 'painel tv', 'sala de espera']
    },
    {
        id: 'horarios',
        title: 'Horários e Turnos Flexíveis',
        category: 'Agendamento',
        icon: Clock,
        href: '/dashboard/horarios',
        whatIsIt: 'Parametrização avançada de disponibilidade e escalas de trabalho dos profissionais. Permite configurar até 10 turnos por dia, com durações flexíveis (15m a 240m para terapias breves, sessões de 50m, 90m ou turnos intensivos ABA de 2h a 4h), com botão "Copiar Dia" para replicar escalas rapidamente.',
        whenToUse: 'Ao cadastrar um novo profissional, alterar dias de trabalho ou redefinir a grade de turnos e durações de consultas.',
        howToUse: 'Selecione o profissional, escolha o dia da semana, defina os horários de início e término de cada turno, configure o tempo padrão de cada sessão e clique em Salvar.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['turnos', 'escalas', 'disponibilidade', 'duração', 'slots', 'copiar dia', 'grade flexivel']
    },
    {
        id: 'co-terapeuta',
        title: 'Co-Terapeuta e Atendimento Duplo',
        category: 'Agendamento',
        icon: Users,
        href: '/dashboard/agenda',
        whatIsIt: 'Recurso para atendimentos multidisciplinares conjuntos (ex: Fonoaudiologia + Terapia Ocupacional, ou Supervisor ABA + Terapeuta Aplicador). Permite vincular um segundo profissional titular a uma sessão ou série recorrente sem gerar falso conflito na agenda. O atendimento surge na grade de ambos e permite emissão individual de evolução de prontuário.',
        whenToUse: 'Sempre que dois profissionais atenderem o mesmo paciente no mesmo horário na sala de terapia.',
        howToUse: 'No formulário de agendamento, selecione o profissional principal e no campo "Co-Terapeuta" selecione o segundo profissional. Na grade, o agendamento exibirá uma etiqueta indicando co-atendimento.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
        tags: ['co-atendimento', 'dupla', 'multidisciplinar', 'co-terapeuta', 'supervisão compartilhada']
    },

    // ==========================================
    // 3. EQUIPE
    // ==========================================
    {
        id: 'medicos',
        title: 'Terapeutas / Médicos',
        category: 'Equipe',
        icon: Stethoscope,
        href: '/dashboard/medicos',
        whatIsIt: 'Gestão completa do corpo clínico da clínica (com rótulo adaptativo conforme a configuração da clínica: "Terapeutas" ou "Médicos"). Gerencia conselhos profissionais (CRM, CREFITO, CRP, CRFa, etc.), especialidades, dados cadastrais, contratos de trabalho, taxas de repasse financeiro e documentos.',
        whenToUse: 'Para cadastrar novos profissionais, atualizar registros profissionais, definir taxas contratuais de comissão e gerenciar permissões de prontuário.',
        howToUse: 'Acesse o menu Terapeutas/Médicos, clique em "Novo Profissional", preencha nome, conselho com UF, especialidade, e-mail de acesso e parâmetros de remuneração. Salve para liberar o acesso ao sistema.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['médicos', 'terapeutas', 'equipe', 'cadastro profissional', 'crefito', 'crm', 'crp', 'repasse'],
        aliases: ['terapeutas', 'profissionais', 'terapeutas-medicos']
    },
    {
        id: 'pacientes',
        title: 'Pacientes',
        category: 'Equipe',
        icon: UserPlus,
        href: '/dashboard/pacientes',
        whatIsIt: 'Cadastro geral e prontuário administrativo de pacientes. Inclui diretório alfabético A-Z instantâneo, alternância entre visualização em Tabela e Cards interativos, foto de perfil, dados dos pais/responsáveis legais, classificação Particular vs Convênio, trilha LGPD e histórico de assinaturas digitais.',
        whenToUse: 'Ao acolher um novo paciente na clínica, atualizar dados de contato, cadastrar convênios ou acessar o prontuário clínico histórico.',
        howToUse: 'Clique em "Novo Paciente" para registrar os dados demográficos, endereço e responsáveis. Na lista, use a barra de busca ou filtre pelas letras A-Z para localizar qualquer prontuário imediatamente.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'STAFF'],
        tags: ['pacientes', 'cadastro', 'diretório a-z', 'responsáveis', 'contato', 'prontuário'],
        aliases: ['pacientes-diretorio-a-z']
    },
    {
        id: 'aniversariantes',
        title: 'Aniversariantes de Pacientes',
        category: 'Equipe',
        icon: Cake,
        href: '/dashboard/pacientes',
        whatIsIt: 'Painel inteligente de relacionamento que monitora as datas de nascimento dos pacientes cadastrados. Identifica aniversariantes do dia e dos próximos 30 dias, disponibilizando botão com 1 clique para enviar mensagem personalizada de parabéns via WhatsApp.',
        whenToUse: 'Diariamente pela recepção ou gestão para estreitar o relacionamento, humanizar o atendimento e fidelizar as famílias.',
        howToUse: 'Abra a aba Aniversariantes no menu de Pacientes ou no Dashboard. Clique no botão de WhatsApp ao lado do nome do aniversariante para abrir a mensagem preformatada.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
        tags: ['aniversário', 'parabéns', 'whatsapp', 'fidelização', 'relacionamento']
    },

    // ==========================================
    // 4. PRONTUÁRIO
    // ==========================================
    {
        id: 'prontuarios',
        title: 'Prontuários',
        category: 'Prontuário',
        icon: FileText,
        href: '/dashboard/prontuarios',
        whatIsIt: 'Prontuário Eletrônico do Paciente (PEP). Centraliza todo o histórico de sessões, laudos, evoluções diárias, atestados, hipóteses diagnósticas (CID-10 / CID-11) e termos assinados, com armazenamento seguro, criptografado e em conformidade estrita com CFM, COFFITO, CFP e LGPD.',
        whenToUse: 'Em todo e qualquer atendimento clínico, antes e durante a sessão para consulta histórica e após a sessão para registro formal.',
        howToUse: 'Abra o agendamento do paciente e clique em "Abrir Prontuário". O prontuário carrega automaticamente os templates da especialidade do profissional (ex: Ficha World Sensory de 7 seções para Terapia Ocupacional). Preencha e clique em Salvar ou Assinar Digitalmente.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['prontuário', 'pep', 'histórico clínico', 'evoluções', 'laudos', 'anamnese']
    },
    {
        id: 'prescricoes',
        title: 'Prescrições',
        category: 'Prontuário',
        icon: Clipboard,
        href: '/dashboard/prescricoes',
        whatIsIt: 'Emissor digital de receitas médicas e prescrições terapêuticas. Integra banco de medicamentos, posologias, orientações de uso e exportação em PDF timbrado oficial da clínica.',
        whenToUse: 'Durante consultas médicas para emissão de medicamentos controlados ou receitas simples.',
        howToUse: 'Acesse Prescrições, selecione o paciente, pesquise os medicamentos, ajuste a posologia e emita o PDF para impressão ou envio digital ao paciente.',
        minPlan: 'Professional',
        roles: ['DOCTOR'],
        tags: ['prescrições', 'receitas', 'medicamentos', 'remédios', 'posologia']
    },
    {
        id: 'documentos',
        title: 'Documentos',
        category: 'Prontuário',
        icon: FileArchive,
        href: '/dashboard/documentos',
        whatIsIt: 'Repositório de arquivos externos e anexos clínicos dos pacientes. Armazena exames laboratoriais, relatórios escolares, relatórios de outros especialistas, laudos neurológicos e imagens em PDF ou JPG.',
        whenToUse: 'Sempre que a família apresentar relatórios externos que precisem ficar vinculados permanentemente ao histórico do paciente.',
        howToUse: 'Acesse Documentos ou a aba Documentos na ficha do paciente, clique em "Anexar Arquivo", escolha o tipo de documento e faça o upload seguro.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['anexos', 'exames', 'arquivos', 'laudos externos', 'pdf']
    },
    {
        id: 'modelos-de-termos-contratos',
        title: 'Modelos de Termos & Contratos',
        category: 'Prontuário',
        icon: ShieldCheck,
        href: '/dashboard/configuracoes/modelos-documentos',
        whatIsIt: 'Central de governança jurídica institucional. Permite redigir e manter minutas de Contratos de Prestação de Serviços Terapêuticos, Termos de Consentimento LGPD, Autorizações de Uso de Imagem e Regimento Interno com variáveis dinâmicas (ex: {{nome_paciente}}, {{cpf_responsavel}}).',
        whenToUse: 'Ao definir ou atualizar as minutas contratuais da clínica que serão assinadas pelos pais e responsáveis.',
        howToUse: 'Crie um novo modelo, escreva o texto padrão e insira as variáveis inteligentes entre chaves. O sistema preenche automaticamente os dados ao emitir o termo para o paciente.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['contratos', 'termos', 'modelos', 'jurídico', 'lgpd', 'variáveis'],
        aliases: ['termos-e-contratos', 'modelos-documentos']
    },
    {
        id: 'assinatura-digital-pais',
        title: 'Assinatura Digital dos Pais',
        category: 'Prontuário',
        icon: Scale,
        href: '/dashboard/pacientes',
        whatIsIt: 'Tecnologia de coleta de assinatura digital na tela do celular para os responsáveis. Possui validade jurídica integral no Brasil (Lei nº 14.063/2020 e MP 2.200-2/2001), registrando IP, data/hora, geolocalização e hash criptográfico SHA-256.',
        whenToUse: 'Na matrícula do paciente ou na renovação anual de contratos de atendimento.',
        howToUse: 'Na ficha do paciente, aba Termos, clique em "Emitir Termo" e selecione "Enviar Link para Assinatura". O responsável abre o link no celular, desenha a rubrica na tela e o documento é arquivado com carimbo de autenticidade.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
        tags: ['assinatura digital', 'rubrica', 'validade jurídica', 'sha256', 'link celular']
    },
    {
        id: 'biometria-consultorio',
        title: 'Validação Biométrica Facial',
        category: 'Prontuário',
        icon: Camera,
        href: '/dashboard/recepcao',
        whatIsIt: 'Sistema de reconhecimento facial com inteligência artificial para comprovação de presença física do paciente ou responsável legal. Funciona tanto na recepção quanto no consultório do terapeuta, eliminando fraudes e garantindo conformidade para repasses e convênios.',
        whenToUse: 'No momento em que o paciente chega à recepção ou quando o terapeuta clica em "Paciente Compareceu" dentro do consultório para iniciar a sessão.',
        howToUse: 'Cadastre a face do paciente ou responsável legal na aba Biometria. No início da sessão, o sistema captura a face via webcam e valida a presença instantaneamente.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
        tags: ['biometria', 'facial', 'reconhecimento facial', 'comprovação de presença', 'tiss', 'lgpd']
    },
    {
        id: 'templates-prontuario',
        title: 'Templates Prontuário',
        category: 'Prontuário',
        icon: FileText,
        href: '/dashboard/configuracoes/templates-prontuario',
        whatIsIt: 'Construtor de modelos estruturados de evolução de sessão clínica. Suporta formatos reconhecidos mundialmente como SOAP (Subjetivo, Objetivo, Avaliação, Plano), CIF (Classificação Internacional de Funcionalidade), DAP e o modelo institucional de 7 seções da World Sensory.',
        whenToUse: 'Para padronizar os formulários de evolução de cada especialidade terapêutica e médica da clínica.',
        howToUse: 'Acesse Templates Prontuário, crie novos campos estruturados ou selecione um modelo predefinido como padrão para a sua clínica ou especialidade.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['templates', 'modelos de evolução', 'soap', 'cif', 'world sensory', 'prontuário']
    },
    {
        id: 'planos-terapeuticos',
        title: 'Planos Terapêuticos',
        category: 'Prontuário',
        icon: ClipboardList,
        href: '/dashboard/planos-terapeuticos',
        whatIsIt: 'Módulo de planejamento terapêutico de médio e longo prazo. Permite registrar metas clínicas quantificáveis, áreas de intervenção prioritárias, frequência semanal indicada e critérios de avaliação de progresso.',
        whenToUse: 'Após a avaliação inicial do paciente e nas revisões semestrais de metas com a família.',
        howToUse: 'Abra Planos Terapêuticos, selecione o paciente, defina as metas por domínio funcional e acompanhe a evolução de cada objetivo a cada ciclo de atendimento.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['plano terapêutico', 'metas', 'objetivos', 'reabilitação', 'evolução clínica']
    },
    {
        id: 'evolucoes',
        title: 'Evoluções',
        category: 'Prontuário',
        icon: TrendingUp,
        href: '/dashboard/evolucoes',
        whatIsIt: 'Painel geral de auditoria e busca de evoluções clínicas diárias. Permite filtrar evoluções por data, paciente, terapeuta responsável e verificar pendências de preenchimento ou assinatura digital.',
        whenToUse: 'Pela coordenação técnica para auditar se todas as sessões realizadas no dia tiveram suas respectivas evoluções digitadas e assinadas pelos profissionais.',
        howToUse: 'Aplique filtros de período ou profissional para listar as evoluções salvas. Identifique atendimentos sem evolução e emita relatórios de conformidade.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['evoluções', 'notas diárias', 'auditoria clínica', 'sessões', 'assinatura']
    },
    {
        id: 'controle-de-faltas',
        title: 'Controle de Faltas',
        category: 'Prontuário',
        icon: UserX,
        href: '/dashboard/controle-faltas',
        whatIsIt: 'Painel analítico de gestão de faltas e absenteísmo. Monitora pacientes com faltas consecutivas, classifica faltas justificadas versus injustificadas e automatiza disparos de reposição rápida para preencher lacunas de agenda.',
        whenToUse: 'Semanalmente para combater a ociosidade da clínica e reengajar famílias com padrão frequente de falta.',
        howToUse: 'Acesse Controle de Faltas para visualizar a taxa global de no-show da clínica, identificar os pacientes mais faltosos e clicar em "Repor Horário" para oferecer o slot a pacientes da fila de espera.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['faltas', 'absenteísmo', 'no-show', 'reposição de horários', 'engajamento'],
        aliases: ['controle-faltas']
    },

    // ==========================================
    // 5. TERAPIA
    // ==========================================
    {
        id: 'fila-de-espera',
        title: 'Fila de Espera',
        category: 'Terapia',
        icon: Clock,
        href: '/dashboard/terapia/fila-espera',
        whatIsIt: 'Central de demanda reprimida e lista de espera inteligente. Registra novos interessados por especialidade, turno de preferência, urgência clínica e dias possíveis.',
        whenToUse: 'Quando uma família busca atendimento em especialidade com agenda lotada ou quando surge uma desistência na grade.',
        howToUse: 'Cadastre o paciente na Fila de Espera com suas preferências de horário. Quando um horário for liberado, o sistema cruza as disponibilidades e sugere o candidato ideal para encaixe.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
        tags: ['fila de espera', 'vagas', 'demanda', 'encaixe', 'leads clínicos'],
        aliases: ['fila-espera', 'fluxo-e-clinico']
    },
    {
        id: 'encaminhamentos',
        title: 'Encaminhamentos',
        category: 'Terapia',
        icon: Send,
        href: '/dashboard/terapia/encaminhamentos',
        whatIsIt: 'Módulo de comunicação interdisciplinar interna. Permite que um terapeuta encaminhe formalmente o paciente para avaliação em outra área (ex: Terapia Ocupacional encaminha para Psicologia ou Fonoaudiologia).',
        whenToUse: 'Sempre que a equipe clínica detectar a necessidade de investigação em áreas complementares da saúde.',
        howToUse: 'No prontuário ou no painel de encaminhamentos, selecione o paciente, a especialidade desejada, descreva a justificativa clínica e envie. O encaminhamento aparece na lista da equipe de recepção e triagem.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['encaminhamento', 'interdisciplinar', 'interconsulta', 'triagem interna']
    },
    {
        id: 'supervisao',
        title: 'Supervisão',
        category: 'Terapia',
        icon: Stethoscope,
        href: '/dashboard/terapia/supervisao',
        whatIsIt: 'Módulo de governança técnica e formação contínua. Registra discussões clínicas, orientações técnicas de supervisores sêniores para aplicadores/estagiários e alinhamentos de conduta terapêutica.',
        whenToUse: 'Durante sessões de supervisão individual ou de equipe para documentar formalmente as diretrizes traçadas para o caso.',
        howToUse: 'Crie um registro de supervisão indicando o supervisor responsável, o terapeuta supervisionado, o paciente e os apontamentos de manejo clínico.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['supervisão', 'mentoria', 'discussão de caso', 'governança clínica']
    },
    {
        id: 'retencao',
        title: 'Retenção',
        category: 'Terapia',
        icon: Users,
        href: '/dashboard/terapia/retencao',
        whatIsIt: 'Indicador analítico de tempo médio de permanência dos pacientes em tratamento ativo antes de receberem alta médica ou encerrarem o vínculo.',
        whenToUse: 'Para auditar a eficiência dos tratamentos e planejar a sustentabilidade da clínica a médio e longo prazo.',
        howToUse: 'Visualize o gráfico de retenção por coorte e especialidade para entender após quantos meses de tratamento ocorre maior concentração de altas ou desligamentos.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['retenção', 'permanência', 'ciclo de vida', 'alta clínica', 'bi terapia']
    },
    {
        id: 'risco-de-evasao',
        title: 'Risco de Evasão',
        category: 'Terapia',
        icon: ShieldAlert,
        href: '/dashboard/terapia/risco-evasao',
        whatIsIt: 'Algoritmo preditivo de Business Intelligence que cruza frequência, faltas consecutivas, desengajamento e atrasos financeiros para pontuar pacientes com probabilidade alta de abandono.',
        whenToUse: 'Semanalmente para identificar precocemente famílias insatisfeitas ou em dificuldades antes que o desligamento ocorra de fato.',
        howToUse: 'Abra a lista ordenada por nível de risco (Alto, Médio, Baixo) e acione a equipe de acolhimento para contato preventivo.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['evasão', 'churn', 'predição', 'inteligência clínica', 'prevenção']
    },
    {
        id: 'aderencia',
        title: 'Aderência',
        category: 'Terapia',
        icon: Activity,
        href: '/dashboard/terapia/aderencia',
        whatIsIt: 'Métricas de assiduidade e cumprimento da frequência prescrita no Plano Terapêutico Singular.',
        whenToUse: 'Para justificar relatórios de evolução e demonstrar à família se as metas não foram atingidas por baixa frequência do paciente.',
        howToUse: 'Consulte o percentual de adesão por paciente e anexe o relatório em reuniões de alinhamento com pais ou operadoras de saúde.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['aderência', 'assiduidade', 'frequência', 'cumprimento de plano']
    },
    {
        id: 'conformidade-evolucoes',
        title: 'Conformidade Evoluções',
        category: 'Terapia',
        icon: FileText,
        href: '/dashboard/terapia/conformidade-evolucao',
        whatIsIt: 'Painel de conformidade regulatória que compara o total de atendimentos realizados com as evoluções digitadas e assinadas digitalmente.',
        whenToUse: 'Antes do fechamento da folha de repasse para garantir que nenhum atendimento sem prontuário preenchido seja pago.',
        howToUse: 'Filtre pelo mês e verifique a taxa percentual de conformidade de cada terapeuta. Notifique os profissionais com pendências.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['conformidade', 'prontuário em dia', 'auditoria de evolução', 'conselho de classe']
    },
    {
        id: 'desfechos',
        title: 'Desfechos',
        category: 'Terapia',
        icon: Target,
        href: '/dashboard/terapia/desfechos',
        whatIsIt: 'Registro quantificado e qualitativo do encerramento de ciclos clínicos: Altas por Objetivos Atingidos, Encaminhamentos Externos ou Evasões.',
        whenToUse: 'Ao conceder alta formal a um paciente ou registrar o término do ciclo terapêutico.',
        howToUse: 'Registre o motivo de encerramento, anexe o relatório de alta e consulte a taxa institucional de sucesso terapêutico.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['alta clínica', 'desfechos', 'sucesso terapêutico', 'encerramento de caso']
    },
    {
        id: 'carga-de-trabalho',
        title: 'Carga de Trabalho',
        category: 'Terapia',
        icon: BarChart3,
        href: '/dashboard/terapia/carga-trabalho',
        whatIsIt: 'Mapeamento de capacidade operacional e distribuição de carga horária entre terapeutas e salas clínicas.',
        whenToUse: 'Para evitar sobrecarga de atendimentos em determinados profissionais e otimizar salas ociosas.',
        howToUse: 'Analise o percentual de horas semanais ocupadas por profissional e reequilibre a distribuição de novos pacientes.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR'],
        tags: ['capacidade', 'carga horária', 'ocupação de salas', 'gestão de equipe']
    },
    {
        id: 'demografico',
        title: 'Demográfico',
        category: 'Terapia',
        icon: Users2,
        href: '/dashboard/terapia/demografico',
        whatIsIt: 'Perfil epidemiológico e sociodemográfico da base de pacientes: distribuição por faixa etária, gênero, bairros/regiões e diagnósticos mais recorrentes.',
        whenToUse: 'Para fundamentar decisões de expansão da clínica, compra de novos materiais e contratação de especialidades direcionadas.',
        howToUse: 'Explore os filtros geográficos e etários para entender onde residem as famílias atendidas e qual faixa etária predomina.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['demografia', 'perfil de pacientes', 'geografia', 'idade', 'planejamento']
    },
    {
        id: 'receita-por-modalidade',
        title: 'Receita por Modalidade',
        category: 'Terapia',
        icon: DollarSign,
        href: '/dashboard/terapia/receita-modalidade',
        whatIsIt: 'Demonstração de faturamento segmentado por tipo de atendimento: Consultas Presenciais, Teleconsultas, Terapias Intensivas, Avaliações Iniciais e Supervisões.',
        whenToUse: 'Para identificar quais modalidades de atendimento geram maior margem de contribuição para a clínica.',
        howToUse: 'Compare a receita e o volume de horas consumidas por cada modalidade no período selecionado.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['modalidade', 'receita', 'faturamento por serviço', 'rentabilidade']
    },
    {
        id: 'sazonalidade',
        title: 'Sazonalidade',
        category: 'Terapia',
        icon: TrendingUp,
        href: '/dashboard/terapia/sazonalidade',
        whatIsIt: 'Curva histórica de variação da demanda ao longo dos meses do ano (ex: férias escolares de janeiro e julho, feriados prolongados e volta às aulas).',
        whenToUse: 'Para planejar férias coletivas da equipe, provisões financeiras de caixa e campanhas de captação.',
        howToUse: 'Analise os meses históricos de maior e menor movimento e prepare ações preventivas de preenchimento de agenda.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['sazonalidade', 'férias', 'demanda anual', 'planejamento de caixa']
    },
    {
        id: 'nps-satisfacao',
        title: 'NPS / Satisfação',
        category: 'Terapia',
        icon: HeartPulse,
        href: '/dashboard/terapia/nps',
        whatIsIt: 'Monitoramento contínuo de Net Promoter Score (NPS) e pesquisas de qualidade respondidas pelas famílias após os atendimentos.',
        whenToUse: 'Para mensurar o índice de promotores vs detratores da clínica e identificar oportunidades de melhoria no acolhimento.',
        howToUse: 'Consulte a pontuação global de NPS (0 a 100) e leia os comentários qualitativos deixados pelos responsáveis.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN'],
        tags: ['nps', 'satisfação', 'pesquisa de qualidade', 'feedback de famílias']
    },

    // ==========================================
    // 6. FINANCEIRO
    // ==========================================
    {
        id: 'lancamentos',
        title: 'Lançamentos',
        category: 'Financeiro',
        icon: DollarSign,
        href: '/dashboard/financeiro',
        whatIsIt: 'Livro caixa e controle de entradas e saídas da clínica. Registra pagamentos recebidos de pacientes particulares, despesas operacionais fixas (aluguel, energia, internet), compras de insumos e repasses.',
        whenToUse: 'Diariamente para lançar toda e qualquer movimentação monetária que entre ou saia das contas da clínica.',
        howToUse: 'Clique em "Novo Lançamento", defina se é Receita ou Despesa, vincule a uma categoria do plano de contas, informe valor, forma de pagamento e anexe o comprovante.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['livro caixa', 'receitas', 'despesas', 'plano de contas', 'movimentação'],
        aliases: ['transacoes-e-caixa', 'financeiro']
    },
    {
        id: 'pagamentos',
        title: 'Pagamentos',
        category: 'Financeiro',
        icon: CreditCard,
        href: '/dashboard/pagamentos',
        whatIsIt: 'Gestão de faturas e cobranças digitais enviadas aos pacientes com integração a gateways (Pix instantâneo, Cartão de Crédito e Boleto).',
        whenToUse: 'Para auditar cobranças enviadas por WhatsApp/E-mail, verificar quais foram liquidadas e reconciliar recebimentos.',
        howToUse: 'Acompanhe a lista de faturas abertas, vencidas e pagas. É possível reenviar links de cobrança com 1 clique para o WhatsApp do responsável.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['pix', 'cartão', 'faturas', 'gateway de pagamento', 'cobrança digital']
    },
    {
        id: 'fechamentos-de-caixa',
        title: 'Fechamentos de Caixa',
        category: 'Financeiro',
        icon: FileText,
        href: '/dashboard/financeiro/fechamento',
        whatIsIt: 'Fechamento diário do caixa físico da recepção. Compara os valores em dinheiro e comprovantes de máquina de cartão com o registrado no sistema, travando o dia para evitar alterações retroativas.',
        whenToUse: 'Ao término do expediente da recepção para fechar e assinar a prestação de contas do dia.',
        howToUse: 'A recepcionista abre a tela de Fechamento de Caixa, digita os valores contados na gaveta física, confere as divergências e confirma o fechamento.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['caixa diário', 'gaveta', 'fechamento', 'auditoria física', 'recepção']
    },
    {
        id: 'creditos-de-pacientes',
        title: 'Créditos de Pacientes',
        category: 'Financeiro',
        icon: Wallet,
        href: '/dashboard/financial/credits',
        whatIsIt: 'Carteira digital de saldos e créditos antecipados de pacientes. Permite que famílias comprem pacotes de sessões com antecedência ou mantenham créditos de consultas desmarcadas com antecedência para abatimento futuro.',
        whenToUse: 'Ao vender pacotes pré-pagos de terapias ou ao conceder crédito por cancelamento dentro do prazo de tolerância da clínica.',
        howToUse: 'Acesse Créditos de Pacientes, pesquise pelo paciente e adicione ou debite saldos com histórico auditável de motivo e data.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['créditos', 'pacotes antecipados', 'saldo de paciente', 'carteira digital']
    },
    {
        id: 'folha-de-repasse',
        title: 'Folha de Repasse',
        category: 'Financeiro',
        icon: Users,
        href: '/dashboard/financial/payroll',
        whatIsIt: 'Motor automatizado de cálculo de comissões de médicos e terapeutas. Processa os atendimentos realizados e confirmados no período, aplicando a taxa contratual de cada profissional (percentual ou valor fixo por sessão).',
        whenToUse: 'No período de fechamento mensal da clínica para calcular e emitir a folha de pagamento de prestadores de serviços.',
        howToUse: 'Selecione o mês de competência, revise os atendimentos apurados por profissional, aplique eventuais descontos ou bônus e aprove a folha de repasse.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['repasse médico', 'comissão', 'folha de pagamento', 'honorários', 'fechamento mensal'],
        aliases: ['repasses-producao', 'folha-repasse']
    },
    {
        id: 'historico-de-repasses',
        title: 'Histórico de Repasses',
        category: 'Financeiro',
        icon: FileText,
        href: '/dashboard/financial/payroll/historico',
        whatIsIt: 'Arquivo histórico de todas as folhas de repasse fechadas e pagas em meses anteriores, com registros de valores brutos, descontos aplicados e comprovantes.',
        whenToUse: 'Para auditorias fiscais, emissão de informes de rendimentos ou esclarecimento de dúvidas contábeis com profissionais.',
        howToUse: 'Consulte competências passadas, filtre pelo profissional desejado e exporte demonstrativos detalhados em PDF ou planilha.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['histórico', 'arquivos passados', 'comprovantes de repasse', 'auditoria contábil']
    },
    {
        id: 'producao-por-profissional',
        title: 'Produção por Profissional',
        category: 'Financeiro',
        icon: TrendingUp,
        href: '/dashboard/financial/producao',
        whatIsIt: 'Relatório consolidado de produtividade clínica e financeira por profissional: total de atendimentos realizados, taxa de no-show própria, faturamento bruto gerado e valor líquido repassado.',
        whenToUse: 'Para avaliar o desempenho operacional de cada membro da equipe e planejar ampliações de horários.',
        howToUse: 'Filtre pelo período desejado e compare a produção entre profissionais ou consulte a evolução mensal de um terapeuta específico.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['produção', 'produtividade', 'faturamento individual', 'desempenho médico']
    },
    {
        id: 'notas-demonstrativos',
        title: 'Notas & Demonstrativos',
        category: 'Financeiro',
        icon: Receipt,
        href: '/dashboard/financial/notas-demonstrativos',
        whatIsIt: 'Central de intercâmbio financeiro entre a gestão da clínica e os profissionais de saúde. A clínica disponibiliza o demonstrativo detalhado de repasse e o profissional anexa sua respectiva Nota Fiscal de prestação de serviços (com fluxo de aprovação e contestação de inconsistências com justificativa).',
        whenToUse: 'Mensalmente nos ciclos de fechamento financeiro para liberação dos pagamentos.',
        howToUse: 'A clínica faz o upload do demonstrativo; o profissional confere, aprova ou aponta inconsistência e anexa sua NF; o financeiro valida e anexa o comprovante bancário com disparo de WhatsApp.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'FINANCIAL', 'DOCTOR'],
        tags: ['notas fiscais', 'demonstrativos', 'repasses', 'comprovantes bancários', 'contestação']
    },
    {
        id: 'auditoria-biometria',
        title: 'Auditoria Mensal de Biometria Facial',
        category: 'Financeiro',
        icon: ShieldCheck,
        href: '/dashboard/financial/notas-demonstrativos',
        whatIsIt: 'Relatório executivo que cruza 100% dos atendimentos faturados no mês com a existência de biometria facial cadastrada e validada. Apresenta o índice percentual de conformidade da clínica e exporta a planilha comprobatória em Excel para operadoras e convênios.',
        whenToUse: 'Antes de liberar os pagamentos de repasse para certificar que nenhum atendimento sem biometria seja repassado sem validação prévia.',
        howToUse: 'Na Central de Notas & Demonstrativos, clique em "Auditoria Biométrica", selecione o mês, verifique os pacientes pendentes e exporte a planilha consolidada.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['biometria', 'auditoria mensal', 'conformidade', 'excel', 'comprovação convênios']
    },
    {
        id: 'dre-consolidada',
        title: 'DRE Consolidada',
        category: 'Financeiro',
        icon: BarChart3,
        href: '/dashboard/financial/dre',
        whatIsIt: 'Demonstração do Resultado do Exercício consolidada. Estrutura a receita bruta, deduções, custos operacionais diretos, despesas fixas e apura o lucro operacional líquido real e a margem EBITDA da clínica.',
        whenToUse: 'No encerramento de cada mês para avaliação estratégica de resultados com os sócios da clínica.',
        howToUse: 'Acesse DRE Consolidada, filtre o ano/mês e visualize as linhas de receitas e despesas com drill-down para detalhar lançamentos individuais.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['dre', 'lucro líquido', 'margem', 'ebitda', 'controladoria', 'resultado']
    },
    {
        id: 'dre-centro-de-custos',
        title: 'DRE Centro de Custos',
        category: 'Financeiro',
        icon: TrendingDown,
        href: '/dashboard/financial/dre-costcenter',
        whatIsIt: 'DRE segmentada por departamentos, unidades ou especialidades clínicas (ex: Unidade Tatuapé vs Moema, ou Setor ABA vs Setor Fisioterapia), apurando a rentabilidade individual de cada unidade de negócio.',
        whenToUse: 'Para clínicas com múltiplas filiais ou unidades de negócio distintas que necessitam de rateio detalhado de custos.',
        howToUse: 'Selecione o centro de custo desejado para auditar a rentabilidade isolada daquele setor.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['centro de custos', 'filiais', 'rateio', 'unidades de negócio', 'rentabilidade']
    },
    {
        id: 'analise-de-ltv',
        title: 'Análise de LTV',
        category: 'Financeiro',
        icon: Target,
        href: '/dashboard/financial/ltv',
        whatIsIt: 'Lifetime Value. Painel preditivo que calcula o valor financeiro histórico total gerado por cada paciente durante seu ciclo ativo de tratamento.',
        whenToUse: 'Para calibrar investimentos de captação de pacientes e avaliar o valor financeiro de cada especialidade.',
        howToUse: 'Analise o LTV médio geral e por especialidade para identificar quais tratamentos geram maior valor acumulado ao longo dos anos.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['ltv', 'lifetime value', 'valor do paciente', 'cac', 'rentabilidade de longo prazo']
    },
    {
        id: 'mix-de-receita',
        title: 'Mix de Receita',
        category: 'Financeiro',
        icon: BarChart3,
        href: '/dashboard/financeiro/mix',
        whatIsIt: 'Composição percentual do faturamento da clínica entre Particular vs Convênios, ou por grupos de especialidades (ex: 60% Particular / 40% Bradesco Saúde).',
        whenToUse: 'Para evitar dependência excessiva de uma única operadora de saúde e balancear a carteira de recebimentos.',
        howToUse: 'Consulte os gráficos em pizza e barras com a distribuição percentual do faturamento e acompanhe a evolução mensal.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['mix de receita', 'particular vs convênio', 'dependência financeira', 'carteira']
    },
    {
        id: 'projecao-de-caixa',
        title: 'Projeção de Caixa',
        category: 'Financeiro',
        icon: Calendar,
        href: '/dashboard/financeiro/projecao',
        whatIsIt: 'Fluxo de caixa projetado para os próximos 30, 60 e 90 dias, considerando agendamentos recorrentes confirmados, contas a pagar provisionadas e recebíveis programados.',
        whenToUse: 'Para prever a necessidade de capital de giro e antecipar períodos de aperto financeiro.',
        howToUse: 'Analise o gráfico de saldo projetado e verifique as linhas de entradas previstas vs compromissos agendados.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['projeção de caixa', 'fluxo futuro', 'capital de giro', 'previsibilidade']
    },
    {
        id: 'projecao-de-faturamento',
        title: 'Projeção de Faturamento & Metas',
        category: 'Financeiro',
        icon: Target,
        href: '/dashboard/financial/goals',
        whatIsIt: 'Painel de acompanhamento de metas financeiras mensais da clínica, comparando o faturamento realizado contra a meta estipulada.',
        whenToUse: 'Para orientar as equipes de atendimento e recepção no alcance dos objetivos comerciais da clínica.',
        howToUse: 'Cadastre a meta monetária do mês e acompanhe o termômetro de atingimento atualizado a cada consulta faturada.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['metas', 'projeção de faturamento', 'objetivos financeiros', 'desempenho']
    },
    {
        id: 'gestao-de-inadimplencia',
        title: 'Gestão de Inadimplência',
        category: 'Financeiro',
        icon: UserX,
        href: '/dashboard/financeiro/inadimplencia',
        whatIsIt: 'Painel de controle de títulos em aberto e devedores. Lista faturas vencidas, calcula juros contratuais e automatiza lembretes amigáveis de cobrança via WhatsApp.',
        whenToUse: 'Semanalmente para identificar atrasos e acionar réguas de cobrança amigáveis antes do agravamento da dívida.',
        howToUse: 'Filtre por dias de atraso (ex: 1 a 15 dias, 16 a 30 dias) e clique no botão de WhatsApp para enviar o link de pagamento atualizado com código Pix.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['inadimplência', 'cobrança', 'atrasos', 'régua de cobrança', 'devedores']
    },
    {
        id: 'auditoria-de-lancamentos',
        title: 'Auditoria de Lançamentos',
        category: 'Financeiro',
        icon: ShieldAlert,
        href: '/dashboard/financial/audit',
        whatIsIt: 'Trilha de auditoria financeira que registra todas as alterações manuais, exclusões de lançamentos, cancelamento de notas e edições de valores de repasse.',
        whenToUse: 'Para investigar divergências contábeis e assegurar transparência absoluta na movimentação financeira da clínica.',
        howToUse: 'Consulte a lista de logs ordenados por data e hora, identificando o usuário responsável e o valor antes e depois da alteração.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['auditoria financeira', 'log de alterações', 'segurança fiscal', 'antifraude']
    },
    {
        id: 'faturamento-tiss',
        title: 'Faturamento TISS (Guias e Lotes)',
        category: 'Financeiro',
        icon: Receipt,
        href: '/dashboard/tiss',
        whatIsIt: 'Sistema industrial de faturamento no padrão obrigatório TISS (ANS 3.05.00 / 4.01.00). Gera guias SP/SADT, empacota em lotes XML validados pelo schema da ANS e exporta para envio aos portais de convênios.',
        whenToUse: 'No fechamento quinzenal ou mensal de faturamento das operadoras de saúde credenciadas.',
        howToUse: 'Acesse Faturamento TISS, gere o lote com as guias do período, execute a validação de regras de preenchimento e baixe o arquivo XML oficial para upload na operadora.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['tiss', 'ans', 'guias', 'lotes xml', 'operadoras de saúde', 'convênios'],
        aliases: ['guias-e-lotes', 'tiss-guias-e-lotes']
    },
    {
        id: 'gestao-de-glosas',
        title: 'Gestão de Glosas',
        category: 'Financeiro',
        icon: ShieldAlert,
        href: '/dashboard/tiss/glosas',
        whatIsIt: 'Módulo de controle e recurso de glosas aplicadas pelas operadoras de saúde. Identifica o motivo do não pagamento e gera o lote de recurso TISS no formato regulatório.',
        whenToUse: 'Após receber o demonstrativo de pagamento do convênio quando houver itens glosados.',
        howToUse: 'Importe o arquivo de retorno da operadora, identifique as guias glosadas, anexe a justificativa ou laudo complementar e emita o lote de recurso.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['glosas', 'recurso de glosa', 'ans', 'tiss', 'recuperação de receita']
    },
    {
        id: 'perdas-bi',
        title: 'Perdas (BI)',
        category: 'Financeiro',
        icon: TrendingDown,
        href: '/dashboard/tiss/reports/loss-analysis',
        whatIsIt: 'Inteligência analítica de glosas e cancelamentos. Mapeia os principais motivos de recusa de guias por operadora e por profissional, apontando onde a clínica está perdendo receita.',
        whenToUse: 'Para treinar a recepção no preenchimento correto de guias e renegociar contratos com convênios problemáticos.',
        howToUse: 'Analise os gráficos dos maiores motivos de glosa e implemente travas preventivas no cadastro de pacientes e atendimentos.',
        minPlan: 'Professional',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['perdas', 'bi financeiro', 'análise de glosas', 'eficiência de faturamento']
    },
    {
        id: 'meu-financeiro',
        title: 'Meu Financeiro (Portal do Terapeuta)',
        category: 'Financeiro',
        icon: Wallet,
        href: '/dashboard/meu-financeiro',
        whatIsIt: 'Portal financeiro exclusivo para médicos e terapeutas parceiros. Exibe o extrato individual de repasses, produção mensal apurada, demonstrativos anexados pela clínica e área de envio da própria Nota Fiscal com acompanhamento de pagamento.',
        whenToUse: 'Uso mensal pelo profissional para conferir seus atendimentos faturados, contestar eventuais inconsistências e enviar sua NF.',
        howToUse: 'O profissional acessa o Meu Financeiro, confere o demonstrativo da competência e clica em "Anexar Nota Fiscal" para liberar o pagamento.',
        minPlan: 'Avançado',
        roles: ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
        tags: ['portal do médico', 'meu financeiro', 'minha comissão', 'repasses recebidos', 'nota fiscal'],
        aliases: ['meu-painel', 'meu-historico', 'minha-producao']
    },
    {
        id: 'convenios',
        title: 'Convênios',
        category: 'Financeiro',
        icon: Shield,
        href: '/dashboard/convenios',
        whatIsIt: 'Cadastro das operadoras de saúde parceiras credenciadas na clínica (Bradesco, Amil, SulAmérica, Unimed, etc.) e parametrização das tabelas de honorários por procedimento clínico.',
        whenToUse: 'Ao firmar parceria com um novo plano de saúde ou ao receber atualização de tabela de repasse de honorários.',
        howToUse: 'Cadastre a operadora com CNPJ e Registro ANS e configure o valor pago por cada código de procedimento médico/terapêutico.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'FINANCIAL'],
        tags: ['planos de saúde', 'convênios', 'tabela de honorários', 'ans', 'credenciamento'],
        aliases: ['convenios-e-reembolsos']
    },
    {
        id: 'regras-de-reembolso',
        title: 'Regras de Reembolso',
        category: 'Financeiro',
        icon: Receipt,
        href: '/dashboard/configuracoes/reembolso',
        whatIsIt: 'Configurador de regras institucionais para atendimentos na modalidade de Reembolso Assistido (Livre Escolha). Permite emitir recibos médicos e relatórios de reembolso em estrita conformidade com as exigências dos planos.',
        whenToUse: 'Para clínicas que atendem pacientes particulares que solicitam reembolso integral ou parcial junto ao seu plano de saúde.',
        howToUse: 'Cadastre as diretrizes de emissão de recibos, laudos de solicitação médica e documentação obrigatória por operadora.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['reembolso', 'livre escolha', 'recibos', 'declaração de reembolso']
    },
    {
        id: 'reembolso-por-paciente',
        title: 'Reembolso por Paciente',
        category: 'Financeiro',
        icon: Users,
        href: '/dashboard/configuracoes/reembolso-paciente',
        whatIsIt: 'Gestão individualizada dos processos de reembolso de cada família, acompanhando datas de emissão de recibos, protocolos protocolados junto à operadora e confirmação de crédito na conta do paciente.',
        whenToUse: 'Para clínicas com serviço de Reembolso Assistido para orientar e apoiar a família no recebimento do valor devido.',
        howToUse: 'Acompanhe a tabela de status de reembolso por paciente e anexe os comprovantes e pedidos médicos vinculados.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['reembolso por paciente', 'acompanhamento de reembolso', 'reembolso assistido']
    },

    // ==========================================
    // 7. COMUNICAÇÃO
    // ==========================================
    {
        id: 'chat-interno',
        title: 'Chat Interno',
        category: 'Comunicação',
        icon: MessagesSquare,
        href: '/dashboard/chat',
        whatIsIt: 'Mensageiro corporativo seguro integrado à plataforma CliniGo. Permite a troca de mensagens em tempo real entre a recepção e os consultórios dos terapeutas, canais gerais da equipe e canal de suporte técnico direto.',
        whenToUse: 'Para avisar a chegada de pacientes, tirar dúvidas operacionais ou alinhar condutas sem usar ferramentas pessoais desprotegidas.',
        howToUse: 'Abra o Chat Interno, selecione o colega ou canal desejado e envie mensagens com suporte a áudio, links e sinalizações visuais de urgência.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'FINANCIAL'],
        tags: ['chat interno', 'mensageiro', 'comunicação equipe', 'conversa segura', 'segurança de dados']
    },
    {
        id: 'whatsapp',
        title: 'WhatsApp',
        category: 'Comunicação',
        icon: MessageCircle,
        href: '/dashboard/whatsapp',
        whatIsIt: 'Módulo de conexão e gerenciamento do canal oficial de WhatsApp corporativo da clínica. Permite ler QR Code de pareamento seguro e monitorar a estabilidade da linha. Acesso restrito a Administradores e Recepção.',
        whenToUse: 'Para conectar o número de WhatsApp da clínica encarregado de disparar lembretes automáticos e receber confirmações dos pacientes.',
        howToUse: 'Acesse o módulo, clique em "Gerar QR Code", aponte a câmera do WhatsApp da clínica e confirme a conexão ativa.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['whatsapp', 'baileys', 'qr code', 'conexão', 'mensagens automáticas']
    },
    {
        id: 'confirmacao-whatsapp',
        title: 'Confirmação Automática via WhatsApp',
        category: 'Comunicação',
        icon: CheckCircle2,
        href: '/dashboard/agenda',
        whatIsIt: 'Automação inteligente de reconhecimento de linguagem natural. Quando o paciente recebe o lembrete de consulta e responde mensagens afirmativas (ex: "Sim", "Confirmo", "Vou sim", "Ok"), o sistema atualiza o status do agendamento para CONFIRMED na Agenda instantaneamente e confirma para o paciente.',
        whenToUse: 'Opera 24/7 de forma totalmente automática, reduzindo a taxa de faltas sem necessidade de intervenção humana da recepção.',
        howToUse: 'Com o canal de WhatsApp conectado, os lembretes de 24h e 1h antes da consulta são disparados automaticamente e as respostas confirmam a grade de forma autônoma.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['confirmação automática', 'inteligência artificial', 'resposta whatsapp', 'redução de faltas']
    },
    {
        id: 'mural-de-recados',
        title: 'Mural de Recados',
        category: 'Comunicação',
        icon: Megaphone,
        href: '/dashboard/agenda',
        whatIsIt: 'Quadro digital de comunicados internos fixado no topo da Agenda Geral. Exibe alertas corporativos com níveis de prioridade (Urgente, Importante, Geral), alertando a equipe com badge visual pulsante quando há novos comunicados não lidos.',
        whenToUse: 'Sempre que a administração precisar divulgar avisos rápidos à equipe (ex: reuniões, manutenções, mudanças de salas ou eventos institucionais).',
        howToUse: 'Clique no ícone de megafone na Agenda para ler os recados ou criar um novo comunicado com título, descrição e prazo de exibição.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'STAFF'],
        tags: ['mural de recados', 'avisos internos', 'comunicados', 'prioridade', 'agenda']
    },
    {
        id: 'notificacoes',
        title: 'Notificações',
        category: 'Comunicação',
        icon: Send,
        href: '/dashboard/notificacoes',
        whatIsIt: 'Central de disparos e histórico de notificações da clínica por SMS, E-mail e WhatsApp. Permite auditar entregas, taxas de leitura e erros de envio.',
        whenToUse: 'Para verificar se os lembretes do dia foram disparados com sucesso e reenviar notificações pendentes.',
        howToUse: 'Acompanhe a lista de disparos com status de envio, horário de entrega e destinatário.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'FINANCIAL'],
        tags: ['notificações', 'disparos', 'sms', 'e-mail', 'histórico de mensagens']
    },
    {
        id: 'fluxomed-crm',
        title: 'FluxoMed (CRM & Automações)',
        category: 'Comunicação',
        icon: Megaphone,
        href: '/dashboard/crm',
        whatIsIt: 'Funil e esteira de relacionamento comercial médico (CRM). Inclui criação de réguas de automação de boas-vindas, pós-consulta, reativação de pacientes inativos e acompanhamento de contatos.',
        whenToUse: 'Para aumentar a captação de novos pacientes e manter contato frequente com a base ativa de famílias.',
        howToUse: 'Crie réguas com gatilhos (ex: "7 dias após a primeira consulta") e defina a mensagem que será enviada automaticamente.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['crm', 'marketing médico', 'funil', 'automações de captação', 'fluxomed'],
        aliases: ['fluxomed', 'automacoes']
    },
    {
        id: 'pipeline',
        title: 'Pipeline (Kanban de Oportunidades)',
        category: 'Comunicação',
        icon: TrendingUp,
        href: '/dashboard/crm/pipeline',
        whatIsIt: 'Quadro visual em colunas Kanban que organiza novos contatos e interessados desde o Primeiro Contato, Triagem, Agendamento de Avaliação até a Efetivação da Matrícula.',
        whenToUse: 'Pela recepção ou equipe comercial para gerenciar o processo de captação de novos pacientes sem perder nenhuma oportunidade.',
        howToUse: 'Arraste os cards de pacientes entre as etapas do funil conforme o avanço do contato e adicione notas de evolução comercial.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['pipeline', 'kanban', 'funil de vendas', 'captação', 'oportunidades']
    },

    // ==========================================
    // 8. GESTÃO
    // ==========================================
    {
        id: 'estoque',
        title: 'Estoque',
        category: 'Gestão',
        icon: Package,
        href: '/dashboard/estoque',
        whatIsIt: 'Gerenciamento inteligente de estoque com regra FEFO (First-Expired, First-Out). Monitora insumos terapêuticos, materiais descartáveis, testes psicológicos e materiais pedagógicos com controle de lote e validade.',
        whenToUse: 'Ao dar entrada em compras de materiais clínicos ou registrar a baixa de itens consumidos no atendimento.',
        howToUse: 'Cadastre o produto com ponto de pedido mínimo. O sistema alerta quando o saldo estiver baixo ou próximo da data de vencimento.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['estoque', 'fefo', 'validade', 'lotes', 'insumos médicos', 'materiais']
    },
    {
        id: 'relatorios',
        title: 'Relatórios',
        category: 'Gestão',
        icon: BarChart3,
        href: '/dashboard/relatorios',
        whatIsIt: 'Gerador consolidado de relatórios com filtros por data, profissional, especialidade e status. Permite exportar tabelas completas em Excel (XLSX) e PDF estruturado para contabilidade e reuniões de diretoria.',
        whenToUse: 'No encerramento de ciclos mensais ou anuais para prestar contas à diretoria e contadores.',
        howToUse: 'Escolha o tipo de relatório desejado (Atendimentos, Faturamento, Pacientes ou Cancelamentos), defina o período e clique em Exportar.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['relatórios', 'excel', 'pdf', 'exportação', 'prestação de contas']
    },
    {
        id: 'termos-legais',
        title: 'Termos Legais',
        category: 'Gestão',
        icon: Scale,
        href: '/dashboard/termos',
        whatIsIt: 'Arquivo jurídico de termos e contratos emitidos pela clínica, com consulta aos documentos já assinados e trilha auditável de consentimento LGPD.',
        whenToUse: 'Para consultar contratos vigentes de pacientes ou comprovar anuência jurídica em caso de auditorias.',
        howToUse: 'Pesquise pelo paciente para visualizar o documento PDF assinado com carimbo criptográfico e data/hora.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['termos legais', 'jurídico', 'contratos vigentes', 'lgpd', 'auditoria documental']
    },
    {
        id: 'importacao',
        title: 'Importação',
        category: 'Gestão',
        icon: Upload,
        href: '/dashboard/importacao',
        whatIsIt: 'Assistente inteligente de migração de dados de sistemas antigos. Permite carregar planilhas de pacientes, profissionais e históricos em lote via Excel ou CSV com mapeador visual de colunas.',
        whenToUse: 'Na fase de implantação da clínica no CliniGo para migrar dados anteriores com rapidez e segurança.',
        howToUse: 'Faça upload da planilha Excel, confirme o mapeamento de colunas (Nome, CPF, Telefone, etc.) e inicie a importação assistida.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
        tags: ['importação', 'migração', 'planilhas', 'csv', 'excel', 'carga em lote']
    },
    {
        id: 'automacao',
        title: 'Automação (Painel & Regras)',
        category: 'Gestão',
        icon: Bot,
        href: '/dashboard/automacao',
        whatIsIt: 'Central de automações operacionais baseadas em regras de negócio (triggers). Programa ações automáticas para eventos do sistema (ex: notificar quando paciente faltar 2 vezes ou alertar retorno de exames).',
        whenToUse: 'Para reduzir tarefas manuais repetitivas e garantir que nenhum paciente fique desassistido.',
        howToUse: 'Selecione o gatilho, adicione as condições de validação e configure a ação resultante (disparo de mensagem, notificação interna ou criação de tarefa).',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['automação', 'regras', 'gatilhos', 'workflows', 'robô'],
        aliases: ['painel']
    },
    {
        id: 'automacao-configuracoes',
        title: 'Configurações de Automação',
        category: 'Gestão',
        icon: Settings,
        href: '/dashboard/automacao/configuracoes',
        whatIsIt: 'Parametrização de limites, horários permitidos de disparo de mensagens automáticas (para não enviar mensagens em horários impróprios à noite) e canais preferenciais.',
        whenToUse: 'Ao configurar os horários de funcionamento das réguas automáticas da clínica.',
        howToUse: 'Defina a janela de envio (ex: 08:00 às 19:00) e os dias permitidos (segunda a sábado) para manter total conformidade com boas práticas de comunicação.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['parâmetros', 'horário de envio', 'regras de disparo', 'governança de comunicação'],
        aliases: ['configuracoes']
    },
    {
        id: 'auditoria',
        title: 'Auditoria (Logs & LGPD)',
        category: 'Gestão',
        icon: Shield,
        href: '/dashboard/logs-auditoria',
        whatIsIt: 'Trilha de auditoria (Audit Trail) inviolável exigida por regulações sanitárias e de proteção de dados (LGPD / CFM). Registra quem visualizou, editou, imprimiu prontuários ou realizou exclusões, com IP, dispositivo e timestamp.',
        whenToUse: 'Para auditorias de conformidade, investigação de vazamentos ou comprovação de integridade dos prontuários clínicos.',
        howToUse: 'Filtre os logs por usuário, ação (Ex: VIEW_RECORD, UPDATE_RATE, EXCLUDE_APPOINTMENT) ou paciente para auditar o histórico de operações.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['audit trail', 'segurança da informação', 'lgpd', 'logs', 'rastreabilidade'],
        aliases: ['logs-auditoria']
    },

    // ==========================================
    // 9. CONFIGURAÇÕES
    // ==========================================
    {
        id: 'minha-clinica',
        title: 'Minha Clínica',
        category: 'Configurações',
        icon: Settings,
        href: '/dashboard/configuracoes',
        whatIsIt: 'Dados cadastrais e jurídicos da clínica: Razão Social, Nome Fantasia, CNPJ, Inscrição Municipal, Endereço completo, Telefone oficial e Contatos de atendimento.',
        whenToUse: 'Para atualizar as informações institucionais que aparecem nos cabeçalhos de impressões, recibos e receitas.',
        howToUse: 'Preencha os campos institucionais e salve. As alterações são refletidas instantaneamente em todos os documentos emitidos pela clínica.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['minha clínica', 'dados institucionais', 'cnpj', 'endereço', 'cabeçalho']
    },
    {
        id: 'logo-clinica-co-branding',
        title: 'Logotipo da Clínica e Co-branding',
        category: 'Configurações',
        icon: Building2,
        href: '/dashboard/configuracoes',
        whatIsIt: 'Upload do logotipo oficial da clínica para exibição harmônica no topo da barra lateral e nos documentos clínicos emitidos, preservando a identidade corporativa da instituição.',
        whenToUse: 'Ao personalizar a plataforma com a identidade visual da clínica.',
        howToUse: 'Faça upload de imagem em formato PNG com fundo transparente. O sistema ajusta a escala esteticamente para a barra lateral e impressões.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['logotipo', 'marca', 'identidade visual', 'co-branding', 'sidebar']
    },
    {
        id: 'pagina-publica',
        title: 'Página Pública & Autoagendamento',
        category: 'Configurações',
        icon: Globe,
        href: '/dashboard/configuracoes/pagina-publica',
        whatIsIt: 'Portal público da clínica na internet (ex: clinigo.app/sua-clinica). Permite que novos pacientes agendem consultas online pelo site ou redes sociais, com escolha de especialidade, profissional e horário livre.',
        whenToUse: 'Para divulgar o link de agendamento online na biografia do Instagram, Google Meu Negócio ou site próprio da clínica.',
        howToUse: 'Defina o slug da clínica (endereço web), personalize cores e banners, selecione os profissionais que aceitam agendamento online e compartilhe o link.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['página pública', 'autoagendamento', 'agendamento online', 'instagram', 'google meu negócio']
    },
    {
        id: 'teleconsulta',
        title: 'Teleconsulta (Configurações)',
        category: 'Configurações',
        icon: Video,
        href: '/dashboard/configuracoes/teleconsulta',
        whatIsIt: 'Configuração dos parâmetros de atendimento remoto: tempo de tolerância de sala de espera virtual, mensagem de boas-vindas e configurações de áudio/vídeo.',
        whenToUse: 'Para ajustar as diretrizes de atendimento a distância da clínica.',
        howToUse: 'Configure o texto do convite e o tempo máximo de antecedência em que o paciente pode acessar a sala virtual.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['teleconsulta', 'configuração de vídeo', 'sala de espera virtual', 'atendimento remoto']
    },
    {
        id: 'usuarios',
        title: 'Usuários e Permissões (RBAC)',
        category: 'Configurações',
        icon: Users,
        href: '/dashboard/configuracoes/usuarios',
        whatIsIt: 'Gerenciamento de contas de acesso da equipe com controle de acesso granular baseado em papéis (Role-Based Access Control): Administradores, Médicos/Terapeutas, Recepção, Enfermagem e Financeiro.',
        whenToUse: 'Ao admitir novos colaboradores, redefinir senhas ou revogar acessos de funcionários desligados.',
        howToUse: 'Clique em "Convidar Usuário", insira o e-mail corporativo, atribua o perfil correspondente e defina as permissões específicas.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['usuários', 'permissões', 'rbac', 'controle de acesso', 'segurança', 'perfis']
    },
    {
        id: 'terapias',
        title: 'Terapias e Procedimentos',
        category: 'Configurações',
        icon: Stethoscope,
        href: '/dashboard/configuracoes/terapias',
        whatIsIt: 'Catálogo de procedimentos, tipos de terapias e especialidades oferecidas pela clínica (Fonoaudiologia, Terapia Ocupacional, Psicologia, Fisioterapia, Psicomotricidade, ABA, etc.), com duração padrão e cor de identificação na agenda.',
        whenToUse: 'Ao adicionar novos serviços ao portfólio da clínica ou redefinir durações padrão.',
        howToUse: 'Cadastre o procedimento, associe a especialidade correspondente, defina a duração em minutos e escolha uma cor para a grade.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['terapias', 'procedimentos', 'especialidades', 'catálogo de serviços', 'duração']
    },
    {
        id: 'assinatura',
        title: 'Assinatura e Planos',
        category: 'Configurações',
        icon: CreditCard,
        href: '/dashboard/configuracoes/assinatura',
        whatIsIt: 'Gerenciamento do plano da clínica no CliniGo (Básico, Avançado, Professional ou Enterprise). Permite consultar recursos ativos, limites de profissionais cadastrados, faturas mensais e fazer upgrades.',
        whenToUse: 'Para verificar a data de renovação, atualizar o cartão de cobrança ou expandir o plano conforme o crescimento da equipe.',
        howToUse: 'Acesse Assinatura para visualizar o plano contratado, consultar faturas quitadas e solicitar upgrade de capacidade.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['assinatura', 'plano', 'faturas', 'upgrade', 'capacidade']
    },
    {
        id: 'seguranca',
        title: 'Segurança e Sessões Ativas',
        category: 'Configurações',
        icon: Lock,
        href: '/dashboard/seguranca',
        whatIsIt: 'Painel de segurança avançada com suporte a Autenticação em Duas Etapas (2FA/MFA), gerenciamento de sessões ativas com encerramento remoto de dispositivos desconhecidos e política de senha forte.',
        whenToUse: 'Para ativar proteção de dois fatores em contas de administradores e auditar de quais computadores a clínica está conectada.',
        howToUse: 'Ative o 2FA via aplicativo autenticador (Google Authenticator ou similar) e encerre sessões abertas em computadores antigos.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['segurança', '2fa', 'mfa', 'sessões ativas', 'duplo fator', 'proteção']
    },
    {
        id: 'integracoes',
        title: 'Integrações e Webhooks',
        category: 'Configurações',
        icon: Globe,
        href: '/dashboard/integracoes',
        whatIsIt: 'Conectores externos para plataformas terceiras: Google Agenda, disparos de webhooks em tempo real, APIs de comunicação e ferramentas de automação.',
        whenToUse: 'Para conectar o CliniGo a ferramentas externas do ecossistema da clínica.',
        howToUse: 'Gere credenciais de API ou configure URLs de webhook para receber notificações de novos agendamentos em tempo real.',
        minPlan: 'Avançado',
        roles: ['CLINIC_ADMIN'],
        tags: ['integrações', 'webhooks', 'api', 'google agenda', 'conectividade']
    },
    {
        id: 'dispositivos-tablets',
        title: 'Dispositivos & Tablets Pareados',
        category: 'Configurações',
        icon: Tablet,
        href: '/dashboard/configuracoes/dispositivos',
        whatIsIt: 'Gestão e pareamento de tablets dedicados instalados nos consultórios para validação biométrica facial do paciente antes do atendimento. Funciona em modo quiosque (/terminal) sem necessidade de login de usuário, sem derrubar a sessão conectada no computador do terapeuta, sem QR Code e com total conformidade LGPD.',
        whenToUse: 'Ao instalar tablets nos consultórios para que o terapeuta ou o paciente realize a comprovação de presença via câmera do tablet ou assinatura touch.',
        howToUse: 'Clique em "Parear Novo Tablet", informe o nome da sala (ex: Consultório 1) e copie o código gerado. No tablet da sala, abra clinigo.app/terminal e digite o código uma única vez. O tablet exibirá a fila do dia da sala e responderá instantaneamente aos disparos do computador do terapeuta.',
        minPlan: 'Básico',
        roles: ['CLINIC_ADMIN'],
        tags: ['tablet', 'terminal', 'quiosque', 'biometria facial', 'dispositivos', 'sala de atendimento', 'pareamento'],
        aliases: ['dispositivos', 'tablets', 'terminal']
    },

    // ==========================================
    // 10. ADMINISTRAÇÃO (SUPER ADMIN)
    // ==========================================
    {
        id: 'master-hub',
        title: 'Master Hub',
        category: 'Administração',
        icon: Shield,
        href: '/system-master-hub',
        whatIsIt: 'Centro de comando global da plataforma CliniGo para a mantenedora do software. Monitora todas as clínicas ativas no ecossistema, status dos servidores, volume global de atendimentos e tráfego de dados.',
        whenToUse: 'Uso restrito da engenharia e suporte da mantenedora CliniGo.',
        howToUse: 'Acesse o Master Hub para monitorar saúde dos clusters, telemetria global e métricas consolidada do SaaS.',
        minPlan: 'Enterprise',
        roles: ['SUPER_ADMIN'],
        tags: ['master hub', 'super admin', 'telemetria', 'infraestrutura global']
    },
    {
        id: 'clinicas',
        title: 'Clínicas',
        category: 'Administração',
        icon: Building2,
        href: '/dashboard/clinicas',
        whatIsIt: 'Gestão multi-tenant das instituições contratantes da plataforma. Permite criar novos tenants, suspender acesso por inadimplência, configurar slugs e auditar administradores de cada clínica.',
        whenToUse: 'Ao implantar uma nova instituição na plataforma ou auditar status de clínicas clientes.',
        howToUse: 'Cadastre a nova clínica, defina o administrador responsável e atribua o plano contratado.',
        minPlan: 'Enterprise',
        roles: ['SUPER_ADMIN'],
        tags: ['multi-tenant', 'gestão de clínicas', 'tenants', 'super admin']
    },
    {
        id: 'planos',
        title: 'Planos',
        category: 'Administração',
        icon: Layers,
        href: '/dashboard/planos',
        whatIsIt: 'Configurador de planos e limites da plataforma (Básico, Avançado, Professional, Enterprise). Define limites de profissionais, recursos inclusos e tabela de preços corporativa.',
        whenToUse: 'Para atualizar as condições comerciais e a matriz de permissões por plano no sistema.',
        howToUse: 'Configure os feature flags associados a cada plano para liberação instantânea no front e backend.',
        minPlan: 'Enterprise',
        roles: ['SUPER_ADMIN'],
        tags: ['planos do sistema', 'matriz de recursos', 'tabela de preços', 'feature flags']
    },
    {
        id: 'cobranca',
        title: 'Cobrança',
        category: 'Administração',
        icon: Wallet,
        href: '/dashboard/cobranca',
        whatIsIt: 'Painel financeiro global do SaaS. Monitora faturas mensais devidas pelas clínicas contratantes, pagamentos via cartão/Pix e réguas de notificação para clientes em atraso.',
        whenToUse: 'Para acompanhar a receita recorrente (MRR) da plataforma e auditar adimplência dos clientes.',
        howToUse: 'Acompanhe as faturas geradas, emita segundas vias de boletos e configure o bloqueio automático de inadimplentes.',
        minPlan: 'Enterprise',
        roles: ['SUPER_ADMIN'],
        tags: ['cobrança global', 'mrr', 'faturas saas', 'financeiro da plataforma']
    },
    {
        id: 'grupos',
        title: 'Grupos e Redes',
        category: 'Administração',
        icon: Users2,
        href: '/dashboard/grupos',
        whatIsIt: 'Gestão de holdings e redes de saúde com múltiplas unidades (franquias ou redes de clínicas). Permite consolidação de indicadores entre diferentes CNPJs sob a mesma governança.',
        whenToUse: 'Para clientes com múltiplas unidades que demandam relatórios consolidados em nível de diretoria executiva.',
        howToUse: 'Vincule as clínicas filiais a um Grupo corporativo e configure os acessos dos diretores executivos.',
        minPlan: 'Enterprise',
        roles: ['SUPER_ADMIN'],
        tags: ['redes de clínicas', 'franquias', 'holding', 'gestão corporativa']
    },
    {
        id: 'relatorios-globais',
        title: 'Relatórios Globais',
        category: 'Administração',
        icon: BarChart3,
        href: '/dashboard/relatorios-globais',
        whatIsIt: 'BI consolidado de todo o ecossistema CliniGo: crescimento de cadastros, volume global de atendimentos por especialidade e utilização de recursos.',
        whenToUse: 'Para direcionamento de investimentos de infraestrutura e expansão de capacidade da plataforma.',
        howToUse: 'Consulte os relatórios analíticos para identificar tendências de mercado e comportamento de uso.',
        minPlan: 'Enterprise',
        roles: ['SUPER_ADMIN'],
        tags: ['relatórios globais', 'bi da plataforma', 'crescimento saas', 'indicadores macro']
    },
    {
        id: 'api-keys',
        title: 'API Keys',
        category: 'Administração',
        icon: Key,
        href: '/dashboard/api-keys',
        whatIsIt: 'Emissão e revogação de chaves criptográficas de API para integração segura de terceiros aos serviços da plataforma com controle de taxa (rate limiting).',
        whenToUse: 'Para conectar parceiros de tecnologia ou ferramentas analíticas corporativas.',
        howToUse: 'Gere um token com escopo restrito e defina permissões de leitura/escrita específicas.',
        minPlan: 'Enterprise',
        roles: ['SUPER_ADMIN'],
        tags: ['api keys', 'tokens', 'integração de parceiros', 'segurança de dados']
    },
    {
        id: 'health-check',
        title: 'Health Check',
        category: 'Administração',
        icon: Activity,
        href: '/dashboard/health',
        whatIsIt: 'Monitoramento em tempo real do estado de saúde dos bancos de dados Supabase/PostgreSQL, filas de mensageria WhatsApp, buckets de armazenamento S3 e latência de rotas.',
        whenToUse: 'Para monitorar a estabilidade operacional 24/7 e diagnosticar incidentes técnicos com velocidade.',
        howToUse: 'Verifique os semáforos de cada microsserviço e visualize o tempo de resposta médio das consultas.',
        minPlan: 'Enterprise',
        roles: ['SUPER_ADMIN'],
        tags: ['health check', 'status do sistema', 'banco de dados', 'latência', 'disponibilidade']
    },
    {
        id: 'super-admins',
        title: 'Super Admins',
        category: 'Administração',
        icon: Shield,
        href: '/dashboard/super/admins',
        whatIsIt: 'Gestão dos engenheiros e operadores de infraestrutura da plataforma com credencial máxima de Super Administrador.',
        whenToUse: 'Para auditar quem possui autorização de manutenção no núcleo da plataforma CliniGo.',
        howToUse: 'Revise os acessos com frequência e mantenha política rígida de MFA obrigatório para todos os administradores centrais.',
        minPlan: 'Enterprise',
        roles: ['SUPER_ADMIN'],
        tags: ['super admins', 'engenharia', 'segurança central', 'mantenedores']
    },
]

export default function HelpPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
    const [highlightedAnchor, setHighlightedAnchor] = useState<string | null>(null)
    const [copiedAnchor, setCopiedAnchor] = useState<string | null>(null)

    const categories = [
        'Todos',
        'Principal',
        'Agendamento',
        'Equipe',
        'Prontuário',
        'Terapia',
        'Financeiro',
        'Comunicação',
        'Gestão',
        'Configurações',
        'Administração'
    ]

    // Listen to hash and smooth scroll
    useEffect(() => {
        const checkHash = () => {
            if (typeof window === 'undefined') return
            const rawHash = window.location.hash.replace('#', '').trim()
            if (!rawHash) return

            setHighlightedAnchor(rawHash)
            setSelectedCategory('Todos')

            setTimeout(() => {
                const el = document.getElementById(rawHash) ||
                    document.getElementById(`card-${rawHash}`)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }, 100)
        }

        checkHash()
        window.addEventListener('hashchange', checkHash)
        return () => window.removeEventListener('hashchange', checkHash)
    }, [])

    // Keyboard shortcut '/' to search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault()
                const input = document.getElementById('help-search-input')
                if (input) input.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase().trim()
        return helpItems.filter(item => {
            const matchesSearch = !term ||
                item.title.toLowerCase().includes(term) ||
                item.category.toLowerCase().includes(term) ||
                item.whatIsIt.toLowerCase().includes(term) ||
                item.whenToUse.toLowerCase().includes(term) ||
                item.howToUse.toLowerCase().includes(term) ||
                item.tags.some(tag => tag.toLowerCase().includes(term)) ||
                (item.aliases && item.aliases.some(alias => alias.toLowerCase().includes(term)))

            const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory

            return matchesSearch && matchesCategory
        })
    }, [searchTerm, selectedCategory])

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { Todos: helpItems.length }
        for (const item of helpItems) {
            counts[item.category] = (counts[item.category] || 0) + 1
        }
        return counts
    }, [])

    const handleCopyLink = (anchor: string) => {
        if (typeof window === 'undefined') return
        const url = `${window.location.origin}/dashboard/help#${anchor}`
        navigator.clipboard.writeText(url)
        setCopiedAnchor(anchor)
        setTimeout(() => setCopiedAnchor(null), 2500)
    }

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/40 py-8 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto max-w-7xl space-y-8">
                {/* Header Institucional Premium */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-sm shrink-0">
                                <HelpCircle className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                        Guia de Ajuda Integrado
                                    </h1>
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        {helpItems.length} Módulos Catalogados
                                    </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-3xl leading-relaxed">
                                    Manual técnico e operacional oficial da plataforma CliniGo. Cada item do menu, fluxo clínico, módulo financeiro e configuração da clínica detalhado com objetivos, quando usar e passos práticos de operação.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <Link href="/dashboard">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition min-h-[44px]"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Voltar ao Painel</span>
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Barra de Pesquisa e Atalhos */}
                    <div className="mt-8 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                id="help-search-input"
                                type="text"
                                placeholder="Pesquise por qualquer funcionalidade, código ou termo... (Ex: controle de faltas, biometria, DRE, TISS, soap, WhatsApp)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm sm:text-base min-h-[48px]"
                            />
                            {searchTerm ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                                    title="Limpar pesquisa"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : (
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                                    Pressione /
                                </span>
                            )}
                        </div>

                        {/* Filtros de Categoria */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
                            {categories.map(cat => {
                                const count = categoryCounts[cat] || 0
                                const isSelected = selectedCategory === cat
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition min-h-[44px]",
                                            isSelected
                                                ? "bg-emerald-700 text-white shadow-xs"
                                                : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <span>{cat}</span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded-full",
                                            isSelected
                                                ? "bg-emerald-800 text-white"
                                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                        )}>
                                            {count}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Feedback de Resultados */}
                <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <div>
                        Exibindo <strong className="text-slate-800 dark:text-slate-200">{filteredItems.length}</strong> de {helpItems.length} módulos documentados
                        {selectedCategory !== 'Todos' && <span> na categoria <strong>{selectedCategory}</strong></span>}
                        {searchTerm && <span> com o termo &ldquo;<strong>{searchTerm}</strong>&rdquo;</span>}
                    </div>
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(''); setSelectedCategory('Todos'); }}
                            className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                        >
                            Redefinir filtros
                        </button>
                    )}
                </div>

                {/* Grade de Módulos */}
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredItems.map(item => {
                            const Icon = item.icon
                            const anchor = getHelpAnchor(item.title)
                            const isHighlighted = highlightedAnchor === anchor ||
                                highlightedAnchor === item.id ||
                                (item.aliases && item.aliases.includes(highlightedAnchor || ''))
                            const isCopied = copiedAnchor === anchor

                            return (
                                <div
                                    key={item.id}
                                    id={anchor}
                                    className={cn(
                                        "bg-white dark:bg-slate-900 rounded-3xl border p-6 sm:p-7 shadow-xs flex flex-col justify-between scroll-mt-24 transition-all duration-300 relative group",
                                        isHighlighted
                                            ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md bg-emerald-50/10 dark:bg-emerald-950/10"
                                            : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                                    )}
                                >
                                    {/* Âncoras invisíveis para matching de URL */}
                                    <span id={item.id} className="sr-only" />
                                    {item.aliases?.map(alias => (
                                        <span key={alias} id={alias} className="sr-only" />
                                    ))}

                                    <div className="space-y-5">
                                        {/* Topo do Card */}
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                                    {item.category}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                                                    item.minPlan === 'Básico'
                                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                                        : item.minPlan === 'Avançado'
                                                            ? "bg-amber-100/70 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                                            : item.minPlan === 'Professional'
                                                                ? "bg-indigo-100/70 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                                                                : "bg-purple-100/70 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                                )}>
                                                    Plano {item.minPlan}
                                                </span>
                                            </div>

                                            {/* Copiar link direto da âncora */}
                                            <button
                                                type="button"
                                                onClick={() => handleCopyLink(anchor)}
                                                title="Copiar link direto para este módulo"
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[36px]"
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span className="text-emerald-600 font-bold">Copiado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Hash className="w-3.5 h-3.5" />
                                                        <span>#{anchor}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Título e Ícone */}
                                        <div className="flex items-start gap-3.5">
                                            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl group-hover:bg-emerald-100/70 dark:group-hover:bg-emerald-950/50 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition shrink-0">
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                                    {item.title}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Rota: <code className="font-mono text-slate-600 dark:text-slate-300">{item.href}</code>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Blocos Explicativos Profissionais */}
                                        <div className="space-y-3 pt-1">
                                            {/* Para que serve? */}
                                            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 space-y-1">
                                                <h4 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                                                    <span>Para que serve?</span>
                                                </h4>
                                                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                    {item.whatIsIt}
                                                </p>
                                            </div>

                                            {/* Quando usar? */}
                                            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 space-y-1">
                                                <h4 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0" />
                                                    <span>Quando usar?</span>
                                                </h4>
                                                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                    {item.whenToUse}
                                                </p>
                                            </div>

                                            {/* Como utilizar */}
                                            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 space-y-1">
                                                <h4 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                                                    <span>Como utilizar / Operação prática:</span>
                                                </h4>
                                                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                    {item.howToUse}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rodapé do Card com Acesso e Ação Direta */}
                                    <div className="border-t border-slate-200/80 dark:border-slate-800 mt-6 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        {/* Perfis com Acesso */}
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mr-1">
                                                Perfis:
                                            </span>
                                            {item.roles.map(role => (
                                                <span
                                                    key={role}
                                                    className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                                                >
                                                    {role.replace('_', ' ')}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Botão de Ação Direta ao Módulo */}
                                        <Link href={item.href} className="shrink-0">
                                            <button
                                                type="button"
                                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition min-h-[44px] shadow-xs"
                                            >
                                                <span>Acessar Módulo</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs space-y-4 max-w-xl mx-auto">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit mx-auto text-slate-400">
                            <HelpCircle className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nenhum módulo encontrado</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                                Não localizamos itens correspondentes à busca &ldquo;<strong>{searchTerm}</strong>&rdquo;. Tente buscar por palavras-chave mais simples como &ldquo;agenda&rdquo;, &ldquo;faltas&rdquo;, &ldquo;biometria&rdquo;, &ldquo;repasse&rdquo; ou &ldquo;prontuário&rdquo;.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(''); setSelectedCategory('Todos'); }}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition min-h-[44px]"
                        >
                            Limpar filtros e ver todos os módulos
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
