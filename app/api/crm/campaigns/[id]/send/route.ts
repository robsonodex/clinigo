import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/service'

export const maxDuration = 300 // Permite até 5 minutos para processar o lote com segurança

/**
 * POST /api/crm/campaigns/[id]/send
 * Dispara uma campanha de WhatsApp para os pacientes alvo da clínica.
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: campaignId } = await context.params
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        // Buscar a campanha
        const { data: campaign, error: campError } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .eq('clinic_id', clinicId)
            .single()

        if (campError || !campaign) {
            return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
        }

        if (campaign.type !== 'WHATSAPP') {
            return NextResponse.json({ error: 'Apenas campanhas de WhatsApp podem ser disparadas por este canal' }, { status: 400 })
        }

        // Determinar o setor do WhatsApp a ser usado
        let sectorToSend = campaign.sector || 'financeiro'

        // Verificar se a sessão do setor está conectada
        const { data: waSession } = await supabase
            .from('whatsapp_sessions')
            .select('sector, status, phone_number')
            .eq('clinic_id', clinicId)
            .eq('sector', sectorToSend)
            .maybeSingle()

        // Se o setor escolhido não estiver conectado, verificar se há outro setor ativo
        if (!waSession || waSession.status !== 'connected') {
            const { data: anyConnected } = await supabase
                .from('whatsapp_sessions')
                .select('sector, status, phone_number')
                .eq('clinic_id', clinicId)
                .eq('status', 'connected')
                .limit(1)
                .maybeSingle()

            if (anyConnected) {
                sectorToSend = anyConnected.sector
            } else {
                return NextResponse.json({
                    error: `WhatsApp do setor "${sectorToSend}" não está conectado. Acesse o menu WhatsApp para conectar antes de disparar a campanha.`
                }, { status: 400 })
            }
        }

        // Buscar clínica para obter nome
        const { data: clinic } = await supabase
            .from('clinics')
            .select('name')
            .eq('id', clinicId)
            .single()

        const clinicName = clinic?.name || 'Clínica'

        // Buscar pacientes destinatários
        let targetPatients: { id: string; full_name: string; phone: string | null }[] = []

        if (campaign.target_all_patients) {
            const { data: patients } = await supabase
                .from('patients')
                .select('id, full_name, phone')
                .eq('clinic_id', clinicId)
                .is('deleted_at', null)

            targetPatients = patients || []
        } else if (Array.isArray(campaign.target_tags) && campaign.target_tags.length > 0) {
            const { data: tagged } = await supabase
                .from('patient_tag_assignments')
                .select('patient:patients(id, full_name, phone)')
                .in('tag_id', campaign.target_tags)

            targetPatients = (tagged || [])
                .map((t: any) => t.patient)
                .filter(Boolean)
        }

        // Filtrar apenas pacientes com telefone válido
        const validRecipients = targetPatients.filter(p => {
            if (!p.phone) return false
            const digits = p.phone.replace(/\D/g, '')
            return digits.length >= 10 && digits.length <= 13
        })

        if (validRecipients.length === 0) {
            return NextResponse.json({
                error: 'Nenhum paciente com telefone válido encontrado para envio.'
            }, { status: 400 })
        }

        // Atualizar status da campanha para RUNNING
        await supabase
            .from('campaigns')
            .update({
                status: 'RUNNING',
                total_recipients: validRecipients.length,
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId)

        let successCount = 0
        let failureCount = 0

        // Disparo cadenciado com intervalo de segurança anti-banimento do Meta
        for (let i = 0; i < validRecipients.length; i++) {
            const patient = validRecipients[i]
            try {
                // Personalização da mensagem com variáveis
                const personalizedMessage = campaign.content
                    .replace(/\{\{patient_name\}\}/gi, patient.full_name || 'Cliente')
                    .replace(/\{\{nome_paciente\}\}/gi, patient.full_name || 'Cliente')
                    .replace(/\{\{clinic_name\}\}/gi, clinicName)
                    .replace(/\{\{nome_clinica\}\}/gi, clinicName)

                await sendWhatsAppMessage(
                    clinicId,
                    patient.phone!,
                    personalizedMessage,
                    `campaign_${campaignId}`,
                    sectorToSend
                )

                successCount++
            } catch (sendErr: any) {
                console.error(`[Campaign ${campaignId}] Falha ao enviar para ${patient.id}:`, sendErr?.message || sendErr)
                failureCount++
            }

            // Atualizar contadores na tabela periodicamente ou no final
            if ((i + 1) % 5 === 0 || i === validRecipients.length - 1) {
                await supabase
                    .from('campaigns')
                    .update({
                        sent_count: successCount,
                        error_count: failureCount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', campaignId)
            }

            // Intervalo de segurança anti-spam (2 segundos entre cada mensagem)
            if (i < validRecipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000))
            }
        }

        // Finalizar campanha
        await supabase
            .from('campaigns')
            .update({
                status: 'COMPLETED',
                sent_count: successCount,
                error_count: failureCount,
                last_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId)

        return NextResponse.json({
            success: true,
            total_recipients: validRecipients.length,
            sent_count: successCount,
            error_count: failureCount,
            sector_used: sectorToSend
        })

    } catch (error: any) {
        console.error('[Campaign Send Error]', error)
        return NextResponse.json({ error: error?.message || 'Erro interno ao processar disparo' }, { status: 500 })
    }
}
