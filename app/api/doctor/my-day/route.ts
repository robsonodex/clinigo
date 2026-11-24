import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

function getSaoPauloTodayIso(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date())
    const year = parts.find((p) => p.type === 'year')?.value || '2026'
    const month = parts.find((p) => p.type === 'month')?.value || '01'
    const day = parts.find((p) => p.type === 'day')?.value || '01'
    return `${year}-${month}-${day}`
}

const ALLOWED_ROLES = new Set(['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'])

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userRow } = (await supabase
            .from('users')
            .select('clinic_id, role, full_name')
            .eq('id', user.id)
            .maybeSingle()) as {
            data: { clinic_id: string | null; role: string | null; full_name: string | null } | null
        }

        if (!userRow?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 403 })
        }

        const role = (userRow.role || '').toUpperCase()
        if (!ALLOWED_ROLES.has(role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get('date')
        const targetDate =
            dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
                ? dateParam
                : getSaoPauloTodayIso()

        const serviceClient = createServiceRoleClient() as any

        // Descobrir doctor_id vinculado ao usuário logado
        const { data: doctorRow } = await serviceClient
            .from('doctors')
            .select('id, specialty')
            .eq('user_id', user.id)
            .eq('clinic_id', userRow.clinic_id)
            .maybeSingle()

        if (role === 'DOCTOR' && !doctorRow?.id) {
            return NextResponse.json({
                success: true,
                data: {
                    date: targetDate,
                    doctorName: userRow.full_name || 'Profissional',
                    specialty: null,
                    summary: { total: 0, completed: 0, signed: 0, pendingSignature: 0 },
                    sessions: [],
                },
            })
        }

        let aptQuery = serviceClient
            .from('appointments')
            .select(
                'id, appointment_date, appointment_time, status, appointment_type, patient_id, doctor_id, patients:patient_id(id, full_name, phone, date_of_birth)'
            )
            .eq('clinic_id', userRow.clinic_id)
            .eq('appointment_date', targetDate)
            .not('status', 'in', '("CANCELLED","NO_SHOW")')
            .order('appointment_time', { ascending: true })
            .limit(80)

        if (doctorRow?.id) {
            aptQuery = aptQuery.eq('doctor_id', doctorRow.id)
        }

        const { data: appointments, error: aptErr } = await aptQuery
        if (aptErr) {
            throw aptErr
        }

        const aptList = Array.isArray(appointments) ? appointments : []
        const appointmentIds = aptList.map((a: any) => a.id).filter(Boolean)
        const patientIds = Array.from(
            new Set(aptList.map((a: any) => a.patient_id).filter(Boolean))
        )

        const [recordsRes, biometricsRes] = await Promise.all([
            appointmentIds.length > 0
                ? serviceClient
                      .from('medical_records')
                      .select('id, appointment_id, patient_id, signed_at, status')
                      .eq('clinic_id', userRow.clinic_id)
                      .in('appointment_id', appointmentIds)
                : Promise.resolve({ data: [] }),
            patientIds.length > 0
                ? serviceClient
                      .from('patient_face_biometrics')
                      .select('patient_id')
                      .eq('clinic_id', userRow.clinic_id)
                      .in('patient_id', patientIds)
                : Promise.resolve({ data: [] }),
        ])

        const recordByAppointment = new Map<string, any>()
        for (const rec of Array.isArray(recordsRes.data) ? recordsRes.data : []) {
            if (rec.appointment_id) recordByAppointment.set(rec.appointment_id, rec)
        }

        const biometricPatientSet = new Set<string>(
            (Array.isArray(biometricsRes.data) ? biometricsRes.data : []).map(
                (b: any) => b.patient_id
            )
        )

        const sessions = aptList.map((apt: any) => {
            const patient = Array.isArray(apt.patients) ? apt.patients[0] : apt.patients
            const rec = recordByAppointment.get(apt.id) || null
            const isSigned = Boolean(rec?.signed_at)
            const hasDraft = Boolean(rec && !rec.signed_at)

            return {
                appointmentId: apt.id,
                patientId: apt.patient_id,
                patientName: patient?.full_name || 'Paciente',
                patientBirthDate: patient?.date_of_birth || null,
                patientPhone: patient?.phone || null,
                time: String(apt.appointment_time || '').slice(0, 5),
                status: String(apt.status || 'SCHEDULED'),
                appointmentType: String(apt.appointment_type || 'presencial'),
                evolutionSigned: isSigned,
                evolutionDraft: hasDraft,
                hasBiometrics: biometricPatientSet.has(apt.patient_id),
            }
        })

        const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length
        const signedCount = sessions.filter((s) => s.evolutionSigned).length
        const pendingSignatureCount = sessions.filter((s) => !s.evolutionSigned).length

        return NextResponse.json({
            success: true,
            data: {
                date: targetDate,
                doctorName: userRow.full_name || 'Profissional',
                specialty: doctorRow?.specialty || null,
                summary: {
                    total: sessions.length,
                    completed: completedCount,
                    signed: signedCount,
                    pendingSignature: pendingSignatureCount,
                },
                sessions,
            },
        })
    } catch (error) {
        console.error('[DOCTOR-MY-DAY] Erro:', error)
        return NextResponse.json(
            { error: 'Não foi possível carregar sua agenda clínica de hoje.' },
            { status: 500 }
        )
    }
}

