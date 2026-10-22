import { withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const GET = withAxiom(async (_: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data, error } = await supabase
            .from('therapeutic_plans')
            .select(`
                *,
                patients(id, full_name),
                doctors(id, specialty, users(full_name)),
                therapeutic_plan_goals(*)
            `)
            .eq('id', id)
            .single()

        if (error) throw error
        return NextResponse.json({ data })
    } catch (error: any) {
        _.log.error('therapeutic-plans/[id]', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

export const PUT = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { goals, ...planData } = body

        const { data, error } = await supabase
            .from('therapeutic_plans')
            .update({ ...planData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        if (goals) {
            await supabase.from('therapeutic_plan_goals').delete().eq('plan_id', id)
            if (goals.length > 0) {
                const goalsData = goals.map((g: any) => ({ ...g, plan_id: id }))
                await supabase.from('therapeutic_plan_goals').insert(goalsData)
            }
        }

        return NextResponse.json({ data })
    } catch (error: any) {
        request.log.error('therapeutic-plans/[id]', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

export const DELETE = withAxiom(async (_: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { error } = await supabase.from('therapeutic_plans').delete().eq('id', id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        _.log.error('therapeutic-plans/[id]', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
