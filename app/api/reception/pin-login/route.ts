// app/api/reception/pin-login/route.ts
// Validação de PIN efêmero de 15 minutos para modo recepção no tablet
// TOTALMENTE DESACOPLADO de supabase.auth e active_sessions

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { signReceptionToken, RECEPTION_COOKIE_NAME, RECEPTION_SESSION_DURATION_SECONDS } from '@/lib/auth/reception-pin-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reception/pin-login
 * Body: { pin: string, device_token?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { pin, device_token } = body

        if (!pin || typeof pin !== 'string' || pin.trim().length < 4) {
            return NextResponse.json({
                success: false,
                error: 'PIN inválido. Digite ao menos 4 dígitos numéricos.'
            }, { status: 400 })
        }

        const trimmedPin = pin.trim()
        const adminDb = createServiceRoleClient()

        // 1. Descobrir a clínica a partir do token do dispositivo pareado (se fornecido)
        let clinicId: string | null = null
        if (device_token) {
            const { data: device } = await (adminDb as any)
                .from('clinic_devices')
                .select('clinic_id, status')
                .eq('device_token', device_token.trim())
                .maybeSingle()

            if (device && device.status === 'active') {
                clinicId = device.clinic_id
            }
        }

        // 2. Buscar PINs ativos
        let query = (adminDb as any)
            .from('reception_pins')
            .select('id, clinic_id, pin_hash, label, status')
            .eq('status', 'active')

        if (clinicId) {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: pins, error: pinError } = await query

        if (pinError) {
            console.error('[PIN Login] Erro ao consultar PINs:', pinError)
            return NextResponse.json({ success: false, error: 'Erro interno ao validar PIN' }, { status: 500 })
        }

        let matchedPinRecord: any = null

        // 3. Comparar o PIN fornecido contra os hashes bcrypt cadastrados
        if (pins && pins.length > 0) {
            for (const record of pins) {
                const isMatch = await bcrypt.compare(trimmedPin, record.pin_hash)
                if (isMatch) {
                    matchedPinRecord = record
                    break
                }
            }
        } else if (clinicId) {
            // Se a clínica ainda não possui PIN cadastrado, provisionar PIN padrão inicial '1234'
            const defaultInitialPin = '1234'
            if (trimmedPin === defaultInitialPin) {
                const hashed = await bcrypt.hash(defaultInitialPin, 10)
                const { data: createdPin } = await (adminDb as any)
                    .from('reception_pins')
                    .insert({
                        clinic_id: clinicId,
                        pin_hash: hashed,
                        label: 'Recepção - PIN Padrão',
                        status: 'active',
                    })
                    .select()
                    .single()

                matchedPinRecord = createdPin
            }
        }

        if (!matchedPinRecord) {
            return NextResponse.json({
                success: false,
                error: 'PIN de recepção incorreto ou expirado.'
            }, { status: 401 })
        }

        // 4. Emitir JWT efêmero de 15 minutos (sem relação com active_sessions ou supabase.auth)
        const receptionToken = signReceptionToken({
            clinic_id: matchedPinRecord.clinic_id,
            pin_id: matchedPinRecord.id,
            label: matchedPinRecord.label,
        })

        const response = NextResponse.json({
            success: true,
            label: matchedPinRecord.label,
            expires_in_seconds: RECEPTION_SESSION_DURATION_SECONDS,
            message: 'Modo Recepção desbloqueado por 15 minutos.'
        })

        // 5. Gravar cookie assinado isolado
        response.cookies.set(RECEPTION_COOKIE_NAME, receptionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: RECEPTION_SESSION_DURATION_SECONDS,
            path: '/',
        })

        return response

    } catch (error: any) {
        console.error('[PIN Login] Erro inesperado:', error)
        return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
    }
}
