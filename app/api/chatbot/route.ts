import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  processStep,
  createInitialState,
  detectIntent,
  getTrialFollowUpMessage,
  type ConversationState,
  type EngineResult,
} from '@/lib/chatbot/clin-engine'
import { MSG_MENU } from '@/lib/chatbot/clin-messages'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Modelos free com fallback automático (se um estiver com rate limit, tenta o próximo)
const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
]

// System prompt REDUZIDO — usado apenas como fallback quando o engine não reconhece a mensagem
const AI_FALLBACK_PROMPT = `Você é o Clin, assistente virtual de vendas do CliniGo.
Tom: amigável, direto, consultivo, nunca robótico. Português brasileiro informal mas profissional.
Nunca invente funcionalidades. Nunca mencione concorrentes.
Respostas em até 3 parágrafos. Use emojis com moderação.

PLANOS: Básico R$99/mês (1 prof), Avançado R$249/mês (até 5), Professional R$449/mês (até 30), Enterprise R$699+/mês (ilimitado).
Teste grátis: https://clinigo.app/trial (7 dias, sem cartão).

Quando o lead quiser falar com humano ou demonstração: responda exatamente "TRANSFER_TO_HUMAN".
Se não souber responder: responda exatamente "TRANSFER_TO_HUMAN".

IMPORTANTE: O sistema CliniGo é web e NÃO possui aplicativo para celular (nem Android, nem iOS). Se perguntado, diga que acessa pelo navegador.
Ao final da resposta, SEMPRE sugira que o usuário escolha uma opção do menu:
1 — O que é o CliniGo
2 — Planos e preços
3 — Demonstração gratuita
4 — Funcionalidades
5 — Falar com especialista`

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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas mensagens. Aguarde um momento.' },
        { status: 429 }
      )
    }

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
      // Garantir que leadData existe
      if (!convState.leadData) convState.leadData = {}
    } else {
      convState = createInitialState()
    }

    // Resetar sessão automaticamente se a última interação foi há mais de 1 hora
    // Isso garante que usuários que falem no WhatsApp novamente após 1 hora reiniciem a conversa do bot perfeitamente
    if (existingSession) {
      const lastUpdate = existingSession.updated_at ? new Date(existingSession.updated_at).getTime() : 0
      const now = Date.now()
      const oneHour = 60 * 60 * 1000 // 1 hora
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
        reply: 'Você atingiu o limite de mensagens desta sessão. Para continuar, fale conosco pelo WhatsApp! 📱',
        messages: ['Você atingiu o limite de mensagens desta sessão. Para continuar, fale conosco pelo WhatsApp! 📱'],
        transfer: true,
        whatsappUrl: 'https://wa.me/5521975129005?text=Olá!%20Vim%20do%20chat%20do%20site%20e%20gostaria%20de%20continuar%20a%20conversa'
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

    // Se sessão já foi transferida, não processar automaticamente (a menos que seja o reset manual)
    if (existingSession?.status === 'transferred') {
      // RESETAR SESSÃO se o usuário enviar a mensagem padrão do botão do site
      if (message.trim().toLowerCase() === 'olá! gostaria de saber mais sobre o clinigo') {
        await supabaseAdmin
          .from('chatbot_sessions')
          .update({
            status: 'active',
            conversation_state: createInitialState(),
            message_count: 0
          })
          .eq('session_id', sessionId)
        
        // Continuamos a execução para processar essa mensagem no novo estado limpo
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
      // Engine retornou resposta determinística
      finalMessages = engineResult.messages
    } else {
      // Engine não reconheceu → fallback para IA
      finalMessages = await callAIFallback(sessionId, message)

      // Verificar se a IA quer transferir
      const joinedReply = finalMessages.join(' ')
      if (joinedReply.includes('TRANSFER_TO_HUMAN')) {
        shouldTransfer = true
        finalMessages = finalMessages.map(m => m.replace(/TRANSFER_TO_HUMAN/g, '').trim()).filter(m => m)
        if (finalMessages.length === 0) {
          finalMessages = ['Perfeito! Vou te conectar agora com um especialista do CliniGo que vai te atender pessoalmente. Um momento! 🙏']
        }
      }

      // Após resposta da IA, resetar para menu para próxima interação
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
      const phone = sessionId.startsWith('wa-') ? sessionId.replace('wa-', '') : null

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

      // Marcar sessão como lead capturado
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
      sendFollowUp: engineResult.sendFollowUp || false,
      followUpMessages: engineResult.sendFollowUp ? getTrialFollowUpMessage() : undefined,
      ...(shouldTransfer ? {
        whatsappUrl: 'https://wa.me/5521975129005?text=Olá!%20Vim%20do%20chat%20do%20site%20e%20gostaria%20de%20falar%20com%20um%20especialista'
      } : {})
    })

  } catch (error) {
    console.error('[Chatbot] Error:', error)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}

// ========== PRIMEIRA MENSAGEM (GET) — Retorna menu inicial ==========

export async function GET() {
  return NextResponse.json({
    reply: MSG_MENU[0],
    messages: MSG_MENU,
    transfer: false,
  })
}

// ========== AI FALLBACK ==========

async function callAIFallback(sessionId: string, message: string): Promise<string[]> {
  if (!OPENROUTER_API_KEY) {
    return ['Estou com uma dificuldade técnica no momento. Que tal falar diretamente com nossa equipe pelo WhatsApp? 😊']
  }

  // Buscar histórico (últimas 10 mensagens)
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
          temperature: 0.7
        })
      })

      if (aiResponse.ok) {
        const data = await aiResponse.json()
        const content = data.choices?.[0]?.message?.content || ''
        if (content) {
          return [content.trim()]
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

  return ['Estou com uma dificuldade técnica no momento. Que tal falar diretamente com nossa equipe pelo WhatsApp? 😊']
}
