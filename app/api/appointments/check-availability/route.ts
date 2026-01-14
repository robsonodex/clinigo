/**
 * CLINIGO PREMIUM - Anti-Overbooking API
 * POST /api/appointments/check-availability
 * 
 * Verifica disponibilidade de slot e adquire lock temporário
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { log } from '@/lib/logger'

const checkAvailabilitySchema = z.object({
    doctor_id: z.string().uuid(),
    slot_datetime: z.string().datetime(),
    patient_id: z.string().uuid().optional(),
    duration: z.number().min(15).max(180).default(30),
})

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // 1. Autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autenticado', code: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }

        // 2. Validação do payload
        const body = await request.json()
        const validated = checkAvailabilitySchema.parse(body)

        // 3. Obter clinic_id do usuário
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { error: 'Clínica não encontrada', code: 'NO_CLINIC' },
                { status: 403 }
            )
        }

        // 4. Verificar se o médico pertence à clínica
        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, clinic_id')
            .eq('id', validated.doctor_id)
            .eq('clinic_id', profile.clinic_id)
            .single()

        if (!doctor) {
            return NextResponse.json(
                { error: 'Médico não encontrado', code: 'DOCTOR_NOT_FOUND' },
                { status: 404 }
            )
        }

        // 5. VERIFICAR LIMITE DO PLANO
        const { data: clinic } = await supabase
            .from('clinics')
            .select('plan_type, plan_limits')
            .eq('id', profile.clinic_id)
            .single()

        if (!clinic) {
            return NextResponse.json(
                { error: 'Clínica não encontrada', code: 'CLINIC_NOT_FOUND' },
                { status: 404 }
            )
        }

        // Contar agendamentos do mês atual
        const currentMonth = new Date()
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

        const { count: appointmentsThisMonth } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', profile.clinic_id)
            .gte('appointment_date', firstDay.toISOString().split('T')[0])
            .lte('appointment_date', lastDay.toISOString().split('T')[0])
            .neq('status', 'CANCELLED')

        const monthlyLimit = clinic.plan_limits?.max_appointments_month || 100

        if (appointmentsThisMonth && appointmentsThisMonth >= monthlyLimit) {
            log.warn('Plan limit reached', {
                clinic_id: profile.clinic_id,
                plan_type: clinic.plan_type,
                appointments_count: appointmentsThisMonth,
                limit: monthlyLimit
            })

            return NextResponse.json(
                {
                    error: 'Limite do plano atingido',
                    code: 'PLAN_LIMIT_REACHED',
                    details: {
                        current_appointments: appointmentsThisMonth,
                        plan_limit: monthlyLimit,
                        plan_type: clinic.plan_type,
                        upgrade_url: '/dashboard/planos'
                    }
                },
                { status: 402 } // Payment Required
            )
        }

        // 6. ADQUIRIR LOCK DE SLOT (função PostgreSQL)
        const { data: lockResult, error: lockError } = await supabase
            .rpc('acquire_slot_lock', {
                p_doctor_id: validated.doctor_id,
                p_slot_datetime: validated.slot_datetime,
                p_user_id: user.id,
                p_metadata: {
                    patient_id: validated.patient_id,
                    duration: validated.duration,
                    ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
                    user_agent: request.headers.get('user-agent')
                }
            })

        if (lockError) {
            log.error('Lock acquisition failed', { error: lockError, validated })
            return NextResponse.json(
                { error: 'Erro ao verificar disponibilidade', code: 'LOCK_ERROR' },
                { status: 500 }
            )
        }

        const lockData = lockResult[0]

        if (!lockData.acquired) {
            log.info('Slot unavailable', { doctor_id: validated.doctor_id, slot_datetime: validated.slot_datetime })

            return NextResponse.json(
                {
                    available: false,
                    message: lockData.message,
                    code: 'SLOT_LOCKED'
                },
                { status: 409 } // Conflict
            )
        }

        // 7. VERIFICAR ELEGIBILIDADE DE CONVÊNIO (se patient_id fornecido)
        let insuranceEligibility = null
        if (validated.patient_id) {
            try {
                const eligibilityResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/insurance/check-eligibility`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            patient_id: validated.patient_id,
                            procedure_date: validated.slot_datetime
                        })
                    }
                )

                if (eligibilityResponse.ok) {
                    insuranceEligibility = await eligibilityResponse.json()
                }
            } catch (error) {
                // Opcional: não bloquear se verificação de convênio falhar
                log.warn('Insurance check failed', { error, patient_id: validated.patient_id })
            }
        }

        // 8. AUDIT LOG
        await supabase.from('appointment_lock_audit').insert({
            lock_id: lockData.lock_id,
            action: 'ACQUIRED',
            user_id: user.id,
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent'),
            metadata: { validated, insurance: insuranceEligibility }
        })

        log.audit(user.id, 'slot_lock_acquired', {
            lock_id: lockData.lock_id,
            doctor_id: validated.doctor_id,
            slot_datetime: validated.slot_datetime
        })

        // 9. RETORNAR SUCESSO
        return NextResponse.json({
            available: true,
            lock_id: lockData.lock_id,
            expires_in_seconds: 30,
            message: lockData.message,
            plan_usage: {
                appointments_this_month: appointmentsThisMonth || 0,
                monthly_limit: monthlyLimit,
                percentage_used: Math.round(((appointmentsThisMonth || 0) / monthlyLimit) * 100)
            },
            insurance: insuranceEligibility
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: error.errors, code: 'VALIDATION_ERROR' },
                { status: 400 }
            )
        }

        log.error('Check availability error', { error })
        return NextResponse.json(
            { error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
