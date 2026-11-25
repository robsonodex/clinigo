/**
 * Tipos e constantes compartilhados do HQ de Prospecção B2B (Super Admin)
 * CliniGo — Uso estritamente interno (SUPER_ADMIN)
 */

export const FUNNEL_STATUSES = [
    'ABORDADO',
    'RESPONDEU',
    'MATERIAL_ENVIADO',
    'DEMO_AGENDADA',
    'FECHADO',
    'PERDIDO',
] as const

export type FunnelStatus = (typeof FUNNEL_STATUSES)[number]

export const FUNNEL_STATUS_META: Record<
    FunnelStatus,
    { label: string; shortLabel: string; badgeClass: string; dotClass: string }
> = {
    ABORDADO: {
        label: 'Abordado',
        shortLabel: 'Abordado',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-500',
    },
    RESPONDEU: {
        label: 'Respondeu',
        shortLabel: 'Respondeu',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
    },
    MATERIAL_ENVIADO: {
        label: 'Material Enviado',
        shortLabel: 'Material',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-600',
    },
    DEMO_AGENDADA: {
        label: 'Em Avaliação (7 dias)',
        shortLabel: 'Avaliação',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dotClass: 'bg-indigo-600',
    },
    FECHADO: {
        label: 'Fechado',
        shortLabel: 'Fechado',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-600',
    },
    PERDIDO: {
        label: 'Perdido / Pausado',
        shortLabel: 'Perdido',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
    },
}

export const VAULT_CATEGORIES = [
    'Apresentação',
    'Modelo PDF',
    'Proposta',
    'Contrato',
    'Material TISS',
    'Outro',
] as const

export type VaultCategory = (typeof VAULT_CATEGORIES)[number]

export const SCRIPT_STAGES = [
    'PRIMEIRO_CONTATO',
    'ENVIO_MATERIAL',
    'FOLLOWUP_3D',
    'FOLLOWUP_7D',
    'CONVITE_DEMO',
    'WHATSAPP',
    'OBJECOES',
] as const

export type ScriptStage = (typeof SCRIPT_STAGES)[number]

export const SCRIPT_STAGE_LABELS: Record<ScriptStage, string> = {
    PRIMEIRO_CONTATO: 'Primeiro Contato',
    ENVIO_MATERIAL: 'Envio do PDF',
    FOLLOWUP_3D: 'Follow-up D+3',
    FOLLOWUP_7D: 'Follow-up D+7',
    CONVITE_DEMO: 'Teste 7 Dias e Proposta',
    WHATSAPP: 'WhatsApp',
    OBJECOES: 'Objeções',
}

export const SCRIPT_CHANNELS = ['EMAIL', 'WHATSAPP'] as const
export type ScriptChannel = (typeof SCRIPT_CHANNELS)[number]

export type PdfDocumentType = 'CONTINUIDADE' | 'EXECUTIVA' | 'PROPOSTA'

export const PDF_DOCUMENT_LABELS: Record<PdfDocumentType, string> = {
    CONTINUIDADE: 'Relatório de Continuidade',
    EXECUTIVA: 'Apresentação Executiva (1p)',
    PROPOSTA: 'Proposta Comercial',
}

export const COMMON_SPECIALTIES = [
    'Fonoaudiologia',
    'Terapia Ocupacional',
    'Psicologia (ABA)',
    'Psicomotricidade',
    'Fisioterapia Pediátrica',
    'Psicopedagogia',
    'Musicoterapia',
    'Nutrição Comportamental',
] as const

export interface SalesProspect {
    id: string
    clinic_name: string
    program_focus: string
    specialties: string[]
    contact_name: string
    email: string
    whatsapp: string
    city_state: string
    funnel_status: FunnelStatus
    estimated_professionals: number
    notes: string
    last_contact_at: string
    next_followup_at: string | null
    pdf_sent_types: string[]
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface SalesVaultDocument {
    id: string
    title: string
    category: VaultCategory
    description: string
    file_name: string
    file_path: string
    mime_type: string
    file_size_bytes: number
    uploaded_by: string | null
    created_at: string
}

export interface SalesScriptTemplate {
    id: string
    title: string
    stage: ScriptStage
    channel: ScriptChannel
    subject_template: string
    body_template: string
    is_default: boolean
    sort_order: number
    created_by: string | null
    created_at: string
    updated_at: string
}

export function getTodayIsoDateBrasilia(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function addDaysIsoDate(days: number): string {
    const base = new Date()
    base.setDate(base.getDate() + days)
    return base.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export type FollowupUrgency = 'overdue' | 'today' | 'upcoming' | 'none'

export function getFollowupUrgency(prospect: Pick<SalesProspect, 'next_followup_at' | 'funnel_status'>): FollowupUrgency {
    if (!prospect.next_followup_at) return 'none'
    if (prospect.funnel_status === 'FECHADO' || prospect.funnel_status === 'PERDIDO') return 'none'

    const today = getTodayIsoDateBrasilia()
    const target = prospect.next_followup_at.slice(0, 10)
    if (target < today) return 'overdue'
    if (target === today) return 'today'
    return 'upcoming'
}

export function normalizeWhatsappDigits(raw: string): string {
    const digits = (raw || '').replace(/\D/g, '')
    if (!digits) return ''
    if (digits.startsWith('55') && digits.length >= 12) return digits
    if (digits.length === 10 || digits.length === 11) return `55${digits}`
    return digits
}

export function buildWhatsappUrl(phone: string, text?: string): string | null {
    const digits = normalizeWhatsappDigits(phone)
    if (!digits) return null
    const base = `https://wa.me/${digits}`
    if (!text) return base
    return `${base}?text=${encodeURIComponent(text)}`
}

export function buildMailtoUrl(email: string, subject: string, body: string): string | null {
    const trimmed = (email || '').trim()
    if (!trimmed) return null
    return `mailto:${encodeURIComponent(trimmed)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = bytes / Math.pow(1024, idx)
    return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`
}

