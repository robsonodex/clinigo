import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'])

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: dbUser } = (await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .maybeSingle()) as { data: { clinic_id: string | null; role: string | null } | null }

        const role = (dbUser?.role || '').toUpperCase()
        if (!ALLOWED_ROLES.has(role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        let clinicId = dbUser?.clinic_id || null
        if (!clinicId && role === 'SUPER_ADMIN') {
            const cookieStore = await cookies()
            clinicId = cookieStore.get('impersonation_clinic_id')?.value || null
        }

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        const serviceClient = createServiceRoleClient() as any
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const next7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const plus30DaysMs = Date.now() + 30 * 24 * 60 * 60 * 1000

        const [
            { data: completedLast30 },
            { data: signedRecordsLast30 },
            { data: upcoming7Days },
            { count: waitingListCount },
        ] = await Promise.all([
            serviceClient
                .from('appointments')
                .select('id, appointment_date, patient_id, doctor_id')
                .eq('clinic_id', clinicId)
                .eq('status', 'COMPLETED')
                .gte('appointment_date', thirtyDaysAgoStr)
                .lte('appointment_date', todayStr)
                .limit(500),
            serviceClient
                .from('medical_records')
                .select('appointment_id, patient_id, signed_at, created_at')
                .eq('clinic_id', clinicId)
                .gte('created_at', new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString())
                .limit(1000),
            serviceClient
                .from('appointments')
                .select(
                    'id, appointment_date, appointment_time, patient_id, health_insurance_plan_id, insurance_card_number, insurance_card_validity, patients:patient_id(id, full_name, billing_type, insurance_card_number, insurance_validity)'
                )
                .eq('clinic_id', clinicId)
                .in('status', ['CONFIRMED', 'SCHEDULED', 'PENDING_PAYMENT'])
                .gte('appointment_date', todayStr)
                .lte('appointment_date', next7DaysStr)
                .order('appointment_date', { ascending: true })
                .limit(200),
            serviceClient
                .from('waiting_list')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .in('status', ['WAITING', 'waiting', 'PENDING', 'pending', 'ACTIVE', 'active']),
        ])

        // 1. Evoluções pendentes de assinatura nos últimos 30 dias
        const signedAppointmentIds = new Set<string>()
        const signedPatientDates = new Set<string>()
        for (const rec of Array.isArray(signedRecordsLast30) ? signedRecordsLast30 : []) {
            if (!rec.signed_at) continue
            if (rec.appointment_id) signedAppointmentIds.add(rec.appointment_id)
            if (rec.patient_id && rec.created_at) {
                signedPatientDates.add(`${rec.patient_id}_${String(rec.created_at).split('T')[0]}`)
            }
        }

        const completedList = Array.isArray(completedLast30) ? completedLast30 : []
        const pendingEvolutionsCount = completedList.filter((apt: any) => {
            if (signedAppointmentIds.has(apt.id)) return false
            if (signedPatientDates.has(`${apt.patient_id}_${apt.appointment_date}`)) return false
            return true
        }).length

        // 2. Semáforo de Carteirinhas / Convênios nos agendamentos dos próximos 7 dias
        const cardAlertsMap = new Map<
            string,
            {
                patient_id: string
                patient_name: string
                appointment_date: string
                issue_type: 'expired' | 'expiring_soon' | 'missing_card'
                issue_label: string
                validity_date: string | null
            }
        >()

        for (const apt of Array.isArray(upcoming7Days) ? upcoming7Days : []) {
            const patient = Array.isArray(apt.patients) ? apt.patients[0] : apt.patients
            if (!patient?.id) continue

            const isInsurance =
                Boolean(apt.health_insurance_plan_id) ||
                patient.billing_type === 'convenio' ||
                patient.billing_type === 'ambos'

            if (!isInsurance) continue

            const cardNum = (apt.insurance_card_number || patient.insurance_card_number || '').trim()
            const validityRaw = apt.insurance_card_validity || patient.insurance_validity || null

            if (!cardNum) {
                if (!cardAlertsMap.has(patient.id)) {
                    cardAlertsMap.set(patient.id, {
                        patient_id: patient.id,
                        patient_name: patient.full_name || 'Paciente',
                        appointment_date: apt.appointment_date,
                        issue_type: 'missing_card',
                        issue_label: 'Número da carteirinha não informado',
                        validity_date: null,
                    })
                }
                continue
            }

            if (validityRaw) {
                const valMs = new Date(`${String(validityRaw).split('T')[0]}T23:59:59Z`).getTime()
                if (!Number.isNaN(valMs)) {
                    if (valMs < Date.now()) {
                        cardAlertsMap.set(patient.id, {
                            patient_id: patient.id,
                            patient_name: patient.full_name || 'Paciente',
                            appointment_date: apt.appointment_date,
                            issue_type: 'expired',
                            issue_label: 'Carteirinha vencida',
                            validity_date: String(validityRaw).split('T')[0],
                        })
                    } else if (valMs <= plus30DaysMs && !cardAlertsMap.has(patient.id)) {
                        cardAlertsMap.set(patient.id, {
                            patient_id: patient.id,
                            patient_name: patient.full_name || 'Paciente',
                            appointment_date: apt.appointment_date,
                            issue_type: 'expiring_soon',
                            issue_label: 'Carteirinha vence em até 30 dias',
                            validity_date: String(validityRaw).split('T')[0],
                        })
                    }
                }
            }
        }

        const cardAlerts = Array.from(cardAlertsMap.values()).slice(0, 12)

        return NextResponse.json({
            success: true,
            data: {
                pending_evolutions_30d: pendingEvolutionsCount,
                completed_sessions_30d: completedList.length,
                insurance_card_alerts_count: cardAlertsMap.size,
                insurance_card_alerts: cardAlerts,
                waiting_list_active_count: waitingListCount || 0,
                updated_at: new Date().toISOString(),
            },
        })
    } catch (err) {
        console.error('[DASHBOARD-OPERATIONAL-ALERTS] Erro:', err)
        return NextResponse.json({ error: 'Erro ao carregar radar operacional' }, { status: 500 })
    }
}

