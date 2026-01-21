import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { nome, email, telefone, assunto, mensagem } = body

        // Validate required fields
        if (!nome || !email || !mensagem) {
            return NextResponse.json(
                { error: 'Campos obrigatórios não preenchidos' },
                { status: 400 }
            )
        }

        // Create transporter - uses existing SMTP config
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.hostinger.com',
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: true,
            auth: {
                user: process.env.SMTP_USER || 'contato@clinigo.app',
                pass: process.env.SMTP_PASSWORD,
            },
        })

        // Email content
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(to right, #059669, #0d9488); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #059669; }
        .value { margin-top: 5px; padding: 10px; background: white; border-radius: 5px; border: 1px solid #e5e7eb; }
        .message-box { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #059669; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">📩 Nova Mensagem de Contato</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Recebido pelo formulário do site CliniGo</p>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Nome</div>
                <div class="value">${nome}</div>
            </div>
            <div class="field">
                <div class="label">E-mail</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
            </div>
            ${telefone ? `
            <div class="field">
                <div class="label">Telefone</div>
                <div class="value"><a href="tel:${telefone}">${telefone}</a></div>
            </div>
            ` : ''}
            <div class="field">
                <div class="label">Assunto</div>
                <div class="value">${assunto}</div>
            </div>
            <div class="message-box">
                <div class="label">Mensagem</div>
                <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${mensagem}</p>
            </div>
        </div>
        <div class="footer">
            CliniGo - Gestão médica completa para clínicas e consultórios<br>
            Este e-mail foi enviado automaticamente pelo formulário de contato.
        </div>
    </div>
</body>
</html>
`

        // Send email
        await transporter.sendMail({
            from: `"CliniGo Contato" <${process.env.SMTP_USER || 'contato@clinigo.app'}>`,
            to: 'contato@clinigo.app',
            replyTo: email,
            subject: `[CliniGo] ${assunto} - ${nome}`,
            html: htmlContent,
            text: `
Nova mensagem de contato do site CliniGo

Nome: ${nome}
E-mail: ${email}
Telefone: ${telefone || 'Não informado'}
Assunto: ${assunto}

Mensagem:
${mensagem}
            `
        })

        // Also send a copy to suporte if it's a technical question
        if (assunto === 'Dúvida técnica') {
            await transporter.sendMail({
                from: `"CliniGo Contato" <${process.env.SMTP_USER || 'contato@clinigo.app'}>`,
                to: 'suporte@clinigo.app',
                replyTo: email,
                subject: `[Suporte] ${assunto} - ${nome}`,
                html: htmlContent,
                text: `Cópia para suporte técnico\n\n${mensagem}`
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error sending contact email:', error)
        return NextResponse.json(
            { error: 'Erro ao enviar mensagem' },
            { status: 500 }
        )
    }
}
