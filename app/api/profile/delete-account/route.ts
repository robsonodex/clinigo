import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { reason, feedback, password } = await request.json()

        if (!reason || !password) {
            return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
        }

        // Verificar senha
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password,
        })

        if (signInError) {
            return NextResponse.json({ error: 'Senha incorreta' }, { status: 400 })
        }

        // Criar solicitação de exclusão (30 dias)
        const scheduledDate = new Date()
        scheduledDate.setDate(scheduledDate.getDate() + 30)

        const { error: deleteRequestError } = await supabase
            .from('account_deletion_requests')
            .upsert({
                user_id: user.id,
                reason,
                feedback: feedback || null,
                status: 'pending',
                requested_at: new Date().toISOString(),
                scheduled_deletion_at: scheduledDate.toISOString(),
            })

        if (deleteRequestError) {
            return NextResponse.json({ error: deleteRequestError.message }, { status: 500 })
        }

        // TODO: Enviar email de confirmação

        return NextResponse.json({
            message: 'Solicitação de exclusão registrada',
            scheduled_deletion_at: scheduledDate,
        })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 })
    }
}

// DELETE - Cancelar exclusão
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { error } = await supabase
            .from('account_deletion_requests')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('status', 'pending')

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ message: 'Exclusão cancelada' })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao cancelar' }, { status: 500 })
    }
}
