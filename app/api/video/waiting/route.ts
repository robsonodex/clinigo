import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get waiting patients for a doctor
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const roomId = searchParams.get('room_id')

        let query = supabase
            .from('waiting_room')
            .select(`
        *,
        patient:patients(id, full_name, email, phone),
        room:video_rooms(
          id, 
          room_url, 
          scheduled_start,
          appointment:appointments(appointment_date, appointment_time)
        )
      `)
            .eq('status', 'WAITING')
            .order('joined_at', { ascending: true })

        if (roomId) {
            query = query.eq('room_id', roomId)
        }

        const { data: waiting, error } = await query

        if (error) {
            console.error('Waiting room error:', error)
            return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 })
        }

        return NextResponse.json({ waiting })
    } catch (error) {
        console.error('Waiting room error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Patient joins waiting room
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const body = await request.json()
        const {
            room_id,
            patient_id,
            device_type = 'desktop',
            browser,
            has_camera = true,
            has_microphone = true
        } = body

        if (!room_id || !patient_id) {
            return NextResponse.json({
                error: 'room_id e patient_id são obrigatórios'
            }, { status: 400 })
        }

        // Check if patient is already waiting
        const { data: existing } = await supabase
            .from('waiting_room')
            .select('id')
            .eq('room_id', room_id)
            .eq('patient_id', patient_id)
            .eq('status', 'WAITING')
            .single()

        if (existing) {
            return NextResponse.json({
                waiting: existing,
                message: 'Paciente já está na sala de espera'
            })
        }

        // Add to waiting room
        const { data: waiting, error } = await supabase
            .from('waiting_room')
            .insert({
                room_id,
                patient_id,
                device_type,
                browser,
                has_camera,
                has_microphone,
                connection_quality: 'good' // Initial assumption
            })
            .select()
            .single()

        if (error) {
            console.error('Join waiting room error:', error)
            return NextResponse.json({ error: 'Erro ao entrar' }, { status: 500 })
        }

        return NextResponse.json({ waiting })
    } catch (error) {
        console.error('Join waiting room error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Admit patient or update status
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { waiting_id, action, connection_quality } = body

        if (!waiting_id) {
            return NextResponse.json({ error: 'waiting_id é obrigatório' }, { status: 400 })
        }

        let updates: any = {}

        switch (action) {
            case 'admit':
                updates = {
                    status: 'IN_CALL',
                    admitted_at: new Date().toISOString()
                }
                break

            case 'complete':
                updates = {
                    status: 'COMPLETED',
                    left_at: new Date().toISOString()
                }
                break

            case 'no_show':
                updates = {
                    status: 'NO_SHOW',
                    left_at: new Date().toISOString()
                }
                break

            case 'update_connection':
                updates = { connection_quality }
                break

            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }

        const { data: waiting, error } = await supabase
            .from('waiting_room')
            .update(updates)
            .eq('id', waiting_id)
            .select()
            .single()

        if (error) {
            console.error('Update waiting room error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
        }

        return NextResponse.json({ waiting })
    } catch (error) {
        console.error('Update waiting room error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
