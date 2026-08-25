import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const patientId = searchParams.get('patient_id')
        const planId = searchParams.get('plan_id')
        const doctorId = searchParams.get('doctor_id')
        const category = searchParams.get('category')

        let query = (supabase as any)
            .from('therapeutic_plan_questionnaire_responses')
            .select(`
                *,
                patient:patients(id, full_name, phone, cpf),
                doctor:doctors(id, specialty, user:users(full_name)),
                plan:therapeutic_plans(id, title)
            `)
            .eq('clinic_id', profile.clinic_id)
            .order('application_date', { ascending: false })
            .order('created_at', { ascending: false })

        if (patientId) query = query.eq('patient_id', patientId)
        if (planId) query = query.eq('plan_id', planId)
        if (doctorId) query = query.eq('doctor_id', doctorId)

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ data: data || [] })
    } catch (error: any) {
        console.error('GET questionnaire responses error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('id, clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const body = await request.json()
        const {
            patient_id,
            plan_id,
            goal_id,
            doctor_id,
            template_id,
            template_snapshot,
            program_name,
            application_date,
            data: responseData,
            summary_metrics,
            status,
            notes
        } = body

        if (!patient_id) {
            return NextResponse.json({ error: 'Paciente é obrigatório' }, { status: 400 })
        }

        if (!template_snapshot) {
            return NextResponse.json({ error: 'Fotografia da estrutura do formulário (template_snapshot) é obrigatória' }, { status: 400 })
        }

        const { data: createdResponse, error } = await (supabase as any)
            .from('therapeutic_plan_questionnaire_responses')
            .insert({
                clinic_id: profile.clinic_id,
                patient_id,
                plan_id: plan_id || null,
                goal_id: goal_id || null,
                doctor_id: doctor_id || null,
                template_id: template_id || null,
                template_snapshot, // Imutabilidade garantida
                program_name: program_name || 'Programa Terapêutico',
                application_date: application_date || new Date().toISOString().split('T')[0],
                data: responseData || {},
                summary_metrics: summary_metrics || {},
                status: status || 'completed',
                notes: notes || null,
                created_by: user.id
            })
            .select(`
                *,
                patient:patients(id, full_name),
                doctor:doctors(id, specialty, user:users(full_name))
            `)
            .single()

        if (error) throw error

        return NextResponse.json({
            data: createdResponse,
            message: 'Folha de registro salva no histórico do paciente com sucesso!'
        }, { status: 201 })
    } catch (error: any) {
        console.error('POST questionnaire response error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID da resposta é obrigatório' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { error } = await (supabase as any)
            .from('therapeutic_plan_questionnaire_responses')
            .delete()
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Registro excluído do histórico com sucesso' })
    } catch (error: any) {
        console.error('DELETE questionnaire response error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
