import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/auth/verify-token'

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { user } = await getVerifiedUser(supabase, request)
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        let { data: userData } = await supabase
            .from('users')
            .select('id, full_name, clinic_id, role')
            .eq('id', user.id)
            .maybeSingle()

        if (!userData) {
            const admin = createServiceRoleClient()
            const { data: fallbackUser } = await admin
                .from('users')
                .select('id, full_name, clinic_id, role')
                .eq('id', user.id)
                .maybeSingle()
            userData = fallbackUser
        }

        return NextResponse.json({ id: user.id, email: user.email, ...userData })
    } catch (error: any) {
        request.log.error('auth/me', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
