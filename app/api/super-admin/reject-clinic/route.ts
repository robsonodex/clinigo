import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifySuperAdmin } from '@/lib/super-admin-middleware'
import { z } from 'zod'

const rejectSchema = z.object({
    clinicId: z.string().uuid('ID da clínica inválido'),
    reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
    try {
        // Verify Super Admin access
        const authResult = await verifySuperAdmin(request)
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { clinicId, reason } = rejectSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Get clinic and admin info
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('*, users!users_clinic_id_fkey(id, email, full_name)')
            .eq('id', clinicId)
            .eq('approval_status', 'pending_approval')
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json({
                success: false,
                error: { message: 'Clínica não encontrada ou já processada' }
            }, { status: 404 })
        }

        const adminUser = clinic.users?.[0]

        // Update clinic status
        const { error: updateError } = await supabase
            .from('clinics')
            .update({
                approval_status: 'rejected',
                rejection_reason: reason || 'Cadastro não aprovado',
                is_active: false
            })
            .eq('id', clinicId)

        if (updateError) {
            console.error('[RejectClinic] Update error:', updateError)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao rejeitar clínica' }
            }, { status: 500 })
        }

        // Send rejection email
        if (adminUser) {
            try {
                const { sendMail } = await import('@/lib/services/mail-service')

                await sendMail({
                    to: adminUser.email,
                    subject: '📋 Atualização sobre seu cadastro - CliniGo',
                    html: `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
                            <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                                <h1 style="color: white; margin: 0; font-size: 28px;">📋 Atualização de Cadastro</h1>
                            </div>
                            <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">Olá, <strong>${adminUser.full_name}</strong>,</p>
                                <p style="color: #4b5563; line-height: 1.6;">Agradecemos seu interesse no CliniGo. Após análise, não foi possível aprovar seu cadastro neste momento.</p>
                                
                                ${reason ? `
                                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0; color: #991b1b; font-size: 14px;">
                                        <strong>Motivo:</strong> ${reason}
                                    </p>
                                </div>
                                ` : ''}
                                
                                <p style="color: #4b5563; line-height: 1.6;">Se você acredita que houve um engano ou deseja mais informações, entre em contato conosco respondendo este e-mail.</p>
                                
                                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                                    Este e-mail foi enviado automaticamente pelo CliniGo.
                                </p>
                            </div>
                        </div>
                    `
                })

                // Log email
                await supabase
                    .from('email_logs')
                    .insert({
                        recipient: adminUser.email,
                        subject: 'Atualização de Cadastro - CliniGo',
                        template_used: 'CLINIC_REJECTED',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        clinic_id: clinic.id,
                        user_id: adminUser.id
                    })

            } catch (emailError) {
                console.error('[RejectClinic] Email error:', emailError)
                // Log failed email
                await supabase
                    .from('email_logs')
                    .insert({
                        recipient: adminUser.email,
                        subject: 'Atualização de Cadastro - CliniGo',
                        template_used: 'CLINIC_REJECTED',
                        status: 'failed',
                        error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
                        clinic_id: clinic.id
                    })
            }
        }

        return NextResponse.json({
            success: true,
            message: `Clínica "${clinic.name}" rejeitada.`
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: { message: error.errors[0].message }
            }, { status: 400 })
        }
        console.error('[RejectClinic] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno do servidor' }
        }, { status: 500 })
    }
}
