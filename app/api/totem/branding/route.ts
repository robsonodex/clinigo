import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
    normalizeTvLayout,
    normalizeTvLogoMode,
    normalizeTvPrivacyMode,
} from '@/lib/utils/tv-panel'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/totem/branding?clinicId=<uuid>
 * Endpoint público (sem PII) para o Totem e o Painel de TV carregarem a identidade visual
 * e as preferências de exibição mesmo em navegadores de TV/tablet sem sessão autenticada.
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const { searchParams } = new URL(request.url)
        const clinicId = (searchParams.get('clinicId') || '').trim()

        if (!UUID_REGEX.test(clinicId)) {
            return NextResponse.json({ error: 'clinicId inválido' }, { status: 400 })
        }

        const adminClient = createServiceRoleClient() as any
        const { data: clinic, error } = await adminClient
            .from('clinics')
            .select('id, name, logo_url, theme')
            .eq('id', clinicId)
            .single()

        if (error || !clinic) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const t = clinic.theme || {}

        return NextResponse.json(
            {
                clinicId: clinic.id,
                clinicName: clinic.name || '',
                clinicLogoUrl: clinic.logo_url || null,
                tvLogoMode: normalizeTvLogoMode(t.tv_logo_mode),
                tvLayout: normalizeTvLayout(t.tv_layout),
                tvSoundTheme: t.tv_sound_theme || 'classico',
                tvVoiceGender: t.tv_voice_gender || 'feminina',
                tvPrivacyMode: normalizeTvPrivacyMode(t.tv_privacy_mode),
                tvTickerMessage: typeof t.tv_ticker_message === 'string' ? t.tv_ticker_message : '',
                tvShowQrCode: Boolean(t.tv_show_qr_code),
            },
            {
                headers: {
                    'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
                },
            }
        )
    } catch (error) {
        request.log.error('totem/branding', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
