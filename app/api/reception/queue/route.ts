import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/auth/verify-token'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const QUEUE_CACHE_TTL_MS = 30_000
const TV_SETTING_CACHE_TTL_MS = 60_000
const userClinicCache = new Map<string, { clinicId: string; expiresAt: number }>()
const clinicTvSettingCache = new Map<string, { enabled: boolean; expiresAt: number }>()

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const { searchParams } = new URL(request.url)
        const publicClinicId = searchParams.get('clinicId')
        const status = searchParams.get('status') || 'waiting' // waiting, in_service, completed

        const adminDb = createServiceRoleClient() as any
        let clinicId = publicClinicId
        const now = Date.now()

        if (!clinicId) {
            const supabase = await createClient()
            const { user } = await getVerifiedUser(supabase, request)

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const cachedClinic = userClinicCache.get(user.id)
            if (cachedClinic && cachedClinic.expiresAt > now) {
                clinicId = cachedClinic.clinicId
            } else {
                // Garante isolamento multi-tenant estrito por clinic_id do usuário autenticado
                const { data: currentUser } = await adminDb
                    .from('users')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single()

                if (!currentUser?.clinic_id) {
                    return NextResponse.json({ error: 'Clinic not found for user' }, { status: 403 })
                }

                clinicId = currentUser.clinic_id
                if (userClinicCache.size >= 500) userClinicCache.clear()
                userClinicCache.set(user.id, {
                    clinicId: currentUser.clinic_id,
                    expiresAt: now + QUEUE_CACHE_TTL_MS,
                })
            }
        }

        const todayBrt = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
        const cachedTv = clinicTvSettingCache.get(clinicId!)

        // Executa em paralelo: agendamentos do dia, walk-ins da clínica e config do painel TV
        const [appointments, walkIns, chamadaPainelTvHabilitada] = await Promise.all([
            (async () => {
                try {
                    const { data, error: apptError } = await adminDb
                        .from('appointments')
                        .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        checked_in_at,
        priority_level,
        waiting_room_notes,
        ticket_number,
        consulting_room_id,
        called_at,
        appointment_type,
        patient_id,
        payment_type,
        health_insurance_plan_id,
        insurance_card_number,
        insurance_card_validity,
        patient:patients(id, full_name, date_of_birth, gender, insurance_card_number, insurance_validity, health_insurance_id),
        doctor:doctors!appointments_doctor_id_fkey(id, user:users(full_name))
      `)
                        .eq('clinic_id', clinicId)
                        .eq('appointment_date', todayBrt)
                        .neq('status', 'CANCELLED')
                        .order('priority_level', { ascending: false })
                        .order('checked_in_at', { ascending: true, nullsFirst: false })

                    if (apptError) {
                        console.error('[Reception Queue] apptError:', apptError)
                        throw apptError
                    }
                    return (data || []).filter((a: any) =>
                        a.appointment_type !== 'SUPERVISION' &&
                        a.appointment_type !== 'STUDENT' &&
                        a.appointment_type !== 'BLOCK' &&
                        a.patient_id != null
                    )
                } catch (e) {
                    request.log.error('reception/queue', { error: e instanceof Error ? e.message : String(e) })
                    console.error('[DEBUG] Error fetching queue appointments:', e)
                    return []
                }
            })(),
            (async () => {
                try {
                    const { data, error: walkInError } = await adminDb
                        .from('walk_in_registrations')
                        .select(`
        id,
        arrival_time,
        urgency_level,
        status,
        reason,
        patient:patients!inner(id, full_name, cpf, phone, clinic_id),
        doctor:doctors(id, user:users(full_name))
      `)
                        .eq('status', status)
                        .eq('patient.clinic_id', clinicId)
                        .order('urgency_level', { ascending: false })
                        .order('arrival_time', { ascending: true })
                        .limit(50)

                    if (walkInError) throw walkInError
                    return data || []
                } catch (e) {
                    request.log.error('reception/queue', { error: e instanceof Error ? e.message : String(e) })
                    console.error('[DEBUG] Error fetching queue walk-ins:', e)
                    return []
                }
            })(),
            (async () => {
                if (cachedTv && cachedTv.expiresAt > now) {
                    return cachedTv.enabled
                }
                try {
                    const { data: clinicConfig } = await adminDb
                        .from('clinics')
                        .select('chamada_painel_tv_habilitada')
                        .eq('id', clinicId)
                        .single()
                    const enabled = !(clinicConfig && clinicConfig.chamada_painel_tv_habilitada === false)
                    if (clinicTvSettingCache.size >= 500) clinicTvSettingCache.clear()
                    clinicTvSettingCache.set(clinicId!, { enabled, expiresAt: now + TV_SETTING_CACHE_TTL_MS })
                    return enabled
                } catch (configErr) {
                    request.log.error('reception/queue', { error: configErr instanceof Error ? configErr.message : String(configErr) })
                    return true
                }
            })(),
        ])

        // Busca dados de autorização e carteirinha apenas para sessões autenticadas (nunca no Painel TV público)
        const authByPatientMap = new Map<string, any>()
        if (!publicClinicId && appointments.length > 0) {
            const convPatientIds = Array.from(
                new Set(appointments.filter((a: any) => a.payment_type === 'CONVENIO' && a.patient_id).map((a: any) => a.patient_id))
            )
            if (convPatientIds.length > 0) {
                try {
                    const { data: authRows } = await adminDb
                        .from('tiss_authorization_requests')
                        .select('id, patient_id, authorization_number, request_number, expires_at, sessions_authorized, sessions_used, status, health_insurance:health_insurances(name)')
                        .eq('clinic_id', clinicId)
                        .in('patient_id', convPatientIds)
                        .in('status', ['APPROVED', 'AUTHORIZED', 'PENDING'])
                        .order('created_at', { ascending: false })

                    for (const row of authRows || []) {
                        if (!authByPatientMap.has(row.patient_id)) {
                            authByPatientMap.set(row.patient_id, row)
                        }
                    }
                } catch (authLookupErr) {
                    console.warn('[Reception Queue] Authorization lookup warning:', authLookupErr)
                }
            }
        }

        const uniqueQueueValues = new Map()
        for (const item of [
            ...appointments.map((a: any) => ({
                id: a.id,
                type: 'appointment',
                patient: a.patient,
                doctor: a.doctor,
                arrivalTime: a.checked_in_at,
                scheduledTime: (a.appointment_date && a.appointment_time ? `${a.appointment_date}T${a.appointment_time}` : a.checked_in_at),
                isPriority: a.priority_level > 0,
                status: a.status,
                notes: a.waiting_room_notes,
                checkedInAt: a.checked_in_at,
                calledAt: a.called_at,
                consulting_room_id: a.consulting_room_id,
                ticket_number: a.ticket_number,
                payment_type: a.payment_type || 'PARTICULAR',
                health_insurance_plan_id: a.health_insurance_plan_id || null,
                insurance_info: (() => {
                    if (publicClinicId || a.payment_type !== 'CONVENIO') return null
                    const auth = authByPatientMap.get(a.patient_id) || null
                    const cardNum = a.insurance_card_number || a.patient?.insurance_card_number || null
                    const cardVal = a.insurance_card_validity || a.patient?.insurance_validity || null
                    const todayIso = new Date().toISOString().split('T')[0]
                    const authorized = auth ? Number(auth.sessions_authorized || 1) : 0
                    const used = auth ? Number(auth.sessions_used || 0) : 0
                    const remaining = Math.max(0, authorized - used)
                    return {
                        card_number: cardNum,
                        card_validity: cardVal,
                        card_expired: Boolean(cardVal && cardVal < todayIso),
                        authorization_id: auth?.id || null,
                        authorization_number: auth?.authorization_number || auth?.request_number || null,
                        authorization_expires_at: auth?.expires_at || null,
                        authorization_expired: Boolean(auth?.expires_at && String(auth.expires_at).slice(0, 10) < todayIso),
                        sessions_authorized: authorized,
                        sessions_used: used,
                        sessions_remaining: remaining,
                        no_balance: Boolean(auth && remaining <= 0),
                        insurance_name: auth?.health_insurance?.name || null,
                    }
                })()
            })),
            ...walkIns.map((w: any) => ({
                id: w.id,
                type: 'walk-in',
                patient: w.patient,
                doctor: w.doctor,
                arrivalTime: w.arrival_time,
                scheduledTime: w.arrival_time,
                isPriority: w.urgency_level !== 'normal',
                status: w.status,
                notes: w.reason,
                consulting_room_id: null,
                ticket_number: null
            }))
        ]) {
            const timeKey = item.scheduledTime ? item.scheduledTime.toString().substring(0, 16) : ''
            const dupKey = `${item.patient?.id}-${item.doctor?.id}-${timeKey}`

            if (uniqueQueueValues.has(dupKey)) {
                const existing = uniqueQueueValues.get(dupKey)
                const statusOrder: Record<string, number> = { 'COMPLETED': 4, 'IN_PROGRESS': 3, 'WAITING': 2, 'CHECKED_IN': 1.5, 'CONFIRMED': 1, 'PENDING_PAYMENT': 0.5, 'SCHEDULED': 0, 'NO_SHOW': -1 }
                if ((statusOrder[item.status] ?? 0) > (statusOrder[existing.status] ?? 0)) {
                    uniqueQueueValues.set(dupKey, item)
                }
            } else {
                uniqueQueueValues.set(dupKey, item)
            }
        }

        const queue = Array.from(uniqueQueueValues.values()).sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1
            if (!a.isPriority && b.isPriority) return 1

            const statusOrder: Record<string, number> = { 'WAITING': 0, 'CHECKED_IN': 0.5, 'CONFIRMED': 1, 'PENDING_PAYMENT': 1.5, 'IN_PROGRESS': 2, 'COMPLETED': 3, 'NO_SHOW': 4 }
            const aOrder = statusOrder[a.status] ?? 5
            const bOrder = statusOrder[b.status] ?? 5
            if (aOrder !== bOrder) return aOrder - bOrder

            const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0
            const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0
            if (timeA && timeB && timeA !== timeB) return timeA - timeB

            const timeArrA = a.arrivalTime ? new Date(a.arrivalTime).getTime() : 0
            const timeArrB = b.arrivalTime ? new Date(b.arrivalTime).getTime() : 0
            return timeArrA - timeArrB
        })

        return NextResponse.json(
            { queue, chamadaPainelTvHabilitada },
            {
                headers: {
                    'Cache-Control': publicClinicId
                        ? 'public, s-maxage=10, stale-while-revalidate=20'
                        : 'private, no-store',
                },
            }
        )
    } catch (error) {
        request.log.error('reception/queue', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
