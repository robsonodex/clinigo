import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/patients/{id}/medical-records
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const patientId = id

        const { data: records, error } = await supabase
            .from('medical_records')
            .select(`
        id,
        patient_id,
        doctor_id,
        appointment_id,
        chief_complaint,
        present_illness,
        diagnosis,
        treatment_plan,
        created_at,
        updated_at,
        doctor:doctors(
          id,
          user:users(full_name)
        ),
        appointment:appointments(
          id,
          appointment_date,
          status
        )
      `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })

        // Verificar se DOCTOR não-coordenador e filtrar
        const { data: profile } = await supabase
            .from('users')
            .select('role, is_coordinator')
            .eq('id', user.id)
            .single()

        let filteredRecords = records || []

        if ((profile as any)?.role === 'DOCTOR' && !(profile as any)?.is_coordinator) {
            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (doctor) {
                filteredRecords = filteredRecords.filter((r: any) => r.doctor_id === (doctor as any).id)
            }
        }

        if (error) {
            console.error('Error fetching medical records:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ records: filteredRecords })
    } catch (error) {
        console.error('Error in medical records API:', error)
        return NextResponse.json({ error: 'Erro ao buscar prontuários' }, { status: 500 })
    }
}
