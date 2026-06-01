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

export async function POST(request: Request) {
  try {
    // 1. Validar que o usuário é SUPER_ADMIN
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito a Super Administradores' }, { status: 403 })
    }

    // 2. Extrair dados do FormData
    const formData = await request.formData()
    const to = formData.get('to') as string
    const text = formData.get('text') as string
    const imageFile = formData.get('image') as File | null

    if (!to) {
      return NextResponse.json({ error: 'Destinatário (to) é obrigatório' }, { status: 400 })
    }

    if (!imageFile) {
      return NextResponse.json({ error: 'Imagem é obrigatória' }, { status: 400 })
    }

    // 3. Validar imagem
    if (!ALLOWED_TYPES.includes(imageFile.type)) {
      return NextResponse.json({ error: `Tipo de imagem não suportado: ${imageFile.type}. Use JPG, PNG, WebP ou GIF.` }, { status: 400 })
    }

    if (imageFile.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: `Imagem muito grande (${(imageFile.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB.` }, { status: 400 })
    }

    // 4. Converter imagem para base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64')

    // 5. Sanitizar número
    const cleanTo = to.replace(/\D/g, '')
    const targets = []

    if (cleanTo.startsWith('55') && cleanTo.length === 13) {
      const ddd = parseInt(cleanTo.substring(2, 4), 10)
      if (ddd > 28) {
        const semNove = cleanTo.substring(0, 4) + cleanTo.substring(5)
        targets.push(semNove)
        targets.push(cleanTo)
      } else {
        targets.push(cleanTo)
      }
    } else {
      targets.push(cleanTo)
    }

    // 6. Enviar para o Clin Bot
    const url = `${getClinBotUrl()}/clin/send-image`
    let success = false
    let lastError = null

    for (const target of targets) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout (imagem é mais pesada)

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: target,
            imageBase64,
            caption: text || '',
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        const text = await res.text()
        let data: any = {}
        try {
          data = JSON.parse(text)
        } catch {
          lastError = 'O serviço do WhatsApp retornou uma resposta inválida (HTML) em vez de JSON.'
          continue
        }

        if (res.ok) {
          success = true
          break
        } else {
          lastError = data.error || 'Erro reportado pelo serviço do WhatsApp'
        }
      } catch (err: any) {
        clearTimeout(timeout)
        if (err.name === 'AbortError') {
          lastError = 'O serviço do WhatsApp não respondeu a tempo (timeout 30s).'
        } else {
          lastError = err.message
        }
      }
    }

    if (!success) {
      throw new Error(lastError || 'Falha ao enviar imagem pelo WhatsApp')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clin WhatsApp Send Image Proxy]', error.message)
    return NextResponse.json({
      error: error.message || 'Erro ao enviar imagem',
    }, { status: 502 })
  }
}
