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

function getSession(clinicId: string): ClinicSession {
  if (!sessions.has(clinicId)) {
    sessions.set(clinicId, {
      socket: null,
      qrCode: null,
      status: 'close',
      phoneNumber: null,
      connectedAt: null,
      authState: null,
      reconnectAttempts: 0,
    })
  }
  return sessions.get(clinicId)!
}

// ========== SUPABASE STORAGE AUTH STATE ==========

/**
 * Carrega o auth state do Supabase Storage.
 * Retorna null se não existir.
 */
async function loadAuthStateFromStorage(clinicId: string): Promise<any | null> {
  const supabase = getSupabaseAdmin()
  const filePath = `${clinicId}/auth_info.json`

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
async function saveAuthStateToStorage(clinicId: string, state: any): Promise<void> {
  const supabase = getSupabaseAdmin()
  const filePath = `${clinicId}/auth_info.json`

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
async function removeAuthStateFromStorage(clinicId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const filePath = `${clinicId}/auth_info.json`

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

async function startBaileysSession(clinicId: string): Promise<void> {
  const session = getSession(clinicId)

  // Se já existe um socket ativo, não recria
  if (session.socket && session.status === 'open') return
  if (session.socket && session.status === 'connecting') return

  session.status = 'connecting'

  // Tentar carregar auth state existente do Storage
  const existingAuth = await loadAuthStateFromStorage(clinicId)
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
            instance_name: `baileys_${clinicId.substring(0, 16)}`,
            status: 'connecting',
            qr_code: qrDataUri,
            qr_code_expires_at: new Date(Date.now() + 45 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'clinic_id' })
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
        await saveAuthStateToStorage(clinicId, authData)

        // Atualizar banco
        const supabase = getSupabaseAdmin()
        await supabase.from('whatsapp_sessions').upsert({
          clinic_id: clinicId,
          instance_name: `baileys_${clinicId.substring(0, 16)}`,
          status: 'connected',
          phone_number: phoneNumber,
          connected_at: new Date().toISOString(),
          qr_code: null,
          error_message: null,
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'clinic_id' })

        console.log(`[WhatsApp] ✅ Clínica ${clinicId} conectada (${phoneNumber})`)
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        console.log(`[WhatsApp] Conexão fechada (${clinicId}), code=${statusCode}, reconnect=${shouldReconnect}`)

        session.socket = null
        session.qrCode = null

        if (shouldReconnect && session.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          // Reconectar automaticamente com limite
          session.reconnectAttempts++
          session.status = 'connecting'
          console.log(`[WhatsApp] Tentativa de reconexão ${session.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} (${clinicId})`)
          setTimeout(() => startBaileysSession(clinicId), 3000)
        } else {
          // Logout ou esgotou tentativas — limpar tudo
          if (session.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log(`[WhatsApp] Máximo de reconexões atingido (${clinicId})`)
          }
          session.status = 'close'
          session.phoneNumber = null
          session.connectedAt = null
          session.reconnectAttempts = 0
          await removeAuthStateFromStorage(clinicId)

          const supabase = getSupabaseAdmin()
          await supabase.from('whatsapp_sessions').update({
            status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            qr_code: null,
            phone_number: null,
            updated_at: new Date().toISOString(),
          }).eq('clinic_id', clinicId)
        }
      }
    })

    // Salvar credenciais quando atualizarem
    socket.ev.on('creds.update', async () => {
      const authData = await saveCreds()
      await saveAuthStateToStorage(clinicId, authData)
    })

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
export async function createInstanceAndGetQR(clinicId: string): Promise<{
  qr_code: string | null
  status: 'connecting' | 'connected'
  instance_name: string
}> {
  const instanceName = `baileys_${clinicId.substring(0, 16)}`
  const session = getSession(clinicId)

  // Se já está conectado
  if (session.status === 'open' && session.socket) {
    return { qr_code: null, status: 'connected', instance_name: instanceName }
  }

  // Iniciar sessão (não bloqueia — QR chega via evento)
  await startBaileysSession(clinicId)

  // Aguardar até 8 segundos pelo QR code
  for (let i = 0; i < 16; i++) {
    await new Promise(r => setTimeout(r, 500))
    const s = getSession(clinicId)
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
export async function checkInstanceStatus(clinicId: string): Promise<{
  connected: boolean
  phone_number: string | null
  status: 'connecting' | 'connected' | 'disconnected'
}> {
  let session = getSession(clinicId)

  // Se a sessão está fechada na memória (ex: Next.js dev server restartou)
  // vamos checar se existe um auth_info no storage para reconectar silenciosamente
  if (session.status === 'close' || !session.socket) {
    const authState = await loadAuthStateFromStorage(clinicId)
    if (authState) {
      console.log(`[WhatsApp] Lazy checking status for ${clinicId}. Data found in storage.`)
      // Disparamos o startBaileysSession em background
      startBaileysSession(clinicId).catch(console.error)
      // Como estamos no meio de um status check, vamos assumir temporariamente que ele 
      // está conectando (evita que a tela pisque "Desconectado")
      return {
        connected: false,
        phone_number: null,
        status: 'connecting',
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

// ========== EXPORTED: ENVIAR MENSAGEM ==========

/**
 * Envia mensagem WhatsApp via sessão Baileys.
 * Todas as mensagens do sistema DEVEM passar por aqui.
 */
export async function sendWhatsAppMessage(
  clinicId: string,
  phone: string,
  message: string,
  triggerSource: string
): Promise<void> {
  let session = getSession(clinicId)
  const supabase = getSupabaseAdmin()

  if (!session.socket || session.status !== 'open') {
    console.log(`[WhatsApp] Socket not open for ${clinicId}. Attempting lazy reconnection...`)
    // Check if we have auth state
    const authState = await loadAuthStateFromStorage(clinicId)
    if (authState) {
      // Start session and wait for it to be open (up to 5 seconds)
      startBaileysSession(clinicId).catch(console.error)
      
      let attempts = 0
      while (session.status !== 'open' && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500))
        session = getSession(clinicId)
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
  const jid = `${fullPhone}@s.whatsapp.net`

  try {
    await session.socket.sendMessage(jid, { text: message })

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
export async function disconnectInstance(clinicId: string): Promise<void> {
  const session = getSession(clinicId)

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
  sessions.delete(clinicId)

  // Remover auth do Storage
  await removeAuthStateFromStorage(clinicId)

  // Atualizar banco
  const supabase = getSupabaseAdmin()
  await supabase.from('whatsapp_sessions').update({
    status: 'disconnected',
    disconnected_at: new Date().toISOString(),
    qr_code: null,
    phone_number: null,
    updated_at: new Date().toISOString(),
  }).eq('clinic_id', clinicId)

  console.log(`[WhatsApp] 🔌 Clínica ${clinicId} desconectada`)
}
