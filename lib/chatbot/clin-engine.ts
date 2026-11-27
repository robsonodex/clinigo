/**
 * Clin Chatbot 2.0 — Motor de Estados Determinístico
 *
 * Processa mensagens do usuário com base no estado atual da conversa.
 * Retorna respostas determinísticas (sem IA) para fluxos estruturados,
 * conta encerrada/nova contratação, simulador de ROI e intenções de clínicas
 * de terapias multidisciplinares. IA (cascata gratuita) atua no fallback aberto.
 */

import {
  MSG_MENU, MSG_FLUXO_1_INTRO, MSG_FLUXO_1A_SOLO, MSG_FLUXO_1B_EQUIPE,
  MSG_FLUXO_1C_REDE, MSG_FLUXO_1C_RECOMENDACAO_ENTERPRISE,
  MSG_FLUXO_2_PLANOS, MSG_FLUXO_3_DEMO, MSG_ENVIAR_TRIAL, MSG_TRIAL_FOLLOWUP,
  MSG_FLUXO_4_FUNCIONALIDADES, MSG_FUNC_FOOTER, MSG_FUNC_4A, MSG_FUNC_4B, MSG_FUNC_4C,
  MSG_FUNC_4D, MSG_FUNC_4E, MSG_FUNC_4F, MSG_FUNC_4G, MSG_FUNC_4H,
  MSG_INTENT_ABA, MSG_INTENT_PSICO, MSG_INTENT_TERAPIAS_ESPEC,
  MSG_INTENT_TISS_BIOMETRIA, MSG_INTENT_TELECONSULTA,
  MSG_INTENT_CLINIGO_IA, MSG_INTENT_FAMILIA, MSG_INTENT_MIGRACAO,
  MSG_INTENT_CONTRATO_IMPLANTACAO,
  MSG_ROI_PERGUNTA_NUM, buildRoiCalculationMessage,
  MSG_FLUXO_5_NOME, MSG_FLUXO_5_CLINICA, MSG_FLUXO_5_NUM, MSG_FLUXO_5_DOR,
  MSG_OBJECAO_PRECO, MSG_OBJECAO_LGPD, MSG_INATIVIDADE,
  MSG_ENVIAR_INFO_ENTERPRISE, DOR_MAP,
  MSG_SAUDACAO_ACOLHIMENTO,
  MSG_TRIAL_DIRETO_FLUXO3, MSG_FLUXO_5_OUTRO_ASSUNTO,
  MSG_FLUXO_5_OUTRO_ASSUNTO_CONFIRMACAO,
  MSG_CONTA_ENCERRADA_INTRO, MSG_CONTA_ENCERRADA_RESPONSAVEL, buildContaEncerradaHandoff,
  MSG_FLUXO_6_BLOQUEIO_MENU, MSG_FLUXO_6_PROBLEMA_ACESSO,
  MSG_FLUXO_6_MOTIVO_BLOQUEIO, MSG_FLUXO_6_GESTOR_FINANCEIRO,
  MSG_FLUXO_6_TRANSFERENCIA_FINANCEIRO,
} from './clin-messages'

// ========== TYPES ==========

export interface LeadData {
  nome?: string
  clinica?: string
  cargo?: string
  numProfissionais?: number
  dorPrincipal?: string
  planoIndicado?: string
  telefone?: string
  hotAlertSent?: boolean
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
  pauseHours?: number // Para silenciar o bot após handoff sensível
}

// ========== RECOMENDAÇÃO DE PLANO ==========

export function recomendarPlano(numProfissionais: number): string {
  if (numProfissionais === 1) return 'Básico (R$ 149/mês — 1 licença)'
  if (numProfissionais <= 5) return 'Avançado (R$ 249/mês — até 5 licenças)'
  if (numProfissionais <= 30) return 'Professional (R$ 449/mês — até 30 licenças)'
  const extras = numProfissionais - 30
  return `Professional (R$ 449/mês — 30 licenças + ${extras} licenças extras a R$ 49,90/mês)`
}

// ========== DETECÇÃO DE INTENÇÃO POR KEYWORDS ==========

export type IntentType =
  | 'contaEncerrada'
  | 'acessoBloqueado'
  | 'jaECliente'
  | 'simuladorRoi'
  | 'clinigoIA'
  | 'clinigoFamilia'
  | 'especialidadeAba'
  | 'especialidadePsico'
  | 'tissBiometria'
  | 'especialidadeTerapias'
  | 'teleconsulta'
  | 'migracao'
  | 'contratoImplantacao'
  | 'objecaoPreco'
  | 'objecaoLGPD'
  | 'querComprar'
  | 'querDemo'
  | null

const INTENCOES: { type: IntentType; keywords: string[] }[] = [
  {
    // PRIORIDADE #1: Conta encerrada / recontratação (nunca confundir com inadimplência!)
    type: 'contaEncerrada',
    keywords: [
      'conta encerrada', 'foi encerrada', 'conta no clinigo foi encerrada',
      'nova contratação', 'nova contratacao', 'recontratação', 'recontratacao',
      'reativar conta', 'reativar clínica', 'reativar clinica',
      'voltar a usar', 'voltar para o clinigo', 'voltar pro clinigo',
      'novo contrato', 'encerramento definitivo', 'conta cancelada',
    ],
  },
  {
    type: 'acessoBloqueado',
    keywords: [
      'bloqueado', 'bloqueada', 'bloqueio', 'desbloqueio', 'desbloquear',
      'suspenso', 'suspensa', 'suspensão', 'suspensao',
      'problema de acesso', 'problemas de acesso', 'erro de acesso',
      'não consigo entrar', 'nao consigo entrar', 'não consigo acessar', 'nao consigo acessar',
      'conta inativa', 'acesso restrito', 'mensalidade atrasada', 'inadimplência', 'inadimplencia',
      'sistema bloqueado', 'clínica suspensa', 'clinica suspensa',
    ],
  },
  {
    type: 'jaECliente',
    keywords: ['já sou cliente', 'ja sou cliente', 'tenho conta', 'minha conta', 'já uso', 'ja uso'],
  },
  {
    type: 'simuladorRoi',
    keywords: [
      'roi', 'simular economia', 'calcular economia', 'quanto economizo',
      'vale a pena', 'retorno financeiro', 'simulador',
    ],
  },
  {
    type: 'clinigoIA',
    keywords: [
      'inteligência artificial', 'inteligencia artificial', 'clinigo ia',
      'laudo automático', 'laudo automatico', 'estruturar evolução', 'estruturar evolucao',
      'carta ans', 'tem ia', 'usa ia',
    ],
  },
  {
    type: 'clinigoFamilia',
    keywords: [
      'portal dos pais', 'portal da família', 'portal da familia', 'clinigo família', 'clinigo familia',
      'acompanhamento dos pais', 'boletim dos pais', 'atividades em casa', 'mural de conquistas',
      'pais conseguem ver', 'família consegue ver', 'familia consegue ver',
    ],
  },
  {
    type: 'especialidadeAba',
    keywords: [
      'aba', 'autismo', 'tea', 'neurodesenvolvimento', 'folha de tentativas', 'modo tatame', 'tatame',
      'dtt', 'curva de aprendizagem', 'curvas aba', 'mesa de supervisão', 'mesa de supervisao',
      'nível de ajuda', 'nivel de ajuda', 'pareamento', 'intervenção precoce', 'intervencao precoce',
    ],
  },
  {
    type: 'especialidadePsico',
    keywords: ['psicolog', 'crp', 'psicoterapia', 'prontuário psicologia', 'prontuario psicologia', 'soap'],
  },
  {
    type: 'tissBiometria',
    keywords: [
      'tiss', 'glosa', 'glosas', 'convênio', 'convenio', 'convênios', 'convenios',
      'xml ans', 'lote xml', 'biometria', 'reconhecimento facial', 'check-in facial', 'checkin facial',
      'totem', 'dossiê', 'dossie', 'renovação de convênio', 'renovacao de convenio',
    ],
  },
  {
    type: 'especialidadeTerapias',
    keywords: [
      'fono', 'crfa', 'terapia ocupacional', 'sala sensorial', 'integração sensorial', 'integracao sensorial',
      'psicomotricidade', 'fisioterapia', 'crefito', 'co-terapia', 'coterapia', 'multidisciplinar',
    ],
  },
  {
    type: 'teleconsulta',
    keywords: ['teleconsulta', 'atendimento online', 'videochamada', 'webrtc', 'sessão online', 'sessao online'],
  },
  {
    type: 'migracao',
    keywords: [
      'migração', 'migracao', 'migrar', 'importar pacientes', 'importação', 'importacao',
      'planilha', 'trocar de sistema', 'treinamento', 'academy',
    ],
  },
  {
    type: 'contratoImplantacao',
    keywords: [
      'fidelidade', 'contrato anual', 'taxa de implantação', 'taxa de implantacao',
      'implantação', 'implantacao', 'licença extra', 'licenca extra', 'unidades', 'filial',
    ],
  },
  {
    type: 'objecaoPreco',
    keywords: ['caro', 'preço alto', 'preco alto', 'muito caro', 'vou pensar', 'depois vejo'],
  },
  {
    type: 'objecaoLGPD',
    keywords: ['seguro', 'lgpd', 'privacidade', 'segurança', 'seguranca', 'vazamento', 'sigilo', 'rbac', 'rls'],
  },
  {
    type: 'querComprar',
    keywords: ['quero comprar', 'quero assinar', 'quero contratar', 'vou fechar', 'quanto custa', 'qual o valor', 'preço', 'preco', 'planos'],
  },
  {
    type: 'querDemo',
    keywords: ['demonstração', 'demonstracao', 'demo', 'ver o sistema', 'ver funcionando', 'testar', 'teste grátis', 'teste gratis'],
  },
]

const WHOLE_WORD_KEYWORDS = new Set(['aba', 'tea', 'crp', 'tiss', 'rls', 'rbac', 'demo', 'roi', 'dtt'])

export function detectIntent(text: string): IntentType {
  const lower = text.toLowerCase().trim()
  for (const { type, keywords } of INTENCOES) {
    if (keywords.some((k) => {
      if (WHOLE_WORD_KEYWORDS.has(k)) {
        const re = new RegExp(`(^|[^a-zà-ú])${k}([^a-zà-ú]|$)`, 'i')
        return re.test(lower)
      }
      return lower.includes(k)
    })) {
      return type
    }
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
    `Perfeito! Aqui está o resumo que estou repassando para nosso especialista:

------------------
*Nome:* ${lead.nome || 'Não informado'}
*Clínica:* ${lead.clinica || 'Não informada'}
*Equipe:* ${lead.numProfissionais || '?'} profissional(is)
*Plano indicado:* ${lead.planoIndicado || 'A definir'}
*Prioridade:* ${dorText}
------------------

*${lead.nome || 'Olá'}*, em instantes um especialista humano do CliniGo vai assumir esta conversa para alinhar os detalhes da sua clínica de terapias.

Se quiser adiantar, você também pode explorar o comparativo técnico em https://clinigo.app/comparativo ou criar sua conta de teste de 7 dias em https://clinigo.app/trial.

------------------
*TRANSFERINDO PARA ESPECIALISTA...*
------------------`,
  ]
}

// ========== GERAR MENSAGEM DE RECOMENDAÇÃO ==========

function buildRecomendacao(num: number, plano: string): string[] {
  return [
    `Para *${num} ${num > 1 ? 'profissionais' : 'profissional'}*, o plano indicado é o *${plano}*.

Todas as assinaturas atendem 1 unidade operacional, com capacitação digital pelo Guia de Uso Integrado e CliniGo Academy, e possibilidade de adicionar licenças extras a R$ 49,90/mês quando a equipe crescer.

Como prefere seguir?

*1* — Testar grátis agora (7 dias sem cartão)
*2* — Simular economia (ROI) para minha equipe
*3* — Falar com um especialista para tirar dúvidas
*0* — Voltar ao menu principal`,
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
    pauseHours: extra?.pauseHours,
  })

  // SE DIGITAR 0, VOLTAR, MENU OU REINICIAR -> MOSTRAR MENU PRINCIPAL INSTANTANEAMENTE
  if (input === '0' || input === 'voltar' || input === 'menu' || input === 'reiniciar') {
    return result(MSG_MENU, 'menu')
  }

  const isPureGreeting = (raw: string): boolean => {
    const cleaned = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return /^(oi|ola|opa|bom dia|boa tarde|boa noite|tudo bem|td bem|tudo bom|alo|hello|hi)(\s+(tudo bem|td bem|tudo bom|como vai|pessoal|equipe|clinigo))?$/.test(
      cleaned
    )
  }

  // ===== STEP ATIVO: FLUXO CONTA ENCERRADA / NOVA CONTRATAÇÃO =====
  if (currentStep === 'fluxo_encerrada_clinica') {
    if (userMessage.trim().length < 2 || isPureGreeting(userMessage)) {
      return result(
        [`Olá! Para localizarmos o histórico da conta encerrada e encaminhar à administração comercial, informe por gentileza o *nome da clínica*.`],
        currentStep
      )
    }
    lead.clinica = userMessage.trim()
    lead.dorPrincipal = 'Avaliação de nova contratação (conta encerrada)'
    return result(MSG_CONTA_ENCERRADA_RESPONSAVEL, 'fluxo_encerrada_responsavel', { leadToSave: lead })
  }

  if (currentStep === 'fluxo_encerrada_responsavel') {
    if (userMessage.trim().length < 2 || isPureGreeting(userMessage)) {
      return result(
        [`Informe por gentileza o *seu nome completo* e a sua *função ou cargo* na clínica (ex.: Diretora, Sócia, Administradora).`],
        currentStep
      )
    }
    lead.nome = userMessage.trim()
    lead.cargo = userMessage.trim()
    lead.dorPrincipal = 'Avaliação de nova contratação (conta encerrada)'
    return result(
      buildContaEncerradaHandoff(lead.clinica || 'Não informada', userMessage.trim()),
      'transferred',
      {
        transfer: true,
        transferTag: 'nova_contratacao_encerrada',
        leadToSave: lead,
        pauseHours: 24,
      }
    )
  }

  // PRIORIDADE #1 GLOBAL: Conta encerrada / nova contratação (SEMPRE antes de bloqueio/inadimplência e saudações!)
  if (detectIntent(userMessage) === 'contaEncerrada') {
    lead.dorPrincipal = 'Avaliação de nova contratação (conta encerrada)'
    return result(MSG_CONTA_ENCERRADA_INTRO, 'fluxo_encerrada_clinica', { leadToSave: lead })
  }

  // PRIORIDADE #2 GLOBAL: Detecção de bloqueio, suspensão ou problema de acesso
  if (
    detectIntent(userMessage) === 'acessoBloqueado' &&
    currentStep !== 'fluxo_6_bloqueio' &&
    currentStep !== 'fluxo_6_gestor'
  ) {
    return result(MSG_FLUXO_6_BLOQUEIO_MENU, 'fluxo_6_bloqueio')
  }

  const isGreeting =
    input === 'oi' || input === 'olá' || input === 'ola' ||
    input.startsWith('bom dia') || input.startsWith('boa tarde') || input.startsWith('boa noite') ||
    input === 'iniciar' || input === 'start' || input === 'ajuda' || input === 'hey' || input === 'hello' || input === 'salve'

  if (isGreeting) {
    return result(MSG_MENU, 'menu')
  }

  // ===== STEP: MENU =====
  if (currentStep === 'menu' || currentStep === 'initial') {
    if (input === '1') return result(MSG_FLUXO_1_INTRO, 'fluxo_1_intro')
    if (input === '2') return result(MSG_FLUXO_2_PLANOS, 'fluxo_2_aguarda_num')
    if (input === '3') return result(MSG_FLUXO_3_DEMO, 'fluxo_3_demo')
    if (input === '4') return result(MSG_FLUXO_4_FUNCIONALIDADES, 'fluxo_4_funcionalidades')
    if (input === '5') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    if (input === '6') return result(MSG_FLUXO_6_BLOQUEIO_MENU, 'fluxo_6_bloqueio')

    // Frases padrão vindas dos botões do site, Google e links wa.me
    if (
      input.includes('gostaria de saber mais sobre o clinigo') ||
      input.includes('gostaria de conhecer o clinigo') ||
      input.includes('vim do chat do site') ||
      input.includes('vim do site clinigo') ||
      input.includes('gostaria de falar com um especialista') ||
      input.includes('quero saber mais sobre o clinigo')
    ) {
      return result(MSG_MENU, 'menu')
    }

    // Pergunta direta sobre o que a empresa faz
    if (
      input.includes('qual servico voces realizam') ||
      input.includes('qual serviço vocês realizam') ||
      input.includes('o que voces fazem') ||
      input.includes('o que vocês fazem') ||
      input.includes('como funciona o clinigo')
    ) {
      return result(MSG_FLUXO_1_INTRO, 'fluxo_1_intro')
    }

    // Não reconheceu → tentar intenção
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: RESPOSTA DE INTENÇÃO POR ESPECIALIDADE / MÓDULO =====
  if (currentStep === 'intent_response') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '2') return result(MSG_FLUXO_2_PLANOS, 'fluxo_2_aguarda_num')
    if (input === '3') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: SIMULADOR DE ROI =====
  if (currentStep === 'fluxo_roi_aguarda_num') {
    const num = extractNumber(userMessage)
    if (num && num > 0) {
      lead.numProfissionais = num
      lead.planoIndicado = recomendarPlano(num)
      return result(buildRoiCalculationMessage(num, lead.planoIndicado), 'fluxo_roi_resultado', {
        leadToSave: lead,
      })
    }
    return result([`Não identifiquei o número. *Quantos profissionais* atendem na sua clínica hoje? (digite apenas o número)`], currentStep)
  }

  if (currentStep === 'fluxo_roi_resultado') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true, leadToSave: lead })
    if (input === '2') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 1 INTRO (perfil) =====
  if (currentStep === 'fluxo_1_intro') {
    if (input === 'a') return result(MSG_FLUXO_1A_SOLO, 'fluxo_1a_solo')
    if (input === 'b') return result(MSG_FLUXO_1B_EQUIPE, 'fluxo_1b_aguarda_num')
    if (input === 'c') return result(MSG_FLUXO_1C_REDE, 'fluxo_1c_aguarda_resposta')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 1A SOLO (opções 1/2/0) =====
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
      return result(buildRecomendacao(num, lead.planoIndicado), 'fluxo_1b_recomendacao', {
        leadToSave: lead,
      })
    }
    return result([`Não consegui identificar o número. *Quantos profissionais* atendem na sua clínica hoje? (digite apenas o número)`], currentStep)
  }

  // ===== STEP: FLUXO 1B RECOMENDAÇÃO =====
  if (currentStep === 'fluxo_1b_recomendacao') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true, leadToSave: lead })
    if (input === '2') {
      const n = lead.numProfissionais || 5
      return result(buildRoiCalculationMessage(n, lead.planoIndicado || recomendarPlano(n)), 'fluxo_roi_resultado', {
        leadToSave: lead,
      })
    }
    if (input === '3') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 1C — AGUARDA RESPOSTA =====
  if (currentStep === 'fluxo_1c_aguarda_resposta') {
    const num = extractNumber(userMessage)
    if (num && num > 0) {
      lead.numProfissionais = num
      lead.planoIndicado = recomendarPlano(num)
      return result(buildRecomendacao(num, lead.planoIndicado), 'fluxo_1b_recomendacao', {
        leadToSave: lead,
      })
    }
    return result(MSG_FLUXO_1C_RECOMENDACAO_ENTERPRISE, 'fluxo_1c_recomendacao_enterprise')
  }

  // ===== STEP: FLUXO 1C RECOMENDAÇÃO =====
  if (currentStep === 'fluxo_1c_recomendacao_enterprise') {
    if (input === '1') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    if (input === '2') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 2 — AGUARDA NÚMERO =====
  if (currentStep === 'fluxo_2_aguarda_num') {
    const num = extractNumber(userMessage)
    if (num && num > 0) {
      lead.numProfissionais = num
      lead.planoIndicado = recomendarPlano(num)
      return result([
        `Perfeito! Para *${num} ${num > 1 ? 'profissionais' : 'profissional'}*, o plano indicado é o *${lead.planoIndicado}*.

Você também tem *7 dias de teste gratuito*, sem precisar de cartão de crédito.

Como prefere seguir?

*1* — Quero testar grátis agora
*2* — Simular economia (ROI) para minha equipe
*3* — Tenho dúvidas, quero falar com um especialista
*4* — Quero conhecer os módulos antes
*0* — Voltar ao menu principal`,
      ], 'fluxo_2_recomendacao', { leadToSave: lead })
    }
    return result([`Não identifiquei o número. *Quantos profissionais* atendem na sua clínica hoje? (digite um número)`], currentStep)
  }

  // ===== STEP: FLUXO 2 RECOMENDAÇÃO =====
  if (currentStep === 'fluxo_2_recomendacao') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true, leadToSave: lead })
    if (input === '2') {
      const n = lead.numProfissionais || 5
      return result(buildRoiCalculationMessage(n, lead.planoIndicado || recomendarPlano(n)), 'fluxo_roi_resultado', {
        leadToSave: lead,
      })
    }
    if (input === '3') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    if (input === '4') return result(MSG_FLUXO_4_FUNCIONALIDADES, 'fluxo_4_funcionalidades')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 3 DEMO =====
  if (currentStep === 'fluxo_3_demo') {
    if (input === 'a') {
      return result([
        `Perfeito! Vou conectar você com um especialista para apresentar o CliniGo para a sua clínica de terapias.

Antes de transferir, me informe rapidamente:

*Qual é o seu nome?*

*0* — Voltar ao menu principal`,
      ], 'fluxo_5_aguarda_nome')
    }
    if (input === 'b') return result(MSG_TRIAL_DIRETO_FLUXO3, 'enviar_trial_fluxo3', { sendFollowUp: true })
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: ENVIAR TRIAL =====
  if (currentStep === 'enviar_trial') {
    if (input === '1' || input === '2') {
      return result(
        [`Entendido! Estou transferindo você para um especialista da equipe CliniGo que vai te auxiliar agora.`],
        'transferred',
        { transfer: true, transferTag: 'suporte', leadToSave: lead }
      )
    }
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: TRIAL FOLLOWUP (após 30s) =====
  if (currentStep === 'trial_followup') {
    if (input === '1' || input === '2') {
      return result(
        [`Entendido! Estou transferindo você para um especialista da nossa equipe.`],
        'transferred',
        { transfer: true, transferTag: 'suporte', leadToSave: lead }
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

  // ===== STEP: DETALHE DE FUNCIONALIDADE (footer 1/2/3/0) =====
  if (currentStep === 'func_detail') {
    if (input === '1') return result(MSG_FLUXO_4_FUNCIONALIDADES, 'fluxo_4_funcionalidades')
    if (input === '2') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '3') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 5 — COLETA NOME =====
  if (currentStep === 'fluxo_5_aguarda_nome') {
    if (userMessage.trim().length < 2) {
      return result([`Por favor, informe seu *nome* para que eu possa te apresentar ao especialista.`], currentStep)
    }
    lead.nome = userMessage.trim()
    return result(MSG_FLUXO_5_CLINICA, 'fluxo_5_aguarda_clinica', { leadToSave: lead })
  }

  // ===== STEP: FLUXO 5 — COLETA CLÍNICA =====
  if (currentStep === 'fluxo_5_aguarda_clinica') {
    if (userMessage.trim().length < 2) {
      return result([`Qual é o *nome da sua clínica ou consultório?*`], currentStep)
    }
    lead.clinica = userMessage.trim()
    return result(MSG_FLUXO_5_NUM, 'fluxo_5_aguarda_num', { leadToSave: lead })
  }

  // ===== STEP: FLUXO 5 — COLETA NÚMERO =====
  if (currentStep === 'fluxo_5_aguarda_num') {
    const num = extractNumber(userMessage)
    if (num && num > 0) {
      lead.numProfissionais = num
      lead.planoIndicado = recomendarPlano(num)
      return result(MSG_FLUXO_5_DOR, 'fluxo_5_aguarda_dor', { leadToSave: lead })
    }
    return result([`Quantos profissionais atendem na clínica? (digite um número)`], currentStep)
  }

  // ===== STEP: FLUXO 5 — COLETA DOR =====
  if (currentStep === 'fluxo_5_aguarda_dor') {
    const dorKey = input.charAt(0)
    let explicacaoDor = ''

    if (DOR_MAP[dorKey]) {
      lead.dorPrincipal = DOR_MAP[dorKey]

      if (dorKey === 'e') {
        return result(MSG_FLUXO_5_OUTRO_ASSUNTO, 'fluxo_5_outro_assunto', { leadToSave: lead })
      }

      if (dorKey === 'a') explicacaoDor = MSG_FUNC_4A[0].replace(MSG_FUNC_FOOTER, '')
      if (dorKey === 'b') explicacaoDor = MSG_FUNC_4B[0].replace(MSG_FUNC_FOOTER, '')
      if (dorKey === 'c') explicacaoDor = MSG_FUNC_4C[0].replace(MSG_FUNC_FOOTER, '')
      if (dorKey === 'd') explicacaoDor = MSG_FUNC_4F[0].replace(MSG_FUNC_FOOTER, '')
    } else {
      lead.dorPrincipal = userMessage.trim()
    }

    const cleanPhone = (lead.telefone || '').replace(/\D/g, '')
    const isPhoneValid = cleanPhone.length >= 12 && cleanPhone.length <= 13

    if (!isPhoneValid) {
      const responseMessages: string[] = []
      if (explicacaoDor) {
        responseMessages.push(explicacaoDor)
      }
      responseMessages.push(
        `Para que o nosso especialista entre em contato diretamente com você, *qual é o seu número de WhatsApp com DDD?* (ex: 21 99999-8888)`
      )
      return result(responseMessages, 'fluxo_5_aguarda_telefone', { leadToSave: lead })
    }

    const responseMessages: string[] = []
    if (explicacaoDor) {
      responseMessages.push(explicacaoDor)
    }
    responseMessages.push(...buildHandoffMessage(lead))

    return result(
      responseMessages,
      'transferred',
      { transfer: true, transferTag: 'vendas', leadToSave: lead }
    )
  }

  // ===== STEP: FLUXO 5 — COLETA TELEFONE =====
  if (currentStep === 'fluxo_5_aguarda_telefone') {
    let digits = userMessage.replace(/\D/g, '')
    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = `55${digits}`
    }

    if (digits.length >= 12 && digits.length <= 13) {
      lead.telefone = digits
      return result(
        buildHandoffMessage(lead),
        'transferred',
        { transfer: true, transferTag: 'vendas', leadToSave: lead }
      )
    }

    return result([`Por favor, digite seu *número de WhatsApp com DDD* completo (ex: 21 99999-8888) para conectar você ao especialista.`], currentStep)
  }

  // ===== STEP: OBJEÇÃO PREÇO =====
  if (currentStep === 'objecao_preco') {
    if (input === '1') return result(MSG_ENVIAR_TRIAL, 'enviar_trial', { sendFollowUp: true })
    if (input === '2') return result(MSG_ROI_PERGUNTA_NUM, 'fluxo_roi_aguarda_num')
    if (input === '3') return result(MSG_FLUXO_5_NOME, 'fluxo_5_aguarda_nome')
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
        [`Entendido! Estou transferindo você para um especialista da equipe CliniGo.`],
        'transferred',
        { transfer: true, transferTag: 'suporte', leadToSave: lead }
      )
    }
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 5 — OUTRO ASSUNTO =====
  if (currentStep === 'fluxo_5_outro_assunto') {
    lead.dorPrincipal = `Outro: ${userMessage.trim()}`
    return result(MSG_FLUXO_5_OUTRO_ASSUNTO_CONFIRMACAO, 'fluxo_5_outro_assunto_confirmacao', { leadToSave: lead })
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
    if (input === '3') return result(MSG_ROI_PERGUNTA_NUM, 'fluxo_roi_aguarda_num')
    if (input === '0') return result(MSG_MENU, 'menu')
    return handleIntentOrResentMenu(state, userMessage)
  }

  // ===== STEP: FLUXO 6 — PROBLEMA DE ACESSO / SUSPENSÃO / BLOQUEIO =====
  if (currentStep === 'fluxo_6_bloqueio') {
    if (input === '4' || input.includes('encerrad') || input.includes('nova contrat')) {
      lead.dorPrincipal = 'Avaliação de nova contratação (conta encerrada)'
      return result(MSG_CONTA_ENCERRADA_INTRO, 'fluxo_encerrada_clinica', { leadToSave: lead })
    }
    if (
      input === '1' ||
      input.includes('problema de acesso') ||
      input.includes('nao consigo entrar') ||
      input.includes('não consigo entrar') ||
      input.includes('profissional') ||
      input.includes('terapeuta') ||
      input.includes('equipe')
    ) {
      return result(MSG_FLUXO_6_PROBLEMA_ACESSO, 'fluxo_6_bloqueio')
    }
    if (
      input === '2' ||
      input.includes('suspens') ||
      input.includes('bloque') ||
      input.includes('motivo')
    ) {
      return result(MSG_FLUXO_6_MOTIVO_BLOQUEIO, 'fluxo_6_bloqueio')
    }
    if (
      input === '3' ||
      input.includes('gestor') ||
      input.includes('direcao') ||
      input.includes('direção') ||
      input.includes('financeiro') ||
      input.includes('regularizar') ||
      input.includes('pagar') ||
      input.includes('quitar')
    ) {
      return result(MSG_FLUXO_6_GESTOR_FINANCEIRO, 'fluxo_6_gestor')
    }
    return result(MSG_FLUXO_6_BLOQUEIO_MENU, 'fluxo_6_bloqueio')
  }

  // ===== STEP: FLUXO 6 — GESTOR / FINANCEIRO =====
  if (currentStep === 'fluxo_6_gestor') {
    if (input === '4' || input.includes('encerrad') || input.includes('nova contrat')) {
      lead.dorPrincipal = 'Avaliação de nova contratação (conta encerrada)'
      return result(MSG_CONTA_ENCERRADA_INTRO, 'fluxo_encerrada_clinica', { leadToSave: lead })
    }
    if (input === '1' || input.includes('sim') || input.includes('pagar') || input.includes('financeiro') || input.includes('regularizar')) {
      return result(
        MSG_FLUXO_6_TRANSFERENCIA_FINANCEIRO,
        'transferred',
        { transfer: true, transferTag: 'financeiro_desbloqueio', leadToSave: lead }
      )
    }
    if (input === '2') {
      return result(MSG_FLUXO_6_MOTIVO_BLOQUEIO, 'fluxo_6_bloqueio')
    }
    return result(MSG_FLUXO_6_GESTOR_FINANCEIRO, 'fluxo_6_gestor')
  }

  // ===== STEP: ENCERRADO / TRANSFERRED =====
  if (currentStep === 'encerrado' || currentStep === 'transferred') {
    return result(MSG_MENU, 'menu')
  }

  // ===== FALLBACK: Step desconhecido → menu =====
  return result(MSG_MENU, 'menu')
}

// ========== HANDLER DE INTENÇÃO OU FALLBACK IA ==========

function handleIntentOrResentMenu(
  state: ConversationState,
  userMessage: string,
): EngineResult {
  const intent = detectIntent(userMessage)
  const lead = { ...state.leadData }
  const input = normalizeInput(userMessage)

  if (intent === 'contaEncerrada') {
    lead.dorPrincipal = 'Avaliação de nova contratação (conta encerrada)'
    return {
      messages: MSG_CONTA_ENCERRADA_INTRO,
      newState: { step: 'fluxo_encerrada_clinica', leadData: lead },
      transfer: false,
      leadToSave: lead,
    }
  }

  if (intent === 'acessoBloqueado') {
    return {
      messages: MSG_FLUXO_6_BLOQUEIO_MENU,
      newState: { step: 'fluxo_6_bloqueio', leadData: lead },
      transfer: false,
    }
  }

  const saudacoes = ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'opa', 'eae', 'hello', 'hi']
  if (saudacoes.includes(input)) {
    return {
      messages: MSG_SAUDACAO_ACOLHIMENTO,
      newState: { step: 'menu', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'jaECliente') {
    return {
      messages: [`Ótimo saber que você já é cliente CliniGo! Estou transferindo seu atendimento para o suporte técnico. Um momento...`],
      newState: { step: 'transferred', leadData: lead },
      transfer: true,
      transferTag: 'suporte_cliente',
      leadToSave: lead,
    }
  }

  if (intent === 'simuladorRoi') {
    const num = extractNumber(userMessage)
    if (num && num > 0) {
      lead.numProfissionais = num
      lead.planoIndicado = recomendarPlano(num)
      return {
        messages: buildRoiCalculationMessage(num, lead.planoIndicado),
        newState: { step: 'fluxo_roi_resultado', leadData: lead },
        transfer: false,
        leadToSave: lead,
      }
    }
    return {
      messages: MSG_ROI_PERGUNTA_NUM,
      newState: { step: 'fluxo_roi_aguarda_num', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'clinigoIA') {
    return {
      messages: MSG_INTENT_CLINIGO_IA,
      newState: { step: 'intent_response', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'clinigoFamilia') {
    return {
      messages: MSG_INTENT_FAMILIA,
      newState: { step: 'intent_response', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'especialidadeAba') {
    return {
      messages: MSG_INTENT_ABA,
      newState: { step: 'intent_response', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'especialidadePsico') {
    return {
      messages: MSG_INTENT_PSICO,
      newState: { step: 'intent_response', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'tissBiometria') {
    return {
      messages: MSG_INTENT_TISS_BIOMETRIA,
      newState: { step: 'intent_response', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'especialidadeTerapias') {
    return {
      messages: MSG_INTENT_TERAPIAS_ESPEC,
      newState: { step: 'intent_response', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'teleconsulta') {
    return {
      messages: MSG_INTENT_TELECONSULTA,
      newState: { step: 'intent_response', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'migracao') {
    return {
      messages: MSG_INTENT_MIGRACAO,
      newState: { step: 'intent_response', leadData: lead },
      transfer: false,
    }
  }

  if (intent === 'contratoImplantacao') {
    return {
      messages: MSG_INTENT_CONTRATO_IMPLANTACAO,
      newState: { step: 'intent_response', leadData: lead },
      transfer: false,
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
      messages: MSG_FLUXO_2_PLANOS,
      newState: { step: 'fluxo_2_aguarda_num', leadData: lead },
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

  // Nenhuma intenção determinística → sinalizar à route para chamar IA fallback
  return {
    messages: [],
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

// Mantém compatibilidade de exportação caso algum consumidor externo importe
export { MSG_ENVIAR_INFO_ENTERPRISE }
