import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DemoBanner } from '@/components/demo/demo-banner'
import { TrialBanner } from '@/components/plans/TrialBanner'
import { BillingOverdueBanner } from '@/components/plans/BillingOverdueBanner'
import { StaffSignatureGate } from '@/components/legal/StaffSignatureGate'
import { DoctorPendingTermsBanner } from '@/components/doctors/DoctorPendingTermsBanner'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { SystemRefreshListener } from '@/components/system/system-refresh-listener'
import { AccessDeniedToast } from '@/components/system/access-denied-toast'

import { getVerifiedUser } from '@/lib/auth/verify-token'

// Cache em memória de curta duração (60s TTL) para evitar 2 queries repetidas ao Supabase a cada navegação RSC
const LAYOUT_CACHE_TTL_MS = 60_000
const _userClinicIdCache = new Map<string, { clinicId: string | null; expiresAt: number }>()
const _clinicBannerDataCache = new Map<string, {
    is_active: boolean
    slug: string | null
    approval_status: string | null
    trial_ends_at: string | null
    payment_confirmed: boolean
    subscription_due_date: string | null
    expiresAt: number
}>()

export default async function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Check authentication on server
    const cookieStore = await cookies()
    const supabase = await createClient()
    const { user } = await getVerifiedUser(supabase, cookieStore)

    if (!user) {
        redirect('/clinica')
    }

    const nowMs = Date.now()

    // Check impersonation cookie
    const impersonationClinicId = cookieStore.get('impersonation_clinic_id')?.value

    // Resolve clinic_id (1º cookie impersonation, 2º user_metadata, 3º cache 60s, 4º query no banco)
    let profileClinicId: string | null = (user as any)?.user_metadata?.clinic_id || null
    if (!impersonationClinicId && !profileClinicId) {
        const cachedUserClinic = _userClinicIdCache.get(user.id)
        if (cachedUserClinic && nowMs < cachedUserClinic.expiresAt) {
            profileClinicId = cachedUserClinic.clinicId
        } else {
            const { data: profile } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single()
            profileClinicId = profile?.clinic_id || null
            _userClinicIdCache.set(user.id, {
                clinicId: profileClinicId,
                expiresAt: nowMs + LAYOUT_CACHE_TTL_MS,
            })
        }
    }

    // Use impersonation clinic_id if active, otherwise use profile clinic_id
    const effectiveClinicId = impersonationClinicId || profileClinicId || undefined

    let isClinicActive = true
    let isDemo = false
    let approvalStatus: string | null = null
    let trialEndsAt: string | null = null
    let paymentConfirmed = true
    let subscriptionDueDate: string | null = null

    if (effectiveClinicId) {
        const cachedBanner = _clinicBannerDataCache.get(effectiveClinicId)
        if (cachedBanner && nowMs < cachedBanner.expiresAt) {
            isClinicActive = cachedBanner.is_active
            isDemo = cachedBanner.slug === 'demo'
            approvalStatus = cachedBanner.approval_status
            trialEndsAt = cachedBanner.trial_ends_at
            paymentConfirmed = cachedBanner.payment_confirmed
            subscriptionDueDate = cachedBanner.subscription_due_date
        } else {
            const { data: clinic } = await supabase
                .from('clinics')
                .select('is_active, slug, approval_status, trial_ends_at, payment_confirmed, subscription_due_date')
                .eq('id', effectiveClinicId)
                .single()
            isClinicActive = clinic?.is_active !== false
            isDemo = clinic?.slug === 'demo'
            approvalStatus = clinic?.approval_status ?? null
            trialEndsAt = clinic?.trial_ends_at ?? null
            paymentConfirmed = clinic?.payment_confirmed !== false
            subscriptionDueDate = clinic?.subscription_due_date ?? null

            if (clinic) {
                _clinicBannerDataCache.set(effectiveClinicId, {
                    is_active: isClinicActive,
                    slug: clinic.slug ?? null,
                    approval_status: approvalStatus,
                    trial_ends_at: trialEndsAt,
                    payment_confirmed: paymentConfirmed,
                    subscription_due_date: subscriptionDueDate,
                    expiresAt: nowMs + LAYOUT_CACHE_TTL_MS,
                })
            }
        }
    }

    // Hard Gate no Layout: se a clínica estiver bloqueada (is_active === false) e não for impersonação do Super Admin
    if (!isClinicActive && !impersonationClinicId) {
        redirect('/conta-bloqueada')
    }

    const isTrialActive = approvalStatus === 'trial' && (!trialEndsAt || new Date(trialEndsAt) > new Date())

    // Exibe banner de cobrança se o pagamento não foi confirmado E a data de vencimento é hoje ou já expirou
    const now = new Date()
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now)
    const isSubscriptionOverdue = Boolean(
        paymentConfirmed === false &&
        !isDemo &&
        !isTrialActive &&
        subscriptionDueDate &&
        (subscriptionDueDate <= todayStr || new Date(`${subscriptionDueDate}T00:00:00`).getTime() <= now.getTime())
    )

    return (
        <>
            <StaffSignatureGate>
                <AccessDeniedToast />
                <SystemRefreshListener clinicId={effectiveClinicId} />
                <DashboardLayout>
                    <ImpersonationBanner />
                    <DemoBanner isDemo={isDemo} />
                    {isSubscriptionOverdue && (
                        <BillingOverdueBanner dueDate={subscriptionDueDate} />
                    )}
                    <TrialBanner trialEndsAt={trialEndsAt} approvalStatus={approvalStatus} />
                    <DoctorPendingTermsBanner />
                    {children}
                </DashboardLayout>
                <MobileBottomNav />
            </StaffSignatureGate>
        </>
    )
}
