import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/evolution-compliance
 * Relatório de conformidade: agendamentos atendidos (COMPLETED) vs evoluções realizadas
 * Separado por terapeuta — identifica quem não está gerando evolução diariamente
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('start_date') || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
        const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]

        // 1. Buscar agendamentos atendidos (status COMPLETED)
        const { data: appointments, error: aptError } = await supabase
            .from('appointments')
            .select(`
                id,
                doctor_id,
                appointment_date,
                status,
                doctors!inner(
                    id,
                    user:users(full_name)
                )
            `)
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate)

        if (aptError) throw aptError

        // 2. Buscar evoluções do período (inclui patient_id para detecção de duplicatas)
        const { data: evolutions, error: evoError } = await supabase
            .from('session_evolutions')
            .select('id, doctor_id, patient_id, appointment_id, evolution_date, created_at, patients(full_name)')
            .eq('clinic_id', profile.clinic_id)
            .gte('evolution_date', startDate)
            .lte('evolution_date', endDate)

        if (evoError) throw evoError

        // 2.1 Detectar possíveis duplicatas (mesmo doctor + patient + date)
        const dupMap: Record<string, any[]> = {}
        evolutions?.forEach((evo: any) => {
            if (!evo.doctor_id || !evo.patient_id) return
            const key = `${evo.doctor_id}__${evo.patient_id}__${evo.evolution_date}`
            if (!dupMap[key]) dupMap[key] = []
            dupMap[key].push(evo)
        })
        const duplicates = Object.entries(dupMap)
            .filter(([, items]) => items.length > 1)
            .map(([key, items]) => {
                const [doctor_id, patient_id, date] = key.split('__')
                const patientObj = items[0]?.patients
                const patientName = patientObj ? (Array.isArray(patientObj) ? patientObj[0]?.full_name : patientObj?.full_name) : 'N/A'
                return { doctor_id, patient_id, date, count: items.length, patient_name: patientName, evolution_ids: items.map((i: any) => i.id) }
            })

        // 3. Mapear evoluções por appointment_id para verificação de vínculo
        const evolutionByAppointment = new Set<string>()
        evolutions?.forEach((evo: any) => {
            if (evo.appointment_id) evolutionByAppointment.add(evo.appointment_id)
        })

        // 4. Mapear evoluções por doctor_id + data
        const evolutionsByDoctorDate: Record<string, Record<string, number>> = {}
        evolutions?.forEach((evo: any) => {
            const did = evo.doctor_id
            if (!did) return
            if (!evolutionsByDoctorDate[did]) evolutionsByDoctorDate[did] = {}
            const dateKey = evo.evolution_date
            if (!evolutionsByDoctorDate[did][dateKey]) evolutionsByDoctorDate[did][dateKey] = 0
            evolutionsByDoctorDate[did][dateKey]++
        })

        // 5. Agregar por terapeuta
        const doctorStats: Record<string, {
            name: string
            totalAttended: number
            totalEvolutions: number
            withEvolution: number
            withoutEvolution: number
            dailyBreakdown: Record<string, { attended: number; evolutions: number }>
        }> = {}

        appointments?.forEach((apt: any) => {
            const did = apt.doctor_id
            if (!did) return
            const docUser = (apt.doctors as any)?.user
            const docName = docUser
                ? (Array.isArray(docUser) ? docUser[0]?.full_name : (docUser as any)?.full_name)
                : 'N/A'

            if (!doctorStats[did]) {
                doctorStats[did] = {
                    name: docName || 'N/A',
                    totalAttended: 0,
                    totalEvolutions: 0,
                    withEvolution: 0,
                    withoutEvolution: 0,
                    dailyBreakdown: {},
                }
            }

            doctorStats[did].totalAttended++

            // Verificar se este appointment específico tem evolução vinculada
            if (evolutionByAppointment.has(apt.id)) {
                doctorStats[did].withEvolution++
            } else {
                doctorStats[did].withoutEvolution++
            }

            const dateKey = apt.appointment_date
            if (!doctorStats[did].dailyBreakdown[dateKey]) {
                doctorStats[did].dailyBreakdown[dateKey] = { attended: 0, evolutions: 0 }
            }
            doctorStats[did].dailyBreakdown[dateKey].attended++
        })

        // Preencher evoluções no daily breakdown
        for (const [did, dates] of Object.entries(evolutionsByDoctorDate)) {
            if (!doctorStats[did]) continue
            doctorStats[did].totalEvolutions = Object.values(dates).reduce((sum, n) => sum + n, 0)
            for (const [dateKey, count] of Object.entries(dates)) {
                if (!doctorStats[did].dailyBreakdown[dateKey]) {
                    doctorStats[did].dailyBreakdown[dateKey] = { attended: 0, evolutions: 0 }
                }
                doctorStats[did].dailyBreakdown[dateKey].evolutions += count
            }
        }

        // Contar evoluções para terapeutas que também possuem appointments
        for (const [did, stats] of Object.entries(doctorStats)) {
            if (stats.totalEvolutions === 0 && evolutionsByDoctorDate[did]) {
                stats.totalEvolutions = Object.values(evolutionsByDoctorDate[did]).reduce((sum, n) => sum + n, 0)
            }
        }

        // 6. Formatar resultado por terapeuta
        const byDoctor = Object.entries(doctorStats)
            .map(([id, stats]) => {
                const complianceRate = stats.totalAttended > 0
                    ? Math.round((stats.totalEvolutions / stats.totalAttended) * 100)
                    : 0

                // Calcular dias com pendência
                const daysWithPending = Object.entries(stats.dailyBreakdown)
                    .filter(([, d]) => d.attended > d.evolutions)
                    .length

                const totalDays = Object.keys(stats.dailyBreakdown).length

                return {
                    doctor_id: id,
                    doctor_name: stats.name,
                    total_attended: stats.totalAttended,
                    total_evolutions: stats.totalEvolutions,
                    with_evolution: stats.withEvolution,
                    without_evolution: stats.withoutEvolution,
                    compliance_rate: Math.min(complianceRate, 100),
                    days_with_pending: daysWithPending,
                    total_days: totalDays,
                    daily: Object.entries(stats.dailyBreakdown)
                        .map(([date, d]) => ({
                            date,
                            attended: d.attended,
                            evolutions: d.evolutions,
                            diff: d.attended - d.evolutions,
                        }))
                        .sort((a, b) => b.date.localeCompare(a.date)),
                }
            })
            .sort((a, b) => a.compliance_rate - b.compliance_rate) // Pior primeiro

        // 7. Resumo geral
        const totalAttended = byDoctor.reduce((sum, d) => sum + d.total_attended, 0)
        const totalEvolutions = byDoctor.reduce((sum, d) => sum + d.total_evolutions, 0)
        const totalWithEvolution = byDoctor.reduce((sum, d) => sum + d.with_evolution, 0)
        const totalWithoutEvolution = byDoctor.reduce((sum, d) => sum + d.without_evolution, 0)

        return NextResponse.json({
            summary: {
                total_attended: totalAttended,
                total_evolutions: totalEvolutions,
                with_evolution: totalWithEvolution,
                without_evolution: totalWithoutEvolution,
                compliance_rate: totalAttended > 0 ? Math.round((totalEvolutions / totalAttended) * 100) : 0,
                total_duplicates: duplicates.length,
            },
            by_doctor: byDoctor,
            duplicates,
            period: { start_date: startDate, end_date: endDate },
        })
    } catch (error: any) {
        console.error('[API] evolution-compliance error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
