export interface CachedClinicBannerData {
    is_active: boolean
    slug: string | null
    is_demo: boolean
    approval_status: string | null
    trial_ends_at: string | null
    payment_confirmed: boolean
    subscription_due_date: string | null
    addons: Record<string, any> | null
    expiresAt: number
}

export const LAYOUT_CACHE_TTL_MS = 60_000

const _userClinicIdCache = new Map<string, { clinicId: string | null; expiresAt: number }>()
const _clinicBannerDataCache = new Map<string, CachedClinicBannerData>()

export function getCachedUserClinicId(userId: string, nowMs: number): string | null | undefined {
    const entry = _userClinicIdCache.get(userId)
    if (entry && nowMs < entry.expiresAt) {
        return entry.clinicId
    }
    return undefined
}

export function setCachedUserClinicId(userId: string, clinicId: string | null, nowMs: number): void {
    _userClinicIdCache.set(userId, {
        clinicId,
        expiresAt: nowMs + LAYOUT_CACHE_TTL_MS,
    })
}

export function getCachedClinicBannerData(
    clinicId: string,
    nowMs: number
): CachedClinicBannerData | undefined {
    const entry = _clinicBannerDataCache.get(clinicId)
    if (entry && nowMs < entry.expiresAt) {
        return entry
    }
    return undefined
}

export function setCachedClinicBannerData(
    clinicId: string,
    data: Omit<CachedClinicBannerData, 'expiresAt'>,
    nowMs: number
): void {
    _clinicBannerDataCache.set(clinicId, {
        ...data,
        expiresAt: nowMs + LAYOUT_CACHE_TTL_MS,
    })
}

/**
 * Invalidates the in-memory layout banner cache for a clinic immediately
 * after super-admin toggles or payment confirmations.
 */
export function invalidateClinicBannerCache(clinicId: string): void {
    _clinicBannerDataCache.delete(clinicId)
}

