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
import { createServiceRoleClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createServiceRoleClient()
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Modelos free com fallback automático
const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'meta-llama/llama-3.1-8b-instruct:free',
]

const CLINIGO_WHATSAPP_CONTINUE_URL =
  'https://wa.me/5521975129005?text=Ol%C3%A1!%20Vim%20do%20site%20CliniGo%20e%20gostaria%20de%20continuar%20a%20conversa%20sobre%20minha%20cl%C3%ADnica%20de%20terapias'

const CLINIGO_WHATSAPP_SPECIALIST_URL =
  'https://wa.me/5521975129005?text=Ol%C3%A1!%20Vim%20do%20site%20CliniGo%20e%20gostaria%20de%20falar%20com%20um%20especialista%20sobre%20minha%20cl%C3%ADnica%20de%20terapias'

// System prompt REDUZIDO — usado apenas como fallback quando o engine não reconhece a mensagem
const AI_FALLBACK_PROMPT = `Você é a Clin, assistente virtual consultiva do CliniGo (plataforma operacional e clínica brasileira especializada em clínicas de terapias multidisciplinares).
Tom: cordial, objetivo, seguro, sem emojis e sempre em português do Brasil (pt-BR).
Nunca invente funcionalidades fora do escopo. Nunca mencione concorrentes.
Respostas curtas (máximo 2 a 3 parágrafos objetivos).

ESPECIALIDADES ATENDIDAS NATIVAMENTE:
- Psicologia (evolução SOAP, sigilo clínico RBAC/RLS no servidor exigido pelo CRP)
- ABA e Neurodesenvolvimento / TEA (planos terapêuticos, metas de pareamento, níveis de ajuda, dupla de terapeutas/co-terapia e supervisão)
- Fonoaudiologia (CRFa, planos por domínio e anexos privados criptografados)
- Terapia Ocupacional (CREFITO, integração sensorial, AVD e reserva de salas sensoriais sem colisões)
- Psicomotricidade (catálogo de objetivos psicomotores e gráfico evolutivo automático)
- Fisioterapia (CREFITO, avaliação funcional, pacotes, reposições e convênios)

PLANOS OFICIAIS (1 unidade operacional, atendimentos ilimitados, sem fidelidade, taxa única de implantação, licença extra avulsa R$ 49,90/mês):
- Básico: R$ 149/mês (1 licença, agenda recorrente, prontuário por especialidade, planos ABA, teleconsulta WebRTC nativa, pré-cadastro e assinatura Lei 14.063/2020, check-in QR Code e Guia de Uso integrado)
- Avançado (mais escolhido): R$ 249/mês (até 5 licenças, tudo do Básico + BI de Terapia, motor de repasse individual com sigilo RBAC, WhatsApp integrado por setores, CRM, DRE e importação Excel/CSV)
- Professional: R$ 449/mês (até 30 licenças, tudo do Avançado + faturamento TISS completo padrão ANS, lotes XML, gestão de glosas, check-in por biometria facial multi-superfície vinculado às guias TISS, Totem de autoatendimento, Painel de TV, NPS, API/Webhooks e SLA 99,5%)

TESTE GRÁTIS E LINKS:
- 7 dias gratuitos sem cartão de crédito em https://clinigo.app/trial
- Soluções por especialidade em https://clinigo.app/solucoes
- Comparativo técnico em https://clinigo.app/comparativo
- WhatsApp oficial CliniGo: (21) 97512-9005

REGRA RÍGIDA DE RESPOSTA:
- NUNCA pense em voz alta.
- NUNCA escreva em inglês ou use meta-comentários como "The user is asking...", "Let's check...", "Now, answer warmly...".
- Entregue APENAS a resposta final que o cliente deve ler no WhatsApp.
- Se o usuário perguntar algo muito específico, comercial customizado ou técnico avançado que precise de atendimento humano, responda "TRANSFER_TO_HUMAN" para transferir a um especialista.

Ao final da resposta, sugira que o usuário escolha uma opção do menu:
1 — O que é o CliniGo e especialidades
2 — Planos e preços
3 — Teste grátis ou demonstração
4 — Módulos da plataforma
5 — Falar com um especialista
6 — Problema de acesso / Conta bloqueada ou suspensa`

// Rate limiting simples em memória (por IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20 // mensagens por minuto
const RATE_WINDOW = 60 * 1000 // 1 minuto
const MAX_MESSAGES_PER_SESSION = 50

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
    const supabaseAdmin = getSupabaseAdmin()
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    const body = await request.json()
    const { message, sessionId, sourcePage, source } = body

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

    // Rate limit aplicável apenas ao chat web (mensagens do WhatsApp usam o mesmo IP do servidor e não devem ser bloqueadas)
    if (!isWhatsApp && !checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas mensagens. Aguarde um momento.' },
        { status: 429 }
      )
    }

    // ========== BUSCAR OU CRIAR SESSÃO ==========
    const { data: existingSession } = await supabaseAdmin
      .from('chatbot_sessions')
      .select('id, message_count, status, conversation_state, updated_at')
      .eq('session_id', sessionId)
      .single()

    // Carregar ou criar estado de conversa
    let convState: ConversationState
    if (existingSession?.conversation_state && Object.keys(existingSession.conversation_state).length > 0) {
      convState = existingSession.conversation_state as ConversationState
      if (!convState.leadData) convState.leadData = {}
    } else {
      convState = createInitialState()
    }

    // Resetar sessão automaticamente se a última interação foi há mais de 1 hora
    if (existingSession) {
      const lastUpdate = existingSession.updated_at ? new Date(existingSession.updated_at).getTime() : 0
      const now = Date.now()
      const oneHour = 60 * 60 * 1000
      const timeDiff = now - lastUpdate

      if (timeDiff > oneHour) {
        await supabaseAdmin
          .from('chatbot_sessions')
          .update({
            status: 'active',
            conversation_state: createInitialState(),
            message_count: 0,
            updated_at: new Date().toISOString()
          })
          .eq('session_id', sessionId)

        existingSession.status = 'active'
        existingSession.message_count = 0
        existingSession.conversation_state = createInitialState()
        convState = createInitialState()
      }
    }

    if (existingSession && existingSession.message_count >= MAX_MESSAGES_PER_SESSION) {
      return NextResponse.json({
        reply: 'Você atingiu o limite de mensagens desta sessão. Para continuar, fale conosco pelo WhatsApp (21) 97512-9005.',
        messages: ['Você atingiu o limite de mensagens desta sessão. Para continuar, fale conosco pelo WhatsApp (21) 97512-9005.'],
        transfer: true,
        whatsappUrl: CLINIGO_WHATSAPP_CONTINUE_URL
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
        msgClean === '6' || detectIntent(message) === 'acessoBloqueado'

      if (isGreetingOrReset) {
        await supabaseAdmin
          .from('chatbot_sessions')
          .update({
            status: 'active',
            conversation_state: createInitialState(),
            message_count: 0,
            updated_at: new Date().toISOString()
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
          transfer: true
        })
      }
    }

    // ========== SALVAR MENSAGEM DO USUÁRIO ==========
    await supabaseAdmin.from('chatbot_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message
    })

    // ========== PROCESSAR COM O ENGINE ==========
    const engineResult: EngineResult = processStep(convState, message)

    let finalMessages: string[] = []
    let shouldTransfer = engineResult.transfer
    let newState = engineResult.newState

    if (engineResult.messages.length > 0) {
      finalMessages = engineResult.messages
    } else {
      finalMessages = await callAIFallback(sessionId, message)

      const joinedReply = finalMessages.join(' ')
      if (joinedReply.includes('TRANSFER_TO_HUMAN')) {
        shouldTransfer = true
        finalMessages = finalMessages.map(m => m.replace(/TRANSFER_TO_HUMAN/g, '').trim()).filter(m => m)
        if (finalMessages.length === 0) {
          finalMessages = ['Perfeito! Vou conectar você agora com um especialista do CliniGo para atender sua clínica pessoalmente. Um momento.']
        }
      }

      newState = { ...newState, step: 'menu' }
    }

    // ========== SALVAR RESPOSTAS DO ASSISTENTE ==========
    for (const msg of finalMessages) {
      await supabaseAdmin.from('chatbot_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: msg
      })
    }

    // ========== ATUALIZAR SESSÃO ==========
    const updateData: Record<string, any> = {
      message_count: (existingSession?.message_count || 0) + 1,
      updated_at: new Date().toISOString(),
      conversation_state: newState,
    }

    if (shouldTransfer) {
      updateData.status = 'transferred'
      updateData.transferred_at = new Date().toISOString()
    }

    await supabaseAdmin
      .from('chatbot_sessions')
      .update(updateData)
      .eq('session_id', sessionId)

    // ========== SALVAR LEAD SE HOUVER ==========
    if (shouldTransfer && engineResult.leadToSave) {
      const lead = engineResult.leadToSave
      const phone = lead.telefone || (sessionId.startsWith('wa-') ? sessionId.replace('wa-', '') : null)

      const { data: existingLead } = await supabaseAdmin
        .from('chatbot_leads')
        .select('id')
        .eq('session_id', sessionId)
        .single()

      const leadPayload = {
        name: lead.nome || null,
        email: null,
        phone: phone,
        specialty: lead.dorPrincipal || null,
        clinic_size: lead.numProfissionais?.toString() || null,
        interest: lead.dorPrincipal || null,
        plan_interest: lead.planoIndicado || null,
        source_page: sourcePage || '/',
        status: 'qualified',
        notes: `Clínica: ${lead.clinica || 'N/I'} | Profissionais: ${lead.numProfissionais || 'N/I'} | Plano: ${lead.planoIndicado || 'N/I'}`,
        updated_at: new Date().toISOString(),
      }

      if (existingLead) {
        await supabaseAdmin
          .from('chatbot_leads')
          .update(leadPayload)
          .eq('id', existingLead.id)
      } else {
        await supabaseAdmin.from('chatbot_leads').insert({
          ...leadPayload,
          session_id: sessionId,
        })
      }

      await supabaseAdmin
        .from('chatbot_sessions')
        .update({ lead_captured: true })
        .eq('session_id', sessionId)
    }

    // ========== RESPONSE ==========
    const reply = finalMessages.join('\n\n')

    return NextResponse.json({
      reply,
      messages: finalMessages,
      transfer: shouldTransfer,
      leadToSave: engineResult.leadToSave || newState.leadData || convState.leadData || {},
      sendFollowUp: engineResult.sendFollowUp || false,
      followUpMessages: engineResult.sendFollowUp ? getTrialFollowUpMessage() : undefined,
      ...(shouldTransfer ? {
        whatsappUrl: CLINIGO_WHATSAPP_SPECIALIST_URL
      } : {})
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

// ========== AI FALLBACK ==========

async function callAIFallback(sessionId: string, _message: string): Promise<string[]> {
  const supabaseAdmin = getSupabaseAdmin()
  if (!OPENROUTER_API_KEY) {
    return MSG_MENU
  }

  const { data: history } = await supabaseAdmin
    .from('chatbot_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(10)

  const messages = [
    { role: 'system' as const, content: AI_FALLBACK_PROMPT },
    ...(history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))
  ]

  for (const model of FREE_MODELS) {
    try {
      const aiResponse = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://clinigo.app',
          'X-Title': 'CliniGo Chatbot'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 500,
          temperature: 0.5
        })
      })

      if (aiResponse.ok) {
        const data = await aiResponse.json()
        let content = data.choices?.[0]?.message?.content || ''
        if (content) {
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

          if (content.includes("The user is asking") || content.includes("Let's check") || content.includes("In the previous context")) {
            const paragraphs = content.split(/\n\s*\n/)
            const cleanParagraphs = paragraphs.filter(p =>
              !p.startsWith('The user') &&
              !p.startsWith("Let's") &&
              !p.startsWith('Now, answer') &&
              !p.startsWith('In the previous') &&
              !p.startsWith('So CliniGo DOES')
            )
            content = cleanParagraphs.join('\n\n').trim()
          }

          if (content) {
            return [content.trim()]
          }
        }
      }

      if (aiResponse.status === 429) {
        console.warn(`[Chatbot] Rate limit no modelo ${model}, tentando próximo...`)
        continue
      }

      const errorText = await aiResponse.text()
      console.error(`[Chatbot] Erro no modelo ${model}:`, aiResponse.status, errorText)
    } catch (fetchError) {
      console.error(`[Chatbot] Fetch error no modelo ${model}:`, fetchError)
    }
  }

  return MSG_MENU
}
