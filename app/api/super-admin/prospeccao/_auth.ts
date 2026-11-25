/**
 * Guard fail-closed exclusivo SUPER_ADMIN para APIs do HQ de Prospecção B2B.
 * Retorna HTTP 404 (cloaking) para visitantes ou perfis não autorizados.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const DEFAULT_SUPER_ADMIN_EMAILS = 'robsonfenriz@gmail.com,contato@clinigo.app'

export function isSuperAdminEmailWhitelisted(email?: string | null): boolean {
    if (!email) return false
    const allowed = (process.env.SUPER_ADMIN_EMAILS || DEFAULT_SUPER_ADMIN_EMAILS)
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    return allowed.includes(email.trim().toLowerCase())
}

export async function requireSuperAdminSalesHq(): Promise<
    | { ok: true; user: { id: string; email: string }; supabaseAdmin: ReturnType<typeof createServiceRoleClient> }
    | { ok: false; response: NextResponse }
> {
    const supabase = await createClient()
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Not Found' }, { status: 404 }),
        }
    }

    const supabaseAdmin = createServiceRoleClient()
    const isWhitelisted = isSuperAdminEmailWhitelisted(user.email)

    if (!isWhitelisted) {
        const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if ((userRow as { role?: string } | null)?.role !== 'SUPER_ADMIN') {
            return {
                ok: false,
                response: NextResponse.json({ error: 'Not Found' }, { status: 404 }),
            }
        }
    }

    return {
        ok: true,
        user: { id: user.id, email: user.email || '' },
        supabaseAdmin,
    }
}

