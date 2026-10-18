import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader, type JWTPayload } from 'jose'
import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Verified Identity Helper
 * Local verification of Supabase Auth JWT tokens using jose.
 * Prevents HTTP round-trips to /auth/v1/user when the JWT is valid and unexpired.
 *
 * Rules:
 * - Uses ES256 asymmetric verification via Supabase JWKS endpoint with in-memory cache.
 * - Supports HS256 symmetric verification fallback via SUPABASE_JWT_SECRET.
 * - Validates audience: 'authenticated' and issuer: '<SUPABASE_URL>/auth/v1'.
 * - If token expires in <= 60s or is already expired, signals `needsRefresh: true`
 *   to allow the caller to execute a single `supabase.auth.getUser()` to rotate tokens.
 * - Never prints or leaks secrets.
 */

export interface VerifiedUser {
    id: string
    email?: string
    role?: string
    user_metadata: Record<string, any>
    app_metadata: Record<string, any>
}

export interface VerificationResult {
    user: VerifiedUser | null
    token: string | null
    needsRefresh: boolean
    error: string | null
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const EXPECTED_ISSUER = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1`
const EXPECTED_AUDIENCE = 'authenticated'
const JWKS_URL = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`

let _remoteJWKS: ReturnType<typeof createRemoteJWKSet> | null = null

function getRemoteJWKS() {
    if (!_remoteJWKS) {
        _remoteJWKS = createRemoteJWKSet(new URL(JWKS_URL))
    }
    return _remoteJWKS
}

/**
 * Extracts the Supabase access token from cookie stores or request headers.
 */
export function extractAccessToken(
    source: NextRequest | { getAll?: () => Array<{ name: string; value: string }>; get?: (name: string) => { value: string } | undefined } | string
): string | null {
    // 1. Direct token string
    if (typeof source === 'string') {
        const cleaned = source.replace(/^Bearer\s+/i, '').trim()
        return cleaned || null
    }

    // 2. NextRequest - check Authorization header first
    if ('headers' in source && typeof source.headers?.get === 'function') {
        const authHeader = source.headers.get('authorization')
        if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
            return authHeader.substring(7).trim()
        }
    }

    // 3. Extract from cookies
    let cookieList: Array<{ name: string; value: string }> = []

    if ('cookies' in source && source.cookies) {
        if (typeof source.cookies.getAll === 'function') {
            cookieList = source.cookies.getAll()
        }
    } else if (typeof (source as any).getAll === 'function') {
        cookieList = (source as any).getAll()
    }

    if (!cookieList || cookieList.length === 0) {
        return null
    }

    // Look for sb-<project-ref>-auth-token cookies (standalone or chunked .0, .1, etc.)
    const authCookies = cookieList.filter(c => c.name.includes('-auth-token'))

    if (authCookies.length === 0) {
        return null
    }

    // Sort chunked cookies if present (e.g. sb-xxx-auth-token.0, sb-xxx-auth-token.1)
    authCookies.sort((a, b) => {
        const aChunk = a.name.match(/\.(\d+)$/)?.[1]
        const bChunk = b.name.match(/\.(\d+)$/)?.[1]
        if (aChunk && bChunk) {
            return parseInt(aChunk, 10) - parseInt(bChunk, 10)
        }
        return a.name.localeCompare(b.name)
    })

    let combined = authCookies.map(c => c.value).join('')

    // Handle base64- prefix used by @supabase/ssr for chunked or serialized sessions
    if (combined.startsWith('base64-')) {
        try {
            if (typeof Buffer !== 'undefined') {
                combined = Buffer.from(combined.slice(7), 'base64').toString('utf8')
            } else if (typeof atob === 'function') {
                combined = atob(combined.slice(7))
            }
        } catch {
            return null
        }
    }

    try {
        const parsed = JSON.parse(combined)
        if (parsed.access_token) {
            return parsed.access_token
        }
        if (Array.isArray(parsed) && parsed[0]?.access_token) {
            return parsed[0].access_token
        }
    } catch {
        // Raw JWT token directly in cookie
        if (combined.split('.').length === 3) {
            return combined
        }
    }

    return null
}

/**
 * Returns the secret key for JWT verification.
 * Strictly reads from server-only environment variables.
 */
function getVerificationSecret(): Uint8Array | null {
    const rawSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET
    if (!rawSecret) {
        return null
    }
    return new TextEncoder().encode(rawSecret)
}

/**
 * Verifies a Supabase JWT locally without hitting /auth/v1/user.
 * Falls back to needsRefresh=true if token is nearing expiration (<= 60 seconds)
 * or if local verification cannot be completed.
 */
export async function verifySupabaseToken(
    source: NextRequest | { getAll?: () => Array<{ name: string; value: string }>; get?: (name: string) => { value: string } | undefined } | string
): Promise<VerificationResult> {
    const token = extractAccessToken(source)

    if (!token) {
        return { user: null, token: null, needsRefresh: false, error: 'NO_TOKEN' }
    }

    try {
        const header = decodeProtectedHeader(token)
        let payload: JWTPayload

        if (header.alg === 'ES256') {
            const jwks = getRemoteJWKS()
            const result = await jwtVerify(token, jwks, {
                algorithms: ['ES256'],
                audience: EXPECTED_AUDIENCE,
                issuer: EXPECTED_ISSUER,
            })
            payload = result.payload
        } else {
            const secret = getVerificationSecret()
            if (!secret) {
                return { user: null, token, needsRefresh: true, error: 'NO_SECRET_CONFIGURED' }
            }
            const result = await jwtVerify(token, secret, {
                algorithms: ['HS256'],
                audience: EXPECTED_AUDIENCE,
                issuer: EXPECTED_ISSUER,
            })
            payload = result.payload
        }

        // Endurecimento de seguranca: exige role === 'authenticated', sub e exp validos
        const role = (payload.role as string) || (payload.app_metadata as any)?.role
        if (role !== 'authenticated') {
            return { user: null, token, needsRefresh: false, error: 'INVALID_ROLE' }
        }

        if (!payload.sub || typeof payload.sub !== 'string') {
            return { user: null, token, needsRefresh: false, error: 'INVALID_SUB' }
        }

        const now = Math.floor(Date.now() / 1000)
        const exp = payload.exp
        if (!exp || exp <= now) {
            return { user: null, token, needsRefresh: true, error: 'TOKEN_EXPIRED' }
        }

        const isExpiringSoon = (exp - now) <= 60

        const user: VerifiedUser = {
            id: payload.sub as string,
            email: payload.email as string | undefined,
            role: payload.role as string | undefined,
            user_metadata: (payload.user_metadata as Record<string, any>) || {},
            app_metadata: (payload.app_metadata as Record<string, any>) || {},
        }

        return {
            user,
            token,
            needsRefresh: isExpiringSoon,
            error: null,
        }
    } catch (err: any) {
        const isExpired = err?.code === 'ERR_JWT_EXPIRED'
        return {
            user: null,
            token,
            needsRefresh: true,
            error: err?.message || 'JWT_VERIFICATION_FAILED',
        }
    }
}

/**
 * Resolves the authenticated user for server endpoints and middleware.
 * Uses local cryptographic verification first.
 * If the token is near expiration or invalid, uses supabase.auth.getUser() to refresh session.
 */
export async function getVerifiedUser(
    supabase: any,
    source?: NextRequest | { getAll?: () => Array<{ name: string; value: string }>; get?: (name: string) => { value: string } | undefined } | string
): Promise<{ user: User | VerifiedUser | null; isLocal: boolean }> {
    if (source) {
        const local = await verifySupabaseToken(source)

        // If local verification is valid and doesn't need refresh, return immediately with zero network calls!
        if (local.user && !local.needsRefresh) {
            return { user: local.user, isLocal: true }
        }
    }

    // Refresh path: execute getUser() to refresh credentials and rotate cookies
    try {
        const getUserFn = typeof supabase?.auth?.getStrictUser === 'function'
            ? () => supabase.auth.getStrictUser()
            : () => supabase.auth.getUser()
        const { data, error } = await getUserFn()
        if (error || !data?.user) {
            return { user: null, isLocal: false }
        }
        return { user: data.user, isLocal: false }
    } catch {
        return { user: null, isLocal: false }
    }
}
