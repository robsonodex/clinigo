import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPatientToken } from '@/lib/patient-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const patient = await verifyPatientToken(request)
        if (!patient) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()

        // Buscar evoluções assinadas ou finalizadas do paciente
        const { data, error } = await supabase
            .from('session_evolutions')
            .select(`
                id,
                evolution_date,
                template_type,
                subjective,
                objective,
                assessment,
                plan_notes,
                content,
                data_description,
                signed_at,
                finalized_at,
                signature_hash,
                signed_pdf_url,
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
            .order('evolution_date', { ascending: false })

        if (error) {
            console.error('Erro ao buscar evoluções do paciente:', error)
            return NextResponse.json({ error: 'Erro ao buscar evoluções' }, { status: 500 })
        }

        // Filtrar apenas evoluções assinadas ou finalizadas
        const finalizedEvolutions = (data || []).filter((ev: any) => ev.signed_at || ev.finalized_at)

        const mappedEvolutions = finalizedEvolutions.map((ev: any) => {
            const isEspacoIncluir = ev.clinic?.id === '5163c916-8b82-4d80-8a71-01726836ee46'
            if (ev.template_type === 'soap' && (isEspacoIncluir || ev.data_description || ev.content)) {
                ev.template_type = 'multidisciplinar'
            }
            return {
                id: ev.id,
                date: ev.evolution_date,
                template_type: ev.template_type,
                subjective: ev.subjective,
                objective: ev.objective,
                assessment: ev.assessment,
                plan_notes: ev.plan_notes,
                content: ev.content, // Orientações aos Responsáveis
                data_description: ev.data_description,
                signed_at: ev.signed_at,
                finalized_at: ev.finalized_at,
                signed_pdf_url: ev.signed_pdf_url,
                doctor: {
                    name: ev.doctor?.user?.full_name || 'Profissional',
                    specialty: ev.doctor?.specialty || 'Terapeuta',
                },
                clinic: {
                    name: ev.clinic?.name || 'Clínica',
                }
            }
        })

        return NextResponse.json({ evolutions: mappedEvolutions })

    } catch (error) {
        console.error('Erro no endpoint de evoluções do paciente:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
