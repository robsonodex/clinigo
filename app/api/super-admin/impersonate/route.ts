import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isMasterAdmin } from '@/lib/super-admin-middleware'

// Use service role for full access
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
    // Verify Super Admin
    const isAuthorized = await isMasterAdmin(request)
    if (!isAuthorized) {
        return new NextResponse('Not Found', { status: 404 })
    }

    try {
        const { clinicId, clinicName } = await request.json()

        if (!clinicId) {
            return NextResponse.json(
                { error: 'clinicId is required' },
                { status: 400 }
            )
        }

        // Verify clinic exists
        const { data: clinic, error: clinicError } = await supabaseAdmin
            .from('clinics')
            .select('id, name')
            .eq('id', clinicId)
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json(
                { error: 'Clinic not found' },
                { status: 404 }
            )
        }

        // Create impersonation session
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('impersonation_sessions')
            .insert({
                admin_email: 'robsonfenriz@gmail.com',
                target_clinic_id: clinicId,
                target_clinic_name: clinicName || clinic.name,
                is_active: true,
            })
            .select('id')
            .single()

        if (sessionError) {
            console.error('Error creating impersonation session:', sessionError)
        }

        // Log the impersonation
        await supabaseAdmin.from('system_logs').insert({
            admin_email: 'robsonfenriz@gmail.com',
            action_type: 'IMPERSONATE',
            action_category: 'CLINIC',
            action_description: `Started impersonation session for ${clinicName || clinic.name}`,
            target_clinic_id: clinicId,
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            request_path: '/api/super-admin/impersonate',
            metadata: { session_id: session?.id }
        })

        // Generate impersonation token
        const impersonationToken = Buffer.from(
            JSON.stringify({
                clinicId,
                clinicName: clinic.name,
                sessionId: session?.id,
                expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
            })
        ).toString('base64')

        const response = NextResponse.json({
            success: true,
            clinicId,
            clinicName: clinic.name,
            sessionId: session?.id,
        })

        // Set impersonation cookie
        response.cookies.set('impersonation_token', impersonationToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60, // 1 hour
            path: '/',
        })

        return response

    } catch (error) {
        console.error('[Impersonate] Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

// End impersonation session
export async function DELETE(request: NextRequest) {
    const isAuthorized = await isMasterAdmin(request)
    if (!isAuthorized) {
        return new NextResponse('Not Found', { status: 404 })
    }

    try {
        const impersonationToken = request.cookies.get('impersonation_token')?.value

        if (impersonationToken) {
            const decoded = JSON.parse(Buffer.from(impersonationToken, 'base64').toString())

            // End the session
            await supabaseAdmin
                .from('impersonation_sessions')
                .update({
                    is_active: false,
                    ended_at: new Date().toISOString(),
                })
                .eq('id', decoded.sessionId)

            // Log the end
            await supabaseAdmin.from('system_logs').insert({
                admin_email: 'robsonfenriz@gmail.com',
                action_type: 'END_IMPERSONATE',
                action_category: 'CLINIC',
                action_description: `Ended impersonation session for ${decoded.clinicName}`,
                target_clinic_id: decoded.clinicId,
                metadata: { session_id: decoded.sessionId }
            })
        }

        const response = NextResponse.json({ success: true })
        response.cookies.delete('impersonation_token')

        return response

    } catch (error) {
        console.error('[End Impersonation] Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

