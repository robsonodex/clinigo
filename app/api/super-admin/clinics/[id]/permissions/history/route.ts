/**
 * GET /api/super-admin/clinics/[id]/permissions/history
 * Get permission and pricing change history for a clinic
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPermissionHistory } from '@/lib/services/permissions-service'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: clinicId } = await params

        // Check SUPER_ADMIN access
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || userData?.role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Forbidden - Super Admin only' },
                { status: 403 }
            )
        }

        // Get limit from query params
        const searchParams = request.nextUrl.searchParams
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

        const history = await getPermissionHistory(clinicId, limit)

        return NextResponse.json({ history })
    } catch (error) {
        console.error('Error fetching permission history:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
