import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { computeSessionPlansAnalytics } from '@/lib/session-plans/learning-curve'
import { SESSION_PLAN_SPECIALTIES_META } from '@/lib/constants/session-plans-beta-clinics'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'])

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: patientId } = await params
        const { searchParams } = new URL(request.url)
        const requestedDays = Number(searchParams.get('days'))
        const periodDays = [30, 60, 90, 180].includes(requestedDays) ? requestedDays : 90

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
            .select('clinic_id, role, full_name')
            .eq('id', user.id)
            .maybeSingle()) as { data: { clinic_id: string | null; role: string | null; full_name: string | null } | null }

        const role = (dbUser?.role || '').toUpperCase()
        if (!ALLOWED_ROLES.has(role)) {
            return NextResponse.json({ error: 'Sem permissão para gerar relatório de renovação' }, { status: 403 })
        }

        const serviceClient = createServiceRoleClient() as any
        let clinicId = dbUser?.clinic_id || null

        if (!clinicId && role === 'SUPER_ADMIN') {
            const cookieStore = await cookies()
            clinicId = cookieStore.get('impersonation_clinic_id')?.value || null
            if (!clinicId) {
                const { data: p } = await serviceClient
                    .from('patients')
                    .select('clinic_id')
                    .eq('id', patientId)
                    .maybeSingle()
                clinicId = p?.clinic_id || null
            }
        }

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        const periodEnd = new Date()
        const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
        const startDateStr = periodStart.toISOString().split('T')[0]
        const endDateStr = periodEnd.toISOString().split('T')[0]

        const [
            { data: patient },
            { data: clinic },
            { data: appointments },
            { data: sessionPlans },
            { data: medicalRecords },
        ] = await Promise.all([
            serviceClient
                .from('patients')
                .select(
                    'id, full_name, date_of_birth, cpf, billing_type, insurance_card_number, insurance_validity, insurance_plan_name, health_insurances(name)'
                )
                .eq('id', patientId)
                .eq('clinic_id', clinicId)
                .maybeSingle(),
            serviceClient
                .from('clinics')
                .select('id, name, cnpj, phone, email, logo_url')
                .eq('id', clinicId)
                .maybeSingle(),
            serviceClient
                .from('appointments')
                .select(
                    'id, appointment_date, status, checked_in_at, checkin_method, doctor_checked_in_at, doctor_id, doctors:doctor_id(specialty, crm, crm_state, user:users(full_name))'
                )
                .eq('clinic_id', clinicId)
                .eq('patient_id', patientId)
                .gte('appointment_date', startDateStr)
                .lte('appointment_date', endDateStr)
                .order('appointment_date', { ascending: true }),
            serviceClient
                .from('planos_sessao')
                .select(
                    'id, especialidade, data_sessao, status, registro_desempenho, grafico_indicadores, decisao_proxima_sessao, created_at'
                )
                .eq('clinica_id', clinicId)
                .eq('paciente_id', patientId)
                .gte('data_sessao', startDateStr)
                .order('data_sessao', { ascending: true }),
            serviceClient
                .from('medical_records')
                .select('id, created_at, signed_at')
                .eq('clinic_id', clinicId)
                .eq('patient_id', patientId)
                .gte('created_at', periodStart.toISOString()),
        ])

        if (!patient) {
            return NextResponse.json({ error: 'Paciente não encontrado nesta clínica' }, { status: 404 })
        }

        const aptList = Array.isArray(appointments) ? appointments : []
        const completedApts = aptList.filter((a: any) => a.status === 'COMPLETED')
        const noShowApts = aptList.filter((a: any) => a.status === 'NO_SHOW')
        const cancelledApts = aptList.filter((a: any) => a.status === 'CANCELLED')
        const biometricCheckedIn = completedApts.filter(
            (a: any) =>
                Boolean(a.checked_in_at) &&
                ['FACIAL', 'BIOMETRIC', 'BIOMETRIA', 'FACE'].some((m) =>
                    String(a.checkin_method || '').toUpperCase().includes(m)
                )
        ).length
        const anyCheckedIn = completedApts.filter((a: any) => Boolean(a.checked_in_at)).length
        const therapistVerified = completedApts.filter((a: any) => Boolean(a.doctor_checked_in_at)).length

        const scheduledEffective = completedApts.length + noShowApts.length
        const attendanceRate =
            scheduledEffective > 0 ? Math.round((completedApts.length / scheduledEffective) * 100) : 100

        // Profissionais que atenderam o paciente no período
        const professionalsMap = new Map<string, { name: string; specialty: string; council: string; sessions: number }>()
        for (const apt of completedApts) {
            const doc = Array.isArray(apt.doctors) ? apt.doctors[0] : apt.doctors
            const docUser = Array.isArray(doc?.user) ? doc.user[0] : doc?.user
            const name = docUser?.full_name || 'Profissional da Equipe'
            const key = apt.doctor_id || name
            const existing = professionalsMap.get(key)
            if (existing) {
                existing.sessions++
            } else {
                professionalsMap.set(key, {
                    name,
                    specialty: doc?.specialty || 'Terapia Multidisciplinar',
                    council: doc?.crm ? `${doc.crm}${doc.crm_state ? `/${doc.crm_state}` : ''}` : '',
                    sessions: 1,
                })
            }
        }

        // Agrupar planos de sessão por especialidade e calcular curva PEI
        const plansBySpecialty = new Map<string, any[]>()
        for (const plan of Array.isArray(sessionPlans) ? sessionPlans : []) {
            const esp = String(plan.especialidade || 'geral')
            if (!plansBySpecialty.has(esp)) plansBySpecialty.set(esp, [])
            plansBySpecialty.get(esp)!.push(plan)
        }

        const specialtiesSummary = Array.from(plansBySpecialty.entries()).map(([esp, list]) => {
            const analytics = computeSessionPlansAnalytics(list)
            const meta = (SESSION_PLAN_SPECIALTIES_META as any)[esp]
            return {
                especialidade: esp,
                label: meta?.label || esp,
                sessionsCount: analytics.totalSessions,
                totalTrials: analytics.totalTrials,
                avgIndependencePct: analytics.avgIndependencePct,
                masteredCount: analytics.masteredCount,
                inProgressCount: analytics.inProgressCount,
                attentionCount: analytics.attentionCount,
                topGoals: analytics.objectives.slice(0, 8).map((o) => ({
                    code: o.code,
                    title: o.title,
                    baselinePct: o.baselinePct,
                    latestPct: o.latestPct,
                    deltaPct: o.deltaPct,
                    status: o.status,
                    latestHelpLabel: o.latestHelpLabel,
                })),
            }
        })

        const recordsList = Array.isArray(medicalRecords) ? medicalRecords : []
        const signedRecords = recordsList.filter((r: any) => Boolean(r.signed_at)).length
        const insuranceObj = Array.isArray(patient.health_insurances)
            ? patient.health_insurances[0]
            : patient.health_insurances

        return NextResponse.json({
            success: true,
            data: {
                period: {
                    days: periodDays,
                    start: startDateStr,
                    end: endDateStr,
                },
                clinic: {
                    name: clinic?.name || 'CliniGo',
                    cnpj: clinic?.cnpj || null,
                    phone: clinic?.phone || null,
                    email: clinic?.email || null,
                },
                patient: {
                    id: patient.id,
                    full_name: patient.full_name,
                    date_of_birth: patient.date_of_birth,
                    insurance_name: insuranceObj?.name || patient.insurance_plan_name || 'Particular / Convênio',
                    insurance_card_number: patient.insurance_card_number || null,
                    insurance_validity: patient.insurance_validity || null,
                },
                attendance: {
                    completed_sessions: completedApts.length,
                    no_shows: noShowApts.length,
                    cancelled: cancelledApts.length,
                    attendance_rate_pct: attendanceRate,
                    biometric_verified_sessions: biometricCheckedIn,
                    checkin_verified_sessions: anyCheckedIn,
                    therapist_verified_sessions: therapistVerified,
                    signed_medical_records: signedRecords,
                    total_medical_records: recordsList.length,
                },
                professionals: Array.from(professionalsMap.values()),
                specialties: specialtiesSummary,
                generated_by: dbUser?.full_name || 'Coordenação Clínica',
                generated_at: new Date().toISOString(),
            },
        })
    } catch (err) {
        console.error('[RENEWAL-REPORT-GET] Erro:', err)
        return NextResponse.json({ error: 'Erro ao consolidar dados para renovação de convênio' }, { status: 500 })
    }
}
