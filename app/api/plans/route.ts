import { withAxiom, AxiomRequest } from 'next-axiom'

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLANS } from '@/lib/constants/plans'

export const dynamic = 'force-dynamic'

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()

        // Forcing use of constants to match requested names and features strictly
        // const { data: plans, error } = await supabase
        //     .from('plans')
        //     .select('*')
        //     .eq('is_active', true)
        //     .order('order', { ascending: true })

        // Return constants directly
        return NextResponse.json(Object.values(PLANS).sort((a, b) =>
            (a.price || 0) - (b.price || 0)
        ))
    } catch (error) {
        request.log.error('plans', { error: error instanceof Error ? error.message : String(error) })
        console.error('Internal error fetching plans:', error)
        return NextResponse.json(Object.values(PLANS), { status: 500 })
    }
})
