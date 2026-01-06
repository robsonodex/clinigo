import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List campaigns
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get('status')

        let query = supabase
            .from('campaigns')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }

        const { data: campaigns, error } = await query

        if (error) {
            console.error('Campaigns fetch error:', error)
            return NextResponse.json({ error: 'Erro ao buscar campanhas' }, { status: 500 })
        }

        return NextResponse.json({ campaigns })
    } catch (error) {
        console.error('Campaigns error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create campaign
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const body = await request.json()
        const {
            name,
            description,
            type,
            subject,
            content,
            target_all_patients = false,
            target_tags = [],
            target_filters = {},
            scheduled_at
        } = body

        if (!name || !type || !content) {
            return NextResponse.json({
                error: 'Campos obrigatórios: name, type, content'
            }, { status: 400 })
        }

        // Calculate recipient count if target_all_patients
        let totalRecipients = 0
        if (target_all_patients) {
            const { count } = await supabase
                .from('patients')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .is('deleted_at', null)
            totalRecipients = count || 0
        } else if (target_tags.length > 0) {
            const { count } = await supabase
                .from('patient_tag_assignments')
                .select('patient_id', { count: 'exact', head: true })
                .in('tag_id', target_tags)
            totalRecipients = count || 0
        }

        const { data: campaign, error } = await supabase
            .from('campaigns')
            .insert({
                clinic_id: clinicId,
                name,
                description,
                type,
                subject,
                content,
                target_all_patients,
                target_tags,
                target_filters,
                status: scheduled_at ? 'SCHEDULED' : 'DRAFT',
                scheduled_at,
                total_recipients: totalRecipients,
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Create campaign error:', error)
            return NextResponse.json({ error: 'Erro ao criar campanha' }, { status: 500 })
        }

        return NextResponse.json({ campaign })
    } catch (error) {
        console.error('Create campaign error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
