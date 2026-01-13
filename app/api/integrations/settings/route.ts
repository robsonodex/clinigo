import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema for integration settings
const IntegrationSettingsSchema = z.object({
    integration_id: z.string(),
    credentials: z.record(z.string(), z.any()).optional(),
    enabled: z.boolean().optional(),
})

// GET - Fetch current integration settings for the clinic
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Get user's clinic
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Fetch clinic settings including integration data
        const { data: settings, error } = await supabase
            .from('clinic_settings')
            .select('*')
            .eq('clinic_id', profile.clinic_id)
            .single()

        // If no settings exist, return empty object
        if (error && error.code === 'PGRST116') {
            return NextResponse.json({ settings: {} })
        }

        if (error) {
            console.error('Error fetching settings:', error)
            return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
        }

        // Hide sensitive data (only show if configured, not the actual keys)
        const safeSettings = {
            mercadopago_configured: !!settings?.mercadopago_access_token,
            daily_configured: !!settings?.daily_api_key,
            google_calendar_configured: !!settings?.google_calendar_token,
            smtp_configured: !!settings?.smtp_settings,
            resend_configured: !!settings?.resend_api_key,
            whatsapp_configured: !!settings?.whatsapp_api_key,
            posthog_configured: !!settings?.posthog_key,
            webhook_url: settings?.webhook_url || null,
            webhook_events: settings?.webhook_events || [],
            notification_settings: settings?.notification_settings || {},
        }

        return NextResponse.json({ settings: safeSettings })

    } catch (error) {
        console.error('Integration settings error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST - Save integration settings
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Get user's clinic and role
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Only CLINIC_ADMIN and SUPER_ADMIN can update settings
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const body = await request.json()
        const { integration_id, credentials, enabled } = IntegrationSettingsSchema.parse(body)

        // Build the update object based on integration_id
        const updates: Record<string, unknown> = {
            clinic_id: profile.clinic_id,
            updated_at: new Date().toISOString(),
        }

        switch (integration_id) {
            case 'mercadopago':
                updates.mercadopago_access_token = credentials?.access_token || null
                updates.mercadopago_webhook_secret = credentials?.webhook_secret || null
                break
            case 'daily':
                updates.daily_api_key = credentials?.api_key || null
                break
            case 'googlemeet':
            case 'googlecalendar':
                updates.google_calendar_token = credentials?.token ? JSON.stringify(credentials.token) : null
                break
            case 'resend':
                updates.resend_api_key = credentials?.api_key || null
                break
            case 'smtp':
                updates.smtp_settings = credentials?.smtp ? JSON.stringify(credentials.smtp) : null
                break
            case 'whatsapp':
                updates.whatsapp_phone_number_id = credentials?.phone_number_id || null
                updates.whatsapp_access_token = credentials?.access_token || null
                updates.whatsapp_business_account_id = credentials?.business_account_id || null
                break
            case 'posthog':
                updates.posthog_key = credentials?.api_key || null
                break
            case 'webhook':
                updates.webhook_url = credentials?.url || null
                updates.webhook_secret = credentials?.secret || null
                updates.webhook_events = credentials?.events || []
                break
            default:
                return NextResponse.json({ error: 'Integração não reconhecida' }, { status: 400 })
        }

        // Upsert settings (insert if not exists, update if exists)
        const { data, error } = await supabase
            .from('clinic_settings')
            .upsert(updates, {
                onConflict: 'clinic_id',
                ignoreDuplicates: false,
            })
            .select()
            .single()

        if (error) {
            console.error('Error saving integration:', error)
            return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Integração ${integration_id} configurada com sucesso`
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
        }
        console.error('Integration settings error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE - Remove integration credentials
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const integrationId = searchParams.get('integration_id')

        if (!integrationId) {
            return NextResponse.json({ error: 'integration_id é obrigatório' }, { status: 400 })
        }

        // Build nullify object
        const updates: Record<string, null> = {}

        switch (integrationId) {
            case 'mercadopago':
                updates.mercadopago_access_token = null
                updates.mercadopago_webhook_secret = null
                break
            case 'daily':
                updates.daily_api_key = null
                break
            case 'googlemeet':
            case 'googlecalendar':
                updates.google_calendar_token = null
                break
            case 'resend':
                updates.resend_api_key = null
                break
            case 'smtp':
                updates.smtp_settings = null
                break
            case 'whatsapp':
                updates.whatsapp_api_key = null
                updates.whatsapp_phone_id = null
                updates.whatsapp_business_id = null
                break
            case 'posthog':
                updates.posthog_key = null
                break
            default:
                return NextResponse.json({ error: 'Integração não reconhecida' }, { status: 400 })
        }

        const { error } = await supabase
            .from('clinic_settings')
            .update(updates)
            .eq('clinic_id', profile.clinic_id)

        if (error) {
            console.error('Error removing integration:', error)
            return NextResponse.json({ error: 'Erro ao remover integração' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Integração ${integrationId} desconectada`
        })

    } catch (error) {
        console.error('Integration delete error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
