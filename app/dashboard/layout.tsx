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
        } else {
            const { data: clinic } = await supabase
                .from('clinics')
                .select('is_active, slug, is_demo, approval_status, trial_ends_at, payment_confirmed, subscription_due_date, addons')
                .eq('id', effectiveClinicId)
                .single()
            const clinicRow = clinic as Record<string, any> | null
            isClinicActive = clinicRow?.is_active !== false
            isDemo = Boolean(clinicRow?.is_demo) || clinicRow?.slug === 'demo'
            approvalStatus = clinicRow?.approval_status ?? null
            trialEndsAt = clinicRow?.trial_ends_at ?? null
            paymentConfirmed = clinicRow?.payment_confirmed !== false
            subscriptionDueDate = clinicRow?.subscription_due_date ?? null
            clinicAddons = (clinicRow?.addons as Record<string, any>) ?? null

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
                }, nowMs)
            }
        }
    }

    // Hard Gate no Layout: se a clínica estiver bloqueada (is_active === false) e não for impersonação do Super Admin
    if (!isClinicActive && !impersonationClinicId) {
        redirect('/conta-bloqueada')
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
