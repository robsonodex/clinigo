import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPatientToken } from '@/lib/patient-auth'

// GET: Lista consultas do paciente
export async function GET(request: NextRequest) {
    try {
        const patient = await verifyPatientToken(request)
        if (!patient) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') // upcoming, past, all
        const limit = parseInt(searchParams.get('limit') || '20')

        let query = supabase
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                consultation_type,
                created_at,
                doctor:doctors(
                    id,
                    specialty,
                    user:users(full_name)
                ),
                clinic:clinics(
                    id,
                    name,
                    phone
                )
            `)
            .eq('patient_id', patient.sub)
            .order('appointment_date', { ascending: false })
            .limit(limit)

        // Filtrar por status
        const today = new Date().toISOString().split('T')[0]
        if (status === 'upcoming') {
            query = query.gte('appointment_date', today)
                .in('status', ['SCHEDULED', 'CONFIRMED'])
        } else if (status === 'past') {
            query = query.lt('appointment_date', today)
        }

        const { data, error } = await query

        if (error) {
            console.error('Erro ao buscar consultas:', error)
            return NextResponse.json({ error: 'Erro ao buscar consultas' }, { status: 500 })
        }

        // Formatar resposta
        const appointments = (data || []).map(apt => ({
            id: apt.id,
            date: apt.appointment_date,
            time: apt.appointment_time,
            status: apt.status,
            type: apt.consultation_type,
            doctor: {
                name: (apt.doctor as any)?.user?.full_name || 'Médico',
                specialty: (apt.doctor as any)?.specialty || 'Especialidade',
            },
            clinic: {
                name: (apt.clinic as any)?.name || 'Clínica',
                phone: (apt.clinic as any)?.phone,
            }
        }))

        return NextResponse.json({ appointments })

    } catch (error) {
        console.error('Erro ao listar consultas:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

