import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/patients/{id}/medical-records
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const patientId = params.id

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
          user:users(name)
        ),
        appointment:appointments(
          id,
          appointment_date,
          status
        )
      `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching medical records:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ records })
    } catch (error) {
        console.error('Error in medical records API:', error)
        return NextResponse.json({ error: 'Erro ao buscar prontuários' }, { status: 500 })
    }
}
