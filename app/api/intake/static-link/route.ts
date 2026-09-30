/**
 * Internal Intake API — /api/intake/static-link
 * 
 * GET: Get or regenerate the clinic's static (reusable) link
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicStaticLink } from '@/lib/services/patient-intake'

export const dynamic = 'force-dynamic'

async function getAuthContext() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return null

    const { data: userData } = await supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single()

    if (!userData?.clinic_id) return null

    return { userId: user.id, clinicId: userData.clinic_id, role: userData.role }
}

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthContext()
        if (!auth) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const origin = request.headers.get('origin') ||
            (request.headers.get('host') ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : undefined)

        const link = await getClinicStaticLink(auth.clinicId, auth.userId, origin)

        return NextResponse.json({ link })

    } catch (error: any) {
        console.error('[Intake Static Link]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
