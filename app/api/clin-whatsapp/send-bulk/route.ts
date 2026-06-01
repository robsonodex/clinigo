import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getClinBotUrl(): string {
  const url = process.env.CLIN_BOT_URL || 'https://clinigo-whatsapp-service-production.up.railway.app'
  if (url.includes('clinigo.app') || url.includes('localhost') || !url.startsWith('http')) {
    return 'https://clinigo-whatsapp-service-production.up.railway.app'
  }
  return url.replace(/\/$/, '')
}

async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'SUPER_ADMIN') return null
  return user
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const DELAY_BETWEEN_SENDS_MS = 2000 // 2 segundos entre envios (anti-ban)

// In-memory progress tracking for bulk sends
const bulkProgress = new Map<string, {
  total: number
  sent: number
  failed: number
  errors: { phone: string; error: string }[]
  status: 'processing' | 'done'
  startedAt: string
}>()

function sanitizePhone(raw: string): string | null {
  let cleaned = raw.replace(/\D/g, '')
  if (cleaned.length < 10) return null
  if (!cleaned.startsWith('55') && (cleaned.length === 10 || cleaned.length === 11)) {
    cleaned = '55' + cleaned
  }
  return cleaned
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * POST /api/clin-whatsapp/send-bulk
 * FormData: text (string), numbers (string, \n separated), image? (File)
 * Returns immediately with a bulkId for progress polling.
 */
export async function POST(request: Request) {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito a Super Administradores' }, { status: 403 })
    }

    const formData = await request.formData()
    const text = formData.get('text') as string
    const numbersRaw = formData.get('numbers') as string
    const imageFile = formData.get('image') as File | null

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
    }
    if (!numbersRaw?.trim()) {
      return NextResponse.json({ error: 'Lista de números é obrigatória' }, { status: 400 })
    }

    // Parse numbers
    const rawLines = numbersRaw.split(/[\n\r,;]+/).map(l => l.trim()).filter(Boolean)
    const phones: string[] = []
    const invalidLines: string[] = []

    for (const line of rawLines) {
      const sanitized = sanitizePhone(line)
      if (sanitized) {
        phones.push(sanitized)
      } else {
        invalidLines.push(line)
      }
    }

    if (phones.length === 0) {
      return NextResponse.json({ error: 'Nenhum número válido encontrado na lista.' }, { status: 400 })
    }

    // Validate image if present
    let imageBase64: string | null = null
    if (imageFile) {
      if (!ALLOWED_TYPES.includes(imageFile.type)) {
        return NextResponse.json({ error: `Tipo de imagem não suportado: ${imageFile.type}` }, { status: 400 })
      }
      if (imageFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: `Imagem muito grande (${(imageFile.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB.` }, { status: 400 })
      }
      const arrayBuffer = await imageFile.arrayBuffer()
      imageBase64 = Buffer.from(arrayBuffer).toString('base64')
    }

    // Generate bulk ID
    const bulkId = `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Initialize progress
    bulkProgress.set(bulkId, {
      total: phones.length,
      sent: 0,
      failed: 0,
      errors: [],
      status: 'processing',
      startedAt: new Date().toISOString(),
    })

    // Process in background (non-blocking)
    processBulkSend(bulkId, phones, text, imageBase64).catch(err => {
      console.error('[Bulk Send] Fatal error:', err)
      const progress = bulkProgress.get(bulkId)
      if (progress) {
        progress.status = 'done'
      }
    })

    return NextResponse.json({
      success: true,
      bulkId,
      total: phones.length,
      invalidNumbers: invalidLines,
      estimatedMinutes: Math.ceil((phones.length * DELAY_BETWEEN_SENDS_MS) / 60000),
    })
  } catch (error: any) {
    console.error('[Clin WhatsApp Send Bulk]', error.message)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

/**
 * GET /api/clin-whatsapp/send-bulk?bulkId=xxx
 * Returns progress of a bulk send operation.
 */
export async function GET(request: Request) {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const bulkId = searchParams.get('bulkId')

    if (!bulkId) {
      return NextResponse.json({ error: 'bulkId é obrigatório' }, { status: 400 })
    }

    const progress = bulkProgress.get(bulkId)
    if (!progress) {
      return NextResponse.json({ error: 'Operação não encontrada' }, { status: 404 })
    }

    // Cleanup old entries (> 1 hour)
    if (progress.status === 'done') {
      const startedAt = new Date(progress.startedAt).getTime()
      if (Date.now() - startedAt > 3600000) {
        bulkProgress.delete(bulkId)
      }
    }

    return NextResponse.json(progress)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function processBulkSend(
  bulkId: string,
  phones: string[],
  text: string,
  imageBase64: string | null,
) {
  const progress = bulkProgress.get(bulkId)!
  const botUrl = getClinBotUrl()

  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i]

    try {
      let res: Response

      if (imageBase64) {
        // Send with image
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        res = await fetch(`${botUrl}/clin/send-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phone, imageBase64, caption: text }),
          signal: controller.signal,
        })

        clearTimeout(timeout)
      } else {
        // Send text only
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        res = await fetch(`${botUrl}/clin/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phone, text }),
          signal: controller.signal,
        })

        clearTimeout(timeout)
      }

      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: 'O serviço do WhatsApp retornou uma resposta inválida (HTML).' }
      }

      if (res.ok) {
        progress.sent++
        console.log(`[Bulk ${bulkId}] ✅ ${i + 1}/${phones.length} - Enviado para ${phone}`)
      } else {
        progress.failed++
        progress.errors.push({ phone, error: data.error || 'Erro no envio' })
        console.log(`[Bulk ${bulkId}] ❌ ${i + 1}/${phones.length} - Falha ${phone}: ${data.error}`)
      }
    } catch (err: any) {
      progress.failed++
      const errorMsg = err.name === 'AbortError' ? 'Timeout' : (err.message || 'Erro inesperado')
      progress.errors.push({ phone, error: errorMsg })
      console.log(`[Bulk ${bulkId}] ❌ ${i + 1}/${phones.length} - Erro ${phone}: ${errorMsg}`)
    }

    // Delay between sends (anti-ban), skip delay on last message
    if (i < phones.length - 1) {
      await delay(DELAY_BETWEEN_SENDS_MS)
    }
  }

  progress.status = 'done'
  console.log(`[Bulk ${bulkId}] 🏁 Concluído! Enviados: ${progress.sent}, Falhas: ${progress.failed}`)
}
