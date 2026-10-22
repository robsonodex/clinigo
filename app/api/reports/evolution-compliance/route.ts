import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/evolution-compliance
 * Relatório de conformidade: agendamentos atendidos (COMPLETED) vs evoluções realizadas
 * Separado por terapeuta — identifica quem não está gerando evolução diariamente
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
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

        // Usar cliente administrativo para queries agregadas da clínica sem gargalo de RLS/timeouts
        const adminSupabase = createServiceRoleClient()

        // 1. Mapear profissionais da clínica antecipadamente
        const { data: clinicDoctors } = await adminSupabase
            .from('doctors')
            .select('id, user:users(full_name)')
            .eq('clinic_id', profile.clinic_id)

        const doctorNameMap = new Map<string, string>()
        clinicDoctors?.forEach((d: any) => {
            const docUser = d.user
            const name = Array.isArray(docUser) ? docUser[0]?.full_name : docUser?.full_name
            doctorNameMap.set(d.id, name || 'Profissional')
        })

        // 2. Buscar agendamentos atendidos (status COMPLETED) com colunas diretas indexadas
        const CHUNK_SIZE = 1000
        let appointments: any[] = []
        let aptFrom = 0
        while (true) {
            const { data: chunk, error: aptError } = await adminSupabase
                .from('appointments')
                .select('id, doctor_id, appointment_date, status')
                .eq('clinic_id', profile.clinic_id)
                .eq('status', 'COMPLETED')
                .gte('appointment_date', startDate)
                .lte('appointment_date', endDate)
                .range(aptFrom, aptFrom + CHUNK_SIZE - 1)

            if (aptError) {
                console.error('[API] evolution-compliance appointments query error:', aptError)
                throw aptError
            }
            if (!chunk || chunk.length === 0) break
            appointments.push(...chunk)
            if (chunk.length < CHUNK_SIZE || appointments.length >= 20000) break
            aptFrom += CHUNK_SIZE
        }

        // 3. Buscar evoluções do período com colunas diretas indexadas
        let evolutions: any[] = []
        let evoFrom = 0
        while (true) {
            const { data: chunk, error: evoError } = await adminSupabase
                .from('session_evolutions')
                .select('id, doctor_id, patient_id, appointment_id, evolution_date, created_at')
                .eq('clinic_id', profile.clinic_id)
                .gte('evolution_date', startDate)
                .lte('evolution_date', endDate)
                .range(evoFrom, evoFrom + CHUNK_SIZE - 1)

            if (evoError) {
                console.error('[API] evolution-compliance evolutions query error:', evoError)
                throw evoError
            }
            if (!chunk || chunk.length === 0) break
            evolutions.push(...chunk)
            if (chunk.length < CHUNK_SIZE || evolutions.length >= 20000) break
            evoFrom += CHUNK_SIZE
        }

        // 3.1 Detectar possíveis duplicatas (mesmo doctor + patient + date)
        const dupMap: Record<string, any[]> = {}
        evolutions?.forEach((evo: any) => {
            if (!evo.doctor_id || !evo.patient_id) return
            const key = `${evo.doctor_id}__${evo.patient_id}__${evo.evolution_date}`
            if (!dupMap[key]) dupMap[key] = []
            dupMap[key].push(evo)
        })

        const rawDuplicates = Object.entries(dupMap)
            .filter(([, items]) => items.length > 1)

        // Buscar nomes dos pacientes das duplicatas pontualmente se houver
        const duplicatePatientIds = [...new Set(rawDuplicates.map(([key]) => key.split('__')[1]))]
        const patientNameMap = new Map<string, string>()
        if (duplicatePatientIds.length > 0) {
            const { data: dupPatients } = await adminSupabase
                .from('patients')
                .select('id, full_name')
                .in('id', duplicatePatientIds)
            dupPatients?.forEach((p: any) => patientNameMap.set(p.id, p.full_name || 'N/A'))
        }

        const duplicates = rawDuplicates.map(([key, items]) => {
            const [doctor_id, patient_id, date] = key.split('__')
            const patientName = patientNameMap.get(patient_id) || 'N/A'
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
            const docName = doctorNameMap.get(did) || 'Profissional'

            if (!doctorStats[did]) {
                doctorStats[did] = {
                    name: docName,
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
        request.log.error('reports/evolution-compliance', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API] evolution-compliance error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
