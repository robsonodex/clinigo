import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import {
  processStep,
  createInitialState,
  detectIntent,
  getTrialFollowUpMessage,
  type ConversationState,
  type EngineResult,
} from '@/lib/chatbot/clin-engine'
import { MSG_MENU } from '@/lib/chatbot/clin-messages'
import {
  callClinAiFallbackCascade,
  normalizeValidWhatsappPhone,
  notifyHotLeadAlert,
  syncQualifiedLeadToSalesHq,
  upsertProgressiveChatbotLead,
  type ChatHistoryMessage,
} from '@/lib/chatbot/clin-growth'
import { createServiceRoleClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createServiceRoleClient()
}

const CLINIGO_WHATSAPP_CONTINUE_URL =
  'https://wa.me/5521975129005?text=Ol%C3%A1!%20Vim%20do%20site%20CliniGo%20e%20gostaria%20de%20continuar%20a%20conversa%20sobre%20minha%20cl%C3%ADnica%20de%20terapias'

const CLINIGO_WHATSAPP_SPECIALIST_URL =
  'https://wa.me/5521975129005?text=Ol%C3%A1!%20Vim%20do%20site%20CliniGo%20e%20gostaria%20de%20falar%20com%20um%20especialista%20sobre%20minha%20cl%C3%ADnica%20de%20terapias'

// System prompt atualizado com todo o CliniGo 2.0 — usado apenas no fallback para perguntas abertas
const AI_FALLBACK_PROMPT = `Você é a Clin, assistente virtual consultiva do CliniGo (plataforma operacional e clínica brasileira especializada em clínicas de terapias multidisciplinares).
Tom: cordial, objetivo, seguro, sem emojis, sem "&" e sempre em português do Brasil (pt-BR).
Nunca invente funcionalidades fora do escopo (o sistema não tem controle de caixa físico em espécie nem emissão de nota fiscal). Nunca mencione concorrentes. Nunca mencione plano Enterprise.
Respostas curtas (máximo 2 a 3 parágrafos objetivos).

ESPECIALIDADES ATENDIDAS NATIVAMENTE:
- Psicologia (evolução SOAP, sigilo clínico RBAC/RLS no servidor exigido pelo CRP)
- ABA e Neurodesenvolvimento / TEA (Modo Tatame DTT/NET 1-toque, Curvas de Aprendizagem com domínio automático >= 80% x 3, Mesa de Supervisão ABA/PEI, dupla de terapeutas/co-terapia)
- Fonoaudiologia (CRFa, planos por domínio e anexos privados criptografados)
- Terapia Ocupacional (CREFITO, integração sensorial, AVD e reserva de salas sensoriais sem colisões)
- Psicomotricidade (biblioteca visual de 55 objetivos A-K e gráfico evolutivo automático)
- Fisioterapia (CREFITO, avaliação funcional, pacotes, reposições e convênios)

DIFERENCIAIS CLINIGO 2.0:
- CliniGo IA com Escudo LGPD nativo (anonimização prévia no servidor): Estruturador Instantâneo de Evolução + Check Anti-Glosa, Redator Multidisciplinar de Laudos em 3 tons, Tradutor Empático para famílias e Carta ANS contra Glosas
- CliniGo Família 2.0 (sem app): boletim LGPD seguro por link, Mural de Conquistas, atividades em casa, correlação Casa x Clínica e micro-retorno da escola
- Meu Dia Clínico + Clonar Última Sessão + Meu Repasse em Tempo Real
- Faturamento TISS ANS com Score de Saúde do Lote, Dossiê Probatório 1-Clique Anti-Glosa (Biometria + Evolução Assinada + Guia TISS) e Relatório de Renovação de Convênio em 1 clique
- Capacitação 100% digital e autoguiada via Guia de Uso Integrado e CliniGo Academy

PLANOS OFICIAIS (1 unidade operacional, atendimentos ilimitados, taxa única de implantação, licença extra avulsa R$ 49,90/mês):
- Básico: R$ 149/mês (1 licença, agenda recorrente, prontuário por especialidade, planos ABA, Modo Tatame, CliniGo IA, CliniGo Família 2.0, teleconsulta WebRTC nativa, pré-cadastro e assinatura Lei 14.063/2020, Guia de Uso e CliniGo Academy)
- Avançado (mais escolhido): R$ 249/mês (até 5 licenças, tudo do Básico + BI de Terapia, Mesa de Supervisão ABA/PEI, motor de repasse com sigilo RBAC, WhatsApp integrado por setores, CRM Kanban, DRE e importação Excel/CSV)
- Professional: R$ 449/mês (até 30 licenças, tudo do Avançado + faturamento TISS padrão ANS, lotes XML, Dossiê Anti-Glosa 1-Clique, check-in por biometria facial multi-superfície, Totem Facial/QR Code, Painel de TV, NPS, API/Webhooks e SLA 99,5%)

TESTE GRÁTIS E LINKS:
- 7 dias gratuitos sem cartão de crédito em https://clinigo.app/trial
- Soluções por especialidade em https://clinigo.app/solucoes
- Comparativo técnico em https://clinigo.app/comparativo
- WhatsApp oficial CliniGo: (21) 97512-9005

REGRA RÍGIDA DE RESPOSTA:
- NUNCA pense em voz alta nem escreva em inglês.
- Entregue APENAS a resposta final que o cliente deve ler no WhatsApp.
- Se o usuário pedir algo comercial customizado, recontratação de conta encerrada ou suporte humano específico, responda "TRANSFER_TO_HUMAN".

Ao final da resposta, sugira escolher uma opção do menu:
1 — O que é o CliniGo e especialidades
2 — Planos, preços e Simulador de Economia
3 — Teste grátis ou avaliação consultiva
4 — Módulos da plataforma
5 — Falar com um especialista
6 — Problema de acesso, suspensão ou conta encerrada`

// Rate limiting simples em memória (por IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20 // mensagens por minuto
const RATE_WINDOW = 60 * 1000 // 1 minuto
const MAX_MESSAGES_PER_SESSION = 50
const SESSION_RESET_WINDOW_MS = 6 * 60 * 60 * 1000 // 6 horas (respeita rotina de atendimentos clínicos)

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT) {
    return false
  }

  entry.count++
  return true
}

export const POST = withAxiom(async (request: AxiomRequest) => {
  try {
    const supabaseAdmin = getSupabaseAdmin() as any
    const ip = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const body = await request.json()
    const { message, sessionId, sourcePage, source, senderPhone, senderName } = body
    const verifiedSenderPhone = normalizeValidWhatsappPhone(senderPhone)
    const cleanSenderName = typeof senderName === 'string' && senderName.trim().length >= 2 ? senderName.trim() : undefined

    if (!message || typeof message !== 'string' || message.length > 1000) {
      return NextResponse.json(
        { error: 'Mensagem inválida.' },
        { status: 400 }
      )
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Sessão inválida.' },
        { status: 400 }
      )
    }

    const isWhatsApp = source === 'whatsapp' || sessionId.startsWith('wa-')

    if (!isWhatsApp && !checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas mensagens. Aguarde um momento.' },
        { status: 429 }
      )
    }

    // ========== BUSCAR OU CRIAR SESSÃO ==========
    const { data: existingSession } = await supabaseAdmin
      .from('chatbot_sessions')
      .select('id, message_count, status, conversation_state, updated_at, bot_paused_until')
      .eq('session_id', sessionId)
      .maybeSingle()

    // Se o Super Admin pausou o bot para esta conversa (ex.: atendimento humano em andamento), ficar 100% silencioso
    if (
      existingSession?.bot_paused_until &&
      new Date(existingSession.bot_paused_until).getTime() > Date.now()
    ) {
      await supabaseAdmin.from('chatbot_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: message,
      })
      return NextResponse.json({
        reply: '',
        messages: [],
        transfer: true,
        paused: true,
      })
    }

    // Carregar ou criar estado de conversa
    let convState: ConversationState
    if (existingSession?.conversation_state && Object.keys(existingSession.conversation_state).length > 0) {
      convState = existingSession.conversation_state as ConversationState
      if (!convState.leadData) convState.leadData = {}
    } else {
      convState = createInitialState()
    }

    // Resetar sessão automaticamente se a última interação foi há mais de 6 horas
    if (existingSession) {
      const lastUpdate = existingSession.updated_at ? new Date(existingSession.updated_at).getTime() : 0
      const timeDiff = Date.now() - lastUpdate

      if (timeDiff > SESSION_RESET_WINDOW_MS) {
        const preservedHotFlag = Boolean(convState.leadData?.hotAlertSent)
        const resetState: ConversationState = {
          step: 'menu',
          leadData: preservedHotFlag ? { hotAlertSent: true } : {},
        }
        await supabaseAdmin
          .from('chatbot_sessions')
          .update({
            status: 'active',
            conversation_state: resetState,
            message_count: 0,
            followup_2h_sent_at: null,
            followup_24h_sent_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId)

        existingSession.status = 'active'
        existingSession.message_count = 0
        existingSession.conversation_state = resetState
        convState = resetState
      }
    }

    if (existingSession && existingSession.message_count >= MAX_MESSAGES_PER_SESSION) {
      return NextResponse.json({
        reply: 'Você atingiu o limite de mensagens desta sessão. Para continuar, fale conosco pelo WhatsApp (21) 97512-9005.',
        messages: ['Você atingiu o limite de mensagens desta sessão. Para continuar, fale conosco pelo WhatsApp (21) 97512-9005.'],
        transfer: true,
        whatsappUrl: CLINIGO_WHATSAPP_CONTINUE_URL,
      })
    }

    if (!existingSession) {
      await supabaseAdmin.from('chatbot_sessions').insert({
        session_id: sessionId,
        source_page: sourcePage || '/',
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || '',
        message_count: 0,
        conversation_state: convState,
      })
    }

    // Se sessão já foi transferida, verificar se o usuário deseja reiniciar a conversa com o bot
    if (existingSession?.status === 'transferred') {
      const msgClean = message.trim().toLowerCase()
      const detected = detectIntent(message)
      const isGreetingOrReset =
        msgClean === 'oi' || msgClean === 'olá' || msgClean === 'ola' ||
        msgClean.startsWith('bom dia') || msgClean.startsWith('boa tarde') || msgClean.startsWith('boa noite') ||
        msgClean === 'menu' || msgClean === '0' || msgClean === 'voltar' || msgClean === 'reiniciar' ||
        msgClean === 'iniciar' || msgClean === 'start' || msgClean === 'ajuda' ||
        msgClean.includes('gostaria de saber mais sobre o clinigo') ||
        msgClean.includes('gostaria de conhecer o clinigo') ||
        msgClean.includes('gostaria de falar com um especialista') ||
        msgClean.includes('vim do chat') ||
        msgClean.includes('vim do site clinigo') ||
        msgClean === '6' || detected === 'acessoBloqueado' || detected === 'contaEncerrada'

      if (isGreetingOrReset) {
        await supabaseAdmin
          .from('chatbot_sessions')
          .update({
            status: 'active',
            conversation_state: createInitialState(),
            message_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId)

        existingSession.status = 'active'
        existingSession.conversation_state = createInitialState()
        existingSession.message_count = 0
        convState = createInitialState()
      } else {
        return NextResponse.json({
          reply: '',
          messages: [],
          transfer: true,
        })
      }
    }

    // ========== SALVAR MENSAGEM DO USUÁRIO ==========
    await supabaseAdmin.from('chatbot_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    })

    // ========== PROCESSAR COM O ENGINE ==========
    const engineResult: EngineResult = processStep(convState, message)

    let finalMessages: string[] = []
    let shouldTransfer = engineResult.transfer
    let newState = engineResult.newState

    if (engineResult.messages.length > 0) {
      finalMessages = engineResult.messages
    } else {
      const { data: historyRows } = await supabaseAdmin
        .from('chatbot_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(10)

      const history: ChatHistoryMessage[] = (historyRows || []).map((row: any) => ({
        role: row.role === 'assistant' ? 'assistant' : 'user',
        content: String(row.content || ''),
      }))

      const aiFallback = await callClinAiFallbackCascade(AI_FALLBACK_PROMPT, history)
      finalMessages = aiFallback.messages

      const joinedReply = finalMessages.join(' ')
      if (joinedReply.includes('TRANSFER_TO_HUMAN')) {
        shouldTransfer = true
        finalMessages = finalMessages
          .map((m) => m.replace(/TRANSFER_TO_HUMAN/g, '').trim())
          .filter(Boolean)
        if (finalMessages.length === 0) {
          finalMessages = [
            'Perfeito! Vou conectar você agora com um especialista do CliniGo para atender sua clínica pessoalmente. Um momento.',
          ]
        }
      }

      newState = { ...newState, step: 'menu' }
    }

    // ========== SALVAR RESPOSTAS DO ASSISTENTE ==========
    for (const msg of finalMessages) {
      await supabaseAdmin.from('chatbot_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: msg,
      })
    }

    // ========== CAPTURA PROGRESSIVA, CRM B2B E ALERTA DE LEAD QUENTE ==========
    const rawLead = engineResult.leadToSave || newState.leadData || convState.leadData || {}
    const effectiveLead = {
      ...rawLead,
      ...(verifiedSenderPhone && !rawLead.telefone ? { telefone: verifiedSenderPhone } : {}),
      ...(cleanSenderName && !rawLead.nome ? { nome: cleanSenderName } : {}),
    }
    try {
      const { phone } = await upsertProgressiveChatbotLead(supabaseAdmin, {
        sessionId,
        sourcePage: sourcePage || '/',
        lead: effectiveLead,
        transferred: shouldTransfer,
        transferTag: engineResult.transferTag,
        trialRequested: Boolean(engineResult.sendFollowUp),
      })

      await syncQualifiedLeadToSalesHq(supabaseAdmin, {
        sessionId,
        lead: effectiveLead,
        phone,
        transferTag: engineResult.transferTag,
        transferred: shouldTransfer,
      })

      const alertSent = await notifyHotLeadAlert(supabaseAdmin, {
        sessionId,
        lead: effectiveLead,
        phone,
        transfer: shouldTransfer,
        transferTag: engineResult.transferTag,
      })

      if (alertSent) {
        newState = {
          ...newState,
          leadData: { ...(newState.leadData || {}), hotAlertSent: true },
        }
      }
    } catch (growthErr) {
      console.warn('[Chatbot Growth Non-Fatal]', growthErr)
    }

    // ========== ATUALIZAR SESSÃO ==========
    const updateData: Record<string, any> = {
      message_count: (existingSession?.message_count || 0) + 1,
      updated_at: new Date().toISOString(),
      conversation_state: newState,
      // Quando o usuário respondeu novamente, libera novos ciclos de follow-up caso volte a parar depois
      followup_2h_sent_at: null,
    }

    if (shouldTransfer) {
      updateData.status = 'transferred'
      updateData.transferred_at = new Date().toISOString()
    }

    if (engineResult.pauseHours && engineResult.pauseHours > 0) {
      updateData.bot_paused_until = new Date(
        Date.now() + engineResult.pauseHours * 60 * 60 * 1000
      ).toISOString()
    }

    await supabaseAdmin
      .from('chatbot_sessions')
      .update(updateData)
      .eq('session_id', sessionId)

    // ========== RESPONSE ==========
    const reply = finalMessages.join('\n\n')

    return NextResponse.json({
      reply,
      messages: finalMessages,
      transfer: shouldTransfer,
      transferTag: engineResult.transferTag,
      leadToSave: effectiveLead,
      sendFollowUp: engineResult.sendFollowUp || false,
      followUpMessages: engineResult.sendFollowUp ? getTrialFollowUpMessage() : undefined,
      ...(shouldTransfer
        ? {
          whatsappUrl: CLINIGO_WHATSAPP_SPECIALIST_URL,
        }
        : {}),
    })
  } catch (error) {
    request.log.error('chatbot', { error: error instanceof Error ? error.message : String(error) })
    console.error('[Chatbot] Error:', error)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
})

// ========== PRIMEIRA MENSAGEM (GET) — Retorna menu inicial ==========

export const GET = withAxiom(async () => {
  return NextResponse.json({
    reply: MSG_MENU[0],
    messages: MSG_MENU,
    transfer: false,
  })
})
