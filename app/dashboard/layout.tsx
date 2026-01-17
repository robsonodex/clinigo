import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DemoBanner } from '@/components/demo/demo-banner'

export default async function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Check authentication on server
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch clinic slug to check if demo
    const { data: profile } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', user.id)
        .single()

    let isDemo = false
    if (profile?.clinic_id) {
        const { data: clinic } = await supabase
            .from('clinics')
            .select('slug')
            .eq('id', profile.clinic_id)
            .single()
        isDemo = clinic?.slug === 'demo'
    }

    return (
        <DashboardLayout>
            <DemoBanner isDemo={isDemo} />
            {children}
        </DashboardLayout>
    )
}
