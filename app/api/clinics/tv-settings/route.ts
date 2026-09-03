import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkInstanceStatus } from '@/lib/whatsapp/service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/clinics/tv-settings
 * Retorna as configurações de chamada, som, voz e status do WhatsApp da clínica
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await (supabase as any)
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        // Buscar dados da clínica
        const { data: clinic, error } = await (supabase as any)
            .from('clinics')
            .select('id, chamada_whatsapp_habilitada, notification_settings, theme')
            .eq('id', profile.clinic_id)
            .single()

        if (error || !clinic) {
            return NextResponse.json({ error: 'Erro ao carregar clínica' }, { status: 500 })
        }

        // Status em tempo real do WhatsApp
        let whatsappConnected = false
        let whatsappPhone: string | null = null

        try {
            const liveStatus = await checkInstanceStatus(profile.clinic_id, 'default')
            whatsappConnected = Boolean(liveStatus?.connected)
            whatsappPhone = liveStatus?.phone_number || null
        } catch (wErr) {
            console.warn('[TV Settings] Erro ao verificar status WhatsApp:', wErr)
        }

        const whatsappCallEnabled = Boolean(
            clinic.chamada_whatsapp_habilitada || 
            clinic.notification_settings?.whatsapp_call_notification
        )

        const tvSoundTheme = clinic.theme?.tv_sound_theme || 'classico'
        const tvVoiceGender = clinic.theme?.tv_voice_gender || 'feminina'
        const tvLayout = clinic.theme?.tv_layout || 'classico'
        const tvRecallMinutes = clinic.theme?.tv_recall_minutes !== undefined ? clinic.theme.tv_recall_minutes : 5

        return NextResponse.json({
            whatsappCallEnabled,
            whatsappConnected,
            whatsappPhone,
            tvSoundTheme,
            tvVoiceGender,
            tvLayout,
            tvRecallMinutes
        })
    } catch (error: any) {
        console.error('[TV Settings GET Error]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * PATCH /api/clinics/tv-settings
 * Body: { 
 *   whatsappCallEnabled?: boolean,
 *   tvSoundTheme?: 'classico' | 'moderno' | 'harmonico' | 'bip',
 *   tvVoiceGender?: 'feminina' | 'masculina' | 'padrao'
 * }
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await (supabase as any)
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        const body = await request.json()
        const { whatsappCallEnabled, tvSoundTheme, tvVoiceGender, tvRecallMinutes } = body

        // Se estiver tentando habilitar WhatsApp, validar se está conectado
        if (whatsappCallEnabled === true) {
            const liveStatus = await checkInstanceStatus(profile.clinic_id, 'default')
            if (!liveStatus?.connected) {
                return NextResponse.json({
                    error: 'WhatsApp da clínica não está conectado. Conecte o WhatsApp para poder ativar este recurso.',
                    whatsappConnected: false,
                    action: 'connect_whatsapp'
                }, { status: 422 })
            }
        }

        // Buscar clinic atual para merge de theme e notification_settings
        const { data: currentClinic } = await (supabase as any)
            .from('clinics')
            .select('theme, notification_settings')
            .eq('id', profile.clinic_id)
            .single()

        const updatedTheme = {
            ...(currentClinic?.theme || {}),
            ...(tvSoundTheme && { tv_sound_theme: tvSoundTheme }),
            ...(tvVoiceGender && { tv_voice_gender: tvVoiceGender }),
            ...(typeof tvRecallMinutes === 'number' && { tv_recall_minutes: tvRecallMinutes }),
        }

        const updatePayload: any = {
            theme: updatedTheme
        }

        if (typeof whatsappCallEnabled === 'boolean') {
            const updatedNotificationSettings = {
                ...(currentClinic?.notification_settings || {}),
                whatsapp_call_notification: whatsappCallEnabled
            }
            updatePayload.notification_settings = updatedNotificationSettings
            updatePayload.chamada_whatsapp_habilitada = whatsappCallEnabled
        }

        // Atualizar no Supabase
        let { error } = await (supabase as any)
            .from('clinics')
            .update(updatePayload)
            .eq('id', profile.clinic_id)

        // Fallback caso a coluna chamada_whatsapp_habilitada não exista na réplica
        if (error && error.message?.includes('chamada_whatsapp_habilitada')) {
            delete updatePayload.chamada_whatsapp_habilitada
            const retry = await (supabase as any)
                .from('clinics')
                .update(updatePayload)
                .eq('id', profile.clinic_id)
            error = retry.error
        }

        if (error) {
            console.error('[TV Settings PATCH Error]:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            theme: updatedTheme,
            whatsappCallEnabled
        })
    } catch (error: any) {
        console.error('[TV Settings PATCH Internal Error]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
