import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// API /api/billing/notifications
// =======================================================================================================================

// GET - Buscar notificações não lidas
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase.from('users').select('clinic_id').eq('id', user.id).single()

        if (!userData?.clinic_id) {
            return NextResponse.json([])
        }

        // Buscar notificações não lidas
        const { data: notifications } = await supabase
            .from('billing_notifications')
            .select('*')
            .eq('clinic_id', userData.clinic_id)
            .is('read_at', null)
            .order('sent_at', { ascending: false })

        return NextResponse.json(notifications || [])
    } catch (error) {
        console.error('Erro ao buscar notificações:', error)
        return NextResponse.json([])
    }
}

// POST - Marcar notificação como lida
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await req.json()
        const { notification_id } = body

        if (!notification_id) {
            return NextResponse.json({ error: 'notification_id obrigatório' }, { status: 400 })
        }

        // Marcar como lida
        await supabase
            .from('billing_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', notification_id)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Erro ao marcar notificação:', error)
        return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
    }
}
