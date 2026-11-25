import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSuperAdminEmailWhitelisted } from '@/app/api/super-admin/prospeccao/_auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'HQ de Prospecção B2B — CliniGO',
    description: 'Operação comercial privada de uso interno.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            'max-snippet': 0,
        },
    },
}

export default async function SalesProspectingHqLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        notFound()
    }

    if (!isSuperAdminEmailWhitelisted(user.email)) {
        const supabaseAdmin = createServiceRoleClient()
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if ((profile as { role?: string } | null)?.role !== 'SUPER_ADMIN') {
            notFound()
        }
    }

    return <>{children}</>
}

