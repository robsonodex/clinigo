/**
 * WhatsApp Service — Baileys In-Process Integration
 *
 * Sessão WebSocket via @whiskeysockets/baileys, rodando dentro do Next.js.
 * Cada clínica tem sessão isolada (Map<clinicId, socket>).
 *
 * Auth state persistido em Supabase Storage + coluna session_data (JSONB).
 * NUNCA grava nada em disco — Railway não persiste filesystem.
 *
 * Funções exportadas (mesma interface pública que a versão Evolution):
 *   createInstanceAndGetQR(clinicId) → { qr_code, status, instance_name }
 *   checkInstanceStatus(clinicId)    → { connected, phone_number, status }
 *   sendWhatsAppMessage(clinicId, phone, message, triggerSource) → void
 *   disconnectInstance(clinicId)     → void
 */

import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  initAuthCreds,
  BufferJSON,
  proto,
  type ConnectionState,
  type WASocket,
  type AuthenticationState,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys'
import { createClient } from '@supabase/supabase-js'
import * as QRCode from 'qrcode'
import pino from 'pino'

// ========== LOGGER ==========
const logger = pino({ level: 'warn' })

// ========== SUPABASE ADMIN ==========

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const STORAGE_BUCKET = 'whatsapp-sessions'

// ========== CHATBOT CLIN — ID da sessão de vendas ==========
const CLIN_SESSION_ID = 'clin-sales-bot'

// ========== IN-MEMORY SESSION MAP ==========

const MAX_RECONNECT_ATTEMPTS = 3

interface ClinicSession {
  socket: WASocket | null
  qrCode: string | null       // base64 data URI do QR
  status: 'qr' | 'connecting' | 'open' | 'close'
  phoneNumber: string | null
  connectedAt: string | null
  authState: AuthenticationState | null
  reconnectAttempts: number
}

const sessions = new Map<string, ClinicSession>()

/** Gera chave composta: clinicId__sector */
function sessionKey(clinicId: string, sector: string = 'default'): string {
  return `${clinicId}__${sector}`
}

function getSession(clinicId: string, sector: string = 'default'): ClinicSession {
  const key = sessionKey(clinicId, sector)
  if (!sessions.has(key)) {
    sessions.set(key, {
      socket: null,
      qrCode: null,
      status: 'close',
      phoneNumber: null,
      connectedAt: null,
      authState: null,
      reconnectAttempts: 0,
    })
  }
  return sessions.get(key)!
}

// ========== SUPABASE STORAGE AUTH STATE ==========

/**
 * Carrega o auth state do Supabase Storage.
 * Retorna null se não existir.
 */
async function loadAuthStateFromStorage(clinicId: string, sector: string = 'default'): Promise<any | null> {
  const supabase = getSupabaseAdmin()
  const filePath = `${clinicId}/${sector}_auth_info.json`

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(filePath)

    if (error || !data) return null

    const text = await data.text()
    return JSON.parse(text, BufferJSON.reviver)
  } catch {
    return null
  }
}

/**
 * Salva o auth state no Supabase Storage.
 */
async function saveAuthStateToStorage(clinicId: string, state: any, sector: string = 'default'): Promise<void> {
  const supabase = getSupabaseAdmin()
  const filePath = `${clinicId}/${sector}_auth_info.json`

  try {
    const jsonStr = JSON.stringify(state, BufferJSON.replacer, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })

    // Upsert: remove e re-cria
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath])
    await supabase.storage.from(STORAGE_BUCKET).upload(filePath, blob, {
      contentType: 'application/json',
      upsert: true,
    })
  } catch (err) {
    console.error(`[WhatsApp] Erro ao salvar auth state (${clinicId}):`, err)
  }
}

/**
 * Remove o auth state do Supabase Storage.
 */
async function removeAuthStateFromStorage(clinicId: string, sector: string = 'default'): Promise<void> {
  const supabase = getSupabaseAdmin()
  const filePath = `${clinicId}/${sector}_auth_info.json`

  try {
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath])
  } catch { /* best effort */ }
}

// ========== CUSTOM IN-MEMORY AUTH STATE ==========

/**
 * Cria um auth state que vive 100% em memória.
 * Compatível com a interface que Baileys espera.
 */
function createInMemoryAuthState(existingState?: any): {
  state: AuthenticationState
  saveCreds: () => Promise<any>
} {
  // Se não há creds existentes, gerar credenciais iniciais com chaves criptográficas
  const creds = existingState?.creds || initAuthCreds()
  const keys: Record<string, Record<string, any>> = existingState?.keys || {}

  const state: AuthenticationState = {
    creds: creds as any,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const result: { [id: string]: SignalDataTypeMap[T] } = {}
        for (const id of ids) {
          if (keys[type]?.[id]) {
            result[id] = keys[type][id]
          }
        }
        return result
      },
      set: async (data: any) => {
        for (const category in data) {
          if (!keys[category]) keys[category] = {}
          for (const id in data[category]) {
            keys[category][id] = data[category][id]
          }
        }
      },
    },
  }

  const saveCreds = async () => {
    return { creds: state.creds, keys }
  }

  return { state, saveCreds }
}

// ========== CORE: INICIAR SESSÃO ==========

async function startBaileysSession(clinicId: string, sector: string = 'default'): Promise<void> {
  const session = getSession(clinicId, sector)

  // Se já existe um socket ativo, não recria
  if (session.socket && session.status === 'open') return
  if (session.socket && session.status === 'connecting') return

  session.status = 'connecting'

  // Tentar carregar auth state existente do Storage
  const existingAuth = await loadAuthStateFromStorage(clinicId, sector)
  const { state, saveCreds } = createInMemoryAuthState(existingAuth || undefined)

  session.authState = state

  try {
    const { version } = await fetchLatestBaileysVersion()

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger as any),
      },
      logger: logger as any,
      printQRInTerminal: false,
      browser: ['CliniGo', 'Chrome', '120.0.0'],
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
    })

    session.socket = socket

    // ===== EVENTOS =====

    // QR Code gerado
    socket.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        // Gerar QR como data URI base64
        try {
          const qrDataUri = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
          session.qrCode = qrDataUri
          session.status = 'qr'

          // Salvar QR no banco para o frontend pegar
          const supabase = getSupabaseAdmin()
          await supabase.from('whatsapp_sessions').upsert({
            clinic_id: clinicId,
            sector: sector,
            instance_name: `baileys_${clinicId.substring(0, 16)}_${sector}`,
            status: 'connecting',
            qr_code: qrDataUri,
            qr_code_expires_at: new Date(Date.now() + 45 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          } as any, { onConflict: 'clinic_id,sector' })
        } catch (err) {
          console.error('[WhatsApp] Erro ao gerar QR:', err)
        }
      }

      if (connection === 'open') {
        session.status = 'open'
        session.qrCode = null

        // Extrair número do telefone
        const me = socket.user
        const phoneNumber = me?.id?.split(':')[0] || me?.id?.split('@')[0] || null
        session.phoneNumber = phoneNumber
        session.connectedAt = new Date().toISOString()

        // Salvar auth state no Storage
        const authData = await saveCreds()
        await saveAuthStateToStorage(clinicId, authData, sector)

        // Atualizar banco
        const supabase = getSupabaseAdmin()
        await supabase.from('whatsapp_sessions').upsert({
          clinic_id: clinicId,
          sector: sector,
          instance_name: `baileys_${clinicId.substring(0, 16)}_${sector}`,
          status: 'connected',
          phone_number: phoneNumber,
          connected_at: new Date().toISOString(),
          qr_code: null,
          error_message: null,
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'clinic_id,sector' })

        console.log(`[WhatsApp] ✅ Clínica ${clinicId} conectada (${phoneNumber})`)
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        console.log(`[WhatsApp] Conexão fechada (${clinicId}), code=${statusCode}, reconnect=${shouldReconnect}`)

        session.socket = null
        session.qrCode = null

        if (shouldReconnect) {
          // Para o Clin bot: reconexão INFINITA (sessão eterna)
          // Para clínicas normais: limite de 3 tentativas
          const isClinBot = clinicId === CLIN_SESSION_ID
          const maxAttempts = isClinBot ? Infinity : MAX_RECONNECT_ATTEMPTS

          if (session.reconnectAttempts < maxAttempts) {
            session.reconnectAttempts++
            session.status = 'connecting'

            // Backoff exponencial: 3s, 6s, 12s, 24s, 30s (max)
            const delay = isClinBot
              ? Math.min(3000 * Math.pow(2, session.reconnectAttempts - 1), 30000)
              : 3000

            console.log(`[WhatsApp] 🔄 Reconexão ${session.reconnectAttempts}${isClinBot ? '/∞' : `/${MAX_RECONNECT_ATTEMPTS}`} em ${delay/1000}s (${clinicId}/${sector})`)
            setTimeout(() => startBaileysSession(clinicId, sector), delay)
          } else {
            console.log(`[WhatsApp] Máximo de reconexões atingido (${clinicId})`)
            session.status = 'close'
            session.phoneNumber = null
            session.connectedAt = null
            session.reconnectAttempts = 0
            await removeAuthStateFromStorage(clinicId, sector)

            const supabase = getSupabaseAdmin()
            await supabase.from('whatsapp_sessions').update({
              status: 'disconnected',
              disconnected_at: new Date().toISOString(),
              qr_code: null,
              phone_number: null,
              updated_at: new Date().toISOString(),
            }).eq('clinic_id', clinicId).eq('sector', sector)
          }
        } else {
          // Logout explícito (desconectou do celular) — limpar tudo
          session.status = 'close'
          session.phoneNumber = null
          session.connectedAt = null
          session.reconnectAttempts = 0
          await removeAuthStateFromStorage(clinicId, sector)

          const supabase = getSupabaseAdmin()
          await supabase.from('whatsapp_sessions').update({
            status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            qr_code: null,
            phone_number: null,
            updated_at: new Date().toISOString(),
          }).eq('clinic_id', clinicId).eq('sector', sector)
        }
      }
    })

    // Salvar credenciais quando atualizarem
    socket.ev.on('creds.update', async () => {
      const authData = await saveCreds()
      await saveAuthStateToStorage(clinicId, authData, sector)
    })

    // ===== CHATBOT CLIN: Listener de mensagens recebidas =====
    if (clinicId === CLIN_SESSION_ID) {
      socket.ev.on('messages.upsert', async (m) => {
        for (const msg of m.messages) {
          // Ignorar mensagens enviadas por nós, de grupo, broadcasts e status
          if (msg.key.fromMe) continue
          if (msg.key.remoteJid?.endsWith('@g.us')) continue
          if (msg.key.remoteJid === 'status@broadcast') continue

          const text = msg.message?.conversation
            || msg.message?.extendedTextMessage?.text
            || ''

          if (!text.trim()) continue

          const senderJid = msg.key.remoteJid!
          const senderPhone = senderJid.split('@')[0]

          console.log(`[Clin WhatsApp] 📩 Mensagem de ${senderPhone}: ${text.substring(0, 50)}`)

          try {
            await handleClinWhatsAppMessage(socket, senderJid, senderPhone, text)
          } catch (err) {
            console.error(`[Clin WhatsApp] Erro ao processar:`, err)
          }
        }
      })
      console.log(`[Clin WhatsApp] 🤖 Listener de mensagens ativado`)
    }

  } catch (error) {
    console.error(`[WhatsApp] Erro ao iniciar sessão (${clinicId}):`, error)
    session.status = 'close'
    session.socket = null
    throw error
  }
}

// ========== EXPORTED: CRIAR INSTÂNCIA + GERAR QR CODE ==========

/**
 * Inicia sessão Baileys e retorna QR Code.
 * Se já estiver conectado, retorna status connected.
 */
export async function createInstanceAndGetQR(clinicId: string, sector: string = 'default', force: boolean = false): Promise<{
  qr_code: string | null
  status: 'connecting' | 'connected'
  instance_name: string
}> {
  const instanceName = `baileys_${clinicId.substring(0, 16)}_${sector}`
  const session = getSession(clinicId, sector)

  if (force) {
    await disconnectInstance(clinicId, sector)
  } else if (session.status === 'open' && session.socket) {
    return { qr_code: null, status: 'connected', instance_name: instanceName }
  }

  // Iniciar sessão (não bloqueia — QR chega via evento)
  await startBaileysSession(clinicId, sector)

  // Aguardar até 8 segundos pelo QR code
  for (let i = 0; i < 16; i++) {
    await new Promise(r => setTimeout(r, 500))
    const s = getSession(clinicId, sector)
    if (s.qrCode) {
      return { qr_code: s.qrCode, status: 'connecting', instance_name: instanceName }
    }
    if (s.status === 'open') {
      return { qr_code: null, status: 'connected', instance_name: instanceName }
    }
  }

  // Se não gerou QR em 8s, retorna connecting sem QR (frontend mostra loading)
  return { qr_code: null, status: 'connecting', instance_name: instanceName }
}

// ========== EXPORTED: VERIFICAR STATUS ==========

/**
 * Verifica status da conexão WhatsApp da clínica.
 */
export async function checkInstanceStatus(clinicId: string, sector: string = 'default'): Promise<{
  connected: boolean
  phone_number: string | null
  status: 'connecting' | 'connected' | 'disconnected'
}> {
  let session = getSession(clinicId, sector)

  // Se a sessão está fechada na memória (ex: Next.js dev server restartou)
  // vamos checar se existe um auth_info no storage para reconectar silenciosamente
  if (session.status === 'close' || !session.socket) {
    const authState = await loadAuthStateFromStorage(clinicId, sector)
    if (authState) {
      console.log(`[WhatsApp] Lazy checking status for ${clinicId}/${sector}. Data found in storage.`)
      // Disparamos o startBaileysSession em background
      startBaileysSession(clinicId, sector).catch(console.error)
      
      // Capturar número de telefone salvo no authState para exibição
      let phoneNumber = null
      if (authState.creds && authState.creds.me && authState.creds.me.id) {
        phoneNumber = authState.creds.me.id.split(':')[0].split('@')[0]
      }

      // 🚀 Correção de Falso Positivo: Como estamos na Vercel (Serverless), a memória RAM reseta constantemente.
      // Se existe AuthState persistido no banco, significa que o usuário não se desconectou e a sessão é válida.
      return {
        connected: true,
        phone_number: phoneNumber,
        status: 'connected',
      }
    }
  }

  // Mapear status interno para a interface esperada
  switch (session.status) {
    case 'open':
      return {
        connected: true,
        phone_number: session.phoneNumber,
        status: 'connected',
      }
    case 'qr':
    case 'connecting':
      return {
        connected: false,
        phone_number: null,
        status: 'connecting',
      }
    case 'close':
    default:
      return {
        connected: false,
        phone_number: null,
        status: 'disconnected',
      }
  }
}

/**
 * Retorna todas as sessões WhatsApp de uma clínica (todos os setores).
 */
export async function getAllClinicSessions(clinicId: string): Promise<any[]> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('sector')
  return data || []
}

// ========== EXPORTED: ENVIAR MENSAGEM ==========

/**
 * Envia mensagem WhatsApp via sessão Baileys.
 * Todas as mensagens do sistema DEVEM passar por aqui.
 */
export async function sendWhatsAppMessage(
  clinicId: string,
  phone: string,
  message: string,
  triggerSource: string,
  sector: string = 'default'
): Promise<void> {
  let session = getSession(clinicId, sector)
  const supabase = getSupabaseAdmin()

  if (!session.socket || session.status !== 'open') {
    console.log(`[WhatsApp] Socket not open for ${clinicId}/${sector}. Attempting lazy reconnection...`)
    // Check if we have auth state
    const authState = await loadAuthStateFromStorage(clinicId, sector)
    if (authState) {
      // Start session and wait for it to be open (up to 5 seconds)
      startBaileysSession(clinicId, sector).catch(console.error)
      
      let attempts = 0
      while (session.status !== 'open' && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500))
        session = getSession(clinicId, sector)
        attempts++
      }
    }
  }

  if (!session.socket || session.status !== 'open') {
    throw new Error('WhatsApp não conectado. Acesse Configurações > WhatsApp para conectar.')
  }

  // Limpar número e formatar para WhatsApp
  const cleanPhone = phone.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
  let jid = `${fullPhone}@s.whatsapp.net`

  try {
    // 🔍 Validar e corrigir nono dígito usando onWhatsApp
    const [result] = await session.socket.onWhatsApp(fullPhone)
    if (result?.exists) {
      jid = result.jid
    } else if (fullPhone.length === 13) {
      // Tentar sem o 9 (muito comum no Brasil em DDDs até 28)
      const semNove = fullPhone.substring(0, 4) + fullPhone.substring(5)
      const [resSemNove] = await session.socket.onWhatsApp(semNove)
      if (resSemNove?.exists) {
        jid = resSemNove.jid
        console.log(`[WhatsApp] 🔄 Número corrigido automaticamente (removido 9): ${semNove}`)
      } else {
        console.log(`[WhatsApp] ⚠️ Número ${fullPhone} não foi encontrado pelo Meta, a mensagem pode falhar silenciosamente.`)
      }
    } else if (fullPhone.length === 12) {
      // Tentar com o 9
      const comNove = fullPhone.substring(0, 4) + '9' + fullPhone.substring(4)
      const [resComNove] = await session.socket.onWhatsApp(comNove)
      if (resComNove?.exists) {
        jid = resComNove.jid
        console.log(`[WhatsApp] 🔄 Número corrigido automaticamente (adicionado 9): ${comNove}`)
      } else {
        console.log(`[WhatsApp] ⚠️ Número ${fullPhone} não foi encontrado pelo Meta, a mensagem pode falhar silenciosamente.`)
      }
    }

    await session.socket.sendMessage(jid, { text: message })
    
    // Delay de 1.5s para garantir que a Vercel/Node Event Loop não mate a Serverless function antes do pacote TCP ser despachado pro Meta
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Log de sucesso
    await supabase.from('whatsapp_logs').insert({
      clinic_id: clinicId,
      recipient_phone: fullPhone,
      message_preview: message.substring(0, 100),
      trigger_source: triggerSource,
      status: 'sent',
    })

    console.log(`[WhatsApp] ✅ Enviado para ${fullPhone} (${triggerSource})`)
  } catch (error: any) {
    // Log de falha
    await supabase.from('whatsapp_logs').insert({
      clinic_id: clinicId,
      recipient_phone: fullPhone,
      message_preview: message.substring(0, 100),
      trigger_source: triggerSource,
      status: 'failed',
      error_message: error.message,
    })

    throw error
  }
}

// ========== EXPORTED: DESCONECTAR ==========

/**
 * Desconecta o WhatsApp da clínica.
 * Remove sessão do Map, auth do Storage, atualiza banco.
 */
export async function disconnectInstance(clinicId: string, sector: string = 'default'): Promise<void> {
  const key = sessionKey(clinicId, sector)
  const session = getSession(clinicId, sector)

  // Fechar socket
  if (session.socket) {
    try {
      await session.socket.logout()
    } catch {
      try {
        session.socket.end(undefined)
      } catch { /* best effort */ }
    }
  }

  // Limpar Map
  sessions.delete(key)

  // Remover auth do Storage
  await removeAuthStateFromStorage(clinicId, sector)

  // Atualizar banco
  const supabase = getSupabaseAdmin()
  await supabase.from('whatsapp_sessions').update({
    status: 'disconnected',
    disconnected_at: new Date().toISOString(),
    qr_code: null,
    phone_number: null,
    updated_at: new Date().toISOString(),
  }).eq('clinic_id', clinicId).eq('sector', sector)

  console.log(`[WhatsApp] 🔌 Clínica ${clinicId}/${sector} desconectada`)
}

// ========== CHATBOT CLIN — HANDLER DE MENSAGENS ==========

/**
 * Map de conversas ativas do Clin no WhatsApp.
 * Chave: número do telefone, Valor: histórico de mensagens
 */
const clinConversations = new Map<string, { role: string; content: string }[]>()

/**
 * Processa mensagem recebida no WhatsApp e responde via Clin.
 */
async function handleClinWhatsAppMessage(
  socket: WASocket,
  senderJid: string,
  senderPhone: string,
  text: string
): Promise<void> {
  // Obter ou criar histórico de conversa
  if (!clinConversations.has(senderPhone)) {
    clinConversations.set(senderPhone, [])
  }
  const history = clinConversations.get(senderPhone)!

  // Adicionar mensagem do usuário ao histórico
  history.push({ role: 'user', content: text })

  // Limitar histórico a 20 mensagens para não estourar tokens
  if (history.length > 20) {
    history.splice(0, history.length - 20)
  }

  // Indicar que está digitando
  try {
    await socket.presenceSubscribe(senderJid)
    await socket.sendPresenceUpdate('composing', senderJid)
  } catch { /* best effort */ }

  try {
    // Chamar a API do Clin internamente
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'
    const response = await fetch(`${baseUrl}/api/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        sessionId: `wa-${senderPhone}`,
        sourcePage: 'whatsapp',
        source: 'whatsapp',
      }),
    })

    if (!response.ok) {
      throw new Error(`API retornou ${response.status}`)
    }

    const data = await response.json()

    // Parsear array de mensagens (novo formato)
    const messages: string[] = data.messages || (data.reply ? [data.reply] : [])
    if (messages.length === 0) {
      messages.push('Desculpe, estou com dificuldade técnica. Tente novamente em instantes! 😊')
    }

    // Adicionar respostas ao histórico
    for (const msg of messages) {
      history.push({ role: 'assistant', content: msg })
    }

    // Parar indicador de digitação antes de enviar
    try {
      await socket.sendPresenceUpdate('paused', senderJid)
    } catch { /* best effort */ }

    // Enviar cada mensagem com delay rápido (300ms) entre elas para resposta imediata
    for (let i = 0; i < messages.length; i++) {
      if (i > 0) {
        try { await socket.sendPresenceUpdate('composing', senderJid) } catch { /* */ }
        await new Promise(r => setTimeout(r, 300))
      }
      await socket.sendMessage(senderJid, { text: messages[i] })
    }

    try { await socket.sendPresenceUpdate('paused', senderJid) } catch { /* */ }

    console.log(`[Clin WhatsApp] ✅ Respondido para ${senderPhone} (${messages.length} msg${messages.length > 1 ? 's' : ''})`)

    // Se API indicou follow-up (trial), enviar após 30s
    if (data.sendFollowUp && data.followUpMessages) {
      setTimeout(async () => {
        try {
          for (let i = 0; i < data.followUpMessages.length; i++) {
            if (i > 0) await new Promise(r => setTimeout(r, 1500))
            await socket.sendMessage(senderJid, { text: data.followUpMessages[i] })
          }
        } catch (err) {
          console.error(`[Clin WhatsApp] Erro ao enviar follow-up:`, err)
        }
      }, 30000)
    }

  } catch (err) {
    console.error(`[Clin WhatsApp] Erro ao chamar API:`, err)

    // Resposta de fallback
    await socket.sendMessage(senderJid, {
      text: 'Oi! 😊 Estou com uma dificuldade técnica momentânea. Mas não se preocupe, nossa equipe já foi notificada e vai te atender em breve!'
    })
  }
}

// ========== EXPORTED: SESSÃO CLIN (CHATBOT DE VENDAS) ==========

/**
 * Conecta a sessão do Clin (chatbot de vendas) e retorna QR Code.
 */
export async function connectClinSession(force: boolean = false): Promise<{
  qr_code: string | null
  status: 'connecting' | 'connected'
}> {
  return createInstanceAndGetQR(CLIN_SESSION_ID, 'default', force) as any
}

/**
 * Verifica status da sessão do Clin.
 */
export async function getClinStatus(): Promise<{
  connected: boolean
  phone_number: string | null
  status: 'connecting' | 'connected' | 'disconnected'
}> {
  return checkInstanceStatus(CLIN_SESSION_ID)
}

/**
 * Desconecta a sessão do Clin.
 */
export async function disconnectClinSession(): Promise<void> {
  clinConversations.clear()
  return disconnectInstance(CLIN_SESSION_ID)
}
