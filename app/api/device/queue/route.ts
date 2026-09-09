// app/api/device/queue/route.ts
// Runtime do Tablet: Consulta da Fila do Dia da Sala (sem login de usuario)

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/device/queue
 * Autenticacao via header 'x-clinigo-device-token'
 * Valida o token contra clinic_devices.status = 'active'
 * Atualiza last_seen_at
 * Retorna agendamentos de hoje: { appointment_id, time, patient_first_name, therapist_first_name, status }[]
 * Regra LGPD: Nunca expor CPF, telefone, endereco ou prontuario.
 */
export async function GET(request: NextRequest) {
    try {
        const deviceToken = request.headers.get('x-clinigo-device-token')?.trim()

        if (!deviceToken) {
            return NextResponse.json({ error: 'Token de dispositivo ausente' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()

        // 1. Validar dispositivo ativo
        const { data: device, error: devError } = await (adminDb as any)
            .from('clinic_devices')
            .select('id, clinic_id, room_label, status')
            .eq('device_token', deviceToken)
            .eq('status', 'active')
            .maybeSingle()

        if (devError || !device) {
            return NextResponse.json({ error: 'Dispositivo nao autorizado ou revogado' }, { status: 401 })
        }

        // 2. Atualizar heartbeat (last_seen_at) de forma assincrona
        await (adminDb as any)
            .from('clinic_devices')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', device.id)

        // 3. Buscar atendimentos de hoje
        // Data local da clinica no formato YYYY-MM-DD
        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]

        // Buscar salas vinculadas ou correspondentes ao room_label
        const { data: matchingRooms } = await (adminDb as any)
            .from('consulting_rooms')
            .select('id, name, display_name, room_number')
            .eq('clinic_id', device.clinic_id)

        const matchingRoomIds = (matchingRooms || [])
            .filter((r: any) => {
                const search = device.room_label.toLowerCase().trim()
                const name = (r.name || '').toLowerCase()
                const disp = (r.display_name || '').toLowerCase()
                const num = String(r.room_number || '')
                return name.includes(search) || disp.includes(search) || search.includes(num)
            })
            .map((r: any) => r.id)

        let query = (adminDb as any)
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                patient_id,
                consulting_room_id,
                checkin_confirmed_at,
                checkin_method,
                patient:patients(id, full_name),
                doctor:doctors!appointments_doctor_id_fkey(user:users(full_name))
            `)
            .eq('clinic_id', device.clinic_id)
            .eq('appointment_date', todayStr)
            .not('status', 'in', '("CANCELLED","NO_SHOW")')
            .order('appointment_time', { ascending: true })

        // Se encontrou sala correspondente, filtra pela sala; caso contrário, exibe os atendimentos do dia da clínica
        if (matchingRoomIds.length > 0) {
            query = query.in('consulting_room_id', matchingRoomIds)
        }

        const { data: appointments, error: apptError } = await query

        if (apptError) {
            console.error('[Device Queue] Erro ao buscar fila:', apptError)
            return NextResponse.json({ error: 'Erro ao buscar fila de atendimentos' }, { status: 500 })
        }

        // 4. Sanitizacao estrita LGPD: apenas primeiro nome/inicial e horario
        const sanitizedQueue = (appointments || []).map((appt: any) => {
            const rawFullName = (appt.patient?.full_name || 'Paciente').trim()
            const nameParts = rawFullName.split(/\s+/).filter(Boolean)
            const firstName = nameParts[0] || 'Paciente'
            const secondInitial = nameParts.length > 1 ? `${nameParts[1][0]}.` : ''
            const safeDisplayName = secondInitial ? `${firstName} ${secondInitial}` : firstName

            const docRawName = (appt.doctor?.user?.full_name || '').trim()
            const docFirstName = docRawName.split(/\s+/)[0] || 'Terapeuta'

            return {
                appointment_id: appt.id,
                patient_id: appt.patient_id,
                time: (appt.appointment_time || '').substring(0, 5),
                patient_first_name: safeDisplayName,
                therapist_first_name: docFirstName,
                status: appt.status,
                checkin_confirmed: Boolean(appt.checkin_confirmed_at),
                checkin_method: appt.checkin_method || null,
            }
        })

        return NextResponse.json({
            clinic_id: device.clinic_id,
            device_id: device.id,
            room_label: device.room_label,
            queue: sanitizedQueue,
        })
    } catch (error: any) {
        console.error('[Device Queue] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
