import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSuperAdminEmailWhitelisted } from '@/app/api/super-admin/prospeccao/_auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Central Privada de Contratos Comerciais — CliniGo',
    description: 'Emissão, edição e arquivamento privado de contratos comerciais SaaS.',
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

export default async function CommercialContractsLayout({
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

