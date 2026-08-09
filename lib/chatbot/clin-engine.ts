/**
 * Clin Chatbot — Motor de Estados Determinístico
 *
 * Processa mensagens do usuário com base no estado atual da conversa.
 * Retorna respostas fixas (sem IA) para fluxos estruturados.
 * IA é usada apenas como fallback para mensagens fora do padrão.
 */

import {
  MSG_MENU, MSG_FLUXO_1_INTRO, MSG_FLUXO_1A_SOLO, MSG_FLUXO_1B_EQUIPE,
  MSG_FLUXO_1C_REDE, MSG_FLUXO_1C_RECOMENDACAO_ENTERPRISE,
  MSG_FLUXO_2_PLANOS, MSG_FLUXO_3_DEMO, MSG_ENVIAR_TRIAL, MSG_TRIAL_FOLLOWUP,
  MSG_FLUXO_4_FUNCIONALIDADES, MSG_FUNC_4A, MSG_FUNC_4B, MSG_FUNC_4C,
  MSG_FUNC_4D, MSG_FUNC_4E, MSG_FUNC_4F, MSG_FUNC_4G, MSG_FUNC_4H,
  MSG_FLUXO_5_NOME, MSG_FLUXO_5_CLINICA, MSG_FLUXO_5_NUM, MSG_FLUXO_5_DOR,
  MSG_OBJECAO_PRECO, MSG_OBJECAO_LGPD, MSG_INATIVIDADE,
  MSG_ENVIAR_INFO_ENTERPRISE, DOR_MAP,
  MSG_SAUDACAO_ACOLHIMENTO, MSG_FALLBACK_SIMPATICO,
  MSG_TRIAL_DIRETO_FLUXO3, MSG_FLUXO_5_OUTRO_ASSUNTO,
  MSG_FLUXO_5_OUTRO_ASSUNTO_CONFIRMACAO, MSG_RECUPERACAO_24H,
} from './clin-messages'

// ========== TYPES ==========

export interface LeadData {
  nome?: string
  clinica?: string
  numProfissionais?: number
  dorPrincipal?: string
  planoIndicado?: string
}

export interface ConversationState {
  step: string
  subStep?: string
  leadData: LeadData
  awaitingField?: string
}

export interface EngineResult {
  messages: string[]
  newState: ConversationState
  transfer: boolean
  transferTag?: string
  leadToSave?: LeadData
  sendFollowUp?: boolean // Para enviar follow-up após 30s (trial)
}

// ========== RECOMENDAÇÃO DE PLANO ==========

export function recomendarPlano(numProfissionais: number): string {
  if (numProfissionais === 1) return 'Básico (R$ 149/mês)'
  if (numProfissionais <= 5) return 'Avançado (R$ 249/mês)'
  if (numProfissionais <= 30) return 'Professional (R$ 449/mês)'
  return 'Enterprise (R$ 699+/mês)'
}

// ========== DETECÇÃO DE INTENÇÃO POR KEYWORDS ==========

type IntentType = 'jaECliente' | 'objecaoPreco' | 'objecaoLGPD' | 'querComprar' | 'querDemo' | null

const INTENCOES: { type: IntentType; keywords: string[] }[] = [
  { type: 'jaECliente', keywords: ['já sou cliente', 'tenho conta', 'minha conta', 'já uso'] },
  { type: 'objecaoPreco', keywords: ['caro', 'preço alto', 'muito caro', 'pensar', 'depois', 'não sei', 'preciso ver'] },
  { type: 'objecaoLGPD', keywords: ['seguro', 'lgpd', 'dados', 'privacidade', 'segurança', 'vazamento'] },
  { type: 'querComprar', keywords: ['quero comprar', 'quero assinar', 'quero contratar', 'vou fechar', 'quanto custa'] },
  { type: 'querDemo', keywords: ['demonstração', 'demo', 'ver o sistema', 'ver funcionando'] },
]

export function detectIntent(text: string): IntentType {
  const lower = text.toLowerCase().trim()
  for (const { type, keywords } of INTENCOES) {
    if (keywords.some(k => lower.includes(k))) return type
  }
  return null
}

// ========== EXTRAIR NÚMERO DA MENSAGEM ==========

function extractNumber(text: string): number | null {
  const match = text.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

// ========== NORMALIZAR INPUT ==========

function normalizeInput(text: string): string {
  return text.toLowerCase().trim().replace(/[.,!?]/g, '')
}

// ========== CRIAR STATE INICIAL ==========

export function createInitialState(): ConversationState {
  return { step: 'menu', leadData: {} }
}

// ========== GERAR MENSAGEM DE HANDOFF ==========

function buildHandoffMessage(lead: LeadData): string[] {
  const dorText = lead.dorPrincipal || 'Não informado'
  return [
    `Perfeito! Aqui está o resumo pra passar pro especialista:

━━━━━━━━━━━━━━━━━━
👤 *Nome:* ${lead.nome || 'Não informado'}
🏥 *Clínica:* ${lead.clinica || 'Não informada'}
👥 *Equipe:* ${lead.numProfissionais || '?'} profissional(is)
💡 *Plano indicado:* ${lead.planoIndicado || 'A definir'}
🎯 *Principal interesse:* ${dorText}
━━━━━━━━━━━━━━━━━━

*${lead.nome || 'Amigo(a)'}*, em instantes um especialista humano do CliniGo vai assumir essa conversa. 🤝

Enquanto isso, saiba que você está no lugar certo. Nossos clientes relatam em média *3h por semana economizadas* com o CliniGo. 💪

━━━━━━━━━━━━━━━━━━
🔁 *TRANSFERINDO PARA ESPECIALISTA...*
━━━━━━━━━━━━━━━━━━`
  ]
}

// ========== GERAR MENSAGEM DE RECOMENDAÇÃO ==========

function buildRecomendacao(num: number, plano: string): string[] {
  return [
    `*${num} profissional${num > 1 ? 'is' : ''}* — o plano *${plano}* já cobre com sobra!

Se sua equipe crescer, é só fazer o upgrade com 1 clique — sem perder nenhum dado. 🙌

O que você prefere?

✅ *1* — Testar grátis agora (7 dias sem cartão)
💬 *2* — Falar com especialista pra tirar dúvidas
🔙 *0* — Voltar ao menu principal`
  ]
}

// ========== MOTOR PRINCIPAL ==========

export function processStep(
  state: ConversationState,
  userMessage: string,
): EngineResult {
  const input = normalizeInput(userMessage)
  const currentStep = state.step
  const lead = { ...state.leadData }

  // Helper para retornar resultado
  const result = (
    messages: string[],
    nextStep: string,
    extra?: Partial<EngineResult>
  ): EngineResult => ({
    messages,
    newState: { step: nextStep, leadData: lead, awaitingField: extra?.newState?.awaitingField },
    transfer: extra?.transfer || false,
    transferTag: extra?.transferTag,
    leadToSave: extra?.leadToSave,
    sendFollowUp: extra?.sendFollowUp,
  })

  const isGreeting = 
    input === 'oi' || input === 'olá' || input === 'ola' ||
    input.startsWith('bom dia') || input.startsWith('boa tarde') || input.startsWith('boa noite') ||
    input === 'iniciar' || input === 'start' || input === 'ajuda' || input === 'hey' || input === 'hello' || input === 'salve'

  // SE DIGITAR 0, VOLTAR, MENU, REINICIAR OU SAUDAÇÃO (OI, OLÁ, ETC) -> MOSTRAR MENU PRINCIPAL INSTANTANEAMENTE
  if (input === '0' || input === 'voltar' || input === 'menu' || input === 'reiniciar' || isGreeting) {
    return result(MSG_MENU, 'menu')
  }

  // ===== STEP: MENU =====
  if (currentStep === 'menu' || currentStep === 'initial') {
    if (input === '1') return result(MSG_FLUXO_1_INTRO, 'fluxo_1_intro')
    if (input === '2') return result(MSG_FLUXO_2_PLANOS, 'fluxo_2_aguarda_num')
    if (input === '3') return result(MSG_FLUXO_3_DEMO, 'fluxo_3_demo')
    if (input === '4') return result(MSG_FLUXO_4_FUNCIONALIDADES, 'fluxo_4_funcionalidades')
    if (input === '5') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    
    // Check for the default message from the website WhatsApp button
    if (input.includes('gostaria de saber mais sobre o clinigo') || input.includes('vim do chat do site') || input.includes('gostaria de falar com um especialista')) {
      return result(MSG_MENU, 'menu')
    }

    // Não reconheceu → tentar intenção
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 1 INTRO (perfil) =====
  if (currentStep === 'fluxo_1_intro') {
    if (input === 'a') return result(MSG_FLUXO_1A_SOLO, 'fluxo_1a_solo')
    if (input === 'b') return result(MSG_FLUXO_1B_EQUIPE, 'fluxo_1b_aguarda_num')
    if (input === 'c') return result(MSG_FLUXO_1C_REDE, 'fluxo_1c_aguarda_resposta')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 1A SOLO (opções 1/2/3) =====
  if (currentStep === 'fluxo_1a_solo') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '2') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    if (input === '3') return result(MSG_MENU, 'menu')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 1B — AGUARDA NÚMERO DE PROFISSIONAIS =====
  if (currentStep === 'fluxo_1b_aguarda_num') {
    const num = extractNumber(userMessage)
    if (num && num > 0) {
      lead.numProfissionais = num
      lead.planoIndicado = recomendarPlano(num)
      return result(buildRecomendacao(num, lead.planoIndicado), 'fluxo_1b_recomendacao')
    }
    return result([`Não consegui entender. *Quantos profissionais* atendem na sua clínica? (digite um número)`], currentStep)
  }

  // ===== STEP: FLUXO 1B RECOMENDAÇÃO =====
  if (currentStep === 'fluxo_1b_recomendacao') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '2') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    if (input === '3') return result(MSG_MENU, 'menu')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 1C — AGUARDA RESPOSTA REDE =====
  if (currentStep === 'fluxo_1c_aguarda_resposta') {
    // Qualquer resposta → recomendar enterprise
    return result(MSG_FLUXO_1C_RECOMENDACAO_ENTERPRISE, 'fluxo_1c_recomendacao_enterprise')
  }

  // ===== STEP: FLUXO 1C RECOMENDAÇÃO ENTERPRISE =====
  if (currentStep === 'fluxo_1c_recomendacao_enterprise') {
    if (input === '1') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    if (input === '2') return result(MSG_ENVIAR_INFO_ENTERPRISE, 'encerrado')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 2 — AGUARDA NÚMERO =====
  if (currentStep === 'fluxo_2_aguarda_num') {
    const num = extractNumber(userMessage)
    if (num && num > 0) {
      lead.numProfissionais = num
      lead.planoIndicado = recomendarPlano(num)
      return result([
        `Perfeito! Pra você, o *${lead.planoIndicado}* já resolve tudo que precisa. 😄

Você também ganha *7 dias de teste grátis*, sem precisar de cartão de crédito.

O que prefere fazer?

✅ *1* — Quero testar grátis agora
💬 *2* — Tenho dúvidas, quero falar com alguém
❓ *3* — Quero ver as funcionalidades antes
🔙 *0* — Voltar ao menu principal`
      ], 'fluxo_2_recomendacao')
    }
    return result([`Não entendi. *Quantos profissionais* atendem na sua clínica? (digite um número)`], currentStep)
  }

  // ===== STEP: FLUXO 2 RECOMENDAÇÃO =====
  if (currentStep === 'fluxo_2_recomendacao') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '2') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    if (input === '3') return result(MSG_FLUXO_4_FUNCIONALIDADES, 'fluxo_4_funcionalidades')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 3 DEMO =====
  if (currentStep === 'fluxo_3_demo') {
    if (input === 'a') {
      return result([
        `Perfeito! Vou te conectar com um especialista para agendar sua demonstração. 🤝

Antes de transferir, me conta rapidinho:

*Qual é o seu nome?*

🔙 *0* — Voltar ao menu principal`
      ], 'fluxo_5_aguarda_nome')
    }
    if (input === 'b') return result(MSG_TRIAL_DIRETO_FLUXO3, 'enviar_trial_fluxo3', { sendFollowUp: true })
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: ENVIAR TRIAL =====
  if (currentStep === 'enviar_trial') {
    if (input === '1' || input === '2') {
      return result(
        [`Entendido! Vou te transferir para um especialista que vai te ajudar. 🤝`],
        'transferred',
        { transfer: true, transferTag: 'suporte' }
      )
    }
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: TRIAL FOLLOWUP (após 30s) =====
  if (currentStep === 'trial_followup') {
    if (input === '1' || input === '2') {
      return result(
        [`Entendido! Vou te transferir para um especialista. 🤝`],
        'transferred',
        { transfer: true, transferTag: 'suporte' }
      )
    }
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 4 FUNCIONALIDADES =====
  if (currentStep === 'fluxo_4_funcionalidades') {
    const funcMap: Record<string, string[]> = {
      'a': MSG_FUNC_4A, 'b': MSG_FUNC_4B, 'c': MSG_FUNC_4C,
      'd': MSG_FUNC_4D, 'e': MSG_FUNC_4E, 'f': MSG_FUNC_4F,
      'g': MSG_FUNC_4G, 'h': MSG_FUNC_4H,
    }
    if (funcMap[input]) {
      return result(funcMap[input], 'func_detail')
    }
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: DETALHE DE FUNCIONALIDADE (footer 1/2/3) =====
  if (currentStep === 'func_detail') {
    if (input === '1') return result(MSG_FLUXO_4_FUNCIONALIDADES, 'fluxo_4_funcionalidades')
    if (input === '2') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '3') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 5 — COLETA NOME =====
  if (currentStep === 'fluxo_5_aguarda_nome') {
    if (userMessage.trim().length < 2) {
      return result([`Por favor, me diga seu *nome* para que eu possa te apresentar ao especialista. 😊`], currentStep)
    }
    lead.nome = userMessage.trim()
    return result(MSG_FLUXO_5_CLINICA, 'fluxo_5_aguarda_clinica')
  }

  // ===== STEP: FLUXO 5 — COLETA CLÍNICA =====
  if (currentStep === 'fluxo_5_aguarda_clinica') {
    if (userMessage.trim().length < 2) {
      return result([`Qual é o *nome da sua clínica?*`], currentStep)
    }
    lead.clinica = userMessage.trim()
    return result(MSG_FLUXO_5_NUM, 'fluxo_5_aguarda_num')
  }

  // ===== STEP: FLUXO 5 — COLETA NÚMERO =====
  if (currentStep === 'fluxo_5_aguarda_num') {
    const num = extractNumber(userMessage)
    if (num && num > 0) {
      lead.numProfissionais = num
      lead.planoIndicado = recomendarPlano(num)
      return result(MSG_FLUXO_5_DOR, 'fluxo_5_aguarda_dor')
    }
    return result([`Quantos profissionais atendem na clínica? (digite um número)`], currentStep)
  }

  // ===== STEP: FLUXO 5 — COLETA DOR =====
  if (currentStep === 'fluxo_5_aguarda_dor') {
    const dorKey = input.charAt(0)
    let dorText = ''
    let explicacaoDor = ''

    if (DOR_MAP[dorKey]) {
      dorText = DOR_MAP[dorKey]
      lead.dorPrincipal = dorText

      if (dorKey === 'e') {
        return result(MSG_FLUXO_5_OUTRO_ASSUNTO, 'fluxo_5_outro_assunto')
      }

      // Mapear explicação específica para a dor selecionada (sem rodapés de menu)
      const cleanFooter = `\n\n🔁 *1* — Ver outra funcionalidade\n🚀 *2* — Testar grátis agora\n💬 *3* — Falar com especialista`
      if (dorKey === 'a') explicacaoDor = MSG_FUNC_4A[0].replace(cleanFooter, '')
      if (dorKey === 'b') explicacaoDor = MSG_FUNC_4C[0].replace(cleanFooter, '')
      if (dorKey === 'c') explicacaoDor = MSG_FUNC_4B[0].replace(cleanFooter, '')
      if (dorKey === 'd') explicacaoDor = MSG_FUNC_4F[0].replace(cleanFooter, '')
    } else {
      lead.dorPrincipal = userMessage.trim()
    }

    // Montar array de mensagens sequenciais
    const responseMessages: string[] = []
    if (explicacaoDor) {
      responseMessages.push(explicacaoDor)
    }
    responseMessages.push(...buildHandoffMessage(lead))

    // HANDOFF
    return result(
      responseMessages,
      'transferred',
      { transfer: true, transferTag: 'vendas', leadToSave: lead }
    )
  }

  // ===== STEP: OBJEÇÃO PREÇO =====
  if (currentStep === 'objecao_preco') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '2') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: OBJEÇÃO LGPD =====
  if (currentStep === 'objecao_lgpd') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '2') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    if (input === '3') return result(MSG_MENU, 'menu')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: ENVIAR TRIAL FLUXO 3 =====
  if (currentStep === 'enviar_trial_fluxo3') {
    if (input === '1' || input === '2') {
      return result(
        [`Entendido! Vou te transferir para um especialista que vai te ajudar. 🤝`],
        'transferred',
        { transfer: true, transferTag: 'suporte' }
      )
    }
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 5 — OUTRO ASSUNTO =====
  if (currentStep === 'fluxo_5_outro_assunto') {
    lead.dorPrincipal = `Outro: ${userMessage.trim()}`
    return result(MSG_FLUXO_5_OUTRO_ASSUNTO_CONFIRMACAO, 'fluxo_5_outro_assunto_confirmacao')
  }

  // ===== STEP: FLUXO 5 — OUTRO ASSUNTO CONFIRMAÇÃO =====
  if (currentStep === 'fluxo_5_outro_assunto_confirmacao') {
    if (input === '1') {
      return result(
        buildHandoffMessage(lead),
        'transferred',
        { transfer: true, transferTag: 'vendas', leadToSave: lead }
      )
    }
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: RECUPERACAO 24H =====
  if (currentStep === 'recuperacao_24h') {
    if (input === '1') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    if (input === '2') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '0') return result(MSG_MENU, 'menu')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: ENCERRADO / TRANSFERRED =====
  if (currentStep === 'encerrado' || currentStep === 'transferred') {
    // Sessão encerrada — reenviar menu para nova interação
    return result(MSG_MENU, 'menu')
  }

  // ===== FALLBACK: Step desconhecido → menu =====
  return result(MSG_MENU, 'menu')
}

// ========== HANDLER DE INTENÇÃO OU REENVIAR MENU ==========

function handleIntentOrResentMenu(
  state: ConversationState,
  userMessage: string,
): EngineResult {
  const intent = detectIntent(userMessage)
  const lead = { ...state.leadData }
  const input = normalizeInput(userMessage)

  // Se for uma saudação comum livre
  const saudacoes = ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'opa', 'eae', 'hello', 'hi']
  if (saudacoes.includes(input)) {
    return {
      messages: MSG_SAUDACAO_ACOLHIMENTO,
      newState: { step: 'menu', leadData: lead },
      transfer: false
    }
  }

  if (intent === 'jaECliente') {
    return {
      messages: [`Que bom que você já é nosso cliente! 💙 Vou te transferir para o suporte. Um momento...`],
      newState: { step: 'transferred', leadData: lead },
      transfer: true,
      transferTag: 'suporte_cliente',
    }
  }

  if (intent === 'objecaoPreco') {
    return {
      messages: MSG_OBJECAO_PRECO,
      newState: { step: 'objecao_preco', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'objecaoLGPD') {
    return {
      messages: MSG_OBJECAO_LGPD,
      newState: { step: 'objecao_lgpd', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'querComprar') {
    return {
      messages: MSG_FLUXO_5_NOME,
      newState: { step: 'fluxo_5_aguarda_nome', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'querDemo') {
    return {
      messages: MSG_FLUXO_3_DEMO,
      newState: { step: 'fluxo_3_demo', leadData: lead },
      transfer: false,
    }
  }

  // Nenhuma intenção detectada → usar AI como fallback
  // Retornamos null-like para sinalizar à route que deve chamar a IA
  return {
    messages: [], // vazio = sinal para a route chamar IA
    newState: state,
    transfer: false,
  }
}

// ========== MENSAGEM DE INATIVIDADE ==========

export function getInactivityMessage(): string[] {
  return MSG_INATIVIDADE
}

// ========== MENSAGEM DE FOLLOW-UP TRIAL ==========

export function getTrialFollowUpMessage(): string[] {
  return MSG_TRIAL_FOLLOWUP
}
