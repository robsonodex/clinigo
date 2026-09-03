import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkInstanceStatus } from '@/lib/whatsapp/service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/clinics/tv-settings
 * Retorna as configurações de chamada e status do WhatsApp da clínica
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
            .select('id, chamada_whatsapp_habilitada, notification_settings')
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

        return NextResponse.json({
            whatsappCallEnabled,
            whatsappConnected,
            whatsappPhone
        })
    } catch (error: any) {
        console.error('[TV Settings GET Error]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * PATCH /api/clinics/tv-settings
 * Body: { whatsappCallEnabled: boolean }
 * Atualiza o toggle de notificação por WhatsApp validando conexão ativa
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
        const { whatsappCallEnabled } = body

        if (typeof whatsappCallEnabled !== 'boolean') {
            return NextResponse.json({ error: 'whatsappCallEnabled deve ser booleano' }, { status: 400 })
        }

        // Se estiver tentando habilitar, validar se o WhatsApp está conectado
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

        // Buscar notification_settings atual para merge
        const { data: currentClinic } = await (supabase as any)
            .from('clinics')
            .select('notification_settings')
            .eq('id', profile.clinic_id)
            .single()

        const updatedNotificationSettings = {
            ...(currentClinic?.notification_settings || {}),
            whatsapp_call_notification: whatsappCallEnabled
        }

        // Tentar atualizar tanto na coluna chamada_whatsapp_habilitada quanto em notification_settings
        let updateError: any = null
        try {
            const { error } = await (supabase as any)
                .from('clinics')
                .update({
                    chamada_whatsapp_habilitada: whatsappCallEnabled,
                    notification_settings: updatedNotificationSettings
                })
                .eq('id', profile.clinic_id)

            updateError = error
        } catch (colErr) {
            updateError = colErr
        }

        // Fallback caso a coluna ainda não exista na réplica do banco
        if (updateError) {
            const { error: fallbackError } = await (supabase as any)
                .from('clinics')
                .update({
                    notification_settings: updatedNotificationSettings
                })
                .eq('id', profile.clinic_id)

            if (fallbackError) {
                console.error('[TV Settings Update Fallback Error]:', fallbackError)
                return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
            }
        }

        return NextResponse.json({
            success: true,
            whatsappCallEnabled
        })
    } catch (error: any) {
        console.error('[TV Settings PATCH Error]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
