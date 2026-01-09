import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

// Interface para API Keys (tabela pode não existir)
interface ApiKeyRow {
    id: string
    clinic_id: string | null
    name: string
    key_hash: string
    permissions: string[]
    rate_limit: number
    last_used_at: string | null
    expires_at: string | null
    is_active: boolean
    created_at: string
    created_by: string
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        // Type-safe extraction for profile
        const profileData = profile as { clinic_id?: string; role?: string } | null

        if (!profileData) {
            return NextResponse.json({ data: [] })
        }

        if (!profileData.clinic_id && profileData.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ data: [] })
        }

        // Fetch API keys - using raw query since table may not exist
        try {
            const { data: apiKeys, error } = await supabase
                .from('api_keys')
                .select('*')
                .order('created_at', { ascending: false }) as { data: ApiKeyRow[] | null, error: unknown }

            if (error) {
                return NextResponse.json({ data: [] })
            }

            // Mask the keys for display
            const maskedKeys = (apiKeys || []).map(key => ({
                id: key.id,
                name: key.name,
                key_prefix: key.key_hash?.substring(0, 12) || 'clg_***',
                permissions: key.permissions || ['read'],
                rate_limit: key.rate_limit || 100,
                last_used_at: key.last_used_at,
                expires_at: key.expires_at,
                is_active: key.is_active,
                created_at: key.created_at,
            }))

            return NextResponse.json({ data: maskedKeys })
        } catch {
            return NextResponse.json({ data: [] })
        }
    } catch (error) {
        console.error('API keys fetch error:', error)
        return NextResponse.json({ data: [] })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        // Type-safe extraction for profile
        const profileData = profile as { clinic_id?: string; role?: string } | null

        if (!profileData) {
            return NextResponse.json({ error: 'No profile found' }, { status: 404 })
        }

        if (!profileData.clinic_id && profileData.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'No clinic found' }, { status: 404 })
        }

        const body = await request.json()
        const { name, permissions = ['read'], rate_limit = 100, expires_in_days } = body

        // Generate secure API key
        const rawKey = `clg_live_${randomBytes(24).toString('hex')}`
        const keyHash = createHash('sha256').update(rawKey).digest('hex')

        // Calculate expiration
        let expires_at: string | null = null
        if (expires_in_days) {
            const expDate = new Date()
            expDate.setDate(expDate.getDate() + expires_in_days)
            expires_at = expDate.toISOString()
        }

        try {
            const { data, error } = await (supabase.from('api_keys') as any)
                .insert({
                    clinic_id: profileData.clinic_id,
                    name,
                    key_hash: keyHash,
                    permissions,
                    rate_limit,
                    expires_at,
                    is_active: true,
                    created_by: user.id,
                } as Record<string, unknown>)
                .select()
                .single() as { data: ApiKeyRow | null, error: unknown }

            if (error || !data) {
                console.error('API key insert error:', error)
                return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                data: {
                    id: data.id,
                    name: data.name,
                    key: rawKey,
                    permissions: data.permissions,
                    expires_at: data.expires_at,
                }
            })
        } catch {
            return NextResponse.json({ error: 'Table not available' }, { status: 500 })
        }
    } catch (error) {
        console.error('API key create error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const keyId = searchParams.get('id')

        if (!keyId) {
            return NextResponse.json({ error: 'Key ID required' }, { status: 400 })
        }

        try {
            const { error } = await supabase
                .from('api_keys')
                .delete()
                .eq('id', keyId)

            if (error) {
                console.error('API key delete error:', error)
                return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
            }

            return NextResponse.json({ success: true })
        } catch {
            return NextResponse.json({ error: 'Table not available' }, { status: 500 })
        }
    } catch (error) {
        console.error('API key delete error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
