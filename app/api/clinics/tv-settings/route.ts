import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { checkInstanceStatus } from '@/lib/whatsapp/service'
import {
    VALID_TV_LAYOUTS,
    VALID_TV_LOGO_MODES,
    VALID_TV_PRIVACY_MODES,
    VALID_TV_SOUND_THEMES,
    VALID_TV_VOICE_GENDERS,
    normalizeTvLayout,
    normalizeTvLogoMode,
    normalizeTvPrivacyMode,
} from '@/lib/utils/tv-panel'

export const dynamic = 'force-dynamic'

/**
 * GET /api/clinics/tv-settings
 * Retorna as configurações completas do Painel de TV (layout, privacidade LGPD, recado, QR, áudio e status do WhatsApp)
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
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

        const adminClient = createServiceRoleClient()
        const { data: clinic, error } = await (adminClient as any)
            .from('clinics')
            .select('id, name, logo_url, notification_settings, theme')
            .eq('id', profile.clinic_id)
            .single()

        if (error || !clinic) {
            console.error('[TV Settings] Erro ao carregar clínica:', error)
            return NextResponse.json({ error: 'Erro ao carregar clínica' }, { status: 500 })
        }

        let whatsappConnected = false
        let whatsappPhone: string | null = null

        try {
            const liveStatus = await checkInstanceStatus(profile.clinic_id, 'default')
            whatsappConnected = Boolean(liveStatus?.connected)
            whatsappPhone = liveStatus?.phone_number || null
        } catch (wErr) {
            request.log.error('clinics/tv-settings', { error: wErr instanceof Error ? wErr.message : String(wErr) })
            console.warn('[TV Settings] Erro ao verificar status WhatsApp:', wErr)
        }

        const whatsappCallEnabled = Boolean(
            clinic.notification_settings?.whatsapp_call_notification
        )

        const themeObj = clinic.theme || {}
        const tvSoundTheme = themeObj.tv_sound_theme || 'classico'
        const tvVoiceGender = themeObj.tv_voice_gender || 'feminina'
        const tvLayout = normalizeTvLayout(themeObj.tv_layout)
        const tvRecallMinutes = themeObj.tv_recall_minutes !== undefined ? Number(themeObj.tv_recall_minutes) : 5
        const tvPrivacyMode = normalizeTvPrivacyMode(themeObj.tv_privacy_mode)
        const tvTickerMessage = typeof themeObj.tv_ticker_message === 'string' ? themeObj.tv_ticker_message : ''
        const tvShowQrCode = Boolean(themeObj.tv_show_qr_code)
        const tvLogoMode = normalizeTvLogoMode(themeObj.tv_logo_mode)

        return NextResponse.json({
            clinicId: clinic.id,
            clinicName: clinic.name || '',
            clinicLogoUrl: clinic.logo_url || null,
            whatsappCallEnabled,
            whatsappConnected,
            whatsappPhone,
            tvSoundTheme,
            tvVoiceGender,
            tvLayout,
            tvRecallMinutes,
            tvPrivacyMode,
            tvTickerMessage,
            tvShowQrCode,
            tvLogoMode,
        }, {
            headers: {
                'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
            },
        })
    } catch (error: any) {
        request.log.error('clinics/tv-settings', { error: error instanceof Error ? error.message : String(error) })
        console.error('[TV Settings GET Error]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})

/**
 * PATCH /api/clinics/tv-settings
 * Atualiza configurações do Painel de TV fazendo merge seguro em clinics.theme
 */
export const PATCH = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await (supabase as any)
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role || '')) {
            return NextResponse.json({ error: 'Apenas administradores podem alterar configurações da TV.' }, { status: 403 })
        }

        const body = await request.json()
        const {
            whatsappCallEnabled,
            tvSoundTheme,
            tvVoiceGender,
            tvRecallMinutes,
            tvLayout,
            tvPrivacyMode,
            tvTickerMessage,
            tvShowQrCode,
            tvLogoMode,
        } = body

        if (whatsappCallEnabled === true) {
            const liveStatus = await checkInstanceStatus(profile.clinic_id, 'default')
            if (!liveStatus?.connected) {
                return NextResponse.json({
                    error: 'WhatsApp da clínica não está conectado. Conecte o WhatsApp para poder ativar este recurso.',
                    whatsappConnected: false,
                    action: 'connect_whatsapp',
                }, { status: 422 })
            }
        }

        const { data: currentClinic } = await (supabase as any)
            .from('clinics')
            .select('theme, notification_settings')
            .eq('id', profile.clinic_id)
            .single()

        const updatedTheme: Record<string, any> = {
            ...(currentClinic?.theme || {}),
        }

        if (typeof tvLayout === 'string' && (VALID_TV_LAYOUTS as readonly string[]).includes(tvLayout)) {
            updatedTheme.tv_layout = tvLayout
        }

        if (typeof tvSoundTheme === 'string' && (VALID_TV_SOUND_THEMES as readonly string[]).includes(tvSoundTheme)) {
            updatedTheme.tv_sound_theme = tvSoundTheme
        }

        if (typeof tvVoiceGender === 'string' && (VALID_TV_VOICE_GENDERS as readonly string[]).includes(tvVoiceGender)) {
            updatedTheme.tv_voice_gender = tvVoiceGender
        }

        if (typeof tvRecallMinutes === 'number' && Number.isFinite(tvRecallMinutes) && tvRecallMinutes >= 0 && tvRecallMinutes <= 60) {
            updatedTheme.tv_recall_minutes = Math.round(tvRecallMinutes)
        }

        if (typeof tvPrivacyMode === 'string' && (VALID_TV_PRIVACY_MODES as readonly string[]).includes(tvPrivacyMode)) {
            updatedTheme.tv_privacy_mode = tvPrivacyMode
        }

        if (typeof tvTickerMessage === 'string') {
            updatedTheme.tv_ticker_message = tvTickerMessage.trim().slice(0, 240)
        }

        if (typeof tvShowQrCode === 'boolean') {
            updatedTheme.tv_show_qr_code = tvShowQrCode
        }

        if (typeof tvLogoMode === 'string' && (VALID_TV_LOGO_MODES as readonly string[]).includes(tvLogoMode)) {
            updatedTheme.tv_logo_mode = tvLogoMode
        }

        const updatePayload: any = {
            theme: updatedTheme,
        }

        if (typeof whatsappCallEnabled === 'boolean') {
            const updatedNotificationSettings = {
                ...(currentClinic?.notification_settings || {}),
                whatsapp_call_notification: whatsappCallEnabled,
            }
            updatePayload.notification_settings = updatedNotificationSettings
            updatePayload.chamada_whatsapp_habilitada = whatsappCallEnabled
        }

        let { error } = await (supabase as any)
            .from('clinics')
            .update(updatePayload)
            .eq('id', profile.clinic_id)

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
            whatsappCallEnabled,
        })
    } catch (error: any) {
        request.log.error('clinics/tv-settings', { error: error instanceof Error ? error.message : String(error) })
        console.error('[TV Settings PATCH Internal Error]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
