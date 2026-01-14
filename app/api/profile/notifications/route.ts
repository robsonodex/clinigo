import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Buscar preferências de notificação
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Buscar ou criar preferências
        let { data: prefs, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()

        // Se não existir, criar com defaults
        if (error && error.code === 'PGRST116') {
            const { data: newPrefs, error: createError } = await supabase
                .from('notification_preferences')
                .insert({ user_id: user.id })
                .select()
                .single()

            if (createError) {
                return NextResponse.json({ error: createError.message }, { status: 500 })
            }
            prefs = newPrefs
        } else if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ preferences: prefs })
    } catch (error) {
        console.error('Error fetching notification preferences:', error)
        return NextResponse.json({ error: 'Erro ao buscar preferências' }, { status: 500 })
    }
}

// PATCH - Atualizar preferências
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()

        const { data: updated, error: updateError } = await supabase
            .from('notification_preferences')
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ preferences: updated })
    } catch (error) {
        console.error('Error updating notification preferences:', error)
        return NextResponse.json({ error: 'Erro ao atualizar preferências' }, { status: 500 })
    }
}
