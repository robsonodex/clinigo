import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

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
    plan_type: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).optional(),
})

const EMAIL_ALREADY_EXISTS_ERROR = 'Este e-mail já está vinculado a uma clínica cadastrada. Por favor, use outro e-mail ou recupere sua senha.'
const CNPJ_ALREADY_EXISTS_ERROR = 'Este CNPJ já está cadastrado no sistema.'

// Validate CNPJ format
function validateCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/\D/g, '')
    if (cleaned.length !== 14) return false
    if (/^(\d)\1+$/.test(cleaned)) return false
    // Basic validation - could be enhanced with checksum validation
    return true
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const data = registerSchema.parse(body)

        const supabaseAdmin = createServiceRoleClient()

        // ============================================
        // EMAIL UNIQUENESS CHECK
        // ============================================
        const { data: existingUser } = await (supabaseAdmin as any)
            .from('users')
            .select('id')
            .eq('email', data.email.toLowerCase())
            .maybeSingle()

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: { message: EMAIL_ALREADY_EXISTS_ERROR } },
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
                { success: false, error: { message: EMAIL_ALREADY_EXISTS_ERROR } },
                { status: 400 }
            )
        }

        // ============================================
        // CNPJ UNIQUENESS CHECK (if provided)
        // ============================================
        if (data.cnpj) {
            const cleanCNPJ = data.cnpj.replace(/\D/g, '')

            if (!validateCNPJ(data.cnpj)) {
                return NextResponse.json(
                    { success: false, error: { message: 'CNPJ inválido' } },
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
                    { success: false, error: { message: CNPJ_ALREADY_EXISTS_ERROR } },
                    { status: 400 }
                )
            }
        }

        // ============================================
        // CREATE AUTH USER (without password yet - will set on activation)
        // ============================================
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: false, // Will confirm on activation
            user_metadata: { full_name: data.full_name }
        })

        if (authError) {
            console.error('[Register] Auth create error:', authError)
            if (authError.message?.includes('already') || authError.message?.includes('exists')) {
                return NextResponse.json(
                    { success: false, error: { message: EMAIL_ALREADY_EXISTS_ERROR } },
                    { status: 400 }
                )
            }
            return NextResponse.json({ success: false, error: { message: authError.message } }, { status: 400 })
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
                plan_type: data.plan_type || 'BASIC',
                is_active: false, // Not active until approved
                approval_status: 'pending_approval', // Key change!
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
                is_active: false, // Not active until approved
                activation_status: 'pending_activation'
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

        // Email 1: To Super Admin (notification of new clinic)
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER
        if (superAdminEmail) {
            const approveLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/super/clinicas-pendentes`

            await sendMail({
                to: superAdminEmail,
                subject: '🏥 Nova Clínica Aguardando Aprovação - CliniGo',
                html: `
                    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">🏥 Nova Clínica Aguardando Aprovação</h1>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
                            <h3 style="color: #1f2937; margin-top: 0;">📋 Dados do Cadastro:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr><td style="padding: 8px 0; color: #6b7280;">Clínica:</td><td style="padding: 8px 0; font-weight: bold;">${data.clinic_name}</td></tr>
                                <tr><td style="padding: 8px 0; color: #6b7280;">CNPJ:</td><td style="padding: 8px 0;">${data.cnpj || 'Não informado'}</td></tr>
                                <tr><td style="padding: 8px 0; color: #6b7280;">Responsável:</td><td style="padding: 8px 0;">${data.full_name}</td></tr>
                                <tr><td style="padding: 8px 0; color: #6b7280;">E-mail:</td><td style="padding: 8px 0;">${data.email}</td></tr>
                                <tr><td style="padding: 8px 0; color: #6b7280;">Telefone:</td><td style="padding: 8px 0;">${data.phone || data.responsible_phone || 'Não informado'}</td></tr>
                                <tr><td style="padding: 8px 0; color: #6b7280;">Plano:</td><td style="padding: 8px 0;">${data.plan_type || 'BASIC'}</td></tr>
                            </table>
                            <div style="text-align: center; margin: 25px 0;">
                                <a href="${approveLink}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
                                    👉 REVISAR E APROVAR
                                </a>
                            </div>
                        </div>
                    </div>
                `
            })
        }

        // Email 2: To Clinic (confirmation of registration received)
        await sendMail({
            to: data.email,
            subject: '✅ Cadastro Recebido - CliniGo',
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Cadastro Recebido!</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
                        <p style="font-size: 18px; color: #1f2937;">Olá, <strong>${data.full_name}</strong>!</p>
                        <p style="color: #4b5563; line-height: 1.6;">Seu cadastro foi recebido com sucesso e está em análise.</p>
                        
                        <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin: 20px 0;">
                            <h3 style="color: #166534; margin: 0 0 15px 0;">📋 Dados cadastrados:</h3>
                            <p style="margin: 5px 0; color: #374151;"><strong>Clínica:</strong> ${data.clinic_name}</p>
                            <p style="margin: 5px 0; color: #374151;"><strong>CNPJ:</strong> ${data.cnpj || 'Não informado'}</p>
                            <p style="margin: 5px 0; color: #374151;"><strong>Plano:</strong> ${data.plan_type || 'BASIC'}</p>
                        </div>
                        
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #92400e;">
                                ⏰ <strong>Prazo de análise:</strong> até 24 horas úteis
                            </p>
                        </div>
                        
                        <p style="color: #4b5563;">Você receberá um novo e-mail assim que seu cadastro for aprovado.</p>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                            Dúvidas? Responda este e-mail ou fale conosco no WhatsApp.
                        </p>
                    </div>
                </div>
            `
        })

        // Log emails
        try {
            await (supabaseAdmin as any)
                .from('email_logs')
                .insert([
                    {
                        recipient: superAdminEmail,
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
            message: 'Cadastro recebido! Você receberá um e-mail quando for aprovado.',
            redirectTo: '/aguardando-aprovacao'
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: { message: error.errors[0].message } }, { status: 400 })
        }
        console.error('[Register] Unexpected error:', error)
        return NextResponse.json({ success: false, error: { message: 'Erro interno no servidor' } }, { status: 500 })
    }
}
