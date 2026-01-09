import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Interface para audit logs (tabela pode não existir)
interface AuditLogRow {
    id: string
    user_id: string | null
    user_name: string | null
    user_email: string | null
    action: string
    entity_type: string | null
    entity_id: string | null
    clinic_id: string | null
    ip_address: string | null
    user_agent: string | null
    severity: string
    created_at: string
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient() as any
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action') || 'all'
        const limit = parseInt(searchParams.get('limit') || '50')

        try {
            // Build query - using type assertion since table may not exist
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit)

            // Non-super admins can only see their clinic's logs
            if (profile && profile.role !== 'SUPER_ADMIN' && profile.clinic_id) {
                query = query.eq('clinic_id', profile.clinic_id)
            }

            // Filter by action if specified
            if (action !== 'all') {
                query = query.ilike('action', `%${action}%`)
            }

            const { data: logs, error } = await query as { data: AuditLogRow[] | null, error: unknown }

            if (error) {
                return NextResponse.json({ data: [] })
            }

            // Transform for frontend
            const formattedLogs = (logs || []).map(log => ({
                id: log.id,
                user_name: log.user_name || 'Sistema',
                user_email: log.user_email || '',
                action: log.action,
                entity_type: log.entity_type || 'SYSTEM',
                entity_id: log.entity_id,
                ip_address: log.ip_address || '0.0.0.0',
                user_agent: log.user_agent || '',
                created_at: log.created_at,
                severity: log.severity || 'low',
            }))

            return NextResponse.json({ data: formattedLogs })
        } catch {
            return NextResponse.json({ data: [] })
        }
    } catch (error) {
        console.error('Audit logs API error:', error)
        return NextResponse.json({ data: [] })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient() as any
        const body = await request.json()

        const {
            user_id,
            user_name,
            user_email,
            action,
            entity_type,
            entity_id,
            clinic_id,
            ip_address,
            user_agent,
            severity = 'low'
        } = body

        try {
            const { error } = await supabase
                .from('audit_logs')
                .insert({
                    user_id,
                    user_name,
                    user_email,
                    action,
                    entity_type,
                    entity_id,
                    clinic_id,
                    ip_address,
                    user_agent,
                    severity,
                } as Record<string, unknown>)

            if (error) {
                console.error('Audit log insert error:', error)
                return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
            }

            return NextResponse.json({ success: true })
        } catch {
            return NextResponse.json({ error: 'Table not available' }, { status: 500 })
        }
    } catch (error) {
        console.error('Audit log create error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
