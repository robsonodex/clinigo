/**
 * GET /api/permissions/check
 * Check if current user's clinic can access a specific feature
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessFeature } from '@/lib/services/permissions-service'
import { type FeatureKey, ALL_FEATURE_KEYS } from '@/lib/constants/features'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const feature = searchParams.get('feature') as FeatureKey

        if (!feature) {
            return NextResponse.json(
                { error: 'Feature key is required' },
                { status: 400 }
            )
        }

        if (!ALL_FEATURE_KEYS.includes(feature)) {
            return NextResponse.json(
                { error: 'Invalid feature key' },
                { status: 400 }
            )
        }

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

        // Get user's clinic
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!userData || !userData.clinic_id) {
            return NextResponse.json(
                { canAccess: false, reason: 'No clinic associated' },
                { status: 200 }
            )
        }

        // SUPER_ADMIN always has access
        if (userData?.role === 'SUPER_ADMIN') {
            return NextResponse.json({ canAccess: true })
        }

        const canAccess = await canAccessFeature(userData.clinic_id!, feature)

        return NextResponse.json({ canAccess })
    } catch (error) {
        console.error('Error checking permission:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
