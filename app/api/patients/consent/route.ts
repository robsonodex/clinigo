/**
 * Patient Consent API
 * 
 * GET: Check consent status
 * POST: Accept consent
 * DELETE: Revoke consent
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
    hasValidConsent,
    acceptConsent,
    revokeConsent,
    getPatientConsents,
    getConsentText,
    type ConsentType
} from '@/lib/services/patient-consent'
import { headers } from 'next/headers'

/**
 * GET /api/patients/consent?patientId=xxx&type=DATA_PROCESSING
 * Check if patient has valid consent
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const url = new URL(req.url)
        const patientId = url.searchParams.get('patientId')
        const consentType = url.searchParams.get('type') as ConsentType | null

        if (!patientId) {
            return NextResponse.json(
                { error: 'patientId é obrigatório' },
                { status: 400 }
            )
        }

        // Get user's clinic
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { error: 'Usuário sem clínica associada' },
                { status: 400 }
            )
        }

        // If specific type requested
        if (consentType) {
            const hasConsent = await hasValidConsent(patientId, profile.clinic_id, consentType)
            return NextResponse.json({
                hasConsent,
                consentType,
                consentText: getConsentText(consentType)
            })
        }

        // Return all consents
        const consents = await getPatientConsents(patientId, profile.clinic_id)
        return NextResponse.json({ consents })

    } catch (error: any) {
        console.error('Error checking consent:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/patients/consent
 * Accept consent
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await req.json()
        const { patientId, consentType } = body

        if (!patientId || !consentType) {
            return NextResponse.json(
                { error: 'patientId e consentType são obrigatórios' },
                { status: 400 }
            )
        }

        // Get user's clinic
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { error: 'Usuário sem clínica associada' },
                { status: 400 }
            )
        }

        // Get request metadata
        const headersList = await headers()
        const ipAddress = headersList.get('x-forwarded-for') ||
            headersList.get('x-real-ip') ||
            'unknown'
        const userAgent = headersList.get('user-agent') || 'unknown'

        const consent = await acceptConsent(
            patientId,
            profile.clinic_id,
            consentType,
            ipAddress,
            userAgent
        )

        return NextResponse.json({
            success: true,
            consent,
            message: 'Consentimento registrado com sucesso'
        })

    } catch (error: any) {
        console.error('Error accepting consent:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/patients/consent
 * Revoke consent
 */
export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await req.json()
        const { patientId, consentType } = body

        if (!patientId || !consentType) {
            return NextResponse.json(
                { error: 'patientId e consentType são obrigatórios' },
                { status: 400 }
            )
        }

        // Get user's clinic
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { error: 'Usuário sem clínica associada' },
                { status: 400 }
            )
        }

        await revokeConsent(patientId, profile.clinic_id, consentType)

        return NextResponse.json({
            success: true,
            message: 'Consentimento revogado com sucesso'
        })

    } catch (error: any) {
        console.error('Error revoking consent:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
