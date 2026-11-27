import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshCampaignCounters } from '@/lib/sales/outreach-worker'

const TOKEN_REGEX = /^[a-f0-9]{16,64}$/i

async function processUnsubscribe(token: string) {
    if (!TOKEN_REGEX.test(token)) {
        return { found: false }
    }

    const supabaseAdmin = createServiceRoleClient()
    const { data: rec } = await supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .select('id, campaign_id, email')
        .eq('tracking_token', token)
        .maybeSingle()

    if (!rec) {
        return { found: false }
    }

    const record = rec as unknown as { id: string; campaign_id: string; email: string }

    await Promise.all([
        supabaseAdmin
            .from('sales_outreach_suppressions' as any)
            .upsert(
                {
                    email: record.email.toLowerCase(),
                    reason: 'UNSUBSCRIBED',
                    source_campaign_id: record.campaign_id,
                } as any,
                { onConflict: 'email' }
            ),
        supabaseAdmin
            .from('sales_outreach_recipients' as any)
            .update({
                status: 'UNSUBSCRIBED',
                next_send_at: null,
            } as any)
            .eq('email', record.email.toLowerCase()),
    ])

    await refreshCampaignCounters(supabaseAdmin, record.campaign_id)
    return { found: true, email: record.email }
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params
    const res = await processUnsubscribe(token)

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Preferência registrada — CliniGO</title>
</head>
<body style="margin:0;background:#F6F8F7;font-family:Arial,Helvetica,sans-serif;color:#0F1F1B;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
  <div style="background:#FFFFFF;border:1px solid #E6E8E5;border-radius:14px;max-width:460px;width:100%;padding:32px;text-align:center;">
    <img src="https://clinigo.app/logo-clinigo-round.jpg" alt="CliniGO" width="56" height="56" style="border-radius:50%;border:1px solid #D6DDD9;margin-bottom:14px;" />
    <h1 style="margin:0 0 10px 0;font-size:20px;color:#0F1F1B;">${res.found ? 'Descadastro confirmado' : 'Solicitação recebida'}</h1>
    <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#4B5B56;">
      ${
          res.found
              ? 'Seu endereço foi removido da nossa lista de comunicações comerciais. Você não receberá novos e-mails desta cadência.'
              : 'Este link já foi processado ou não está mais ativo.'
      }
    </p>
    <a href="https://clinigo.app" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#155E4B;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:600;">Voltar para clinigo.app</a>
  </div>
</body>
</html>`

    return new NextResponse(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex, nofollow',
        },
    })
}

// RFC 8058 One-Click Unsubscribe (POST enviado automaticamente por clientes de e-mail)
export async function POST(
    _request: NextRequest,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params
    await processUnsubscribe(token)
    return NextResponse.json({ success: true })
}

