/**
 * AiA Triage History API Route
 * CliniGo - Sistema de Triagem Médica
 * 
 * GET /api/aia/triage/history
 * - Get triage session history for a clinic
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTriageService } from '@/lib/aia/triage-service'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get user's clinic
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile || !('clinic_id' in profile) || !profile.clinic_id) {
            return NextResponse.json(
                { error: 'Clinic not found' },
                { status: 404 }
            )
        }

        const clinicId = profile.clinic_id as string

        // Parse query params
        const { searchParams } = new URL(request.url)
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
        const patientId = searchParams.get('patient_id')

        // Get triage history
        const triageService = getTriageService()
        let sessions = await triageService.getTriageHistory(clinicId, limit)

        // Filter by patient if specified
        if (patientId) {
            sessions = sessions.filter(s => s.patient_id === patientId)
        }

        return NextResponse.json({
            sessions,
            total: sessions.length,
        })

    } catch (error) {
        console.error('Triage history error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
