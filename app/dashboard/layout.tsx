import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

    return <DashboardLayout>{children}</DashboardLayout>
}
