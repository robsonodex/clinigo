import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

const inviteDoctorSchema = z.object({
    email: z.string().email('Email inválido'),
    full_name: z.string().min(3, 'Nome completo é obrigatório'),
    crm: z.string().min(4, 'CRM é obrigatório'),
    crm_state: z.string().length(2, 'UF do CRM deve ter 2 caracteres'),
    specialty: z.string().min(3, 'Especialidade é obrigatória'),
    consultation_price: z.number().min(0, 'Valor da consulta é obrigatório'),
    phone: z.string().optional(),
    bio: z.string().optional(),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const data = inviteDoctorSchema.parse(body)

        // Get current user and clinic
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ success: false, error: { message: 'Não autenticado' } }, { status: 401 })
        }

        const supabaseAdmin = createServiceRoleClient() as any

        // Get clinic info
        const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('clinic_id, clinics!users_clinic_id_fkey(name, approval_status)')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ success: false, error: { message: 'Clínica não encontrada' } }, { status: 400 })
        }

        const clinic = currentUser.clinics as any

        // Check if clinic is active
        if (clinic?.approval_status !== 'active' && clinic?.approval_status !== 'trial') {
            return NextResponse.json({
                success: false,
                error: { message: 'Sua clínica precisa estar ativa para convidar médicos' }
            }, { status: 403 })
        }

        // Check if CRM already exists in this clinic
        const { data: existingDoctor } = await supabaseAdmin
            .from('doctors')
            .select('id')
            .eq('clinic_id', currentUser.clinic_id)
            .eq('crm', data.crm)
            .maybeSingle()

        if (existingDoctor) {
            return NextResponse.json({
                success: false,
                error: { message: 'Este CRM já está cadastrado nesta clínica' }
            }, { status: 400 })
        }

        // Check if email already exists
        const { data: existingEmail } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', data.email.toLowerCase())
            .maybeSingle()

        if (existingEmail) {
            return NextResponse.json({
                success: false,
                error: { message: 'Este e-mail já está cadastrado no sistema' }
            }, { status: 400 })
        }

        // Create temporary user record (without auth - will be created on activation)
        const tempUserId = crypto.randomUUID()

        const { error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                id: tempUserId,
                email: data.email.toLowerCase(),
                full_name: data.full_name,
                role: 'DOCTOR',
                clinic_id: currentUser.clinic_id,
                phone: data.phone,
                is_active: false,
                activation_status: 'pending_activation'
            })

        if (userError) {
            console.error('[InviteDoctor] User creation error:', userError)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao criar usuário: ' + userError.message }
            }, { status: 400 })
        }

        // Create doctor record
        const { error: doctorError } = await supabaseAdmin
            .from('doctors')
            .insert({
                user_id: tempUserId,
                clinic_id: currentUser.clinic_id,
                crm: data.crm,
                crm_state: data.crm_state.toUpperCase(),
                specialty: data.specialty,
                consultation_price: data.consultation_price,
                bio: data.bio,
                is_accepting_appointments: true
            })

        if (doctorError) {
            // Rollback user
            await supabaseAdmin.from('users').delete().eq('id', tempUserId)
            console.error('[InviteDoctor] Doctor creation error:', doctorError)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao criar médico: ' + doctorError.message }
            }, { status: 400 })
        }

        // Generate activation token (7 days)
        const activationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        await supabaseAdmin
            .from('activation_tokens')
            .insert({
                user_id: tempUserId,
                clinic_id: currentUser.clinic_id,
                email: data.email.toLowerCase(),
                token: activationToken,
                type: 'doctor_invite',
                expires_at: expiresAt.toISOString()
            })

        // Send invitation email
        const { sendMail } = await import('@/lib/services/mail-service')
        const activationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/ativar-conta/${activationToken}`

        await sendMail({
            to: data.email,
            subject: `👨‍⚕️ Você foi cadastrado no CliniGo - ${clinic.name}`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">👨‍⚕️ Bem-vindo ao CliniGo!</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
                        <p style="font-size: 18px; color: #1f2937;">Olá, Dr(a). <strong>${data.full_name}</strong>!</p>
                        <p style="color: #4b5563; line-height: 1.6;">
                            Você foi cadastrado como médico na plataforma CliniGo pela clínica <strong>${clinic.name}</strong>.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${activationLink}" style="background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                👉 CRIAR SEU ACESSO
                            </a>
                        </div>
                        
                        <div style="background: #eff6ff; border-radius: 10px; padding: 20px; margin: 20px 0;">
                            <h4 style="color: #1e40af; margin: 0 0 10px 0;">Após criar sua senha, você terá acesso a:</h4>
                            <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li>Agenda de consultas</li>
                                <li>Prontuário eletrônico</li>
                                <li>Prescrição digital</li>
                                <li>Telemedicina</li>
                            </ul>
                        </div>
                        
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #92400e; font-size: 14px;">
                                ⚠️ <strong>Este link expira em 7 dias.</strong>
                            </p>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px;">
                            <strong>Portal de acesso:</strong> clinigo.app/medico<br>
                            <strong>E-mail de login:</strong> ${data.email}
                        </p>
                    </div>
                </div>
            `
        })

        // Log email
        await supabaseAdmin
            .from('email_logs')
            .insert({
                recipient: data.email,
                subject: `Convite de Médico - ${clinic.name}`,
                template_used: 'DOCTOR_INVITE',
                status: 'sent',
                sent_at: new Date().toISOString(),
                clinic_id: currentUser.clinic_id,
                user_id: tempUserId
            })

        return NextResponse.json({
            success: true,
            message: `Convite enviado para ${data.email}!`
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: { message: error.errors[0].message } }, { status: 400 })
        }
        console.error('[InviteDoctor] Unexpected error:', error)
        return NextResponse.json({ success: false, error: { message: 'Erro interno no servidor' } }, { status: 500 })
    }
}
