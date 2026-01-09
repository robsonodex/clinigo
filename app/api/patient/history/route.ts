import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPatientToken } from '@/lib/patient-auth'

// GET: Histórico simplificado do paciente (sem prontuário)
export async function GET(request: NextRequest) {
    try {
        const patient = await verifyPatientToken(request)
        if (!patient) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        // Buscar consultas realizadas (histórico)
        const { data: consultations, error: consultError } = await supabase
            .from('consultations')
            .select(`
                id,
                date,
                start_time,
                end_time,
                status,
                consultation_type,
                doctor:doctors(
                    id,
                    specialty,
                    user:users(full_name)
                ),
                clinic:clinics(
                    id,
                    name
                )
            `)
            .eq('patient_id', patient.sub)
            .eq('status', 'COMPLETED')
            .order('date', { ascending: false })
            .range(offset, offset + limit - 1)

        if (consultError) {
            console.error('Erro ao buscar histórico:', consultError)
            return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
        }

        // Formatar histórico (SEM dados do prontuário)
        const history = (consultations || []).map(c => ({
            id: c.id,
            date: c.date,
            startTime: c.start_time,
            endTime: c.end_time,
            type: c.consultation_type,
            doctor: {
                name: (c.doctor as any)?.user?.full_name || 'Médico',
                specialty: (c.doctor as any)?.specialty || 'Especialidade',
            },
            clinic: {
                name: (c.clinic as any)?.name || 'Clínica',
            },
            // NOTA: Não incluímos dados do prontuário por privacidade
        }))

        // Contar total para paginação
        const { count } = await supabase
            .from('consultations')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', patient.sub)
            .eq('status', 'COMPLETED')

        return NextResponse.json({
            history,
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (offset + limit) < (count || 0)
            }
        })

    } catch (error) {
        console.error('Erro ao buscar histórico:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

