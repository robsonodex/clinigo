import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse, after } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/service'

export const maxDuration = 60

// GET: List campaigns
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        // 🔥 FEATURE GATE: CRM is PRO+ exclusive
        const { data: clinic } = await supabase
            .from('clinics')
            .select('plan_type')
            .eq('id', clinicId)
            .single()

        if (clinic?.plan_type === 'BASIC') {
            return NextResponse.json({
                error: 'CRM disponível apenas nos planos Profissional e Enterprise',
                current_plan: 'BASIC',
                upgrade_to: 'PRO'
            }, { status: 403 })
        }

        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get('status')

        let query = supabase
            .from('campaigns')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }

        const { data: campaigns, error } = await query

        if (error) {
            console.error('Campaigns fetch error:', error)
            return NextResponse.json({ error: 'Erro ao buscar campanhas' }, { status: 500 })
        }

        return NextResponse.json({ campaigns })
    } catch (error) {
        console.error('Campaigns error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create or Send campaign
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const body = await request.json()

        // SUB-AÇÃO: DISPARAR CAMPANHA VIA WHATSAPP
        if (body.action === 'send') {
            const campaignId = body.campaign_id || body.id
            if (!campaignId) {
                return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 })
            }

            const { data: campaign, error: campErr } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .eq('clinic_id', clinicId)
                .single()

            if (campErr || !campaign) {
                return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
            }

            let sectorToSend = campaign.sector || 'financeiro'

            // Verificar se o setor está conectado
            const { data: waSession } = await supabase
                .from('whatsapp_sessions')
                .select('sector, status, phone_number')
                .eq('clinic_id', clinicId)
                .eq('sector', sectorToSend)
                .maybeSingle()

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
                        error: `WhatsApp do setor "${sectorToSend}" não está conectado. Acesse o menu WhatsApp para conectar antes de disparar.`
                    }, { status: 400 })
                }
            }

            const { data: clinicData } = await supabase
                .from('clinics')
                .select('name')
                .eq('id', clinicId)
                .single()

            const clinicName = clinicData?.name || 'Clínica'

            // Destinatários
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

                targetPatients = (tagged || []).map((t: any) => t.patient).filter(Boolean)
            }

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

            await supabase
                .from('campaigns')
                .update({
                    status: 'RUNNING',
                    total_recipients: validRecipients.length,
                    updated_at: new Date().toISOString()
                })
                .eq('id', campaignId)

            // Executar envio cadenciado em segundo plano com Next.js after()
            after(async () => {
                let successCount = 0
                let failureCount = 0

                for (let i = 0; i < validRecipients.length; i += 2) {
                    const chunk = validRecipients.slice(i, i + 2)
                    await Promise.all(chunk.map(async (patient) => {
                        try {
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
                    }))

                    await supabase
                        .from('campaigns')
                        .update({
                            sent_count: successCount,
                            error_count: failureCount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', campaignId)
                }

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
            })

            return NextResponse.json({
                success: true,
                message: 'Disparo iniciado com sucesso! O envio está sendo processado de forma cadenciada.',
                total_recipients: validRecipients.length,
                sector_used: sectorToSend
            })
        }

        // CRIAÇÃO NORMAL DE CAMPANHA
        const {
            name,
            description,
            type,
            subject,
            content,
            sector = 'financeiro',
            target_all_patients = false,
            target_tags = [],
            target_filters = {},
            scheduled_at
        } = body

        if (!name || !type || !content) {
            return NextResponse.json({
                error: 'Campos obrigatórios: name, type, content'
            }, { status: 400 })
        }

        let totalRecipients = 0
        if (target_all_patients) {
            const { count } = await supabase
                .from('patients')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .is('deleted_at', null)
            totalRecipients = count || 0
        } else if (target_tags.length > 0) {
            const { count } = await supabase
                .from('patient_tag_assignments')
                .select('patient_id', { count: 'exact', head: true })
                .in('tag_id', target_tags)
            totalRecipients = count || 0
        }

        const { data: campaign, error } = await supabase
            .from('campaigns')
            .insert({
                clinic_id: clinicId,
                name,
                description,
                type,
                subject,
                content,
                sector: sector || 'financeiro',
                target_all_patients,
                target_tags,
                target_filters,
                status: scheduled_at ? 'SCHEDULED' : 'DRAFT',
                scheduled_at,
                total_recipients: totalRecipients,
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Create campaign error:', error)
            return NextResponse.json({ error: 'Erro ao criar campanha' }, { status: 500 })
        }

        return NextResponse.json({ campaign })
    } catch (error) {
        console.error('Campaigns error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE: Remove campaign
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const searchParams = request.nextUrl.searchParams
        let campaignId = searchParams.get('id')

        if (!campaignId) {
            try {
                const body = await request.json()
                campaignId = body.id || body.campaign_id
            } catch {}
        }

        if (!campaignId) {
            return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 })
        }

        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', campaignId)
            .eq('clinic_id', clinicId)

        if (error) {
            return NextResponse.json({ error: 'Erro ao excluir campanha' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
    }
}
