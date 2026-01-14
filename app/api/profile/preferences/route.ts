import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        let { data: prefs, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (error && error.code === 'PGRST116') {
            const { data: newPrefs, error: createError } = await supabase
                .from('user_preferences')
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
        return NextResponse.json({ error: 'Erro ao buscar preferências' }, { status: 500 })
    }
}

// PATCH
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()

        const { data: updated, error: updateError } = await supabase
            .from('user_preferences')
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
        return NextResponse.json({ error: 'Erro ao atualizar preferências' }, { status: 500 })
    }
}
