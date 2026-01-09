import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get single patient
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ patientId: string }> }
) {
    try {
        const { patientId } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: patient, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .eq('is_active', true)
            .single()

        if (error || !patient) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        return NextResponse.json(patient)

    } catch (error) {
        console.error('Patient fetch error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH - Update patient
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ patientId: string }> }
) {
    try {
        const { patientId } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()

        const { data: patient, error } = await supabase
            .from('patients')
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq('id', patientId)
            .select()
            .single()

        if (error) {
            console.error('Patient update error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar paciente' }, { status: 500 })
        }

        return NextResponse.json(patient)

    } catch (error) {
        console.error('Patient update error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE - Soft delete patient (LGPD compliant)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ patientId: string }> }
) {
    try {
        const { patientId } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Get user role
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile?.role || '')) {
            return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 })
        }

        // LGPD compliant soft delete - anonymize data
        const { error } = await supabase
            .from('patients')
            .update({
                is_active: false,
                is_anonymized: true,
                full_name: 'DADOS_ANONIMIZADOS',
                email: null,
                phone: 'ANONIMIZADO',
                cpf: null,
                address: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', patientId)

        if (error) {
            console.error('Patient delete error:', error)
            return NextResponse.json({ error: 'Erro ao excluir paciente' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Dados do paciente anonimizados conforme LGPD'
        })

    } catch (error) {
        console.error('Patient delete error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
