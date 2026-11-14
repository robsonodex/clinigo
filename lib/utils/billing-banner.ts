export type BillingBannerMode = 'off' | 'on' | 'scheduled'
export type BillingBannerAudience = 'all' | 'admin_only'
export type BillingBannerStage = 'none' | 'upcoming' | 'due_today' | 'overdue'

export interface BillingBannerConfig {
    mode: BillingBannerMode
    active_from?: string | null
    audience?: BillingBannerAudience
    updated_at?: string | null
    updated_by?: string | null
}

export interface EvaluateBillingBannerInput {
    isDemo?: boolean | null
    approvalStatus?: string | null
    trialEndsAt?: string | null
    paymentConfirmed?: boolean | null
    subscriptionDueDate?: string | null
    addons?: Record<string, any> | null
    now?: Date
}

export interface EvaluatedBillingBanner {
    shouldShow: boolean
    audience: BillingBannerAudience
    stage: BillingBannerStage
    mode: BillingBannerMode
    activeFrom: string | null
    dueDateClean: string
    todayStr: string
}

/**
 * Returns today's date in YYYY-MM-DD formatted in America/Sao_Paulo timezone.
 */
export function getTodayBrtStr(date: Date = new Date()): string {
    if (typeof Intl !== 'undefined') {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)
    }
    return date.toISOString().split('T')[0]
}

/**
 * Normalizes ISO timestamps or YYYY-MM-DD strings into YYYY-MM-DD.
 */
export function normalizeDateStr(value: string | null | undefined): string {
    if (!value) return ''
    const clean = String(value).trim().split('T')[0]
    return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : ''
}

/**
 * Formats YYYY-MM-DD into DD/MM/YYYY for UI display.
 */
export function formatDateBr(value: string | null | undefined): string {
    const clean = normalizeDateStr(value)
    if (!clean) return ''
    const [year, month, day] = clean.split('-')
    return `${day}/${month}/${year}`
}

/**
 * Extracts and validates the billing_banner config stored inside clinics.addons.
 */
export function parseBillingBannerConfig(addons: unknown): BillingBannerConfig | null {
    if (!addons || typeof addons !== 'object') return null
    const raw = (addons as Record<string, any>).billing_banner
    if (!raw || typeof raw !== 'object') return null

    const mode = raw.mode
    if (mode !== 'off' && mode !== 'on' && mode !== 'scheduled') {
        return null
    }

    const audience: BillingBannerAudience =
        raw.audience === 'admin_only' ? 'admin_only' : 'all'

    const activeFrom = normalizeDateStr(raw.active_from) || null

    return {
        mode,
        active_from: activeFrom,
        audience,
        updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
        updated_by: typeof raw.updated_by === 'string' ? raw.updated_by : null,
    }
}

/**
 * Returns a merged clinics.addons object with billing_banner explicitly reset to off.
 */
export function resetBillingBannerAddons(
    addons: unknown,
    updatedBy?: string | null
): Record<string, any> {
    const base = addons && typeof addons === 'object' ? { ...(addons as Record<string, any>) } : {}
    const existing = parseBillingBannerConfig(base)
    return {
        ...base,
        billing_banner: {
            mode: 'off' as BillingBannerMode,
            active_from: null,
            audience: existing?.audience ?? 'all',
            updated_at: new Date().toISOString(),
            updated_by: updatedBy ?? null,
        },
    }
}

/**
 * Returns a merged clinics.addons object with billing_banner enabled immediately.
 */
export function enableBillingBannerAddons(
    addons: unknown,
    updatedBy?: string | null
): Record<string, any> {
    const base = addons && typeof addons === 'object' ? { ...(addons as Record<string, any>) } : {}
    const existing = parseBillingBannerConfig(base)
    return {
        ...base,
        billing_banner: {
            mode: 'on' as BillingBannerMode,
            active_from: null,
            audience: existing?.audience ?? 'all',
            updated_at: new Date().toISOString(),
            updated_by: updatedBy ?? null,
        },
    }
}

/**
 * Evaluates whether the billing banner should be displayed at the given instant.
 */
export function evaluateBillingBanner(
    input: EvaluateBillingBannerInput
): EvaluatedBillingBanner {
    const now = input.now ?? new Date()
    const todayStr = getTodayBrtStr(now)
    const dueDateClean = normalizeDateStr(input.subscriptionDueDate)
    const config = parseBillingBannerConfig(input.addons)
    const audience: BillingBannerAudience = config?.audience ?? 'all'
    const activeFrom = config?.active_from ?? null

    const isTrialActive =
        input.approvalStatus === 'trial' &&
        (!input.trialEndsAt || new Date(input.trialEndsAt) > now)

    if (input.isDemo || isTrialActive) {
        return {
            shouldShow: false,
            audience,
            stage: 'none',
            mode: config?.mode ?? 'off',
            activeFrom,
            dueDateClean,
            todayStr,
        }
    }

    let shouldShow = false
    let effectiveMode: BillingBannerMode = 'off'

    if (config) {
        effectiveMode = config.mode
        if (config.mode === 'on') {
            shouldShow = true
        } else if (config.mode === 'scheduled') {
            shouldShow = Boolean(activeFrom && todayStr >= activeFrom)
        } else {
            shouldShow = false
        }
    } else {
        // Legacy fallback when clinics.addons.billing_banner has not been configured yet
        const legacyOverdue = Boolean(
            input.paymentConfirmed === false &&
            dueDateClean &&
            (dueDateClean <= todayStr || new Date(`${dueDateClean}T00:00:00`).getTime() <= now.getTime())
        )
        shouldShow = legacyOverdue
        effectiveMode = legacyOverdue ? 'on' : 'off'
    }

    let stage: BillingBannerStage = 'none'
    if (shouldShow) {
        if (dueDateClean && dueDateClean > todayStr) {
            stage = 'upcoming'
        } else if (dueDateClean && dueDateClean === todayStr) {
            stage = 'due_today'
        } else {
            stage = 'overdue'
        }
    }

    return {
        shouldShow,
        audience,
        stage,
        mode: effectiveMode,
        activeFrom,
        dueDateClean,
        todayStr,
    }
}

