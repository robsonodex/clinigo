/**
 * Internal Intake API — /api/intake/links
 * 
 * GET: List clinic links
 * POST: Create new link
 * 
 * Requires authentication. RBAC enforced by middleware (CLINIC_ADMIN, RECEPTIONIST).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
    createIntakeLink,
    getClinicLinks,
    markLinkAsSent,
    buildIntakeWhatsAppMessage,
} from '@/lib/services/patient-intake'
import { CreateLinkSchema } from '@/lib/validations/patient-intake'
import { sendWhatsAppMessage, checkInstanceStatus } from '@/lib/whatsapp/service'

export const dynamic = 'force-dynamic'

async function getAuthContext() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return null

    const { data: userData } = await supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single()

    if (!userData?.clinic_id) return null

    return { userId: user.id, clinicId: userData.clinic_id, role: userData.role }
}

/**
 * GET /api/intake/links
 * List all non-static links for the clinic
 */
export async function GET() {
    try {
        const auth = await getAuthContext()
        if (!auth) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const links = await getClinicLinks(auth.clinicId)

        // Check WhatsApp status
        let whatsappConnected = false
        try {
            const status = await checkInstanceStatus(auth.clinicId)
            whatsappConnected = status.connected
        } catch {
            whatsappConnected = false
        }

        return NextResponse.json({ links, whatsappConnected })
    } catch (error: any) {
        console.error('[Intake Links GET]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/intake/links
 * Create a new intake link
 * Body: { lead_name?, lead_phone?, send_whatsapp?: boolean }
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthContext()
        if (!auth) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = CreateLinkSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.errors },
                { status: 400 }
            )
        }

        const origin = request.headers.get('origin') ||
            (request.headers.get('host') ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : undefined)

        const link = await createIntakeLink({
            clinicId: auth.clinicId,
            leadName: parsed.data.lead_name,
            leadPhone: parsed.data.lead_phone,
            createdBy: auth.userId,
            baseUrl: origin,
        })


        let whatsappSent = false
        let whatsappStatus = 'not_requested'

        // If send_whatsapp was requested
        if (body.send_whatsapp && parsed.data.lead_phone) {
            try {
                const status = await checkInstanceStatus(auth.clinicId)
                if (status.connected) {
                    const supabase = await createClient()
                    const { data: clinic } = await supabase
                        .from('clinics')
                        .select('name')
                        .eq('id', auth.clinicId)
                        .single()

                    const message = buildIntakeWhatsAppMessage(
                        parsed.data.lead_name,
                        clinic?.name || 'a clínica',
                        link.url
                    )

                    await sendWhatsAppMessage(
                        auth.clinicId,
                        parsed.data.lead_phone,
                        message,
                        'pre-cadastro-link'
                    )

                    await markLinkAsSent(link.id, auth.clinicId, auth.userId)
                    link.status = 'sent'
                    whatsappSent = true
                    whatsappStatus = 'sent'
                } else {
                    whatsappStatus = 'disconnected'
                }
            } catch (whatsappError: any) {
                console.warn('[Intake] WhatsApp send failed:', whatsappError.message)
                whatsappStatus = 'failed'
            }
        }

        return NextResponse.json({ link, whatsappSent, whatsappStatus })
    } catch (error: any) {
        console.error('[Intake Links POST]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
