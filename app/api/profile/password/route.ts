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

        const { currentPassword, newPassword } = await request.json()

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Senhas obrigatórias' }, { status: 400 })
        }

        // Verificar senha atual fazendo login
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password: currentPassword,
        })

        if (signInError) {
            return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
        }

        // Atualizar senha
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        })

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // Registrar atividade
        await supabase.from('activity_log').insert({
            user_id: user.id,
            action: 'password_change',
            description: 'Senha alterada',
        })

        // Encerrar outras sessões (opcional, requer implementação adicional)

        return NextResponse.json({ message: 'Senha alterada com sucesso' })
    } catch (error) {
        console.error('Error changing password:', error)
        return NextResponse.json({ error: 'Erro ao alterar senha' }, { status: 500 })
    }
}
