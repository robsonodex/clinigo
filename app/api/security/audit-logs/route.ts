import { withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/security/audit-logs - Fetch audit logs from activity_log table
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action')
        const userId = searchParams.get('user_id')
        const limit = parseInt(searchParams.get('limit') || '50')

        let query = supabase
            .from('activity_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (action) {
            query = query.eq('action', action)
        }
        if (userId) {
            query = query.eq('user_id', userId)
        }

        const { data: logs, error } = await query

        if (error) {
            console.error('Error fetching audit logs:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ logs })
    } catch (error) {
        request.log.error('security/audit-logs', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error in audit logs API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
