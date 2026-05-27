import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPatientToken } from '@/lib/patient-auth'

// GET: Retorna os comunicados institucionais públicos para o paciente
export async function GET(request: NextRequest) {
    try {
        const patient = await verifyPatientToken(request)
        if (!patient) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()

        // Buscar a clínica vinculada ao paciente
        const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('clinic_id')
            .eq('id', patient.sub)
            .single()

        if (patientError || !patientData?.clinic_id) {
            return NextResponse.json({ error: 'Paciente ou clínica não cadastrados' }, { status: 404 })
        }

        // Buscar boletins públicos (target 'patients' ou 'all') daquela clínica
        const { data: bulletins, error } = await supabase
            .from('clinic_bulletins')
            .select('*')
            .eq('clinic_id', patientData.clinic_id)
            .in('target', ['patients', 'all'])
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Erro ao buscar bulletins para paciente:', error)
            return NextResponse.json({ error: 'Erro ao buscar avisos' }, { status: 500 })
        }

        return NextResponse.json({ bulletins: bulletins || [] })

    } catch (error) {
        console.error('Erro interno na API de bulletins do paciente:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
