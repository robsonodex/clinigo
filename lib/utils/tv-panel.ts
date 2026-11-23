export type TvLayoutType = 'editorial' | 'executivo' | 'informativo' | 'classico'
export type TvSoundTheme = 'classico' | 'moderno' | 'harmonico' | 'bip'
export type TvVoiceGender = 'feminina' | 'masculina' | 'padrao'
export type TvPrivacyMode = 'full' | 'initials'
export type TvLogoMode = 'clinic' | 'clinigo'

export const VALID_TV_LAYOUTS: readonly TvLayoutType[] = [
    'editorial',
    'executivo',
    'informativo',
    'classico',
] as const

export const VALID_TV_SOUND_THEMES: readonly TvSoundTheme[] = [
    'classico',
    'moderno',
    'harmonico',
    'bip',
] as const

export const VALID_TV_VOICE_GENDERS: readonly TvVoiceGender[] = [
    'feminina',
    'masculina',
    'padrao',
] as const

export const VALID_TV_PRIVACY_MODES: readonly TvPrivacyMode[] = [
    'full',
    'initials',
] as const

export const VALID_TV_LOGO_MODES: readonly TvLogoMode[] = [
    'clinic',
    'clinigo',
] as const

export const OFFICIAL_CLINIGO_LOGO_LIGHT = '/logo_black.svg'
export const OFFICIAL_CLINIGO_LOGO_DARK = '/logo_white.svg'

export interface TvLayoutOption {
    id: TvLayoutType
    title: string
    badge: string
    description: string
    recommendedFor: string
}

export const TV_LAYOUT_OPTIONS: TvLayoutOption[] = [
    {
        id: 'editorial',
        title: 'Editorial Sensorial (Claro)',
        badge: 'Conforto Sensorial · Terapias',
        description: 'Fundo claro porcelana quente (#FAFAF8) com acento Verde Floresta (#155E4B), logotipo da clínica, histórico das últimas chamadas e zero flashes agressivos.',
        recommendedFor: 'Clínicas de Psicologia, ABA/TEA, Fonoaudiologia, TO e ambientes infantis.',
    },
    {
        id: 'executivo',
        title: 'Clínica Executiva (Dark Esmeralda)',
        badge: 'Premium · Alto Contraste',
        description: 'Visual escuro arquitetônico na paleta oficial da marca (#0B1512) com logotipo, cartão de chamada em destaque, últimas chamadas e salas ativas.',
        recommendedFor: 'Recepções amplas, salas de espera com muita luz natural ou clínicas multidisciplinares.',
    },
    {
        id: 'informativo',
        title: 'Painel Dividido (Salas Ao Vivo)',
        badge: 'Tela Dividida',
        description: 'Exibe a chamada principal e histórico à esquerda ao lado da lista permanente de salas, terapeutas e especialidades em atendimento.',
        recommendedFor: 'Clínicas com várias salas operando simultaneamente.',
    },
    {
        id: 'classico',
        title: 'Foco Total (Tipografia Gigante)',
        badge: 'Máxima Legibilidade',
        description: 'Prioriza a leitura imediata do paciente e da sala a longa distância, com logotipo no topo e barra discreta das últimas 3 chamadas na base.',
        recommendedFor: 'TVs menores ou salas de espera compridas.',
    },
]

export function normalizeTvLayout(raw: unknown): TvLayoutType {
    if (typeof raw === 'string' && (VALID_TV_LAYOUTS as readonly string[]).includes(raw)) {
        return raw as TvLayoutType
    }
    return 'classico'
}

export function normalizeTvPrivacyMode(raw: unknown): TvPrivacyMode {
    return raw === 'initials' ? 'initials' : 'full'
}

export function normalizeTvLogoMode(raw: unknown): TvLogoMode {
    return raw === 'clinigo' ? 'clinigo' : 'clinic'
}

/**
 * Resolve o logotipo oficial a ser exibido no Painel de TV e no Totem.
 * - 'clinic': usa o logotipo cadastrado da própria clínica (com fallback seguro para o logo oficial CliniGo se não houver upload)
 * - 'clinigo': exibe o logotipo oficial do CliniGo adaptado ao fundo claro ou escuro
 */
export function resolveTvDisplayLogo(options: {
    logoMode: TvLogoMode
    clinicLogoUrl?: string | null
    clinicName?: string | null
    surface: 'light' | 'dark'
}): { src: string; isClinicLogo: boolean; alt: string } {
    const trimmedClinicLogo = typeof options.clinicLogoUrl === 'string' ? options.clinicLogoUrl.trim() : ''
    if (options.logoMode === 'clinic' && trimmedClinicLogo.length > 0) {
        return {
            src: trimmedClinicLogo,
            isClinicLogo: true,
            alt: options.clinicName?.trim() || 'Logotipo da clínica',
        }
    }

    return {
        src: options.surface === 'light' ? OFFICIAL_CLINIGO_LOGO_LIGHT : OFFICIAL_CLINIGO_LOGO_DARK,
        isClinicLogo: false,
        alt: 'CliniGo',
    }
}

/**
 * Formata o nome do paciente para exibição na TV respeitando o modo de privacidade LGPD.
 * - 'full': exibe o nome completo (padrão)
 * - 'initials': exibe o primeiro nome + inicial do último sobrenome (ex.: "Lucas M.")
 */
export function formatPatientNameForTv(
    fullName: string | null | undefined,
    privacyMode: TvPrivacyMode = 'full'
): string {
    const cleaned = (fullName || '').trim().replace(/\s+/g, ' ')
    if (!cleaned) return 'Paciente'
    if (privacyMode !== 'initials') return cleaned

    const parts = cleaned.split(' ').filter(Boolean)
    if (parts.length === 1) return parts[0]

    const firstName = parts[0]
    const lastPart = parts[parts.length - 1]
    const lastInitial = lastPart.charAt(0).toUpperCase()
    return `${firstName} ${lastInitial}.`
}

/**
 * Nome determinístico do canal Supabase Realtime usado pela TV da clínica (isolado por clinicId).
 */
export function getTvRealtimeChannelName(clinicId: string): string {
    return `tv_panel_realtime_${clinicId}`
}

export interface TvTestCallPayload {
    patientName: string
    roomName: string
    doctorName?: string
    specialty?: string
    ticketNumber?: string | null
    timestamp: number
}

