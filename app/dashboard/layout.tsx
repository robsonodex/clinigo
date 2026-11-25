import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
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
import {
    getClinicBlockedRedirectPath,
    isClinicEffectivelyBlocked,
} from '@/lib/auth/clinic-lockdown'
import { evaluateBillingBanner } from '@/lib/utils/billing-banner'
import {
    getCachedUserClinicId,
    setCachedUserClinicId,
    getCachedClinicBannerData,
    setCachedClinicBannerData,
} from '@/lib/utils/clinic-banner-cache'

export default async function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Check authentication on server
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
    const supabase = await createClient()
    const { user } = await getVerifiedUser(supabase, cookieStore)

    if (!user) {
        redirect('/clinica')
    }

    const nowMs = Date.now()

    // Check impersonation cookie
    const impersonationClinicId = cookieStore.get('impersonation_clinic_id')?.value

    // Resolve clinic_id (1º cookie impersonation, 2º header x-clinic-id do middleware, 3º user_metadata, 4º cache 5min, 5º banco)
    let profileClinicId: string | null =
        headerStore.get('x-clinic-id') ||
        (user as any)?.user_metadata?.clinic_id ||
        null
    if (!impersonationClinicId && !profileClinicId) {
        const cachedUserClinic = getCachedUserClinicId(user.id, nowMs)
        if (cachedUserClinic !== undefined) {
            profileClinicId = cachedUserClinic
        } else {
            const { data: profile } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single()
            profileClinicId = profile?.clinic_id || null
            setCachedUserClinicId(user.id, profileClinicId, nowMs)
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
    let clinicAddons: Record<string, any> | null = null
    let scheduledBlockAt: string | null = null
    let blockType: string | null = null
    let manualUnlockOnly = false
    let blockNoticeMessage: string | null = null

    if (effectiveClinicId) {
        const cachedBanner = getCachedClinicBannerData(effectiveClinicId, nowMs)
        if (cachedBanner) {
            isClinicActive = cachedBanner.is_active
            isDemo = cachedBanner.is_demo || cachedBanner.slug === 'demo'
            approvalStatus = cachedBanner.approval_status
            trialEndsAt = cachedBanner.trial_ends_at
            paymentConfirmed = cachedBanner.payment_confirmed
            subscriptionDueDate = cachedBanner.subscription_due_date
            clinicAddons = cachedBanner.addons
            scheduledBlockAt = cachedBanner.scheduled_block_at ?? null
            blockType = cachedBanner.block_type ?? null
            manualUnlockOnly = Boolean(cachedBanner.manual_unlock_only)
            blockNoticeMessage = cachedBanner.block_notice_message ?? null
        } else {
            let clinicRow: Record<string, any> | null = null
            const extendedRes = await supabase
                .from('clinics')
                .select('is_active, slug, is_demo, approval_status, trial_ends_at, payment_confirmed, subscription_due_date, addons, scheduled_block_at, block_type, manual_unlock_only, block_notice_message')
                .eq('id', effectiveClinicId)
                .single()

            if (!extendedRes.error && extendedRes.data) {
                clinicRow = extendedRes.data as Record<string, any>
            } else {
                const legacyRes = await supabase
                    .from('clinics')
                    .select('is_active, slug, is_demo, approval_status, trial_ends_at, payment_confirmed, subscription_due_date, addons')
                    .eq('id', effectiveClinicId)
                    .single()
                clinicRow = (legacyRes.data as Record<string, any> | null) || null
            }

            isClinicActive = clinicRow?.is_active !== false
            isDemo = Boolean(clinicRow?.is_demo) || clinicRow?.slug === 'demo'
            approvalStatus = clinicRow?.approval_status ?? null
            trialEndsAt = clinicRow?.trial_ends_at ?? null
            paymentConfirmed = clinicRow?.payment_confirmed !== false
            subscriptionDueDate = clinicRow?.subscription_due_date ?? null
            clinicAddons = (clinicRow?.addons as Record<string, any>) ?? null
            scheduledBlockAt = clinicRow?.scheduled_block_at ?? null
            blockType = clinicRow?.block_type ?? null
            manualUnlockOnly = Boolean(clinicRow?.manual_unlock_only)
            blockNoticeMessage = clinicRow?.block_notice_message ?? null

            if (clinicRow) {
                setCachedClinicBannerData(effectiveClinicId, {
                    is_active: isClinicActive,
                    slug: clinicRow.slug ?? null,
                    is_demo: Boolean(clinicRow.is_demo),
                    approval_status: approvalStatus,
                    trial_ends_at: trialEndsAt,
                    payment_confirmed: paymentConfirmed,
                    subscription_due_date: subscriptionDueDate,
                    addons: clinicAddons,
                    scheduled_block_at: scheduledBlockAt,
                    block_type: blockType,
                    manual_unlock_only: manualUnlockOnly,
                    block_notice_message: blockNoticeMessage,
                }, nowMs)
            }
        }
    }

    const clinicLockState = {
        is_active: isClinicActive,
        scheduled_block_at: scheduledBlockAt,
        block_type: blockType,
        manual_unlock_only: manualUnlockOnly,
    }

    // Hard Gate no Layout: se a clínica estiver bloqueada ou atingiu o horário agendado de encerramento (exceto impersonação do Super Admin)
    if (isClinicEffectivelyBlocked(clinicLockState, nowMs) && !impersonationClinicId) {
        redirect(getClinicBlockedRedirectPath(clinicLockState))
    }

    const billingBannerEval = evaluateBillingBanner({
        isDemo,
        approvalStatus,
        trialEndsAt,
        paymentConfirmed,
        subscriptionDueDate,
        addons: clinicAddons,
    })

    return (
        <>
            <StaffSignatureGate>
                <AccessDeniedToast />
                <SystemRefreshListener clinicId={effectiveClinicId} />
                <DashboardLayout>
                    <ImpersonationBanner />
                    <DemoBanner isDemo={isDemo} />
                    {billingBannerEval.shouldShow && (
                        <BillingOverdueBanner
                            dueDate={subscriptionDueDate}
                            audience={billingBannerEval.audience}
                        />
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
