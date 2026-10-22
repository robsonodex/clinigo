import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Buscar preferências de notificação
export const GET = withAxiom(async (request: AxiomRequest) => {
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
        request.log.error('profile/notifications', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error fetching notification preferences:', error)
        return NextResponse.json({ error: 'Erro ao buscar preferências' }, { status: 500 })
    }
})

// PATCH - Atualizar preferências
export const PATCH = withAxiom(async (request: AxiomRequest) => {
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
        request.log.error('profile/notifications', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error updating notification preferences:', error)
        return NextResponse.json({ error: 'Erro ao atualizar preferências' }, { status: 500 })
    }
})
