/**
 * GET/POST /api/super-admin/clinics/[id]/permissions
 * Manage custom permissions for a specific clinic (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
    getClinicPermissions,
    enableFeature,
    disableFeature,
    resetClinicPermissions,
} from '@/lib/services/permissions-service'
import {
    type FeatureKey,
    FEATURE_METADATA,
    ALL_FEATURE_KEYS,
    PROTECTED_FEATURES,
} from '@/lib/constants/features'
import { isClinicInSessionPlansAllowlist } from '@/lib/constants/session-plans-beta-clinics'

interface RouteParams {
    params: Promise<{ id: string }>
}

// Middleware to check SUPER_ADMIN access
async function checkSuperAdmin() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized', status: 401 }
    }

    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!userData || userData?.role !== 'SUPER_ADMIN') {
        return { error: 'Forbidden - Super Admin only', status: 403 }
    }

    return { userId: user.id }
}

/**
 * GET - Get all permissions for a clinic
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: clinicId } = await params
        const authCheck = await checkSuperAdmin()

        if ('error' in authCheck) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            )
        }

        const permissions = await getClinicPermissions(clinicId)

        return NextResponse.json({ permissions })
    } catch (error) {
        console.error('Error fetching permissions:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * POST - Update a permission for a clinic
 * Body: { feature: string, enabled: boolean, reason?: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: clinicId } = await params
        const authCheck = await checkSuperAdmin()

        if ('error' in authCheck) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            )
        }

        const body = await request.json()
        const { feature, enabled, reason } = body as {
            feature: FeatureKey
            enabled: boolean
            reason?: string
        }

        // Validate feature key
        if (!feature || !ALL_FEATURE_KEYS.includes(feature)) {
            return NextResponse.json(
                { error: 'Invalid feature key' },
                { status: 400 }
            )
        }

        // Camada A: Se for feature de Terapia e a clínica não estiver na allowlist, retorna 404 (sem dar pista)
        if (FEATURE_METADATA[feature]?.category === 'TERAPIA' && !isClinicInSessionPlansAllowlist(clinicId)) {
            return NextResponse.json(
                { error: 'Not Found' },
                { status: 404 }
            )
        }

        // Prevent modifying protected features
        if (PROTECTED_FEATURES.includes(feature)) {
            return NextResponse.json(
                { error: 'Cannot modify protected feature' },
                { status: 400 }
            )
        }

        // Validate enabled is boolean
        if (typeof enabled !== 'boolean') {
            return NextResponse.json(
                { error: 'enabled must be a boolean' },
                { status: 400 }
            )
        }

        // Enable or disable the feature
        if (enabled) {
            await enableFeature(clinicId, feature, authCheck.userId, reason)
        } else {
            await disableFeature(clinicId, feature, authCheck.userId, reason)
        }

        return NextResponse.json({
            success: true,
            message: `Feature ${feature} ${enabled ? 'enabled' : 'disabled'}`,
        })
    } catch (error) {
        console.error('Error updating permission:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * DELETE - Reset all custom permissions to defaults
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: clinicId } = await params
        const authCheck = await checkSuperAdmin()

        if ('error' in authCheck) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            )
        }

        await resetClinicPermissions(clinicId)

        return NextResponse.json({
            success: true,
            message: 'All custom permissions reset to defaults',
        })
    } catch (error) {
        console.error('Error resetting permissions:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
