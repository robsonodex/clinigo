/**
 * Internal Intake API — /api/intake/submissions
 * 
 * GET: List submissions for the clinic (optional ?status= filter)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicSubmissions } from '@/lib/services/patient-intake'

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

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || undefined

        const submissions = await getClinicSubmissions(auth.clinicId, status)

        return NextResponse.json({ submissions })
    } catch (error: any) {
        console.error('[Intake Submissions GET]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
