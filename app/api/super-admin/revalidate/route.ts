import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/super-admin/revalidate
 * Force hard-refresh (cache purge) for a specific clinic's pages.
 * Equivalent to Ctrl+Shift+R on the clinic side.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Verify super admin
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if ((profile as any)?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        const { clinicId, clinicName } = await request.json()

        if (!clinicId) {
            return NextResponse.json({ error: 'clinicId obrigatório' }, { status: 400 })
        }

        // Purge all cached pages for the dashboard
        revalidatePath('/dashboard', 'layout')
        revalidatePath('/dashboard/relatorios', 'page')
        revalidatePath('/dashboard/pagamentos', 'page')
        revalidatePath('/dashboard/financeiro', 'page')
        revalidatePath('/dashboard/financial', 'layout')
        revalidatePath('/api/reports', 'page')
        revalidatePath('/api/financial', 'layout')

        return NextResponse.json({
            success: true,
            message: `Cache limpo para "${clinicName || clinicId}". Os dados serão recalculados no próximo acesso.`
        })
    } catch (error) {
        console.error('Revalidate error:', error)
        return NextResponse.json({ error: 'Erro ao limpar cache' }, { status: 500 })
    }
}
