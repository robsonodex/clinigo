import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getClinBotUrl(): string {
  return process.env.CLIN_BOT_URL || 'https://clinigo-whatsapp-service-production.up.railway.app'
}

/**
 * CRON JOB: Process scheduled WhatsApp messages
 * Schedule: Every 10 minutes (or as configured in Vercel Cron)
 * 
 * Finds messages with status='pending' and scheduled_for <= NOW(),
 * sends them via Railway Clin Bot with smart non-digit fallback,
 * and updates status to 'sent' or 'failed'.
 */
export async function GET(request: Request) {
  try {
    // Aceita chamadas do pg_cron do Supabase e de qualquer trigger autorizado
    // Segurança: este endpoint apenas processa mensagens pendentes já cadastradas no banco

    const supabase = getAdminClient()
    const now = new Date().toISOString()

    // 1. Buscar mensagens pendentes com data vencida
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('scheduled_whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)

    if (fetchError) {
      console.error('[CronSendScheduledWhatsApp] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Falha ao buscar mensagens programadas' }, { status: 500 })
    }

    let sentCount = 0
    let failedCount = 0

    if (pendingMessages && pendingMessages.length > 0) {
      const url = `${getClinBotUrl()}/clin/send`

      for (const msg of pendingMessages) {
        // Higienizar número de telefone
        const cleanTo = msg.recipient_phone.replace(/\D/g, '')
        let primaryTarget = cleanTo

        // Adicionar DDI 55 se não tiver
        if (!cleanTo.startsWith('55') && (cleanTo.length === 10 || cleanTo.length === 11)) {
          primaryTarget = '55' + cleanTo
        }

        const targets = []

        // Inversão inteligente: para DDD > 28, o correto no WhatsApp é SEM o 9
        if (primaryTarget.startsWith('55') && primaryTarget.length === 13) {
          const ddd = parseInt(primaryTarget.substring(2, 4), 10)
          if (ddd > 28) {
            const semNove = primaryTarget.substring(0, 4) + primaryTarget.substring(5)
            targets.push(semNove) // Tenta SEM o 9 primeiro
            targets.push(primaryTarget) // Fallback COM o 9
          } else {
            targets.push(primaryTarget)
          }
        } else {
          targets.push(primaryTarget)
        }

        let success = false
        let lastError = null
        const formattedText = `*Assunto:* ${msg.subject.trim()}\n\n${msg.message.trim()}`
        const hasImage = !!msg.image_base64

        // Tentar enviar para os JIDs mapeados
        for (const target of targets) {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), hasImage ? 30000 : 10000)

          try {
            let res: Response

            if (hasImage) {
              // Enviar com imagem
              res = await fetch(`${getClinBotUrl()}/clin/send-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: target, imageBase64: msg.image_base64, caption: formattedText }),
                signal: controller.signal,
              })
            } else {
              // Enviar apenas texto
              res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: target, text: formattedText }),
                signal: controller.signal,
              })
            }

            clearTimeout(timeout)

            const data = await res.json()
            if (res.ok) {
              success = true
              break; // Para o envio se obteve sucesso em um dos alvos
            } else {
              lastError = data.error || 'Erro reportado pelo serviço do WhatsApp'
            }
          } catch (err: any) {
            clearTimeout(timeout)
            if (err.name === 'AbortError') {
              lastError = 'O serviço do WhatsApp (Clin Bot) não respondeu a tempo.'
            } else {
              lastError = err.message
            }
          }
        }

        // Atualizar status do agendamento no Supabase
        if (success) {
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              error_message: null
            })
            .eq('id', msg.id)
          
          sentCount++
        } else {
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({
              status: 'failed',
              error_message: lastError || 'Erro de conexão no envio'
            })
            .eq('id', msg.id)
          
          failedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: {
        found: pendingMessages?.length || 0,
        sent: sentCount,
        failed: failedCount
      }
    })

  } catch (error: any) {
    console.error('[CronSendScheduledWhatsApp] Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Erro Interno do Servidor' }, { status: 500 })
  }
}
