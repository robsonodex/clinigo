/**
 * POST /api/super-admin/clinics/[id]/custom-price
 * Set or clear custom pricing for a clinic (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
    setCustomPrice,
    clearCustomPrice,
    getEffectivePrice,
} from '@/lib/services/permissions-service'

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
 * GET - Get current pricing info for a clinic
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

        const pricing = await getEffectivePrice(clinicId)

        return NextResponse.json({ pricing })
    } catch (error) {
        console.error('Error fetching pricing:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * POST - Set custom price for a clinic
 * Body: { price: number, startDate: string, endDate?: string, reason: string }
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
        const { price, startDate, endDate, reason } = body as {
            price: number
            startDate: string
            endDate?: string
            reason: string
        }

        // Validation
        if (typeof price !== 'number' || price < 0) {
            return NextResponse.json(
                { error: 'Price must be a positive number' },
                { status: 400 }
            )
        }

        if (!startDate) {
            return NextResponse.json(
                { error: 'Start date is required' },
                { status: 400 }
            )
        }

        if (!reason || reason.trim().length === 0) {
            return NextResponse.json(
                { error: 'Reason is required for custom pricing' },
                { status: 400 }
            )
        }

        const parsedStartDate = new Date(startDate)
        const parsedEndDate = endDate ? new Date(endDate) : null

        if (isNaN(parsedStartDate.getTime())) {
            return NextResponse.json(
                { error: 'Invalid start date format' },
                { status: 400 }
            )
        }

        if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
            return NextResponse.json(
                { error: 'Invalid end date format' },
                { status: 400 }
            )
        }

        if (parsedEndDate && parsedEndDate < parsedStartDate) {
            return NextResponse.json(
                { error: 'End date must be after start date' },
                { status: 400 }
            )
        }

        await setCustomPrice(
            clinicId,
            price,
            parsedStartDate,
            parsedEndDate,
            reason.trim()
        )

        return NextResponse.json({
            success: true,
            message: 'Custom price set successfully',
        })
    } catch (error) {
        console.error('Error setting custom price:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * DELETE - Clear custom price for a clinic (revert to plan default)
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

        await clearCustomPrice(clinicId)

        return NextResponse.json({
            success: true,
            message: 'Custom price cleared - using plan default',
        })
    } catch (error) {
        console.error('Error clearing custom price:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
