import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, after } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/service'

export const maxDuration = 60

async function countClinicTargetPatients(
    supabase: Awaited<ReturnType<typeof createClient>>,
    clinicId: string,
    targetAllPatients: boolean
): Promise<number> {
    if (!targetAllPatients) return 0
    const { data: rows } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(5000)

    return rows?.length || 0
}

// GET: List campaigns
export const GET = withAxiom(async (request: AxiomRequest) => {
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

        // FEATURE GATE: CRM é exclusivo de planos Avançado/Profissional+
        const { data: clinic } = await supabase
            .from('clinics')
            .select('plan_type')
            .eq('id', clinicId)
            .single()

        const planType = String((clinic as any)?.plan_type || '').toUpperCase()
        if (planType === 'BASIC' || planType === 'BASICO' || planType === 'STARTER') {
            return NextResponse.json({
                error: 'CRM disponível apenas nos planos Avançado, Profissional e Enterprise',
                current_plan: planType,
                upgrade_to: 'AVANCADO'
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
            console.error('[GET /api/crm/campaigns] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao buscar campanhas' }, { status: 500 })
        }

        return NextResponse.json({ campaigns: campaigns || [] })
    } catch (error) {
        request.log.error('crm/campaigns', { error: error instanceof Error ? error.message : String(error) })
        console.error('[GET /api/crm/campaigns] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})

// POST: Create or Send campaign
export const POST = withAxiom(async (request: AxiomRequest) => {
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

            // Consultar quantas mensagens já foram enviadas com sucesso no whatsapp_logs (consulta indexada com limite)
            const { data: sentLogRows } = await (supabase as any)
                .from('whatsapp_logs')
                .select('id')
                .eq('clinic_id', clinicId)
                .eq('trigger_source', `campaign_${campaignId}`)
                .eq('status', 'sent')
                .limit(10000)

            const sentLogsCount = sentLogRows?.length || 0

            const { error: resetErr } = await (supabase as any)
                .from('campaigns')
                .update({
                    status: 'DRAFT',
                    sent_count: sentLogsCount,
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
                    .eq('is_active', true)
                    .is('deleted_at', null)
                    .limit(5000)

                targetPatients = patients || []
            } else {
                // Segmentação por tags ainda não possui tabela dedicada no schema; evita falha PGRST205
                return NextResponse.json({
                    error: 'Ative "Enviar para todos os pacientes" na campanha para definir os destinatários.'
                }, { status: 400 })
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
                .limit(10000)

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
                .eq('clinic_id', clinicId)

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

                        if (isAlreadySent(patient.phone)) {
                            continue
                        }

                        if (Date.now() - startTime > 50000) {
                            console.warn(`[Campaign ${campaignId}] Limite de tempo se aproximando (50s). Pausando fila com progresso salvo.`)
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
                            request.log.error('crm/campaigns', { error: sendErr instanceof Error ? sendErr.message : String(sendErr) })
                            // LGPD: nunca registrar telefone de paciente nos logs
                            console.error(`[Campaign ${campaignId}] Falha ao enviar para paciente ${patient.id}:`, sendErr?.message || sendErr)
                            failureCount++
                            const errMsg = (sendErr?.message || '').toLowerCase()
                            if (errMsg.includes('não conectado') || errMsg.includes('desconectado') || errMsg.includes('socket')) {
                                consecutiveConnectionErrors++
                            }
                        }

                        await (adminDb as any)
                            .from('campaigns')
                            .update({
                                sent_count: successCount,
                                error_count: failureCount,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', campaignId)
                            .eq('clinic_id', clinicId)

                        await new Promise(resolve => setTimeout(resolve, 800))
                    }
                } catch (loopErr) {
                    request.log.error('crm/campaigns', { error: loopErr instanceof Error ? loopErr.message : String(loopErr) })
                    console.error(`[Campaign ${campaignId}] Erro inesperado no loop de disparo:`, loopErr)
                } finally {
                    const isFullyFinished = (successCount + failureCount) >= validRecipients.length
                    let finalStatus = 'COMPLETED'

                    if (!isFullyFinished) {
                        if (aborted || consecutiveConnectionErrors >= 4) {
                            finalStatus = 'FAILED'
                        } else {
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
                        .eq('clinic_id', clinicId)
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
            target_all_patients = true,
            target_tags = [],
            target_filters = {},
            scheduled_at
        } = body

        const trimmedName = typeof name === 'string' ? name.trim() : ''
        const trimmedContent = typeof content === 'string' ? content.trim() : ''
        if (!trimmedName || !type || !trimmedContent) {
            return NextResponse.json({
                error: 'Campos obrigatórios: name, type, content'
            }, { status: 400 })
        }

        const totalRecipients = await countClinicTargetPatients(
            supabase,
            clinicId,
            Boolean(target_all_patients)
        )

        const { data: campaign, error } = await (supabase as any)
            .from('campaigns')
            .insert({
                clinic_id: clinicId,
                name: trimmedName,
                description: typeof description === 'string' ? description.trim() || null : null,
                type,
                subject: typeof subject === 'string' ? subject.trim() || null : null,
                content: trimmedContent,
                sector: sector || 'financeiro',
                target_all_patients: Boolean(target_all_patients),
                target_tags: Array.isArray(target_tags) ? target_tags : [],
                target_filters: target_filters || {},
                status: scheduled_at ? 'SCHEDULED' : 'DRAFT',
                scheduled_at: scheduled_at || null,
                total_recipients: totalRecipients,
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('[POST /api/crm/campaigns] Erro ao criar campanha:', error.message)
            return NextResponse.json({ error: 'Erro ao criar campanha' }, { status: 500 })
        }

        return NextResponse.json({ campaign }, { status: 201 })
    } catch (error) {
        request.log.error('crm/campaigns', { error: error instanceof Error ? error.message : String(error) })
        console.error('[POST /api/crm/campaigns] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})

// PATCH: Update campaign
export const PATCH = withAxiom(async (request: AxiomRequest) => {
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
            .select('status, target_all_patients')
            .eq('id', campaignId)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (!existing) {
            return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
        }

        if ((existing as any)?.status === 'RUNNING') {
            return NextResponse.json({ error: 'Não é possível alterar uma campanha em andamento' }, { status: 400 })
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (body.name !== undefined) updates.name = String(body.name).trim()
        if (body.content !== undefined) updates.content = String(body.content).trim()
        if (body.sector !== undefined) updates.sector = body.sector
        if (body.type !== undefined) updates.type = body.type
        if (body.subject !== undefined) updates.subject = body.subject ? String(body.subject).trim() : null
        if (body.target_all_patients !== undefined) {
            const targetAll = Boolean(body.target_all_patients)
            updates.target_all_patients = targetAll
            updates.total_recipients = await countClinicTargetPatients(supabase, clinicId, targetAll)
        }

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
        request.log.error('crm/campaigns', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
    }
})

// DELETE: Remove campaign
export const DELETE = withAxiom(async (request: AxiomRequest) => {
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
                campaignId = body?.id || body?.campaign_id
            } catch {
                // empty body allowed when id is missing
            }
        }

        if (!campaignId) {
            return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 })
        }

        const { data: deleted, error } = await (supabase as any)
            .from('campaigns')
            .delete()
            .eq('id', campaignId)
            .eq('clinic_id', clinicId)
            .select('id')
            .maybeSingle()

        if (error) {
            return NextResponse.json({ error: 'Erro ao excluir campanha' }, { status: 500 })
        }

        if (!deleted) {
            return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        request.log.error('crm/campaigns', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
    }
})
