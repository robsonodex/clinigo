import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List bookings
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get('status')
        const date = searchParams.get('date')
        const serviceId = searchParams.get('service_id')

        let query = supabase
            .from('online_bookings')
            .select(`
        *,
        service:clinic_services(id, name, price, duration_minutes),
        doctor:doctors(id, users(full_name)),
        patient:patients(id, full_name, phone)
      `)
            .eq('clinic_id', clinicId)
            .order('booking_date', { ascending: true })
            .order('booking_time', { ascending: true })

        if (status) query = query.eq('status', status)
        if (date) query = query.eq('booking_date', date)
        if (serviceId) query = query.eq('service_id', serviceId)

        const { data: bookings, error } = await query.limit(100)

        if (error) {
            console.error('Bookings error:', error)
            return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 })
        }

        return NextResponse.json({ bookings })
    } catch (error) {
        console.error('Bookings error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create online booking (public)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const body = await request.json()
        const {
            service_id,
            doctor_id,
            booking_date,
            booking_time,
            guest_name,
            guest_email,
            guest_phone,
            guest_cpf,
            patient_id,
            patient_notes,
            source = 'website',
            utm_source,
            utm_medium,
            utm_campaign
        } = body

        if (!service_id || !booking_date || !booking_time) {
            return NextResponse.json({
                error: 'Campos obrigatórios: service_id, booking_date, booking_time'
            }, { status: 400 })
        }

        if (!patient_id && (!guest_name || !guest_phone)) {
            return NextResponse.json({
                error: 'Informe nome e telefone ou faça login'
            }, { status: 400 })
        }

        // Get service details
        const { data: service, error: serviceError } = await supabase
            .from('clinic_services')
            .select('*, clinic:clinics(id, name)')
            .eq('id', service_id)
            .eq('online_booking_enabled', true)
            .eq('is_active', true)
            .single()

        if (serviceError || !service) {
            return NextResponse.json({ error: 'Serviço não disponível para agendamento online' }, { status: 400 })
        }

        // Check slot availability
        const { data: existingBooking } = await supabase
            .from('online_bookings')
            .select('id')
            .eq('service_id', service_id)
            .eq('doctor_id', doctor_id)
            .eq('booking_date', booking_date)
            .eq('booking_time', booking_time)
            .in('status', ['PENDING', 'CONFIRMED'])
            .single()

        if (existingBooking) {
            return NextResponse.json({ error: 'Horário não disponível' }, { status: 400 })
        }

        // Create booking
        const { data: booking, error: bookingError } = await supabase
            .from('online_bookings')
            .insert({
                clinic_id: (service as any).clinic_id,
                service_id,
                doctor_id,
                booking_date,
                booking_time,
                duration_minutes: (service as any).duration_minutes,
                price: (service as any).promotional_price || (service as any).price,
                patient_id,
                guest_name,
                guest_email,
                guest_phone,
                guest_cpf,
                patient_notes,
                source,
                utm_source,
                utm_medium,
                utm_campaign
            })
            .select()
            .single()

        if (bookingError) {
            console.error('Create booking error:', bookingError)
            return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 })
        }

        // Update service stats
        await supabase
            .from('clinic_services')
            .update({ total_bookings: (service as any).total_bookings + 1 })
            .eq('id', service_id)

        return NextResponse.json({
            booking,
            message: `Agendamento criado! Código: ${booking.confirmation_code}`
        })
    } catch (error) {
        console.error('Create booking error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Update booking status
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { id, action, cancellation_reason, internal_notes } = body

        if (!id || !action) {
            return NextResponse.json({ error: 'ID e action são obrigatórios' }, { status: 400 })
        }

        let updates: any = {}

        switch (action) {
            case 'confirm':
                updates = {
                    status: 'CONFIRMED',
                    confirmed_at: new Date().toISOString()
                }
                break

            case 'cancel':
                updates = {
                    status: 'CANCELLED',
                    cancelled_at: new Date().toISOString(),
                    cancellation_reason
                }
                break

            case 'complete':
                updates = { status: 'COMPLETED' }
                break

            case 'no_show':
                updates = { status: 'NO_SHOW' }
                break

            case 'add_notes':
                updates = { internal_notes }
                break

            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }

        const { data: booking, error } = await supabase
            .from('online_bookings')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Update booking error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
        }

        return NextResponse.json({ booking })
    } catch (error) {
        console.error('Update booking error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

