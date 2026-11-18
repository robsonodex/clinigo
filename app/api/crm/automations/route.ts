import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getClinicContext() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Não autorizado', status: 401 as const }
    }

    const { data: userData } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', user.id)
        .single()

    const clinicId = (userData as any)?.clinic_id as string | undefined
    if (!clinicId) {
        return { error: 'Clínica não encontrada', status: 400 as const }
    }

    return { supabase, user, clinicId }
}

// GET: List automation rules
export const GET = withAxiom(async () => {
    try {
        const ctx = await getClinicContext()
        if ('error' in ctx) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status })
        }

        const { supabase, clinicId } = ctx
        const { data: rules, error } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[GET /api/crm/automations] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao buscar automações' }, { status: 500 })
        }

        return NextResponse.json({ rules: rules || [] })
    } catch (error) {
        console.error('[GET /api/crm/automations] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})

// POST: Create automation rule
export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const ctx = await getClinicContext()
        if ('error' in ctx) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status })
        }

        const { supabase, user, clinicId } = ctx
        const body = await request.json()
        const { name, description, trigger, trigger_filters, actions, is_active = true } = body

        const trimmedName = typeof name === 'string' ? name.trim() : ''
        if (!trimmedName || !trigger || !Array.isArray(actions) || actions.length === 0) {
            return NextResponse.json({
                error: 'Campos obrigatórios: name, trigger, actions'
            }, { status: 400 })
        }

        const { data: rule, error } = await supabase
            .from('automation_rules')
            .insert({
                clinic_id: clinicId,
                name: trimmedName,
                description: typeof description === 'string' ? description.trim() || null : null,
                trigger: String(trigger),
                trigger_filters: trigger_filters || {},
                actions,
                is_active: Boolean(is_active),
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            request.log.error('crm/automations/post', { error: error.message })
            console.error('[POST /api/crm/automations] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao criar automação' }, { status: 500 })
        }

        return NextResponse.json({ rule }, { status: 201 })
    } catch (error) {
        request.log.error('crm/automations', { error: error instanceof Error ? error.message : String(error) })
        console.error('[POST /api/crm/automations] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})

// PATCH: Update or toggle automation rule
export const PATCH = withAxiom(async (request: AxiomRequest) => {
    try {
        const ctx = await getClinicContext()
        if ('error' in ctx) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status })
        }

        const { supabase, clinicId } = ctx
        const body = await request.json()
        const id = body?.id

        if (!id || typeof id !== 'string') {
            return NextResponse.json({ error: 'ID da automação é obrigatório' }, { status: 400 })
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        }

        if (body.name !== undefined) {
            const trimmed = String(body.name).trim()
            if (!trimmed) {
                return NextResponse.json({ error: 'Nome da automação é obrigatório' }, { status: 400 })
            }
            updates.name = trimmed
        }
        if (body.description !== undefined) {
            updates.description = body.description ? String(body.description).trim() : null
        }
        if (body.trigger !== undefined) {
            updates.trigger = String(body.trigger)
        }
        if (body.trigger_filters !== undefined) {
            updates.trigger_filters = body.trigger_filters || {}
        }
        if (body.actions !== undefined) {
            if (!Array.isArray(body.actions) || body.actions.length === 0) {
                return NextResponse.json({ error: 'Informe ao menos uma ação' }, { status: 400 })
            }
            updates.actions = body.actions
        }
        if (body.is_active !== undefined) {
            updates.is_active = Boolean(body.is_active)
        }

        const { data: rule, error } = await supabase
            .from('automation_rules')
            .update(updates)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .select()
            .maybeSingle()

        if (error) {
            request.log.error('crm/automations/patch', { error: error.message })
            console.error('[PATCH /api/crm/automations] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao atualizar automação' }, { status: 500 })
        }

        if (!rule) {
            return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 })
        }

        return NextResponse.json({ rule })
    } catch (error) {
        request.log.error('crm/automations', { error: error instanceof Error ? error.message : String(error) })
        console.error('[PATCH /api/crm/automations] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})

// DELETE: Remove automation rule
export const DELETE = withAxiom(async (request: AxiomRequest) => {
    try {
        const ctx = await getClinicContext()
        if ('error' in ctx) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status })
        }

        const { supabase, clinicId } = ctx
        let ruleId = request.nextUrl.searchParams.get('id')

        if (!ruleId) {
            try {
                const body = await request.json()
                ruleId = body?.id
            } catch {
                // empty body allowed when id is missing
            }
        }

        if (!ruleId || typeof ruleId !== 'string') {
            return NextResponse.json({ error: 'ID da automação é obrigatório' }, { status: 400 })
        }

        const { data: deleted, error } = await supabase
            .from('automation_rules')
            .delete()
            .eq('id', ruleId)
            .eq('clinic_id', clinicId)
            .select('id')
            .maybeSingle()

        if (error) {
            request.log.error('crm/automations/delete', { error: error.message })
            console.error('[DELETE /api/crm/automations] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao excluir automação' }, { status: 500 })
        }

        if (!deleted) {
            return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        request.log.error('crm/automations', { error: error instanceof Error ? error.message : String(error) })
        console.error('[DELETE /api/crm/automations] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})
