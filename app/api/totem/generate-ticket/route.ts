import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        // Limitar taxa por IP
        const ip = request.headers.get('x-forwarded-for') || 'unknown'
        const rateLimitResponse = await withRateLimit('api', `totem-ticket:${ip}`)
        if (rateLimitResponse) return rateLimitResponse

        const body = await request.json()
        const { clinic_id, priority_level = 0, patient_name, cpf } = body

        if (!clinic_id) {
            return NextResponse.json({ error: 'clinic_id é obrigatório' }, { status: 400 })
        }

        const supabase = createServiceRoleClient()

        // 1. Verificar se a clínica existe e seu plano
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id, plan_type')
            .eq('id', clinic_id)
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // 2. Identificar ou cadastrar o paciente
        let patientId = null
        let finalPatientName = patient_name?.trim() || 'Paciente Avulso'

        if (cpf) {
            const cleanCpf = cpf.replace(/\D/g, '')
            // Tenta buscar por CPF
            const { data: existingPatient } = await supabase
                .from('patients')
                .select('id, full_name')
                .eq('clinic_id', clinic_id)
                .eq('cpf', cleanCpf)
                .maybeSingle()

            if (existingPatient) {
                patientId = existingPatient.id
                if (!patient_name) {
                    finalPatientName = existingPatient.full_name
                }
            } else {
                // Cadastra novo paciente rápido
                const { data: newPatient, error: createError } = await supabase
                    .from('patients')
                    .insert({
                        clinic_id,
                        full_name: finalPatientName,
                        cpf: cleanCpf,
                    })
                    .select('id')
                    .single()

                if (!createError && newPatient) {
                    patientId = newPatient.id
                }
            }
        }

        // Fallback: se não tiver patient_id, cria um registro avulso
        if (!patientId) {
            const { data: newPatient, error: createError } = await supabase
                .from('patients')
                .insert({
                    clinic_id,
                    full_name: finalPatientName,
                })
                .select('id')
                .single()

            if (createError || !newPatient) {
                console.error('[Generate-Ticket] Error creating fallback patient:', createError)
                return NextResponse.json({ error: 'Erro ao cadastrar paciente para a fila' }, { status: 500 })
            }
            patientId = newPatient.id
        }

        // 3. Determinar o próximo número de ticket sequencial do dia
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) // YYYY-MM-DD
        const prefix = priority_level > 0 ? 'P' : 'N'

        // Busca appointments do dia com ticket
        const { data: todayAppts } = await supabase
            .from('appointments')
            .select('ticket_number')
            .eq('clinic_id', clinic_id)
            .eq('appointment_date', todayStr)
            .not('ticket_number', 'is', null)

        let nextNum = 1
        if (todayAppts && todayAppts.length > 0) {
            const numbers = todayAppts
                .map(a => {
                    const ticket = a.ticket_number || ''
                    if (ticket.startsWith(`${prefix}-`)) {
                        const numPart = ticket.split('-')[1]
                        return parseInt(numPart, 10) || 0
                    }
                    return 0
                })
                .filter(num => num > 0)

            if (numbers.length > 0) {
                nextNum = Math.max(...numbers) + 1
            }
        }

        const ticketNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`

        // 4. Inserir em appointments como CHECKED_IN
        const now = new Date().toISOString()
        const currentTime = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
        })

        const { data: appointment, error: apptError } = await supabase
            .from('appointments')
            .insert({
                clinic_id,
                patient_id: patientId,
                appointment_date: todayStr,
                appointment_time: currentTime,
                status: 'CHECKED_IN',
                priority_level: priority_level,
                ticket_number: ticketNumber,
                checked_in_at: now,
            } as any)
            .select('id')
            .single()

        if (apptError || !appointment) {
            console.error('[Generate-Ticket] Appointment Error:', apptError)
            return NextResponse.json({ error: 'Erro ao gerar senha' }, { status: 500 })
        }

        // 5. Inserir em appointment_queue
        const priorityReason = priority_level > 0 ? 'preferencial' : 'normal'
        const priorityScore = priority_level > 0 ? 30 : 100

        // Obter contagem atual da fila da clínica para definir posição
        const { count } = await supabase
            .from('appointment_queue')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinic_id)
            .eq('status', 'waiting')

        const queuePosition = (count || 0) + 1

        const { error: queueError } = await supabase
            .from('appointment_queue')
            .insert({
                appointment_id: appointment.id,
                clinic_id,
                patient_id: patientId,
                status: 'waiting',
                priority_score: priorityScore,
                priority_reason: priorityReason,
                queue_position: queuePosition,
                entered_queue_at: now,
            } as any)

        if (queueError) {
            console.error('[Generate-Ticket] Queue Error:', queueError)
            // Não falhamos a senha se criar na fila falhar, mas logamos
        }

        return NextResponse.json({
            success: true,
            ticket_number: ticketNumber,
            patient_name: finalPatientName,
            queue_position: queuePosition,
        })

    } catch (error) {
        console.error('[Generate-Ticket] Internal error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
