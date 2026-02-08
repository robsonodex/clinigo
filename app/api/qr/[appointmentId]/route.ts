/**
 * GET /api/qr/[appointmentId]
 * Returns the QR code image as PNG for use in emails
 * 
 * This endpoint serves QR codes as actual images (not base64 data URLs)
 * because most email clients block embedded base64 images for security reasons.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ appointmentId: string }> }
) {
    try {
        const { appointmentId } = await params

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(appointmentId)) {
            return new NextResponse('Invalid appointment ID', { status: 400 })
        }

        // Verify appointment exists using service role (no auth required for QR viewing)
        const supabase = createServiceRoleClient()

        const { data: appointment, error } = await supabase
            .from('appointments')
            .select('id, clinic_id')
            .eq('id', appointmentId)
            .single()

        if (error || !appointment) {
            // Return a generic placeholder QR if appointment not found
            // This prevents enumeration attacks
            const placeholderQR = await QRCode.toBuffer('https://clinigo.app', {
                width: 200,
                margin: 2,
                color: { dark: '#cccccc', light: '#ffffff' },
                errorCorrectionLevel: 'L'
            })

            return new NextResponse(new Uint8Array(placeholderQR), {
                status: 200,
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=86400', // 24 hours
                }
            })
        }

        // Generate the check-in URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'
        const checkinUrl = `${baseUrl}/checkin/${appointmentId}`

        // Generate QR code as PNG buffer
        const qrBuffer = await QRCode.toBuffer(checkinUrl, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
        })

        return new NextResponse(new Uint8Array(qrBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=604800', // 7 days
                'Content-Disposition': `inline; filename="qr-${appointmentId}.png"`
            }
        })

    } catch (error) {
        console.error('[QR API] Error generating QR code:', error)
        return new NextResponse('Error generating QR code', { status: 500 })
    }
}
