
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLANS } from '@/lib/constants/plans'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Try to fetch from database
        const { data: plans, error } = await supabase
            .from('plans')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true })

        if (error) {
            console.error('Error fetching plans from DB:', error)
            // Fallback to constants if DB fails or table doesn't exist yet
            return NextResponse.json(Object.values(PLANS).sort((a, b) =>
                (a.price || 0) - (b.price || 0)
            ))
        }

        if (!plans || plans.length === 0) {
            // Fallback if empty
            return NextResponse.json(Object.values(PLANS).sort((a, b) =>
                (a.price || 0) - (b.price || 0)
            ))
        }

        return NextResponse.json(plans)
    } catch (error) {
        console.error('Internal error fetching plans:', error)
        return NextResponse.json(Object.values(PLANS), { status: 500 })
    }
}
