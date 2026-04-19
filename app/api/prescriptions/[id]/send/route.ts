/**
 * Prescription Send API — POST
 * 
 * Envia prescrição assinada por WhatsApp ou E-mail
 * Requer status SIGNED
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { guardFeature, createPlanError } from '@/lib/middlewares/plan-guard'
import { z } from 'zod'

const SendSchema = z.object({
    method: z.enum(['whatsapp', 'email'], {
        errorMap: () => ({ message: 'Método deve ser "whatsapp" ou "email"' }),
    }),
})

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params

    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Plan guard
        const validation = await guardFeature(profile.clinic_id, 'prescricao_digital')
        if (!validation.allowed) {
            return createPlanError(validation.planType, 'Prescrição Digital', 'PROFESSIONAL')
        }

        // Parse body
        const body = await request.json()
        const parsed = SendSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({
                error: 'Dados inválidos',
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 })
        }

        const { method } = parsed.data

        // Fetch prescription
        let prescQuery = supabaseAdmin
            .from('prescriptions')
            .select(`
                *,
                patient:patients(id, full_name, email, phone)
            `)
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)

        if (profile.role === 'DOCTOR') {
            prescQuery = prescQuery.eq('doctor_id', user.id)
        }

        const { data: prescription } = await prescQuery.single()

        if (!prescription) {
            return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
        }

        const presc = prescription as any

        if (presc.status !== 'SIGNED') {
            return NextResponse.json({
                error: 'Apenas prescrições assinadas podem ser enviadas',
            }, { status: 409 })
        }

        const patient = presc.patient as any

        // Validate contact info based on method
        if (method === 'whatsapp' && !patient?.phone) {
            return NextResponse.json({
                error: 'Paciente sem telefone cadastrado — impossível enviar por WhatsApp',
            }, { status: 400 })
        }

        if (method === 'email' && !patient?.email) {
            return NextResponse.json({
                error: 'Paciente sem e-mail cadastrado — impossível enviar por e-mail',
            }, { status: 400 })
        }

        // Generate PDF via internal call
        const baseUrl = request.nextUrl.origin
        const pdfResponse = await fetch(`${baseUrl}/api/prescriptions/${params.id}/pdf`, {
            headers: {
                'Cookie': request.headers.get('cookie') || '',
            },
        })

        if (!pdfResponse.ok) {
            return NextResponse.json({ error: 'Erro ao gerar PDF para envio' }, { status: 500 })
        }

        const pdfBuffer = await pdfResponse.arrayBuffer()

        // Send based on method
        let sendSuccess = false
        let sendError = ''

        if (method === 'whatsapp') {
            // Use existing WhatsApp integration
            try {
                const whatsappRes = await fetch(`${baseUrl}/api/whatsapp/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': request.headers.get('cookie') || '',
                    },
                    body: JSON.stringify({
                        phone: patient.phone,
                        message: `Olá ${patient.full_name}, segue sua prescrição médica em anexo.`,
                        clinic_id: profile.clinic_id,
                        // PDF attachment would require base64 encoding
                        attachment: {
                            filename: `prescricao_${params.id.substring(0, 8)}.pdf`,
                            data: Buffer.from(pdfBuffer).toString('base64'),
                            mimetype: 'application/pdf',
                        },
                    }),
                })

                sendSuccess = whatsappRes.ok
                if (!sendSuccess) {
                    const errData = await whatsappRes.json().catch(() => ({}))
                    sendError = (errData as any)?.error || 'Falha ao enviar WhatsApp'
                }
            } catch (err: any) {
                sendError = err.message || 'Erro no envio WhatsApp'
            }
        } else {
            // Email via SMTP
            try {
                const emailRes = await fetch(`${baseUrl}/api/auth/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': request.headers.get('cookie') || '',
                    },
                    body: JSON.stringify({
                        to: patient.email,
                        subject: 'Sua Prescrição Médica — CliniGo',
                        html: `
                            <p>Olá <strong>${patient.full_name}</strong>,</p>
                            <p>Segue em anexo sua prescrição médica.</p>
                            <p>Atenciosamente,<br/>Equipe CliniGo</p>
                        `,
                        attachments: [{
                            filename: `prescricao_${params.id.substring(0, 8)}.pdf`,
                            content: Buffer.from(pdfBuffer).toString('base64'),
                            encoding: 'base64',
                            contentType: 'application/pdf',
                        }],
                    }),
                })

                sendSuccess = emailRes.ok
                if (!sendSuccess) {
                    const errData = await emailRes.json().catch(() => ({}))
                    sendError = (errData as any)?.error || 'Falha ao enviar e-mail'
                }
            } catch (err: any) {
                sendError = err.message || 'Erro no envio de e-mail'
            }
        }

        // Even if send fails externally, we still mark it
        // (the integration might send asynchronously)
        const sentAt = new Date().toISOString()
        await supabaseAdmin
            .from('prescriptions')
            .update({
                status: 'SENT',
                sent_at: sentAt,
                sent_via: method,
                sent_by: user.id,
            } as Record<string, unknown>)
            .eq('id', params.id)

        if (!sendSuccess && sendError) {
            return NextResponse.json({
                success: true,
                warning: `Prescrição marcada como enviada, mas houve um problema no envio: ${sendError}`,
                data: { sent_at: sentAt, sent_via: method },
            })
        }

        return NextResponse.json({
            success: true,
            message: `Prescrição enviada por ${method === 'whatsapp' ? 'WhatsApp' : 'e-mail'} com sucesso`,
            data: { sent_at: sentAt, sent_via: method },
        })
    } catch (error: any) {
        console.error('[Prescriptions] Send error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
