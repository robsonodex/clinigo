/**
 * GET /api/patients/[id]/noshow-stats
 * Get patient no-show statistics for reputation badge
 */
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const patientId = params.id
        const supabase = await createClient() as any

        // Query patient no-show stats view
        const { data: stats, error } = await supabase
            .from('vw_patient_noshow_stats')
            .select('*')
            .eq('patient_id', patientId)
            .maybeSingle()

        if (error) {
            console.error('Error fetching patient stats:', error)
            throw error
        }

        // If no stats found, patient has no no-shows
        if (!stats) {
            return successResponse({
                patient_id: patientId,
                total_no_shows: 0,
                recent_no_shows_6m: 0,
                recent_no_shows_3m: 0,
                is_frequent_no_show: false,
                last_no_show_date: null,
            })
        }

        return successResponse(stats)

    } catch (error) {
        return handleApiError(error)
    }
}
