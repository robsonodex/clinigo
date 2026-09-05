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
import { SessionGuardProvider } from '@/components/providers/SessionGuardProvider'

export default async function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Check authentication on server
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/clinica')
    }

    // Check impersonation cookie
    const cookieStore = await cookies()
    const impersonationClinicId = cookieStore.get('impersonation_clinic_id')?.value

    // Fetch clinic slug to check if demo
    const { data: profile } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', user.id)
        .single()

    // Use impersonation clinic_id if active, otherwise use profile clinic_id
    const effectiveClinicId = impersonationClinicId || profile?.clinic_id

    let isDemo = false
    let approvalStatus: string | null = null
    let trialEndsAt: string | null = null
    let paymentConfirmed = true
    let subscriptionDueDate: string | null = null
    if (effectiveClinicId) {
        const { data: clinic } = await supabase
            .from('clinics')
            .select('slug, approval_status, trial_ends_at, payment_confirmed, subscription_due_date')
            .eq('id', effectiveClinicId)
            .single()
        isDemo = clinic?.slug === 'demo'
        approvalStatus = clinic?.approval_status ?? null
        trialEndsAt = clinic?.trial_ends_at ?? null
        paymentConfirmed = clinic?.payment_confirmed !== false
        subscriptionDueDate = clinic?.subscription_due_date ?? null
    }

    const isTrialActive = approvalStatus === 'trial' && (!trialEndsAt || new Date(trialEndsAt) > new Date())

    return (
        <>
            <StaffSignatureGate>
                <SystemRefreshListener clinicId={effectiveClinicId} />
                <DashboardLayout>
                    <ImpersonationBanner />
                    <DemoBanner isDemo={isDemo} />
                    {paymentConfirmed === false && !isDemo && !isTrialActive && (
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
