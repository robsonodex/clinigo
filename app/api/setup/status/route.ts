import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Buscar clinic_id do usuário
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single() as { data: { clinic_id: string | null; role: string } | null }

        if (!userData || !userData.clinic_id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const clinicId = userData.clinic_id

        // Verificar médico
        const { count: doctorCount } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)

        // Verificar paciente
        const { count: patientCount } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)

        // Verificar horários (via doctors que têm schedules)
        const { data: doctorsWithSchedules } = await supabase
            .from('doctors')
            .select('id, schedules(id)')
            .eq('clinic_id', clinicId)

        const hasSchedule = doctorsWithSchedules?.some(
            (doc: { id: string; schedules: { id: string }[] | null }) =>
                doc.schedules && doc.schedules.length > 0
        ) || false

        // Verificar SMTP e plano da clínica
        const { data: clinic } = await supabase
            .from('clinics')
            .select('smtp_enabled, plan_type')
            .eq('id', clinicId)
            .single()

        const hasSmtp = !!(clinic?.smtp_enabled)
        const planType = clinic?.plan_type ?? 'BASIC'

        return NextResponse.json({
            hasDoctor: (doctorCount || 0) > 0,
            hasPatient: (patientCount || 0) > 0,
            hasSchedule,
            hasSmtp,
            planType
        })
    } catch (error) {
        console.error('Error checking setup status:', error)
        return NextResponse.json({
            hasDoctor: false,
            hasPatient: false,
            hasSchedule: false,
            hasSmtp: false,
            planType: 'BASIC'
        })
    }
}

