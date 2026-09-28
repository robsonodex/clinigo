import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/super-admin/revalidate
 * Force hard-refresh (cache purge) for a specific clinic's pages.
 * Equivalent to Ctrl+Shift+R on the clinic side.
 */
export async function POST(request: NextRequest) {
    try {
        const authClient = await createClient()
        const { data: { user } } = await authClient.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Verify super admin
        const { data: profile } = await authClient
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

        // 1. Purge all Next.js server cache
        revalidatePath('/dashboard', 'layout')
        revalidatePath('/dashboard/relatorios', 'page')
        revalidatePath('/dashboard/pagamentos', 'page')
        revalidatePath('/dashboard/financeiro', 'page')
        revalidatePath('/dashboard/financial', 'layout')
        revalidatePath('/api/reports', 'page')
        revalidatePath('/api/financial', 'layout')

        // 2. Trigger real-time reload on active client browsers using Service Role Client
        // O Super Admin possui clinic_id = null, portanto o RLS padrão de clinics bloquearia o update.
        const supabaseAdmin = createServiceRoleClient()

        // 2.1 Atualiza clinics no banco para disparar postgres_changes
        const { error: updateError } = await supabaseAdmin
            .from('clinics')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', clinicId)

        if (updateError) {
            console.error('Error updating clinic updated_at:', updateError)
            return NextResponse.json({ error: 'Erro ao notificar banco de dados' }, { status: 500 })
        }

        // 2.2 Envia broadcast no canal dedicado da clínica como reforço instantâneo
        try {
            const channel = supabaseAdmin.channel(`clinic-cache-update-${clinicId}`)
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'hard-refresh',
                        payload: { timestamp: Date.now(), trigger: 'master-hub' }
                    })
                }
            })
        } catch (bcError) {
            console.warn('Realtime broadcast warning:', bcError)
        }

        return NextResponse.json({
            success: true,
            message: `Cache limpo para "${clinicName || clinicId}". Os navegadores ativos da clínica foram notificados para recarregar.`
        })
    } catch (error) {
        console.error('Revalidate error:', error)
        return NextResponse.json({ error: 'Erro ao limpar cache' }, { status: 500 })
    }
}
