import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as OTPAuth from 'otpauth'
import * as crypto from 'crypto'

// Force Node.js runtime for crypto support
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { code, is_backup_code } = body

        if (!code) {
            return NextResponse.json({ error: 'Código é obrigatório' }, { status: 400 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('id, email, clinic_id')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        const { data: mfaSettings } = await supabase
            .from('user_mfa_settings')
            .select('totp_secret, totp_enabled, backup_codes')
            .eq('user_id', user.id)
            .single()

        const settings = mfaSettings as any || {}

        if (!settings.totp_enabled) {
            return NextResponse.json({ error: 'MFA não está habilitado' }, { status: 400 })
        }

        let isValid = false

        if (is_backup_code) {
            // Verify backup code
            const codeHash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex')

            const unusedCodes = settings.backup_codes.filter((c: any) => c.used_at === null)
            const matchingCode = unusedCodes.find((c: any) => c.code_hash === codeHash)

            if (matchingCode) {
                // Mark code as used
                const updatedCodes = settings.backup_codes.map((c: any) =>
                    c.code_hash === codeHash
                        ? { ...c, used_at: new Date().toISOString() }
                        : c
                )

                await (supabase
                    .from('user_mfa_settings') as any)
                    .update({ backup_codes: updatedCodes })
                    .eq('user_id', user.id)

                isValid = true
            }
        } else {
            // Verify TOTP code
            const totp = new OTPAuth.TOTP({
                issuer: 'CliniGo',
                label: (userData as any).email,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: OTPAuth.Secret.fromBase32(settings.totp_secret),
            })

            isValid = totp.validate({ token: code, window: 1 }) !== null
        }

        // Log the attempt
        await (supabase.from('session_audit') as any).insert({
            user_id: user.id,
            clinic_id: (userData as any).clinic_id,
            event_type: isValid ? 'MFA_SUCCESS' : 'MFA_FAILED',
            event_details: { is_backup_code },
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent'),
        })

        if (!isValid) {
            return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
        }

        // Update session as MFA verified
        const sessionId = request.headers.get('x-session-id')
        if (sessionId) {
            await (supabase
                .from('user_sessions') as any)
                .update({
                    mfa_verified: true,
                    mfa_verified_at: new Date().toISOString(),
                })
                .eq('id', sessionId)
        }

        return NextResponse.json({
            success: true,
            message: 'MFA verificado com sucesso',
        })
    } catch (error) {
        console.error('MFA verification error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

