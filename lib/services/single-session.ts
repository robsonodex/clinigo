/**
 * Single Session Manager
 * Gerencia sessão única por usuário — invalida sessões anteriores ao fazer login
 * Usado pelo login API e pelo endpoint de registro de sessão
 */
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Generate a UUID compatible with both Node.js and Edge runtimes
 */
function generateSessionToken(): string {
    // Web Crypto API (works in Edge runtime and modern Node.js)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    // Fallback: generate UUID-like string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

export interface SessionRegistration {
    sessionToken: string
    sessionId: string
}

/**
 * Registra nova sessão para o usuário, invalidando todas as anteriores
 * @returns Token da nova sessão para setar no cookie
 */
export async function registerSingleSession(
    supabase: SupabaseClient,
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
): Promise<SessionRegistration> {
    // 1. Invalidar TODAS as sessões ativas anteriores deste usuário
    await (supabase
        .from('active_sessions') as any)
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true)

    // 2. Criar nova sessão com token único
    const sessionToken = generateSessionToken()

    const now = new Date().toISOString()

    const { data, error } = await (supabase
        .from('active_sessions') as any)
        .insert({
            user_id: userId,
            session_token: sessionToken,
            device_info: deviceInfo || null,
            ip_address: ipAddress || null,
            is_active: true,
            last_active_at: now,
        })
        .select('id')
        .single()

    if (error) {
        console.error('[SESSION] Error creating session:', error)
        throw new Error('Erro ao registrar sessão')
    }

    console.log('[SESSION] New single session registered for user:', userId)

    return {
        sessionToken,
        sessionId: data.id,
    }
}

/**
 * Valida se o token de sessão fornecido é a sessão ativa do usuário
 * e atualiza o timestamp de atividade recente (last_active_at)
 */
export async function validateSession(
    supabase: SupabaseClient,
    userId: string,
    sessionToken: string
): Promise<boolean> {
    const { data, error } = await (supabase
        .from('active_sessions') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .single()

    if (error || !data) {
        return false
    }

    // Atualiza last_active_at de forma assíncrona (não bloqueia validação)
    ;(supabase
        .from('active_sessions') as any)
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {})
        .catch((err: any) => console.error('[SESSION] Error updating last_active_at:', err))

    return true
}

/**
 * Cookie options para o session token
 */
export const SESSION_COOKIE_NAME = 'clinigo_session_id'
export const SESSION_COOKIE_OPTIONS = {
    httpOnly: false, // Precisa ser acessível pelo JS para o polling
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
}
