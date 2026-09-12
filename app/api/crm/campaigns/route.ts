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

        // FEATURE GATE: CRM is PRO+ exclusive
        const { data: clinic } = await supabase
            .from('clinics')
            .select('plan_type')
            .eq('id', clinicId)
            .single()

        if (clinic && (clinic as any).plan_type === 'BASIC') {
            return NextResponse.json({
                error: 'CRM disponível apenas nos planos Profissional e Enterprise',
                current_plan: 'BASIC',
                upgrade_to: 'PRO'
            }, { status: 403 })
        }

        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get('status')

        let query = (supabase as any)
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

        // SUB-AÇÃO: CANCELAR / RESETAR CAMPANHA TRAVADA
        if (body.action === 'reset' || body.action === 'cancel') {
            const campaignId = body.campaign_id || body.id
            if (!campaignId) {
                return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 })
            }

            // Consultar quantas mensagens já foram enviadas com sucesso no whatsapp_logs para preservar o contador real
            const { count: sentLogsCount } = await (supabase as any)
                .from('whatsapp_logs')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .eq('trigger_source', `campaign_${campaignId}`)
                .eq('status', 'sent')

            const { error: resetErr } = await (supabase as any)
                .from('campaigns')
                .update({
                    status: 'DRAFT',
                    sent_count: sentLogsCount || 0,
                    error_count: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', campaignId)
                .eq('clinic_id', clinicId)

            if (resetErr) {
                return NextResponse.json({ error: 'Erro ao resetar campanha' }, { status: 500 })
            }

            return NextResponse.json({ success: true, message: 'Campanha redefinida para rascunho com sucesso' })
        }

        // SUB-AÇÃO: DISPARAR CAMPANHA VIA WHATSAPP
        if (body.action === 'send') {
            const campaignId = body.campaign_id || body.id
            if (!campaignId) {
                return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 })
            }

            const { data: campaign, error: campErr } = await (supabase as any)
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .eq('clinic_id', clinicId)
                .single()

            if (campErr || !campaign) {
                return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
            }

            let sectorToSend = (campaign as any)?.sector || 'financeiro'

            // Verificar em tempo real se o setor está conectado no Baileys/Storage
            const { checkInstanceStatus, getAllClinicSessions } = await import('@/lib/whatsapp/service')
            const statusTarget = await checkInstanceStatus(clinicId, sectorToSend)

            if (!statusTarget.connected) {
                // Verificar se existe algum outro setor ativo e conectado para fallback
                const allSessions = await getAllClinicSessions(clinicId)
                let fallbackSector: string | null = null

                for (const s of allSessions) {
                    if (s.sector !== sectorToSend) {
                        const check = await checkInstanceStatus(clinicId, s.sector)
                        if (check.connected) {
                            fallbackSector = s.sector
                            break
                        }
                    }
                }

                if (fallbackSector) {
                    sectorToSend = fallbackSector
                } else {
                    return NextResponse.json({
                        error: `O WhatsApp do setor "${sectorToSend}" não está conectado. Acesse Menu > WhatsApp para conectar antes de disparar.`
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

            if ((campaign as any).target_all_patients) {
                const { data: patients } = await supabase
                    .from('patients')
                    .select('id, full_name, phone')
                    .eq('clinic_id', clinicId)
                    .is('deleted_at', null)

                targetPatients = patients || []
            } else if (Array.isArray((campaign as any).target_tags) && (campaign as any).target_tags.length > 0) {
                const { data: tagged } = await supabase
                    .from('patient_tag_assignments')
                    .select('patient:patients(id, full_name, phone)')
                    .in('tag_id', (campaign as any).target_tags)

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

            // Consultar mensagens que já foram enviadas com sucesso para esta campanha (deduplicação)
            const { data: sentLogs } = await (supabase as any)
                .from('whatsapp_logs')
                .select('recipient_phone')
                .eq('clinic_id', clinicId)
                .eq('trigger_source', `campaign_${campaignId}`)
                .eq('status', 'sent')

            const sentPhoneSet = new Set<string>()
            for (const log of sentLogs || []) {
                if (log.recipient_phone) {
                    const clean = log.recipient_phone.replace(/\D/g, '')
                    sentPhoneSet.add(clean)
                    if (clean.startsWith('55')) {
                        sentPhoneSet.add(clean.substring(2))
                    } else {
                        sentPhoneSet.add(`55${clean}`)
                    }
                }
            }

            const isAlreadySent = (rawPhone: string | null | undefined): boolean => {
                if (!rawPhone) return false
                const clean = rawPhone.replace(/\D/g, '')
                if (sentPhoneSet.has(clean)) return true
                if (clean.startsWith('55') && sentPhoneSet.has(clean.substring(2))) return true
                if (!clean.startsWith('55') && sentPhoneSet.has(`55${clean}`)) return true

                const ddd = clean.startsWith('55') ? clean.substring(2, 4) : clean.substring(0, 2)
                const num = clean.startsWith('55') ? clean.substring(4) : clean.substring(2)
                if (num.length === 9 && num.startsWith('9')) {
                    const without9 = clean.startsWith('55') ? `55${ddd}${num.substring(1)}` : `${ddd}${num.substring(1)}`
                    if (sentPhoneSet.has(without9)) return true
                } else if (num.length === 8) {
                    const with9 = clean.startsWith('55') ? `55${ddd}9${num}` : `${ddd}9${num}`
                    if (sentPhoneSet.has(with9)) return true
                }
                return false
            }

            const initialSentCount = validRecipients.filter(p => isAlreadySent(p.phone)).length

            await (supabase as any)
                .from('campaigns')
                .update({
                    status: 'RUNNING',
                    total_recipients: validRecipients.length,
                    sent_count: initialSentCount,
                    error_count: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', campaignId)

            // Executar envio sequencial em segundo plano com Next.js after()
            after(async () => {
                const { createServiceRoleClient } = await import('@/lib/supabase/server')
                const adminDb = createServiceRoleClient()
                let successCount = initialSentCount
                let failureCount = 0
                let consecutiveConnectionErrors = 0
                let aborted = false
                const startTime = Date.now()

                try {
                    for (const patient of validRecipients) {
                        if (aborted) break

                        // Pular destinatário se já foi enviado com sucesso
                        if (isAlreadySent(patient.phone)) {
                            continue
                        }

                        // Proteção contra timeout de Serverless (buffer seguro antes do limite de 60s da Vercel)
                        if (Date.now() - startTime > 50000) {
                            console.warn(`[Campaign ${campaignId}] Limite de tempo da função se aproximando (50s). Pausando fila com progresso salvo.`)
                            break
                        }

                        if (consecutiveConnectionErrors >= 4) {
                            console.error(`[Campaign ${campaignId}] WhatsApp desconectado em múltiplos envios seguidos. Interrompendo fila.`)
                            aborted = true
                            break
                        }

                        try {
                            const personalizedMessage = ((campaign as any).content || '')
                                .replace(/\{\{patient_name\}\}/gi, patient.full_name || 'Cliente')
                                .replace(/\{\{nome_paciente\}\}/gi, patient.full_name || 'Cliente')
                                .replace(/\{\{clinic_name\}\}/gi, clinicName)
                                .replace(/\{\{nome_clinica\}\}/gi, clinicName)

                            // Timeout individual de 10 segundos para garantir que o socket Baileys nunca trave a execução
                            await Promise.race([
                                sendWhatsAppMessage(
                                    clinicId,
                                    patient.phone!,
                                    personalizedMessage,
                                    `campaign_${campaignId}`,
                                    sectorToSend
                                ),
                                new Promise((_, reject) =>
                                    setTimeout(() => reject(new Error('Tempo limite de envio excedido (10s)')), 10000)
                                )
                            ])

                            successCount++
                            consecutiveConnectionErrors = 0
                            if (patient.phone) {
                                const clean = patient.phone.replace(/\D/g, '')
                                sentPhoneSet.add(clean)
                            }
                        } catch (sendErr: any) {
                            console.error(`[Campaign ${campaignId}] Falha ao enviar para ${patient.id} (${patient.phone}):`, sendErr?.message || sendErr)
                            failureCount++
                            const errMsg = (sendErr?.message || '').toLowerCase()
                            if (errMsg.includes('não conectado') || errMsg.includes('desconectado') || errMsg.includes('socket')) {
                                consecutiveConnectionErrors++
                            }
                        }

                        // Persistência incremental imediata para atualizar o polling da tela em tempo real a cada 3s
                        await (adminDb as any)
                            .from('campaigns')
                            .update({
                                sent_count: successCount,
                                error_count: failureCount,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', campaignId)

                        // Cadência suave de 800ms entre mensagens para proteger o socket e manter performance
                        await new Promise(resolve => setTimeout(resolve, 800))
                    }
                } catch (loopErr) {
                    console.error(`[Campaign ${campaignId}] Erro inesperado no loop de disparo:`, loopErr)
                } finally {
                    const isFullyFinished = (successCount + failureCount) >= validRecipients.length
                    let finalStatus = 'COMPLETED'

                    if (!isFullyFinished) {
                        if (aborted || consecutiveConnectionErrors >= 4) {
                            finalStatus = 'FAILED'
                        } else {
                            // Interrupção por tempo da função: volta para DRAFT preservando sent_count para permitir continuar
                            finalStatus = 'DRAFT'
                        }
                    } else if (failureCount > 0 && successCount === 0) {
                        finalStatus = 'FAILED'
                    }

                    await (adminDb as any)
                        .from('campaigns')
                        .update({
                            status: finalStatus,
                            sent_count: successCount,
                            error_count: failureCount,
                            last_sent_at: successCount > 0 ? new Date().toISOString() : null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', campaignId)
                }
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

        const { data: campaign, error } = await (supabase as any)
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

// PATCH: Update campaign
export async function PATCH(request: NextRequest) {
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

        const body = await request.json()
        const campaignId = body.id || body.campaign_id
        if (!campaignId) {
            return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 })
        }

        const { data: existing } = await (supabase as any)
            .from('campaigns')
            .select('status')
            .eq('id', campaignId)
            .eq('clinic_id', clinicId)
            .single()

        if (!existing) {
            return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
        }

        if ((existing as any)?.status === 'RUNNING') {
            return NextResponse.json({ error: 'Não é possível alterar uma campanha em andamento' }, { status: 400 })
        }

        const updates: any = { updated_at: new Date().toISOString() }
        if (body.name !== undefined) updates.name = body.name
        if (body.content !== undefined) updates.content = body.content
        if (body.sector !== undefined) updates.sector = body.sector
        if (body.type !== undefined) updates.type = body.type
        if (body.subject !== undefined) updates.subject = body.subject
        if (body.target_all_patients !== undefined) updates.target_all_patients = body.target_all_patients

        if ((existing as any)?.status === 'FAILED') {
            updates.status = 'DRAFT'
            updates.error_count = 0
            updates.sent_count = 0
        }

        const { data: updated, error } = await (supabase as any)
            .from('campaigns')
            .update(updates)
            .eq('id', campaignId)
            .eq('clinic_id', clinicId)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: 'Erro ao atualizar campanha' }, { status: 500 })
        }

        return NextResponse.json({ success: true, campaign: updated })
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
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

        const { error } = await (supabase as any)
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
