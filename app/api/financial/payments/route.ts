import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireRole, forbiddenResponse, unauthorizedResponse } from '@/lib/middlewares/auth'
import { log } from '@/lib/logger'
import { createPaymentSchema } from '@/lib/validations/financial'
import { withRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/financial/payments - Create manual payment
export async function POST(request: Request) {
    try {
        // Authorization: Only CLINIC_ADMIN and SUPER_ADMIN can create payments
        const authResult = await requireRole(['CLINIC_ADMIN', 'SUPER_ADMIN'])

        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult

        // Rate limiting: 20 requests per minute for payment operations
        const rateLimitResponse = await withRateLimit('payments', user.id)
        if (rateLimitResponse) return rateLimitResponse

        const supabase = await createClient()

        const body = await request.json()

        // Validate request body with Zod
        const validationResult = createPaymentSchema.safeParse(body)

        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validationResult.error.format()
            }, { status: 400 })
        }

        const {
            patient_id,
            amount,
            payment_method,
            category,
            description,
            appointment_id
        } = validationResult.data

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        }

        const clinicId = user.clinic_id

        if (!clinicId) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        // Create payment entry
        const { data: payment, error } = await supabase
            .from('financial_entries')
            .insert({
                clinic_id: clinicId,
                type: 'income',
                amount,
                description: description || 'Pagamento manual',
                category,
                payment_method,
                appointment_id,
                created_by: user.id,
                date: new Date().toISOString()
            } as any) // Type assertion needed until database types are generated
            .select()
            .single()

        if (error) {
            log.error('Error creating payment', { error, userId: user.id })
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Audit log the payment creation
        log.audit(user.id, 'create_payment', {
            amount,
            payment_method,
            category,
            patient_id
        })

        return NextResponse.json({ success: true, payment })
    } catch (error) {
        console.error('Error in payments API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// GET /api/financial/payments - List payments with filters
export async function GET(request: Request) {
    try {
        // Authorization: Only CLINIC_ADMIN and SUPER_ADMIN can view payments
        const authResult = await requireRole(['CLINIC_ADMIN', 'SUPER_ADMIN'])

        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult
        const supabase = await createClient()

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const paymentMethod = searchParams.get('payment_method')
        const category = searchParams.get('category')

        const clinicId = user.clinic_id

        let query = supabase
            .from('financial_entries')
            .select('id, amount, payment_method, category, status, date, description, patient_id, appointment_id, created_at')
            .eq('clinic_id', clinicId)
            .eq('type', 'income')

        if (startDate) {
            query = query.gte('date', startDate)
        }
        if (endDate) {
            query = query.lte('date', endDate)
        }
        if (paymentMethod) {
            query = query.eq('payment_method', paymentMethod)
        }
        if (category) {
            query = query.eq('category', category)
        }

        query = query
            .order('date', { ascending: false })
            .limit(100) // Limite de performance

        const { data: payments, error } = await query

        if (error) {
            log.error('Error fetching payments', { error, userId: user.id, clinicId })
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ payments })
    } catch (error) {
        log.error('Error in payments API', { error })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
