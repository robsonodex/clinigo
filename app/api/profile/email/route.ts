import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { emailChangeSchema } from '@/lib/validations/profile-schema'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()
        
        // Validação com Zod
        const validatedData = emailChangeSchema.parse(body)

        // Supabase update user email
        const { data, error } = await supabase.auth.updateUser({
            email: validatedData.newEmail,
        })

        if (error) {
            console.error('Error updating email in Supabase:', error)
            return NextResponse.json({ error: error.message || 'Erro ao atualizar e-mail.' }, { status: 400 })
        }

        return NextResponse.json({ 
            success: true, 
            message: 'E-mail atualizado. Verifique sua caixa de entrada.',
            user: data.user 
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
        }
        
        console.error('Error updating email:', error)
        return NextResponse.json({ error: 'Erro interno ao atualizar e-mail' }, { status: 500 })
    }
}
