/**
 * Tipos, constantes e modelos comerciais de alta conversão para automação de prospecção B2B.
 * Uso exclusivo Super Admin — Central Comercial CliniGO.
 */

export const OUTREACH_CAMPAIGN_STATUSES = [
    'DRAFT',
    'RUNNING',
    'PAUSED',
    'COMPLETED',
    'CANCELLED',
] as const

export type OutreachCampaignStatus = (typeof OUTREACH_CAMPAIGN_STATUSES)[number]

export const OUTREACH_DELIVERY_MODES = [
    'ATTACHMENT',
    'TRACKED_LINK',
    'BOTH',
] as const

export type OutreachDeliveryMode = (typeof OUTREACH_DELIVERY_MODES)[number]

export const OUTREACH_RECIPIENT_STATUSES = [
    'PENDING',
    'SENDING',
    'SENT',
    'FOLLOWUP_1_SENT',
    'FOLLOWUP_2_SENT',
    'REPLIED',
    'UNSUBSCRIBED',
    'FAILED',
    'SKIPPED',
] as const

export type OutreachRecipientStatus = (typeof OUTREACH_RECIPIENT_STATUSES)[number]

export const CAMPAIGN_STATUS_META: Record<
    OutreachCampaignStatus,
    { label: string; badgeClass: string; dotClass: string }
> = {
    DRAFT: {
        label: 'Rascunho',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-500',
    },
    RUNNING: {
        label: 'Disparando',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-600',
    },
    PAUSED: {
        label: 'Pausada',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
    },
    COMPLETED: {
        label: 'Concluída',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-600',
    },
    CANCELLED: {
        label: 'Cancelada',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
    },
}

export const RECIPIENT_STATUS_META: Record<
    OutreachRecipientStatus,
    { label: string; badgeClass: string }
> = {
    PENDING: {
        label: 'Na fila',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    SENDING: {
        label: 'Enviando',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    },
    SENT: {
        label: 'Toque 1 enviado',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    FOLLOWUP_1_SENT: {
        label: 'Follow-up D+3',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    FOLLOWUP_2_SENT: {
        label: 'Cadência concluída',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    REPLIED: {
        label: 'Respondeu',
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
    },
    UNSUBSCRIBED: {
        label: 'Descadastrado',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    },
    FAILED: {
        label: 'Falha no envio',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    SKIPPED: {
        label: 'Ignorado',
        badgeClass: 'bg-slate-50 text-slate-500 border-slate-200',
    },
}

export const DELIVERY_MODE_META: Record<
    OutreachDeliveryMode,
    { label: string; description: string }
> = {
    BOTH: {
        label: 'Anexo PDF e Link Rastreável (Recomendado)',
        description:
            'Envia o PDF em anexo e inclui botão para leitura rápida no celular com alerta de abertura em tempo real.',
    },
    ATTACHMENT: {
        label: 'Somente Anexo PDF no e-mail',
        description:
            'Anexa o arquivo diretamente na mensagem enviada pelo contato@clinigo.app.',
    },
    TRACKED_LINK: {
        label: 'Somente Link Rastreável no clinigo.app',
        description:
            'Máxima entregabilidade em filtros anti-spam e aviso imediato quando a clínica abrir o material.',
    },
}

export interface SalesOutreachCampaign {
    id: string
    name: string
    status: OutreachCampaignStatus
    delivery_mode: OutreachDeliveryMode
    vault_document_id: string | null
    subject_step1: string
    body_step1: string
    enable_cadence: boolean
    subject_step2: string
    body_step2: string
    step2_delay_days: number
    subject_step3: string
    body_step3: string
    step3_delay_days: number
    daily_limit: number
    min_interval_minutes: number
    max_interval_minutes: number
    business_hours_only: boolean
    send_start_hour: number
    send_end_hour: number
    sender_name: string
    sender_role: string
    sender_phone: string
    sender_email: string
    total_recipients: number
    sent_count: number
    failed_count: number
    opened_count: number
    replied_count: number
    last_run_at: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    vault_document?: {
        id: string
        title: string
        file_name: string
        mime_type: string
        file_size_bytes: number
    } | null
}

export interface SalesOutreachRecipient {
    id: string
    campaign_id: string
    prospect_id: string | null
    email: string
    contact_name: string
    clinic_name: string
    phone: string
    tracking_token: string
    status: OutreachRecipientStatus
    current_step: number
    next_send_at: string | null
    last_sent_at: string | null
    last_message_id: string | null
    last_error: string | null
    view_count: number
    first_viewed_at: string | null
    last_viewed_at: string | null
    cta_clicks: number
    mx_valid: boolean
    created_at: string
    updated_at: string
}

export interface SalesOutreachSuppression {
    id: string
    email: string
    reason: 'UNSUBSCRIBED' | 'BOUNCE' | 'MANUAL'
    source_campaign_id: string | null
    created_at: string
}

export interface ParsedOutreachContact {
    email: string
    contact_name: string
    clinic_name: string
    phone: string
    inferred_clinic?: boolean
}

export interface ParsePreviewResult {
    valid: ParsedOutreachContact[]
    invalid_lines: Array<{ line: number; raw: string; reason: string }>
    duplicates_removed: number
    suppressed_removed: number
    already_in_crm_count: number
    mx_invalid_emails: string[]
}

export const DEFAULT_DIRECTOR_SIGNATURE = {
    name: 'Robson Oliveira',
    role: 'Diretor',
    company: 'CliniGO',
    phone: '(21) 96696-0684',
    email: 'contato@clinigo.app',
    website: 'clinigo.app',
    tagline: 'Gestão Clínica Multidisciplinar, Terapias Seriadas e Faturamento TISS-ANS',
} as const

export const DEFAULT_OUTREACH_TEMPLATES = {
    subject_step1: 'Apresentação CliniGO para {{clinica}} — terapias seriadas e repasses',
    body_step1: `{{saudacao}}, tudo bem?

Sou Robson Oliveira, diretor da CliniGO. Trabalhamos especificamente com clínicas de terapias multidisciplinares (Fonoaudiologia, Terapia Ocupacional, Psicologia, ABA, Fisioterapia e Psicomotricidade) que precisam acabar com planilhas paralelas no controle de sessões recorrentes, evoluções e repasses por profissional.

Preparei um material executivo objetivo mostrando na prática como estruturamos:
- Agenda recorrente de terapias seriadas com controle real de presença e pacotes
- Prontuário multidisciplinar por especialidade e Portal CliniGO Família
- Folha de repasse automatizada com sigilo por terapeuta e DRE gerencial
- Faturamento TISS-ANS com validação pré-envio e gestão de glosas

Caso faça sentido conhecer no ritmo da sua equipe, liberamos uma avaliação completa de 7 dias gratuitos (sem compromisso e sem cartão).

Fico à disposição por aqui ou direto no meu WhatsApp abaixo.`,

    subject_step2: 'Re: Apresentação CliniGO para {{clinica}} — terapias seriadas e repasses',
    body_step2: `{{saudacao}},

Passando rapidamente para confirmar se o material da CliniGO chegou na sua caixa principal.

Hoje, qual ponto toma mais tempo da gestão aí na {{clinica}}: controle de sessões recorrentes, fechamento de repasses da equipe ou faturamento e glosas de convênios?

Se quiser, posso liberar um ambiente de teste gratuito de 7 dias para vocês explorarem sem compromisso.`,

    subject_step3: 'Encerrando meu contato por aqui — {{clinica}}',
    body_step3: `{{saudacao}},

Imagino que a rotina na {{clinica}} esteja bem corrida esta semana. Vou encerrar meu contato por aqui para não encher sua caixa de entrada.

Deixei o acesso de avaliação gratuita de 7 dias disponível em clinigo.app caso queira testar quando fizer sentido para sua equipe. Se precisar de qualquer apoio, meu WhatsApp segue aberto abaixo.

Sucesso na operação de vocês!`,
} as const

export function buildSmartGreeting(contactName?: string, clinicName?: string): string {
    const cleanContact = (contactName || '').trim()
    if (cleanContact.length >= 2) {
        const firstName = cleanContact.split(/\s+/)[0]
        // Mantém título como Dra. Maria ou Dr. João quando presente
        if (/^(dr\.?|dra\.?)$/i.test(firstName) && cleanContact.split(/\s+/).length >= 2) {
            const second = cleanContact.split(/\s+/)[1]
            return `Olá, ${firstName} ${second}`
        }
        return `Olá, ${firstName}`
    }

    const cleanClinic = (clinicName || '').trim()
    if (cleanClinic.length >= 2 && cleanClinic.toLowerCase() !== 'sua clínica') {
        return `Olá, equipe da ${cleanClinic}`
    }

    return 'Olá'
}

export function interpolateOutreachTemplate(
    template: string,
    ctx: {
        contact_name?: string
        clinic_name?: string
        email?: string
        phone?: string
    }
): string {
    const cleanContact = (ctx.contact_name || '').trim()
    const cleanClinic = (ctx.clinic_name || '').trim() || 'sua clínica'
    const greeting = buildSmartGreeting(cleanContact, ctx.clinic_name)

    const replacements: Record<string, string> = {
        saudacao: greeting,
        nome: cleanContact || 'equipe',
        responsavel: cleanContact || 'equipe',
        clinica: cleanClinic,
        email: (ctx.email || '').trim(),
        telefone: (ctx.phone || '').trim(),
    }

    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
        const normalized = key.toLowerCase()
        return normalized in replacements ? replacements[normalized] : match
    })
}

export function buildOutreachWhatsappMessage(contact: {
    contact_name?: string
    clinic_name?: string
    email: string
}): string {
    const greeting = buildSmartGreeting(contact.contact_name, contact.clinic_name)
    const clinicPart =
        contact.clinic_name && contact.clinic_name.trim().length >= 2
            ? ` da ${contact.clinic_name.trim()}`
            : ''
    return `${greeting}, tudo bem? Sou Robson Oliveira, diretor da CliniGO. Acabei de enviar no e-mail ${contact.email} um material executivo sobre gestão de terapias seriadas, repasses e faturamento TISS para clínicas${clinicPart}. Chegou certinho ou caiu no spam?`
}

