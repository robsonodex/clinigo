// lib/auth/reception-pin-auth.ts
// Autenticação isolada por PIN efêmero para Tablets em Modo Recepção
// NUNCA toca supabase.auth, active_sessions ou useSessionGuard

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.RECEPTION_PIN_SECRET || process.env.SUPABASE_JWT_SECRET || 'clinigo-reception-secret-key-2026-v4'
export const RECEPTION_COOKIE_NAME = 'clinigo_reception_token'
export const RECEPTION_SESSION_DURATION_SECONDS = 15 * 60 // 15 minutos

export interface ReceptionSessionPayload {
    clinic_id: string
    pin_id: string
    label: string
    scope: 'terminal_reception'
    iat?: number
    exp?: number
}

/**
 * Assina um token JWT com validade estrita de 15 minutos
 */
export function signReceptionToken(payload: Omit<ReceptionSessionPayload, 'scope'>): string {
    return jwt.sign(
        {
            ...payload,
            scope: 'terminal_reception',
        },
        JWT_SECRET,
        {
            expiresIn: RECEPTION_SESSION_DURATION_SECONDS,
        }
    )
}

/**
 * Verifica e decodifica o token JWT do cookie efêmero
 */
export function verifyReceptionToken(token: string): ReceptionSessionPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as ReceptionSessionPayload
        if (decoded && decoded.scope === 'terminal_reception' && decoded.clinic_id) {
            return decoded
        }
        return null
    } catch {
        return null
    }
}
