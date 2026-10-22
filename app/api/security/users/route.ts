import { withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/security/users - List all users with their roles
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch users from profiles table
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, name, email, role, created_at')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching users:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ users })
    } catch (error) {
        request.log.error('security/users', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error in users API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
