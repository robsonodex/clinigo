/**
 * GET /api/clinics/by-slug/[slug] - Public endpoint to get clinic info by slug
 * Used by public booking pages to show clinic branding
 */
import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

interface RouteParams {
    params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params

        if (!slug) {
            throw new NotFoundError('Clínica')
        }

        // Use service role for public access (no authentication required)
        const supabase = createServiceRoleClient()

        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('id, name, slug, email, phone, logo_url, primary_color, is_active, plan_type')
            .eq('slug', slug)
            .eq('is_active', true)
            .single()

        if (error || !clinic) {
            throw new NotFoundError('Clínica')
        }

        return successResponse(clinic)
    } catch (error) {
        return handleApiError(error)
    }
}
