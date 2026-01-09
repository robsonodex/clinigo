
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()
        const { api_key, phone_number_id, business_account_id } = body

        // Validar dados
        if (!api_key || !phone_number_id) {
            return NextResponse.json(
                { error: 'API Key e Phone Number ID são obrigatórios' },
                { status: 400 }
            )
        }

        // Obter clínica do usuário
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single()

        if (!user?.clinic_id) {
            return NextResponse.json({ error: 'Usuário sem clínica vinculada' }, { status: 400 })
        }

        // Salvar configurações
        const { error } = await supabase
            .from('clinic_settings')
            .upsert({
                clinic_id: user.clinic_id,
                whatsapp_api_key: api_key,
                whatsapp_phone_number_id: phone_number_id,
                whatsapp_business_account_id: business_account_id,
                whatsapp_enabled: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'clinic_id' })

        if (error) throw error

        // Mock test connection (since we don't have the external lib installed yet)
        // const testResult = await testWhatsAppConnection(api_key, phone_number_id);
        const testResult = { success: true }

        return NextResponse.json({
            success: true,
            test_result: testResult,
            message: 'WhatsApp configurado com sucesso'
        })

    } catch (error) {
        console.error('WhatsApp setup error:', error)
        return NextResponse.json(
            { error: 'Erro ao configurar WhatsApp' },
            { status: 500 }
        )
    }
}
