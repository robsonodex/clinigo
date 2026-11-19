import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Tentar obter o clinicId diretamente do header (resolvendo impersonation de forma limpa)
        const headersList = await headers()
        let clinicId = headersList.get('x-clinic-id')

        if (!clinicId) {
            // Buscar clinic_id do usuário como fallback
            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id, role')
                .eq('id', user.id)
                .single() as { data: { clinic_id: string | null; role: string } | null }

            if (!userData || !userData.clinic_id) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
            }
            clinicId = userData.clinic_id
        }

        // Executar todas as 6 consultas independentes em paralelo
        const [
            { count: doctorCount },
            { count: patientCount },
            { data: doctorsWithSchedules },
            { count: whatsappCount },
            { count: appointmentCount },
            { data: clinic },
        ] = await Promise.all([
            supabase
                .from('doctors')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId),
            supabase
                .from('patients')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId),
            supabase
                .from('doctors')
                .select('id, schedules(id)')
                .eq('clinic_id', clinicId),
            supabase
                .from('whatsapp_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .eq('status', 'connected'),
            supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId),
            supabase
                .from('clinics')
                .select('smtp_enabled, plan_type, created_at, chamada_painel_tv_habilitada')
                .eq('id', clinicId)
                .single(),
        ])

        const hasSchedule = doctorsWithSchedules?.some(
            (doc: { id: string; schedules: { id: string }[] | null }) =>
                doc.schedules && doc.schedules.length > 0
        ) || false

        const hasSmtp = !!(clinic?.smtp_enabled)
        const planType = clinic?.plan_type ?? 'BASIC'
        const clinicCreatedAt = clinic?.created_at ?? null
        // Default é TRUE caso a coluna seja null/undefined
        const chamadaPainelTvHabilitada = clinic?.chamada_painel_tv_habilitada !== false

        const response = NextResponse.json({
            hasDoctor: (doctorCount || 0) > 0,
            hasPatient: (patientCount || 0) > 0,
            hasSchedule,
            hasWhatsApp: (whatsappCount || 0) > 0,
            hasAppointment: (appointmentCount || 0) > 0,
            hasSmtp,
            planType,
            clinicCreatedAt,
            chamadaPainelTvHabilitada,
        })
        response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300')
        return response
    } catch (error) {
        request.log.error('setup/status', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error checking setup status:', error)
        return NextResponse.json({
            hasDoctor: false,
            hasPatient: false,
            hasSchedule: false,
            hasWhatsApp: false,
            hasAppointment: false,
            hasSmtp: false,
            planType: 'BASIC',
            clinicCreatedAt: null,
            chamadaPainelTvHabilitada: true,
        })
    }
})
