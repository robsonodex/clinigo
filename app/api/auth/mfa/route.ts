import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as OTPAuth from 'otpauth'
import * as crypto from 'crypto'

// Force Node.js runtime for crypto support
export const runtime = 'nodejs'


// MFA configuration constants
const MFA_ISSUER = 'CliniGo'
const TOTP_PERIOD = 30
const TOTP_DIGITS = 6
const BACKUP_CODES_COUNT = 10

// Generate a new TOTP secret
function generateTOTPSecret(): string {
    return crypto.randomBytes(20).toString('base64')
}

// Create TOTP instance
function createTOTP(secret: string, userEmail: string): OTPAuth.TOTP {
    return new OTPAuth.TOTP({
        issuer: MFA_ISSUER,
        label: userEmail,
        algorithm: 'SHA1',
        digits: TOTP_DIGITS,
        period: TOTP_PERIOD,
        secret: OTPAuth.Secret.fromBase32(secret),
    })
}

// Generate backup codes
function generateBackupCodes(): { plain: string[]; hashed: { code_hash: string; used_at: null }[] } {
    const plain: string[] = []
    const hashed: { code_hash: string; used_at: null }[] = []

    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase()
        plain.push(code)
        hashed.push({
            code_hash: crypto.createHash('sha256').update(code).digest('hex'),
            used_at: null,
        })
    }

    return { plain, hashed }
}

// GET: Get MFA status
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        const { data: mfaSettings } = await supabase
            .from('user_mfa_settings')
            .select('totp_enabled, totp_verified_at, backup_codes_generated_at, recovery_email, recovery_email_verified')
            .eq('user_id', user.id)
            .single()

        const backupCodesRemaining = mfaSettings?.backup_codes_generated_at
            ? await getBackupCodesRemaining(supabase, user.id)
            : 0

        return NextResponse.json({
            mfa_enabled: mfaSettings?.totp_enabled || false,
            mfa_verified_at: mfaSettings?.totp_verified_at,
            backup_codes_generated_at: mfaSettings?.backup_codes_generated_at,
            backup_codes_remaining: backupCodesRemaining,
            recovery_email: mfaSettings?.recovery_email,
            recovery_email_verified: mfaSettings?.recovery_email_verified || false,
        })
    } catch (error) {
        console.error('MFA status error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Setup or verify MFA
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { action, code, recovery_email } = body

        const { data: userData } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        switch (action) {
            case 'setup':
                return await handleSetup(supabase, user.id, userData.email)

            case 'verify':
                return await handleVerify(supabase, user.id, userData.email, code)

            case 'generate_backup_codes':
                return await handleGenerateBackupCodes(supabase, user.id)

            case 'set_recovery_email':
                return await handleSetRecoveryEmail(supabase, user.id, recovery_email)

            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }
    } catch (error) {
        console.error('MFA action error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE: Disable MFA
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { code } = body

        // Verify code before disabling
        const { data: mfaSettings } = await supabase
            .from('user_mfa_settings')
            .select('totp_secret')
            .eq('user_id', user.id)
            .single()

        if (!mfaSettings?.totp_secret) {
            return NextResponse.json({ error: 'MFA não está habilitado' }, { status: 400 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', user.id)
            .single()

        const totp = createTOTP(mfaSettings.totp_secret, userData?.email || '')

        if (totp.validate({ token: code, window: 1 }) === null) {
            // Log failed attempt
            await logSessionEvent(supabase, user.id, 'MFA_DISABLE_FAILED', request)
            return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
        }

        // Disable MFA
        await supabase
            .from('user_mfa_settings')
            .update({
                totp_enabled: false,
                totp_secret: null,
                totp_verified_at: null,
                backup_codes: [],
                backup_codes_generated_at: null,
            })
            .eq('user_id', user.id)

        // Log event
        await logSessionEvent(supabase, user.id, 'MFA_DISABLED', request)

        return NextResponse.json({ success: true, message: 'MFA desabilitado com sucesso' })
    } catch (error) {
        console.error('MFA disable error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// Helper functions
async function handleSetup(supabase: any, userId: string, userEmail: string) {
    const secret = generateTOTPSecret()
    const totp = createTOTP(secret, userEmail)

    // Store secret (not yet enabled)
    await supabase
        .from('user_mfa_settings')
        .upsert({
            user_id: userId,
            totp_secret: secret,
            totp_enabled: false,
        }, { onConflict: 'user_id' })

    return NextResponse.json({
        secret: secret,
        qr_code_uri: totp.toString(),
        issuer: MFA_ISSUER,
    })
}

async function handleVerify(supabase: any, userId: string, userEmail: string, code: string) {
    const { data: mfaSettings } = await supabase
        .from('user_mfa_settings')
        .select('totp_secret')
        .eq('user_id', userId)
        .single()

    if (!mfaSettings?.totp_secret) {
        return NextResponse.json({ error: 'Configure o MFA primeiro' }, { status: 400 })
    }

    const totp = createTOTP(mfaSettings.totp_secret, userEmail)

    if (totp.validate({ token: code, window: 1 }) === null) {
        return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes()

    // Enable MFA
    await supabase
        .from('user_mfa_settings')
        .update({
            totp_enabled: true,
            totp_verified_at: new Date().toISOString(),
            backup_codes: backupCodes.hashed,
            backup_codes_generated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

    return NextResponse.json({
        success: true,
        message: 'MFA habilitado com sucesso',
        backup_codes: backupCodes.plain, // Only shown once!
    })
}

async function handleGenerateBackupCodes(supabase: any, userId: string) {
    const { data: mfaSettings } = await supabase
        .from('user_mfa_settings')
        .select('totp_enabled')
        .eq('user_id', userId)
        .single()

    if (!mfaSettings?.totp_enabled) {
        return NextResponse.json({ error: 'MFA não está habilitado' }, { status: 400 })
    }

    const backupCodes = generateBackupCodes()

    await supabase
        .from('user_mfa_settings')
        .update({
            backup_codes: backupCodes.hashed,
            backup_codes_generated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

    return NextResponse.json({
        success: true,
        backup_codes: backupCodes.plain,
    })
}

async function handleSetRecoveryEmail(supabase: any, userId: string, email: string) {
    if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    await supabase
        .from('user_mfa_settings')
        .upsert({
            user_id: userId,
            recovery_email: email,
            recovery_email_verified: false,
        }, { onConflict: 'user_id' })

    // TODO: Send verification email

    return NextResponse.json({
        success: true,
        message: 'Email de recuperação configurado. Verifique sua caixa de entrada.',
    })
}

async function getBackupCodesRemaining(supabase: any, userId: string): Promise<number> {
    const { data } = await supabase
        .from('user_mfa_settings')
        .select('backup_codes')
        .eq('user_id', userId)
        .single()

    if (!data?.backup_codes) return 0

    return data.backup_codes.filter((c: any) => c.used_at === null).length
}

async function logSessionEvent(
    supabase: any,
    userId: string,
    eventType: string,
    request: NextRequest
) {
    const { data: userData } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', userId)
        .single()

    await supabase.from('session_audit').insert({
        user_id: userId,
        clinic_id: userData?.clinic_id,
        event_type: eventType,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
    })
}
