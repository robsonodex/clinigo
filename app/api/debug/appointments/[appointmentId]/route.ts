import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ appointmentId: string }>
}

/**
 * DEBUG ROUTE - GET /api/debug/appointments/[appointmentId]
 * Returns full debug information about appointment fetch
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { appointmentId } = await params
        const debugInfo: any = {
            requestedId: appointmentId,
            timestamp: new Date().toISOString(),
            steps: []
        }

        // Step 1: Check auth
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        debugInfo.steps.push({
            step: 1,
            name: 'Auth Check',
            userId: user?.id,
            authError: authError?.message,
            isAuthenticated: !!user
        })

        if (!user) {
            return NextResponse.json(debugInfo, { status: 200 })
        }

        // Step 2: Check with service role (bypasses RLS)
        const adminDb = createServiceRoleClient()
        const { data: adminCheck, error: adminError } = await adminDb
            .from('appointments')
            .select('*')
            .eq('id', appointmentId)
            .single()

        debugInfo.steps.push({
            step: 2,
            name: 'Service Role Check (bypasses RLS)',
            found: !!adminCheck,
            data: adminCheck,
            error: adminError ? {
                message: adminError.message,
                code: adminError.code,
                details: adminError.details,
                hint: adminError.hint
            } : null
        })

        // Step 3: Try with foreign keys specified
        const { data: withFkeys, error: fkeyError } = await adminDb
            .from('appointments')
            .select(`
                *,
                patient:patients!appointments_patient_id_fkey(id, full_name),
                doctor:doctors!appointments_doctor_id_fkey(id),
                clinic:clinics!appointments_clinic_id_fkey(id, name)
            `)
            .eq('id', appointmentId)
            .single()

        debugInfo.steps.push({
            step: 3,
            name: 'With Foreign Keys',
            found: !!withFkeys,
            data: withFkeys,
            error: fkeyError ? {
                message: fkeyError.message,
                code: fkeyError.code,
                details: fkeyError.details,
                hint: fkeyError.hint
            } : null
        })

        // Step 4: Check user permissions
        const { data: userData } = await adminDb
            .from('users')
            .select('id, role, clinic_id')
            .eq('id', user.id)
            .single()

        debugInfo.steps.push({
            step: 4,
            name: 'User Data',
            userData
        })

        return NextResponse.json(debugInfo, { status: 200 })

    } catch (error: any) {
        return NextResponse.json({
            error: 'Fatal error',
            message: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
