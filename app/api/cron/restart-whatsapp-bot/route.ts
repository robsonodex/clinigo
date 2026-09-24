/**
 * WhatsApp Bot Restart CRON API
 * GET /api/cron/restart-whatsapp-bot
 * 
 * Executes every 15 days (1st and 16th of each month) at midnight (UTC).
 * Forces a reconnection of the Baileys session to refresh Signal Protocol
 * encryption keys and prevent "Aguardando mensagem" issues caused by
 * stale pre-keys after long uptime periods.
 * 
 * Flow:
 * 1. Check current status
 * 2. Disconnect the session (clears in-memory keys)
 * 3. Wait for cleanup
 * 4. Reconnect (uses persisted credentials from Supabase — no QR needed)
 * 5. Verify connection restored
 */

import { NextRequest, NextResponse } from 'next/server'

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY
const BOT_SERVICE_URL = process.env.CLIN_BOT_URL || 'https://clinigo-whatsapp-service-production.up.railway.app'

async function fetchBot(path: string, method: 'GET' | 'POST' = 'GET', timeoutMs = 15000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BOT_SERVICE_URL}${path}`, {
      method,
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const text = await res.text()
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) }
    } catch {
      return { ok: res.ok, status: res.status, data: { raw: text } }
    }
  } catch (err: any) {
    clearTimeout(timeout)
    return { ok: false, status: 0, data: { error: err.message } }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const log: string[] = []

  try {
    // Verify cron secret (Vercel sends it as Bearer token)
    const authHeader = request.headers.get('authorization')

    if (CRON_SECRET_KEY && authHeader !== `Bearer ${CRON_SECRET_KEY}`) {
      console.warn('[CRON:restart-whatsapp-bot] Unauthorized attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    log.push(`[${new Date().toISOString()}] Restart initiated`)

    // Step 1: Check current status
    const statusBefore = await fetchBot('/clin/status')
    log.push(`[STATUS-BEFORE] ${JSON.stringify(statusBefore.data)}`)

    if (!statusBefore.ok) {
      log.push('[WARN] Bot service unreachable, attempting connect anyway')
    }

    // Step 2: Disconnect
    const disconnectResult = await fetchBot('/clin/disconnect', 'POST')
    log.push(`[DISCONNECT] ${JSON.stringify(disconnectResult.data)}`)

    // Step 3: Wait for cleanup
    await sleep(5000)
    log.push('[WAIT] 5s cleanup pause completed')

    // Step 4: Reconnect
    const connectResult = await fetchBot('/clin/connect', 'POST')
    log.push(`[CONNECT] ${JSON.stringify(connectResult.data)}`)

    // Step 5: Wait for session to establish
    await sleep(10000)
    log.push('[WAIT] 10s session establishment pause completed')

    // Step 6: Verify final status
    const statusAfter = await fetchBot('/clin/status')
    log.push(`[STATUS-AFTER] ${JSON.stringify(statusAfter.data)}`)

    const isConnected = statusAfter.data?.connected === true
    const elapsed = Date.now() - startTime

    log.push(`[RESULT] connected=${isConnected}, elapsed=${elapsed}ms`)

    console.log(`[CRON:restart-whatsapp-bot] ${log.join(' | ')}`)

    return NextResponse.json({
      success: true,
      connected: isConnected,
      elapsed_ms: elapsed,
      log,
    })
  } catch (error: any) {
    log.push(`[ERROR] ${error.message}`)
    console.error('[CRON:restart-whatsapp-bot]', error.message, log)

    return NextResponse.json({
      success: false,
      error: error.message,
      log,
    }, { status: 500 })
  }
}
