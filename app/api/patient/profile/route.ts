import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPatientToken } from '@/lib/patient-auth'
import { z } from 'zod'

const updateSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().min(10).max(11).optional(),
})

// GET: Retorna perfil do paciente
export async function GET(request: NextRequest) {
    try {
        const patient = await verifyPatientToken(request)
        if (!patient) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from('patients')
            .select(`
                id,
                full_name,
                email,
                phone,
                cpf,
                date_of_birth,
                health_score,
                health_score_updated_at,
                created_at
            `)
            .eq('id', patient.sub)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        return NextResponse.json({
            patient: {
                ...data,
                cpf: `***.***.${data.cpf?.slice(-5, -2)}-**`, // Mascarar CPF
            }
        })

    } catch (error) {
        console.error('Erro ao buscar perfil:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Atualiza perfil do paciente
export async function PATCH(request: NextRequest) {
    try {
        const patient = await verifyPatientToken(request)
        if (!patient) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const updates = updateSchema.parse(body)

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
        }

        const supabase = await createClient()

        const { error } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', patient.sub)

        if (error) {
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Perfil atualizado' })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
        }
        console.error('Erro ao atualizar perfil:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

