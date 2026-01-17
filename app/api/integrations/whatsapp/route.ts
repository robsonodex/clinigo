import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/integrations/whatsapp - Save WhatsApp configuration
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Check permission
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const body = await req.json()
        const { provider, config } = body

        if (!provider || !config) {
            return NextResponse.json({ error: 'Provedor e configuração são obrigatórios' }, { status: 400 })
        }

        // Validate provider
        const validProviders = ['Z_API', 'EVOLUTION', 'OFFICIAL']
        if (!validProviders.includes(provider)) {
            return NextResponse.json({ error: 'Provedor inválido' }, { status: 400 })
        }

        // Save or update configuration
        const { data: existing } = await supabase
            .from('clinic_integrations')
            .select('id')
            .eq('clinic_id', profile.clinic_id)
            .eq('type', 'WHATSAPP')
            .single()

        if (existing) {
            // Update existing
            const { error: updateError } = await supabase
                .from('clinic_integrations')
                .update({
                    provider,
                    config,
                    is_active: true,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', existing.id)

            if (updateError) {
                console.error('Error updating integration:', updateError)
                return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 })
            }
        } else {
            // Insert new
            const { error: insertError } = await supabase
                .from('clinic_integrations')
                .insert({
                    clinic_id: profile.clinic_id,
                    type: 'WHATSAPP',
                    provider,
                    config,
                    is_active: true
                } as any)

            if (insertError) {
                console.error('Error inserting integration:', insertError)
                return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Configuração salva com sucesso'
        })

    } catch (error) {
        console.error('Error saving WhatsApp config:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// GET /api/integrations/whatsapp - Get current configuration
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { data: integration } = await supabase
            .from('clinic_integrations')
            .select('provider, is_active, updated_at')
            .eq('clinic_id', profile.clinic_id)
            .eq('type', 'WHATSAPP')
            .single()

        return NextResponse.json({
            configured: !!integration,
            provider: integration?.provider || null,
            is_active: integration?.is_active || false,
            updated_at: integration?.updated_at || null
        })

    } catch (error) {
        console.error('Error fetching WhatsApp config:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
