/**
 * POST /api/appointments/rearrange - Generate rearrangement suggestions
 * When a therapist is absent, find alternative slots for their patients
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RearrangeRequest {
    doctor_id: string  // absent therapist
    date: string       // day of absence (YYYY-MM-DD)
}

interface RearrangeSuggestion {
    appointment_id: string
    patient_id: string
    patient_name: string
    original_time: string
    original_doctor_name: string
    suggested_doctor_id: string
    suggested_doctor_name: string
    suggested_time: string
    specialty: string
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        const body: RearrangeRequest = await request.json()

        if (!body.doctor_id || !body.date) {
            return NextResponse.json(
                { error: 'Médico/Terapeuta e data são obrigatórios' },
                { status: 400 }
            )
        }

        const clinicId = profile.clinic_id

        // 1. Get absent therapist info
        const { data: absentDoctor } = await supabase
            .from('doctors')
            .select('id, specialty, user:users(full_name)')
            .eq('id', body.doctor_id)
            .eq('clinic_id', clinicId)
            .single()

        if (!absentDoctor) {
            return NextResponse.json({ error: 'Terapeuta não encontrado' }, { status: 404 })
        }

        // 2. Get all appointments for the absent therapist on that day
        const { data: affectedAppointments } = await supabase
            .from('appointments')
            .select(`
                id, appointment_time, patient_id,
                patient:patients(id, full_name)
            `)
            .eq('doctor_id', body.doctor_id)
            .eq('appointment_date', body.date)
            .in('status', ['CONFIRMED', 'PENDING_PAYMENT'])
            .order('appointment_time', { ascending: true })

        if (!affectedAppointments || affectedAppointments.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Nenhum agendamento encontrado para este terapeuta neste dia',
                affected_count: 0,
                suggestions: [],
            })
        }

        // 3. Find alternative therapists of the SAME specialty in the clinic
        const { data: alternativeDoctors } = await supabase
            .from('doctors')
            .select('id, specialty, is_accepting_appointments, user:users(full_name)')
            .eq('clinic_id', clinicId)
            .eq('specialty', absentDoctor.specialty)
            .eq('is_accepting_appointments', true)
            .neq('id', body.doctor_id)

        if (!alternativeDoctors || alternativeDoctors.length === 0) {
            return NextResponse.json({
                success: true,
                message: `Nenhum outro terapeuta de ${absentDoctor.specialty} disponível na clínica`,
                affected_count: affectedAppointments.length,
                affected_appointments: affectedAppointments.map((a: any) => ({
                    appointment_id: a.id,
                    patient_name: a.patient?.full_name,
                    time: a.appointment_time,
                })),
                suggestions: [],
                no_alternatives: true,
            })
        }

        // 4. For each affected appointment, find available slots in alternative therapists
        const dayOfWeek = new Date(body.date + 'T00:00:00').getDay()

        // Get schedules of alternative therapists for this day of week
        const altDoctorIds = alternativeDoctors.map((d: any) => d.id)
        const { data: altSchedules } = await supabase
            .from('schedules')
            .select('doctor_id, start_time, end_time, slot_duration_minutes')
            .in('doctor_id', altDoctorIds)
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true)

        // Get existing appointments of alternative therapists on that date
        const { data: existingAppointments } = await supabase
            .from('appointments')
            .select('doctor_id, appointment_time')
            .in('doctor_id', altDoctorIds)
            .eq('appointment_date', body.date)
            .not('status', 'in', '("CANCELLED")')

        // Build availability map: doctor_id -> available time slots
        const availabilityMap = new Map<string, string[]>()

        for (const schedule of (altSchedules || [])) {
            const doctorSlots: string[] = []
            const startHour = parseInt(schedule.start_time.split(':')[0])
            const startMin = parseInt(schedule.start_time.split(':')[1])
            const endHour = parseInt(schedule.end_time.split(':')[0])
            const endMin = parseInt(schedule.end_time.split(':')[1])
            const duration = schedule.slot_duration_minutes || 30

            let currentMinutes = startHour * 60 + startMin
            const endMinutes = endHour * 60 + endMin

            while (currentMinutes + duration <= endMinutes) {
                const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0')
                const m = (currentMinutes % 60).toString().padStart(2, '0')
                doctorSlots.push(`${h}:${m}`)
                currentMinutes += duration
            }

            // Remove occupied slots
            const occupied = (existingAppointments || [])
                .filter((a: any) => a.doctor_id === schedule.doctor_id)
                .map((a: any) => a.appointment_time.substring(0, 5))

            const freeSlots = doctorSlots.filter(s => !occupied.includes(s))

            const existing = availabilityMap.get(schedule.doctor_id) || []
            availabilityMap.set(schedule.doctor_id, [...existing, ...freeSlots])
        }

        // 5. Generate suggestions - match each patient to best available slot
        const suggestions: RearrangeSuggestion[] = []
        const usedSlots = new Map<string, Set<string>>() // doctor_id -> used time slots for this rearrangement

        for (const appointment of affectedAppointments) {
            const originalTime = (appointment as any).appointment_time.substring(0, 5)
            let bestMatch: { doctorId: string; time: string; timeDiff: number } | null = null

            // Try to find closest time slot across all alternative therapists
            for (const [altDoctorId, freeSlots] of availabilityMap) {
                const usedForDoctor = usedSlots.get(altDoctorId) || new Set()

                for (const slot of freeSlots) {
                    if (usedForDoctor.has(slot)) continue // Already suggested for another patient

                    const originalMinutes = parseInt(originalTime.split(':')[0]) * 60 + parseInt(originalTime.split(':')[1])
                    const slotMinutes = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1])
                    const timeDiff = Math.abs(originalMinutes - slotMinutes)

                    if (!bestMatch || timeDiff < bestMatch.timeDiff) {
                        bestMatch = { doctorId: altDoctorId, time: slot, timeDiff }
                    }
                }
            }

            if (bestMatch) {
                const altDoctor = alternativeDoctors.find((d: any) => d.id === bestMatch!.doctorId) as any

                suggestions.push({
                    appointment_id: (appointment as any).id,
                    patient_id: (appointment as any).patient_id,
                    patient_name: (appointment as any).patient?.full_name || 'Paciente',
                    original_time: originalTime,
                    original_doctor_name: (absentDoctor as any).user?.full_name || 'Terapeuta',
                    suggested_doctor_id: bestMatch.doctorId,
                    suggested_doctor_name: altDoctor?.user?.full_name || 'Terapeuta',
                    suggested_time: bestMatch.time,
                    specialty: absentDoctor.specialty,
                })

                // Mark this slot as used
                const used = usedSlots.get(bestMatch.doctorId) || new Set()
                used.add(bestMatch.time)
                usedSlots.set(bestMatch.doctorId, used)
            }
        }

        const unmatched = affectedAppointments.length - suggestions.length

        return NextResponse.json({
            success: true,
            absent_doctor: (absentDoctor as any).user?.full_name,
            specialty: absentDoctor.specialty,
            date: body.date,
            affected_count: affectedAppointments.length,
            suggestions,
            unmatched_count: unmatched,
            message: unmatched > 0
                ? `${suggestions.length} sugestão(ões) encontrada(s), ${unmatched} paciente(s) sem encaixe disponível`
                : `${suggestions.length} sugestão(ões) de remanejamento encontrada(s)`,
        })

    } catch (error) {
        console.error('Rearrange error:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
