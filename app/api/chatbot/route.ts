import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

const SYSTEM_PROMPT = `Você é o assistente virtual de vendas do CliniGo, chamado "Clin".

Seu objetivo é atender leads interessados no CliniGo, tirar dúvidas, 
apresentar os planos e agendar uma demonstração com a equipe comercial.

## SOBRE O CLINIGO

O CliniGo é uma plataforma SaaS all-in-one para gestão completa de 
clínicas médicas e terapêuticas. Atende médicos solo, clínicas 
multiprofissionais, espaços terapêuticos e redes de clínicas.

### Diferenciais exclusivos (nenhum concorrente tem tudo isso junto):
- Check-in facial com biometria (face-api.js)
- Totem de autoatendimento para check-in presencial
- Painel TV com fila de espera em tempo real
- WhatsApp nativo integrado (sem custo de API extra)
- Faturamento TISS completo com validação XSD conforme padrão ANS
- Sigilo clínico por terapeuta com isolamento total no banco de dados
- Teleconsulta WebRTC nativa (sem app adicional)
- PWA mobile para profissionais em campo
- Portal do paciente com autoagendamento
- Controle de faltas com automação WhatsApp
- Assinatura digital ICP-Brasil em evoluções
- Estoque FEFO com badges de validade
- DRE e fechamento mensal consolidado
- Repasse automático por profissional
- Programa de parceiros e afiliados
- Super Admin com gestão de múltiplas clínicas

### Especialidades atendidas:
Clínicas médicas, psicologia, fisioterapia, fonoaudiologia, 
terapia ocupacional, nutrição, odontologia, centros de reabilitação, 
espaços terapêuticos multiprofissionais.

## PLANOS E PREÇOS

| Plano | Preço | Profissionais | Pacientes | Destaques |
|---|---|---|---|---|
| Básico | R$ 99/mês | 1 | 200 | Agenda, Prontuário, Financeiro |
| Avançado | R$ 249/mês | 5 | Ilimitado | + Teleconsulta, WhatsApp, TISS, Repasse, CRM |
| Professional | R$ 449/mês | 30 | Ilimitado | + Check-in facial, Totem, Auditoria, API |
| Enterprise | R$ 699+/mês | Ilimitado | Ilimitado | + Multi-clínicas, Analytics global, SLA 99.5% |

Todos os planos incluem:
- Teste grátis por 7 dias sem cartão de crédito
- Suporte em português
- Cancele quando quiser
- Dados seguros com criptografia e conformidade LGPD

## COMPARAÇÃO COM CONCORRENTES

Se perguntarem sobre iClinic, Feegow, Clínica nas Nuvens ou GestãoDS:
- O CliniGo é o único com totem + check-in facial + TISS completo no mesmo sistema
- WhatsApp nativo sem custo extra de API (concorrentes pagam R$ 800-2.500/mês só pela API)
- Sigilo clínico por terapeuta com isolamento real no banco de dados
- Painel TV de recepção em tempo real
- Preço mais competitivo considerando o que inclui
Nunca fale mal dos concorrentes — apenas destaque os diferenciais do CliniGo.

## FLUXO DE ATENDIMENTO

Quando o lead chegar pela primeira vez:
Cumprimente pelo nome se souber, apresente-se como Clin e pergunte como pode ajudar.

Quando perguntar sobre planos:
Pergunte primeiro quantos profissionais a clínica tem e qual especialidade — assim você recomenda o plano certo.

Quando o lead quiser testar:
Direcione para: "clinigo.app"

Quando o lead quiser falar com humano ou agendar demo:
Responda exatamente: "TRANSFER_TO_HUMAN"

Quando não souber responder:
Responda exatamente: "TRANSFER_TO_HUMAN"

## CAPTURA DE DADOS

IMPORTANTE: Nas primeiras interações, naturalmente tente coletar:
1. Nome do lead
2. Email ou telefone
3. Especialidade da clínica
4. Quantidade de profissionais

Faça isso de forma natural e conversacional, nunca como um formulário.
Quando conseguir esses dados, inclua no final da mensagem (invisível para o lead):
[LEAD_DATA:nome=X|email=X|phone=X|specialty=X|clinic_size=X]

## PERGUNTAS FREQUENTES

"Como funciona o teste grátis?"
7 dias completos, todas as funcionalidades, sem cartão de crédito, cancele quando quiser.

"Precisa instalar alguma coisa?"
Não. 100% online, funciona no navegador. Também tem PWA mobile.

"É seguro?"
Sim. Criptografia AES-256, conformidade LGPD, Row Level Security, MFA.

"Funciona para psicologia/fisioterapia?"
Sim. Nomenclatura adaptativa. Modelos SOAP, CIF e DAP.

"Tem integração com convênios?"
Sim. TISS completo com validação XSD, gestão de glosas e autorização SP/SADT.

"Posso migrar meus dados?"
Sim. Importação via CSV/Excel.

## REGRAS DE COMPORTAMENTO

1. Sempre responda em português brasileiro
2. Seja cordial, objetivo e humano
3. Mensagens curtas — máximo 3 parágrafos
4. Use emojis com moderação — no máximo 1 ou 2 por mensagem
5. Nunca invente informações
6. Nunca fale mal de concorrentes
7. Nunca prometa funcionalidades que não existem
8. Nunca dê descontos — diga que vai verificar com a equipe
9. Quando o lead demonstrar interesse real em comprar, responda: TRANSFER_TO_HUMAN
10. Mantenha o foco em vendas — não é suporte técnico

## QUANDO RESPONDER "TRANSFER_TO_HUMAN"

- Pedir desconto ou negociação
- Quiser demonstração ao vivo
- Dúvida técnica complexa
- Algo que você não sabe responder
- Intenção clara de compra
- Insatisfação com as respostas
- Pedir para falar com pessoa`

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

// Extrair dados de lead da resposta do AI
function extractLeadData(content: string): Record<string, string> | null {
  const match = content.match(/\[LEAD_DATA:(.*?)\]/)
  if (!match) return null

  const data: Record<string, string> = {}
  const pairs = match[1].split('|')
  for (const pair of pairs) {
    const [key, value] = pair.split('=')
    if (key && value && value !== 'X' && value.trim()) {
      data[key.trim()] = value.trim()
    }
  }

  return Object.keys(data).length > 0 ? data : null
}

// Limpar LEAD_DATA da resposta visível ao usuário
function cleanResponse(content: string): string {
  return content.replace(/\[LEAD_DATA:.*?\]/g, '').trim()
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

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Serviço temporariamente indisponível.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { message, sessionId, sourcePage } = body

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

    // Buscar ou criar sessão
    const { data: existingSession } = await supabaseAdmin
      .from('chatbot_sessions')
      .select('id, message_count, status')
      .eq('session_id', sessionId)
      .single()

    if (existingSession && existingSession.message_count >= MAX_MESSAGES_PER_SESSION) {
      return NextResponse.json({
        reply: 'Você atingiu o limite de mensagens desta sessão. Para continuar, fale conosco pelo WhatsApp! 📱',
        transfer: true,
        whatsappUrl: 'https://wa.me/5521965532247?text=Olá!%20Vim%20do%20chat%20do%20site%20e%20gostaria%20de%20continuar%20a%20conversa'
      })
    }

    if (!existingSession) {
      await supabaseAdmin.from('chatbot_sessions').insert({
        session_id: sessionId,
        source_page: sourcePage || '/',
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || '',
        message_count: 0
      })
    }

    // Salvar mensagem do usuário
    await supabaseAdmin.from('chatbot_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message
    })

    // Buscar histórico (últimas 20 mensagens)
    const { data: history } = await supabaseAdmin
      .from('chatbot_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...(history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ]

    // Chamar OpenRouter API com fallback entre modelos free
    let rawReply = ''
    let apiSuccess = false

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
            rawReply = content
            apiSuccess = true
            break
          }
        }

        // Se 429 (rate limit), tentar próximo modelo
        if (aiResponse.status === 429) {
          console.warn(`[Chatbot] Rate limit no modelo ${model}, tentando próximo...`)
          continue
        }

        // Outro erro — logar e tentar próximo
        const errorText = await aiResponse.text()
        console.error(`[Chatbot] Erro no modelo ${model}:`, aiResponse.status, errorText)
      } catch (fetchError) {
        console.error(`[Chatbot] Fetch error no modelo ${model}:`, fetchError)
      }
    }

    if (!apiSuccess || !rawReply) {
      return NextResponse.json({
        reply: 'Estou com uma dificuldade técnica no momento. Que tal falar diretamente com nossa equipe pelo WhatsApp? 😊',
        transfer: true,
        whatsappUrl: 'https://wa.me/5521965532247?text=Olá!%20Tentei%20usar%20o%20chat%20do%20site%20e%20gostaria%20de%20atendimento'
      })
    }

    // Verificar transferência para humano
    const shouldTransfer = rawReply.includes('TRANSFER_TO_HUMAN')

    // Extrair dados de lead
    const leadData = extractLeadData(rawReply)
    
    // Limpar resposta
    let reply = cleanResponse(rawReply)
    
    if (shouldTransfer) {
      reply = reply.replace(/TRANSFER_TO_HUMAN/g, '').trim()
      if (!reply) {
        reply = 'Perfeito! Vou te conectar agora com um especialista do CliniGo que vai te atender pessoalmente. Um momento! 🙏'
      }
    }

    // Salvar resposta do assistente
    await supabaseAdmin.from('chatbot_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: reply
    })

    // Atualizar contador da sessão
    await supabaseAdmin
      .from('chatbot_sessions')
      .update({ 
        message_count: (existingSession?.message_count || 0) + 1,
        updated_at: new Date().toISOString(),
        ...(shouldTransfer ? { status: 'transferred', transferred_at: new Date().toISOString() } : {})
      })
      .eq('session_id', sessionId)

    // Salvar/atualizar lead se tiver dados
    if (leadData && Object.keys(leadData).length > 0) {
      const { data: existingLead } = await supabaseAdmin
        .from('chatbot_leads')
        .select('id')
        .eq('session_id', sessionId)
        .single()

      if (existingLead) {
        await supabaseAdmin
          .from('chatbot_leads')
          .update({
            ...(leadData.nome ? { name: leadData.nome } : {}),
            ...(leadData.email ? { email: leadData.email } : {}),
            ...(leadData.phone ? { phone: leadData.phone } : {}),
            ...(leadData.specialty ? { specialty: leadData.specialty } : {}),
            ...(leadData.clinic_size ? { clinic_size: leadData.clinic_size } : {}),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id)
      } else {
        await supabaseAdmin.from('chatbot_leads').insert({
          session_id: sessionId,
          name: leadData.nome || null,
          email: leadData.email || null,
          phone: leadData.phone || null,
          specialty: leadData.specialty || null,
          clinic_size: leadData.clinic_size || null,
          source_page: sourcePage || '/',
          status: 'new'
        })

        // Marcar sessão como lead capturado
        await supabaseAdmin
          .from('chatbot_sessions')
          .update({ lead_captured: true })
          .eq('session_id', sessionId)
      }
    }

    return NextResponse.json({
      reply,
      transfer: shouldTransfer,
      ...(shouldTransfer ? {
        whatsappUrl: 'https://wa.me/5521965532247?text=Olá!%20Vim%20do%20chat%20do%20site%20e%20gostaria%20de%20falar%20com%20um%20especialista'
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
