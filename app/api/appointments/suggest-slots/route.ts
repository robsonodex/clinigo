/**
 * POST /api/appointments/suggest-slots - Suggest best time slots for a new patient
 * Based on therapy needs and period preference (morning/afternoon)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SuggestRequest {
    therapies: { specialty: string; sessions_per_week: number }[]
    period: 'morning' | 'afternoon' | 'any'
}

interface TherapySuggestion {
    specialty: string
    doctor_id: string
    doctor_name: string
    days: { day_of_week: number; day_name: string; time: string }[]
}

interface SuggestionOption {
    option_number: number
    therapies: TherapySuggestion[]
    score: number // lower is better (less time gaps between sessions)
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MORNING_END = 12 * 60   // 12:00
const AFTERNOON_START = 13 * 60 // 13:00
const AFTERNOON_END = 18 * 60   // 18:00
const MORNING_START = 7 * 60    // 07:00

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

function isInPeriod(time: string, period: 'morning' | 'afternoon' | 'any'): boolean {
    const minutes = timeToMinutes(time)
    if (period === 'morning') return minutes >= MORNING_START && minutes < MORNING_END
    if (period === 'afternoon') return minutes >= AFTERNOON_START && minutes < AFTERNOON_END
    return true
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

        const body: SuggestRequest = await request.json()

        if (!body.therapies || body.therapies.length === 0) {
            return NextResponse.json(
                { error: 'Informe ao menos uma terapia' },
                { status: 400 }
            )
        }

        const clinicId = profile.clinic_id
        const period = body.period || 'any'

        // 1. For each therapy type, find doctors and their weekly schedules
        const therapyOptions: Map<string, {
            doctor_id: string
            doctor_name: string
            specialty: string
            weekly_slots: { day_of_week: number; times: string[] }[]
        }[]> = new Map()

        for (const therapy of body.therapies) {
            // Find doctors with this specialty
            const { data: doctors } = await supabase
                .from('doctors')
                .select('id, specialty, is_accepting_appointments, user:users(full_name)')
                .eq('clinic_id', clinicId)
                .eq('specialty', therapy.specialty)
                .eq('is_accepting_appointments', true)

            if (!doctors || doctors.length === 0) {
                therapyOptions.set(therapy.specialty, [])
                continue
            }

            const doctorOptions = []

            for (const doctor of doctors) {
                // Get weekly schedule for this doctor
                const { data: schedules } = await supabase
                    .from('schedules')
                    .select('day_of_week, start_time, end_time, slot_duration_minutes')
                    .eq('doctor_id', doctor.id)
                    .eq('is_active', true)
                    .order('day_of_week', { ascending: true })

                if (!schedules || schedules.length === 0) continue

                // Generate available time slots per day
                const weeklySlots = []

                for (const sched of schedules) {
                    const slots: string[] = []
                    const startMin = timeToMinutes(sched.start_time)
                    const endMin = timeToMinutes(sched.end_time)
                    const duration = sched.slot_duration_minutes || 30

                    let current = startMin
                    while (current + duration <= endMin) {
                        const h = Math.floor(current / 60).toString().padStart(2, '0')
                        const m = (current % 60).toString().padStart(2, '0')
                        const timeStr = `${h}:${m}`

                        if (isInPeriod(timeStr, period)) {
                            slots.push(timeStr)
                        }
                        current += duration
                    }

                    if (slots.length > 0) {
                        weeklySlots.push({
                            day_of_week: sched.day_of_week,
                            times: slots,
                        })
                    }
                }

                if (weeklySlots.length > 0) {
                    doctorOptions.push({
                        doctor_id: doctor.id,
                        doctor_name: (doctor as any).user?.full_name || 'Terapeuta',
                        specialty: doctor.specialty,
                        weekly_slots: weeklySlots,
                    })
                }
            }

            therapyOptions.set(therapy.specialty, doctorOptions)
        }

        // 2. Check if all therapies have available options
        const missingTherapies = body.therapies
            .filter(t => !therapyOptions.get(t.specialty) || therapyOptions.get(t.specialty)!.length === 0)
            .map(t => t.specialty)

        if (missingTherapies.length > 0) {
            return NextResponse.json({
                success: false,
                error: `Sem terapeutas disponíveis para: ${missingTherapies.join(', ')}`,
                missing_specialties: missingTherapies,
            }, { status: 404 })
        }

        // 3. Generate up to 3 suggestion options
        const options: SuggestionOption[] = []

        // Strategy: for each therapy, pick a different doctor permutation to generate diversity
        const firstTherapy = body.therapies[0]
        const firstOptions = therapyOptions.get(firstTherapy.specialty) || []

        for (let optIdx = 0; optIdx < Math.min(3, firstOptions.length); optIdx++) {
            const option: TherapySuggestion[] = []
            const usedDays = new Set<number>() // Track used day+time combos across therapies
            let validOption = true

            for (const therapy of body.therapies) {
                const doctors = therapyOptions.get(therapy.specialty) || []
                if (doctors.length === 0) { validOption = false; break }

                // Pick doctor (rotate through for different options)
                const doctorIdx = optIdx % doctors.length
                const selectedDoctor = doctors[doctorIdx]

                // Pick N days for this therapy
                const selectedDays: { day_of_week: number; day_name: string; time: string }[] = []
                const availableDays = selectedDoctor.weekly_slots
                    .filter(ws => !usedDays.has(ws.day_of_week)) // Don't use same day for different therapies if possible

                // If not enough unique days, allow shared days
                const daysPool = availableDays.length >= therapy.sessions_per_week ? availableDays : selectedDoctor.weekly_slots

                for (let i = 0; i < Math.min(therapy.sessions_per_week, daysPool.length); i++) {
                    const daySlot = daysPool[i]
                    const earlyTime = daySlot.times[0] // Pick earliest available time in period
                    selectedDays.push({
                        day_of_week: daySlot.day_of_week,
                        day_name: DAY_NAMES[daySlot.day_of_week],
                        time: earlyTime,
                    })
                    usedDays.add(daySlot.day_of_week)
                }

                if (selectedDays.length < therapy.sessions_per_week) {
                    validOption = false
                    break
                }

                option.push({
                    specialty: therapy.specialty,
                    doctor_id: selectedDoctor.doctor_id,
                    doctor_name: selectedDoctor.doctor_name,
                    days: selectedDays,
                })
            }

            if (validOption && option.length === body.therapies.length) {
                // Score: prefer options with days spread out (lower is better)
                const allDays = option.flatMap(t => t.days.map(d => d.day_of_week))
                const uniqueDays = new Set(allDays).size
                const score = allDays.length - uniqueDays // penalty for overlapping days

                options.push({
                    option_number: options.length + 1,
                    therapies: option,
                    score,
                })
            }
        }

        // Sort by score (lower = better = more spread out)
        options.sort((a, b) => a.score - b.score)

        return NextResponse.json({
            success: true,
            period: period === 'morning' ? 'Manhã (7h-12h)' : period === 'afternoon' ? 'Tarde (13h-18h)' : 'Qualquer',
            options,
            total_options: options.length,
            message: options.length > 0
                ? `${options.length} opção(ões) de horário encontrada(s)`
                : 'Nenhuma combinação de horários disponível para os critérios informados',
        })

    } catch (error) {
        console.error('Suggest slots error:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
