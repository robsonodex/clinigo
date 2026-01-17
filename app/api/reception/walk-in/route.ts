import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireRole, forbiddenResponse, unauthorizedResponse } from '@/lib/middlewares/auth'
import { log } from '@/lib/logger'
import { walkInPatientSchema } from '@/lib/validations/reception'
import { withRateLimit } from '@/lib/rate-limit'
import { generateQRToken, generateWhatsAppShareUrl, generateCheckinUrl } from '@/lib/utils/qr-code'

export const dynamic = 'force-dynamic'

// POST /api/reception/walk-in
export async function POST(request: Request) {
    try {
        // Authorization: Only RECEPTIONIST, CLINIC_ADMIN, and SUPER_ADMIN can register walk-ins
        const authResult = await requireRole(['RECEPTIONIST', 'CLINIC_ADMIN', 'SUPER_ADMIN'])

        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult

        // Rate limiting: General API limit (100 req/min)
        const rateLimitResponse = await withRateLimit('api', user.id)
        if (rateLimitResponse) return rateLimitResponse

        const supabase = await createClient()

        const body = await request.json()

        // Validate request body with Zod
        const validationResult = walkInPatientSchema.safeParse(body)

        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validationResult.error.format()
            }, { status: 400 })
        }

        const { patient_id, doctor_id, urgency_level, reason } = validationResult.data

        // Create walk-in registration
        const { data: walkInResult, error } = await supabase
            .from('walk_in_registrations')
            .insert({
                patient_id,
                doctor_id,
                urgency_level: urgency_level || 'normal',
                reason,
                created_by: user.id,
                status: 'waiting'
            } as any)
            .select(`
        *,
        patient:patients(id, full_name, cpf, phone),
        doctor:doctors(id, user:users(name))
      `)
            .single()

        const walkIn = walkInResult as any

        if (error || !walkIn) {
            log.error('Error creating walk-in', { error, userId: user.id })
            return NextResponse.json({ error: error?.message || 'Failed to create walk-in' }, { status: 500 })
        }

        // Audit log the walk-in registration
        log.audit(user.id, 'create_walk_in', {
            patient_id,
            urgency_level: urgency_level || 'normal',
            doctor_id
        })

        // Generate QR Code data
        const qrToken = generateQRToken(walkIn.id)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'
        const checkinUrl = generateCheckinUrl(baseUrl, walkIn.id)

        const whatsappLink = generateWhatsAppShareUrl({
            clinicName: 'CliniGo', // Ideal: Fetch clinic name
            doctorName: (walkIn as any).doctor?.user?.name || 'Clínico Geral',
            appointmentDate: new Date().toISOString(),
            appointmentTime: new Date().toLocaleTimeString(),
            appointmentId: walkIn.id,
            baseUrl
        })

        return NextResponse.json({
            success: true,
            walkIn,
            qrCode: {
                token: qrToken,
                checkinUrl,
                whatsappLink
            }
        })
    } catch (error) {
        log.error('Error in walk-in API', { error })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
