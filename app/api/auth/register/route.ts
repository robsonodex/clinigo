import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isValidCPF } from '@/lib/utils/cpf'

// Validation schema for clinic registration
const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    full_name: z.string().min(3, 'Nome completo é obrigatório'),
    clinic_name: z.string().min(3, 'Nome da clínica é obrigatório'),
    cnpj: z.string().optional(),
    phone: z.string().optional(),
    responsible_phone: z.string().optional(),
    address: z.object({
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
    }).optional(),
    plan_type: z.enum(['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
})

const TRIAL_ALREADY_EXISTS_ERROR = 'Já existe ou esse e-mail, CPF, ou telefone já fez um teste grátis. Para usar adquira um plano.'

// Validate CNPJ format
function validateCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/\D/g, '')
    if (cleaned.length !== 14) return false
    if (/^(\d)\1+$/.test(cleaned)) return false
    return true
}

// Validate CPF or CNPJ format
function validateCPForCNPJ(value: string): boolean {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 11) {
        return isValidCPF(cleaned)
    } else if (cleaned.length === 14) {
        return validateCNPJ(cleaned)
    }
    return false
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const data = registerSchema.parse(body)

        const supabaseAdmin = createServiceRoleClient()

        // ============================================
        // 1. EMAIL UNIQUENESS CHECK
        // ============================================
        const { data: existingUser } = await (supabaseAdmin as any)
            .from('users')
            .select('id')
            .eq('email', data.email.toLowerCase())
            .maybeSingle()

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: { message: TRIAL_ALREADY_EXISTS_ERROR } },
                { status: 400 }
            )
        }

        const { data: existingClinic } = await (supabaseAdmin as any)
            .from('clinics')
            .select('id')
            .eq('email', data.email.toLowerCase())
            .maybeSingle()

        if (existingClinic) {
            return NextResponse.json(
                { success: false, error: { message: TRIAL_ALREADY_EXISTS_ERROR } },
                { status: 400 }
            )
        }

        // ============================================
        // 2. CPF/CNPJ MANDATORY & UNIQUENESS CHECK
        // ============================================
        if (!data.cnpj) {
            return NextResponse.json(
                { success: false, error: { message: 'CPF ou CNPJ é obrigatório para iniciar o teste grátis.' } },
                { status: 400 }
            )
        }

        const cleanCNPJ = data.cnpj.replace(/\D/g, '')

        if (!validateCPForCNPJ(data.cnpj)) {
            return NextResponse.json(
                { success: false, error: { message: 'CPF ou CNPJ inválido.' } },
                { status: 400 }
            )
        }

        const { data: existingCNPJ } = await (supabaseAdmin as any)
            .from('clinics')
            .select('id')
            .eq('cnpj', cleanCNPJ)
            .maybeSingle()

        if (existingCNPJ) {
            return NextResponse.json(
                { success: false, error: { message: TRIAL_ALREADY_EXISTS_ERROR } },
                { status: 400 }
            )
        }

        // ============================================
        // 3. PHONE UNIQUENESS CHECK
        // ============================================
        if (data.phone) {
            const cleanPhone = data.phone.replace(/\D/g, '')
            if (cleanPhone.length >= 8) {
                const formattedPhone1 = cleanPhone.length === 11 
                    ? `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}` 
                    : `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
                
                const { data: existingPhoneClinic } = await (supabaseAdmin as any)
                    .from('clinics')
                    .select('id')
                    .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone1}`)
                    .maybeSingle()

                if (existingPhoneClinic) {
                    return NextResponse.json(
                        { success: false, error: { message: TRIAL_ALREADY_EXISTS_ERROR } },
                        { status: 400 }
                    )
                }
            }
        }

        // ============================================
        // CREATE AUTH USER (auto-confirmed for trial access)
        // ============================================
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true, // Auto-confirm for trial - user can login immediately
            user_metadata: { full_name: data.full_name }
        })

        if (authError) {
            console.error('[Register] Auth create error:', authError)
            if (authError.message?.includes('already') || authError.message?.includes('exists') || authError.message?.includes('User already registered')) {
                return NextResponse.json(
                    { success: false, error: { message: TRIAL_ALREADY_EXISTS_ERROR } },
                    { status: 400 }
                )
            }
            return NextResponse.json({ success: false, error: { message: 'Database error creating new user' } }, { status: 400 })
        }
        if (!authUser.user) {
            return NextResponse.json({ success: false, error: { message: 'Failed to create user' } }, { status: 500 })
        }

        // ============================================
        // CREATE CLINIC with PENDING_APPROVAL status
        // ============================================
        const slug = data.clinic_name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')

        let finalSlug = slug
        for (let i = 0; i < 3; i++) {
            const { data: existing } = await (supabaseAdmin as any).from('clinics').select('id').eq('slug', finalSlug).single()
            if (!existing) break
            finalSlug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
        }

        // Calculate trial end date (7 days from now)
        const trialEndsAt = new Date()
        trialEndsAt.setDate(trialEndsAt.getDate() + 7)

        const { data: clinic, error: clinicError } = await (supabaseAdmin as any)
            .from('clinics')
            .insert({
                name: data.clinic_name,
                slug: finalSlug,
                email: data.email.toLowerCase(),
                cnpj: data.cnpj?.replace(/\D/g, ''),
                phone: data.phone,
                responsible_name: data.full_name,
                responsible_phone: data.responsible_phone || data.phone,
                address: data.address || {},
                plan_type: data.plan_type || 'STARTER', // Default to STARTER for trial
                is_active: true, // Active for trial period!
                trial_ends_at: trialEndsAt.toISOString(), // Trial expiration
                approval_status: 'trial', // Trial status
            })
            .select()
            .single()

        if (clinicError) {
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            console.error('[Register] Clinic create error:', clinicError)
            return NextResponse.json({ success: false, error: { message: 'Erro ao criar clínica: ' + clinicError.message } }, { status: 400 })
        }

        // ============================================
        // CREATE USER PROFILE
        // ============================================
        const { error: profileError } = await (supabaseAdmin as any)
            .from('users')
            .insert({
                id: authUser.user.id,
                email: data.email.toLowerCase(),
                full_name: data.full_name,
                role: 'CLINIC_ADMIN',
                clinic_id: clinic?.id,
                is_active: true, // Active for trial!
                activation_status: 'active'
            })

        if (profileError) {
            await (supabaseAdmin as any).from('clinics').delete().eq('id', clinic?.id)
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            console.error('[Register] Profile create error:', profileError)
            return NextResponse.json({ success: false, error: { message: 'Erro ao criar perfil: ' + profileError.message } }, { status: 400 })
        }

        // ============================================
        // SEND EMAILS
        // ============================================
        const { sendMail } = await import('@/lib/services/mail-service')

        // Email 1: To Super Admin (notificação de novo trial de 7 dias para os e-mails informados)
        const emailsToNotify = ['contato@clinigo.app', 'contato.clinigo@gmail.com']
        const approveLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'}/dashboard/super/clinicas-pendentes`

        const notificationHtml = `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Novo Cliente Trial 7 Dias</h1>
                </div>
                <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
                    <h3 style="color: #1f2937; margin-top: 0;">Dados do Cadastro:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #6b7280;">Responsável:</td><td style="padding: 8px 0; font-weight: bold;">${data.full_name}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Nome da Clínica/Consultório:</td><td style="padding: 8px 0; font-weight: bold;">${data.clinic_name}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">E-mail:</td><td style="padding: 8px 0;">${data.email}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">WhatsApp/Telefone:</td><td style="padding: 8px 0; font-weight: bold;">${data.phone || 'Não informado'}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Plano:</td><td style="padding: 8px 0;">${data.plan_type || 'AVANCADO'}</td></tr>
                    </table>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${approveLink}" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
                            GERENCIAR NO PAINEL SUPER ADMIN
                        </a>
                    </div>
                </div>
            </div>
        `

        for (const email of emailsToNotify) {
            try {
                await sendMail({
                    to: email,
                    subject: `🎁 Novo Cliente Trial 7 Dias - ${data.full_name}`,
                    html: notificationHtml
                })
            } catch (mailErr) {
                console.error(`[Register] Erro ao enviar e-mail de notificação para ${email}:`, mailErr)
            }
        }

        // ============================================
        // WHATSAPP NOTIFICATION
        // ============================================
        try {
            const { sendWhatsAppToLeadAdmin } = await import('@/lib/whatsapp/service')
            const waMessage = `🎁 *Novo Cliente Trial (7 Dias) se cadastrou!* 🎁\n\n` +
                `👤 *Nome:* ${data.full_name}\n` +
                `🏥 *Clínica/Consultório:* ${data.clinic_name}\n` +
                `📧 *E-mail:* ${data.email}\n` +
                `📱 *WhatsApp do cliente:* ${data.phone || 'Não informado'}\n\n` +
                `🚀 _Acesse em segundos. Sem cartão._`

            await sendWhatsAppToLeadAdmin(waMessage, 'trial-notification')
            console.log('[Register] WhatsApp lead notification successfully dispatched to (21) 96557-2247')
        } catch (waError) {
            console.error('[Register] Failed to send WhatsApp notification:', waError)
        }

        // Email 2: To Clinic (Welcome with trial access and password)
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'}/clinica`
        const trialEndFormatted = trialEndsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

        console.log('[Register] Sending welcome email to:', data.email)
        const bccList = ['contato.clinigo@gmail.com', 'robson.e.cleiniane@gmail.com', 'contato@clinigo.app']
        const welcomeEmailResult = await sendMail({
            to: data.email,
            bcc: bccList,
            subject: 'Bem-vindo ao CliniGo! Seu teste grátis começou',
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Bem-vindo ao CliniGo!</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
                        <p style="font-size: 18px; color: #1f2937;">Olá, <strong>${data.full_name}</strong>!</p>
                        <p style="color: #4b5563; line-height: 1.6;">Sua conta foi criada com sucesso! Você tem <strong>7 dias de teste grátis</strong> para explorar todas as funcionalidades.</p>
                        
                        <div style="background: #dbeafe; border-radius: 10px; padding: 20px; margin: 20px 0; border: 2px solid #3b82f6;">
                            <h3 style="color: #1e40af; margin: 0 0 15px 0;">Seus dados de acesso:</h3>
                            <p style="margin: 5px 0; color: #1f2937;"><strong>E-mail:</strong> ${data.email}</p>
                            <p style="margin: 5px 0; color: #1f2937;"><strong>Senha:</strong> ${data.password}</p>
                            <p style="margin: 5px 0; color: #1f2937;"><strong>Clínica:</strong> ${data.clinic_name}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${loginUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 16px;">
                                ACESSAR MINHA CLÍNICA
                            </a>
                        </div>
                        
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #92400e;">
                                <strong>Teste válido até:</strong> ${trialEndFormatted}
                            </p>
                            <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">
                                Após esse prazo, escolha um plano para continuar usando.
                            </p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                            Por segurança, recomendamos que você altere sua senha no primeiro acesso.<br>
                            Dúvidas? Responda este e-mail ou fale conosco no WhatsApp.
                        </p>
                    </div>
                </div>
            `
        })
        console.log('[Register] Welcome email result:', welcomeEmailResult)

        // Log emails
        try {
            await (supabaseAdmin as any)
                .from('email_logs')
                .insert([
                    {
                        recipient: emailsToNotify[0],
                        subject: 'Nova Clínica Aguardando Aprovação',
                        template_used: 'CLINIC_PENDING_ADMIN',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        clinic_id: clinic.id
                    },
                    {
                        recipient: data.email,
                        subject: 'Cadastro Recebido',
                        template_used: 'CLINIC_PENDING_USER',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        clinic_id: clinic.id,
                        user_id: authUser.user.id
                    }
                ])
        } catch (logError) {
            console.error('[Register] Email log error:', logError)
        }

        return NextResponse.json({
            success: true,
            message: 'Conta criada com sucesso! Seu teste grátis de 7 dias começou. Verifique seu e-mail para os dados de acesso.',
            redirectTo: '/login?trial=success'
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: { message: error.errors[0].message } }, { status: 400 })
        }
        console.error('[Register] Unexpected error:', error)
        return NextResponse.json({ success: false, error: { message: 'Erro interno no servidor' } }, { status: 500 })
    }
}
