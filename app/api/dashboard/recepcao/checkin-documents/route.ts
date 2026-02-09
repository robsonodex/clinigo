import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        // Verify user is authenticated via Supabase session
        const supabaseClient = await createClient()
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        // Get appointment_id from query params
        const { searchParams } = new URL(request.url)
        const appointmentId = searchParams.get('appointmentId')

        if (!appointmentId) {
            return NextResponse.json(
                { error: 'appointmentId é obrigatório' },
                { status: 400 }
            )
        }

        const supabase = createServiceRoleClient()

        // Get pre-checkin submission
        const { data: submission, error: submissionError } = await supabase
            .from('pre_checkin_submissions')
            .select('id, checked_in_at, status, data, document_url, document_type')
            .eq('appointment_id', appointmentId)
            .single()

        // Get appointment checkins (documents)
        const { data: checkinData, error: checkinError } = await supabase
            .from('appointment_checkins')
            .select('documents')
            .eq('appointment_id', appointmentId)
            .single()

        // Both tables may not have data - that's ok
        return NextResponse.json({
            success: true,
            preCheckin: submission || null,
            documents: (checkinData as { documents?: any[] } | null)?.documents || []
        })
    } catch (error) {
        console.error('[checkin-documents] Error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

