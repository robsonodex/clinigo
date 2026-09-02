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
    if (state && state.creds && state.creds.me && state.creds.me.id) {
      state.creds.registered = true
    }
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
          } as any, { onConflict: 'clinic_id' })
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
        } as any, { onConflict: 'clinic_id' })

        console.log(`[WhatsApp] ✅ Clínica ${clinicId} conectada (${phoneNumber})`)

        if (clinicId === CLIN_SESSION_ID) {
          console.log(`[WhatsApp] ✅ Clin Sales Bot conectado (${phoneNumber}). Handoff de sessão para o Railway em 3s...`)
          setTimeout(() => {
            try { socket.end(undefined) } catch {}
          }, 3000)
        }
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

    // Ouvir mensagens recebidas para comandos interativos (ex: Extrato de Repasse do Profissional)
    socket.ev.on('messages.upsert', async ({ messages, type }: { messages: any[]; type: string }) => {
      if (type !== 'notify') return
      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.fromMe) continue
          const remoteJid = msg.key.remoteJid
          if (!remoteJid || remoteJid.endsWith('@g.us')) continue // Ignora grupos

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            ''

          if (text) {
            const { processIncomingWhatsAppRepasse } = await import('@/lib/services/whatsapp-repasse')
            await processIncomingWhatsAppRepasse(clinicId, remoteJid, text, sector)
          }
        } catch (msgErr: any) {
          console.error('[WhatsApp] Erro ao processar mensagem recebida:', msgErr?.message || msgErr)
        }
      }
    })

    // ===== CHATBOT CLIN: Gerenciado exclusivamente via Railway =====
    if (clinicId === CLIN_SESSION_ID) {
      console.log(`[Clin WhatsApp] ℹ️ Clin Sales Bot é gerenciado 100% pelo serviço Railway standalone. Socket in-process do Next.js ignorado para evitar conflito 440.`)
      return
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

// ========== EXPORTED: NOTIFICAÇÃO DE LEAD PARA O ADMIN ==========

/**
 * Envia notificação de novo Lead / cadastro para o número comercial/admin (21 96557-2247).
 * Tenta enviar via sessão 'comercial' ou qualquer outra sessão ativa no sistema.
 */
export async function sendWhatsAppToLeadAdmin(
  message: string,
  triggerSource: string = 'lead-notification'
): Promise<boolean> {
  const leadPhone = process.env.ADMIN_LEAD_WHATSAPP_NUMBER || '21965572247'
  
  // Tenta sessões conhecidas em ordem (comercial primeiro)
  const sessionsToTry = [
    { clinicId: '5163c916-8b82-4d80-8a71-01726836ee46', sector: 'comercial' },
    { clinicId: 'de000000-0000-0000-0000-000000000001', sector: 'default' }
  ]

  for (const s of sessionsToTry) {
    try {
      await sendWhatsAppMessage(s.clinicId, leadPhone, message, triggerSource, s.sector)
      console.log(`[WhatsApp Lead Admin] ✅ Notificação enviada via ${s.clinicId}/${s.sector}`)
      return true
    } catch (err: any) {
      console.warn(`[WhatsApp Lead Admin] Tentativa via ${s.clinicId}/${s.sector} falhou:`, err.message)
    }
  }

  // Tenta qualquer sessão ativa no banco
  try {
    const supabase = getSupabaseAdmin()
    const { data: active } = await supabase
      .from('whatsapp_sessions')
      .select('clinic_id, sector')
      .eq('status', 'connected')
      .limit(5)

    if (active && active.length > 0) {
      for (const a of active) {
        try {
          await sendWhatsAppMessage(a.clinic_id, leadPhone, message, triggerSource, a.sector || 'default')
          console.log(`[WhatsApp Lead Admin] ✅ Notificação enviada via sessão ativa ${a.clinic_id}/${a.sector}`)
          return true
        } catch {
          /* continua pro próximo */
        }
      }
    }
  } catch (dbErr) {
    console.error('[WhatsApp Lead Admin] Erro ao buscar sessões ativas:', dbErr)
  }

  console.error('[WhatsApp Lead Admin] ❌ Não foi possível entregar a notificação por nenhuma sessão.')
  return false
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

    // Sincronizar com conversas no celular / módulo de chat
    await syncWhatsAppToChat(supabase, clinicId, fullPhone, message)

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

/**
 * Sincroniza envio de WhatsApp para a tabela de conversas/mensagens do Chat interno
 */
async function syncWhatsAppToChat(
  supabase: any,
  clinicId: string,
  fullPhone: string,
  message: string
) {
  try {
    const formattedPhone = fullPhone.startsWith('55')
      ? `+55 (${fullPhone.substring(2, 4)}) ${fullPhone.substring(4, 9)}-${fullPhone.substring(9)}`
      : fullPhone

    const title = `WhatsApp: ${formattedPhone}`

    let { data: conv } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('title', title)
      .maybeSingle()

    if (!conv) {
      const { data: firstAdmin } = await supabase
        .from('users')
        .select('id')
        .eq('clinic_id', clinicId)
        .limit(1)
        .maybeSingle()

      const createdBy = firstAdmin?.id || null

      const { data: newConv, error: convErr } = await supabase
        .from('chat_conversations')
        .insert({
          clinic_id: clinicId,
          type: 'internal',
          title: title,
          created_by: createdBy,
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
        })
        .select('id')
        .single()

      if (!convErr && newConv) {
        conv = newConv
        if (createdBy) {
          await supabase.from('chat_participants').insert({
            conversation_id: newConv.id,
            user_id: createdBy,
            role: 'admin',
          })
        }
      }
    }

    if (conv?.id) {
      await supabase
        .from('chat_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conv.id)

      const { data: senderUser } = await supabase
        .from('users')
        .select('id')
        .eq('clinic_id', clinicId)
        .limit(1)
        .maybeSingle()

      if (senderUser?.id) {
        await supabase.from('chat_messages').insert({
          conversation_id: conv.id,
          sender_id: senderUser.id,
          content: `[WhatsApp enviado para ${formattedPhone}]:\n${message}`,
          message_type: 'text',
        })
      }
    }
  } catch (err) {
    console.error('[WhatsApp Chat Sync Error]', err)
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
 * Extrai o texto contido na mensagem Baileys (suporta efêmera, botões, listas, etc)
 */
function extractMessageText(msg: proto.IWebMessageInfo): string {
  const m = msg.message
  if (!m) return ''

  const message = m.ephemeralMessage?.message
    || m.viewOnceMessage?.message
    || m.viewOnceMessageV2?.message
    || m.documentWithCaptionMessage?.message
    || m

  return message.conversation
    || message.extendedTextMessage?.text
    || message.buttonsResponseMessage?.selectedButtonId
    || message.buttonsResponseMessage?.selectedDisplayText
    || message.listResponseMessage?.singleSelectReply?.selectedRowId
    || message.listResponseMessage?.title
    || message.templateButtonReplyMessage?.selectedId
    || message.imageMessage?.caption
    || message.videoMessage?.caption
    || ''
}

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
    // Chamar a API do Clin com fallback de URLs (Local, Env, Prod)
    const baseUrls = [
      process.env.NEXT_PUBLIC_APP_URL,
      `http://127.0.0.1:${process.env.PORT || 3000}`,
      'https://clinigo.app'
    ].filter(Boolean) as string[]

    let data: any = null
    let lastErr: any = null

    for (const baseUrl of baseUrls) {
      try {
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

        if (response.ok) {
          data = await response.json()
          break
        } else {
          lastErr = new Error(`API retornou status ${response.status}`)
        }
      } catch (err) {
        lastErr = err
      }
    }

    if (!data) {
      throw lastErr || new Error('Falha ao conectar com a API do chatbot')
    }

    // Parsear array de mensagens
    const messages: string[] = data.messages || (data.reply ? [data.reply] : [])

    // Se o atendimento foi transferido e não há nova resposta do bot, mantém em silêncio para atendimento humano
    if (messages.length === 0 && data.transfer) {
      try { await socket.sendPresenceUpdate('paused', senderJid) } catch { /* best effort */ }
      return
    }

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

    try { await socket.sendPresenceUpdate('paused', senderJid) } catch { /* best effort */ }

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

    try { await socket.sendPresenceUpdate('paused', senderJid) } catch { /* best effort */ }

    // Resposta de fallback imediata enviando o menu principal
    await socket.sendMessage(senderJid, {
      text: 'Olá! 😊 Como posso te ajudar hoje?\n\n1 — O que é o CliniGo\n2 — Planos e preços\n3 — Demonstração gratuita\n4 — Funcionalidades\n5 — Falar com especialista'
    })
  } finally {
    try { await socket.sendPresenceUpdate('paused', senderJid) } catch { /* best effort */ }
  }
}

// ========== EXPORTED: SESSÃO CLIN (CHATBOT DE VENDAS) ==========

const CLIN_BOT_SERVICE_URL = process.env.CLIN_BOT_URL || 'https://clinigo-whatsapp-service-production.up.railway.app'

/**
 * Conecta a sessão do Clin (chatbot de vendas) via serviço 24/7 no Railway.
 */
export async function connectClinSession(force: boolean = false): Promise<{
  qr_code: string | null
  status: 'connecting' | 'connected'
}> {
  try {
    if (force) {
      console.log('[connectClinSession] Forçando reconexão no Railway...')
      await fetch(`${CLIN_BOT_SERVICE_URL}/clin/connect`, {
        method: 'POST',
        cache: 'no-store'
      })
      // Pequena pausa para o Baileys iniciar a geração
      await new Promise(r => setTimeout(r, 1000))
    }

    // Buscar QR Code no endpoint GET /clin/qr do Railway
    const res = await fetch(`${CLIN_BOT_SERVICE_URL}/clin/qr`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      return {
        qr_code: data.qr || null,
        status: data.status === 'connected' ? 'connected' : 'connecting',
      }
    }
  } catch (err) {
    console.error('[connectClinSession] Erro ao conectar ao bot Railway:', err)
  }
  return { qr_code: null, status: 'connecting' }
}

/**
 * Verifica status da sessão do Clin no serviço 24/7 Railway (com fallback DB).
 */
export async function getClinStatus(): Promise<{
  connected: boolean
  phone_number: string | null
  status: 'connecting' | 'connected' | 'disconnected'
}> {
  try {
    const res = await fetch(`${CLIN_BOT_SERVICE_URL}/clin/status`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      return {
        connected: data.connected || false,
        phone_number: data.phone_number || null,
        status: data.status || 'disconnected',
      }
    }
  } catch (err) {
    console.error('[getClinStatus] Erro ao consultar status no bot Railway:', err)
  }

  // Fallback: consultar Supabase DB
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('status, phone_number')
      .eq('clinic_id', CLIN_SESSION_ID)
      .single()

    return {
      connected: data?.status === 'connected',
      phone_number: data?.phone_number || null,
      status: (data?.status as any) || 'disconnected',
    }
  } catch {
    return { connected: false, phone_number: null, status: 'disconnected' }
  }
}

/**
 * Desconecta a sessão do Clin no serviço 24/7 Railway.
 */
export async function disconnectClinSession(): Promise<void> {
  clinConversations.clear()
  try {
    await fetch(`${CLIN_BOT_SERVICE_URL}/clin/disconnect`, { method: 'POST' })
  } catch (err) {
    console.error('[disconnectClinSession] Erro ao desconectar no Railway:', err)
  }
}
