import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Super Admin email whitelist from env (matching middleware logic)
const SUPER_ADMIN_EMAILS = (
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com'
).split(',').map(e => e.trim().toLowerCase())

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Check Super Admin
        const { data: { user } } = await supabase.auth.getUser()

        let isSuperAdmin = false
        if (user) {
            // 1. Check Metadata Role
            if (user.user_metadata?.role === 'SUPER_ADMIN' || user.app_metadata?.role === 'SUPER_ADMIN') {
                isSuperAdmin = true
            }
            // 2. Check Email Whitelist
            const userEmail = (user.email || '').toLowerCase()
            if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
                isSuperAdmin = true
            }
        }

        if (!isSuperAdmin) {
            return new NextResponse('Unauthorized', { status: 403 })
        }

        const { data: plans, error } = await supabase
            .from('plans')
            .select('*')
            .order('order', { ascending: true })

        if (error) throw error

        return NextResponse.json(plans)
    } catch (error) {
        console.error('Error fetching admin plans:', error)
        return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient()

        // Check Super Admin
        const { data: { user } } = await supabase.auth.getUser()

        let isSuperAdmin = false
        if (user) {
            // 1. Check Metadata Role
            if (user.user_metadata?.role === 'SUPER_ADMIN' || user.app_metadata?.role === 'SUPER_ADMIN') {
                isSuperAdmin = true
            }
            // 2. Check Email Whitelist
            const userEmail = (user.email || '').toLowerCase()
            if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
                isSuperAdmin = true
            }
        }

        if (!isSuperAdmin) {
            return new NextResponse('Unauthorized', { status: 403 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Plan ID required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('plans')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating plan:', error)
        return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
    }
}
