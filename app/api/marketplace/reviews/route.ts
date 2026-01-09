import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List reviews
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const searchParams = request.nextUrl.searchParams
        const clinicId = searchParams.get('clinic_id')
        const serviceId = searchParams.get('service_id')
        const doctorId = searchParams.get('doctor_id')
        const status = searchParams.get('status') || 'APPROVED'

        let query = supabase
            .from('service_reviews')
            .select(`
        *,
        service:clinic_services(id, name),
        doctor:doctors(id, users(full_name))
      `)
            .order('created_at', { ascending: false })

        if (clinicId) query = query.eq('clinic_id', clinicId)
        if (serviceId) query = query.eq('service_id', serviceId)
        if (doctorId) query = query.eq('doctor_id', doctorId)
        if (status !== 'all') query = query.eq('status', status)

        const { data: reviews, error } = await query.limit(50)

        if (error) {
            console.error('Reviews error:', error)
            return NextResponse.json({ error: 'Erro ao buscar avaliações' }, { status: 500 })
        }

        // Calculate stats
        const stats = {
            total: reviews?.length || 0,
            average: reviews?.length ?
                (reviews.reduce((acc, r) => acc + r.overall_rating, 0) / reviews.length).toFixed(1) : 0,
            distribution: {
                5: reviews?.filter(r => r.overall_rating === 5).length || 0,
                4: reviews?.filter(r => r.overall_rating === 4).length || 0,
                3: reviews?.filter(r => r.overall_rating === 3).length || 0,
                2: reviews?.filter(r => r.overall_rating === 2).length || 0,
                1: reviews?.filter(r => r.overall_rating === 1).length || 0,
            }
        }

        return NextResponse.json({ reviews, stats })
    } catch (error) {
        console.error('Reviews error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create review
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const body = await request.json()
        const {
            clinic_id,
            service_id,
            doctor_id,
            booking_id,
            appointment_id,
            patient_id,
            reviewer_name,
            overall_rating,
            punctuality_rating,
            environment_rating,
            service_rating,
            title,
            content
        } = body

        if (!clinic_id || !overall_rating || !reviewer_name) {
            return NextResponse.json({
                error: 'Campos obrigatórios: clinic_id, overall_rating, reviewer_name'
            }, { status: 400 })
        }

        if (overall_rating < 1 || overall_rating > 5) {
            return NextResponse.json({ error: 'Rating deve ser entre 1 e 5' }, { status: 400 })
        }

        // Check if booking/appointment is verified
        let isVerified = false
        if (booking_id) {
            const { data: booking } = await supabase
                .from('online_bookings')
                .select('status')
                .eq('id', booking_id)
                .single()
            isVerified = (booking as any)?.status === 'COMPLETED'
        } else if (appointment_id) {
            const { data: apt } = await supabase
                .from('appointments')
                .select('status')
                .eq('id', appointment_id)
                .single()
            isVerified = (apt as any)?.status === 'COMPLETED'
        }

        const { data: review, error } = await supabase
            .from('service_reviews')
            .insert({
                clinic_id,
                service_id,
                doctor_id,
                booking_id,
                appointment_id,
                patient_id,
                reviewer_name,
                is_verified: isVerified,
                overall_rating,
                punctuality_rating,
                environment_rating,
                service_rating,
                title,
                content,
                status: 'PENDING' // Requires moderation
            })
            .select()
            .single()

        if (error) {
            console.error('Create review error:', error)
            return NextResponse.json({ error: 'Erro ao criar avaliação' }, { status: 500 })
        }

        return NextResponse.json({
            review,
            message: 'Avaliação enviada! Será publicada após moderação.'
        })
    } catch (error) {
        console.error('Create review error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Moderate review / Add response
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { id, action, clinic_response, rejection_reason } = body

        if (!id || !action) {
            return NextResponse.json({ error: 'ID e action são obrigatórios' }, { status: 400 })
        }

        let updates: any = {}

        switch (action) {
            case 'approve':
                updates = { status: 'APPROVED' }
                break

            case 'reject':
                updates = { status: 'REJECTED' }
                break

            case 'flag':
                updates = { status: 'FLAGGED' }
                break

            case 'respond':
                updates = {
                    clinic_response,
                    responded_at: new Date().toISOString(),
                    responded_by: user.id
                }
                break

            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }

        const { data: review, error } = await supabase
            .from('service_reviews')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Update review error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
        }

        return NextResponse.json({ review })
    } catch (error) {
        console.error('Update review error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

