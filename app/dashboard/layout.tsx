import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DemoBanner } from '@/components/demo/demo-banner'
import { TrialBanner } from '@/components/plans/TrialBanner'
import { StaffSignatureGate } from '@/components/legal/StaffSignatureGate'
import { ImpersonationBanner } from '@/components/impersonation-banner'

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

    // Fetch clinic slug to check if demo
    const { data: profile } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', user.id)
        .single()

    let isDemo = false
    let approvalStatus: string | null = null
    let trialEndsAt: string | null = null
    if (profile?.clinic_id) {
        const { data: clinic } = await supabase
            .from('clinics')
            .select('slug, approval_status, trial_ends_at')
            .eq('id', profile.clinic_id)
            .single()
        isDemo = clinic?.slug === 'demo'
        approvalStatus = clinic?.approval_status ?? null
        trialEndsAt = clinic?.trial_ends_at ?? null
    }

    return (
        <>
            <StaffSignatureGate>
                <DashboardLayout>
                    <ImpersonationBanner />
                    <DemoBanner isDemo={isDemo} />
                    <TrialBanner trialEndsAt={trialEndsAt} approvalStatus={approvalStatus} />
                    {children}
                </DashboardLayout>
                <MobileBottomNav />
            </StaffSignatureGate>
        </>
    )
}
