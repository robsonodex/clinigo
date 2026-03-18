import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

const inviteUserSchema = z.object({
    email: z.string().email('Email inválido'),
    name: z.string().min(3, 'Nome é obrigatório'),
    role: z.enum(['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'FINANCIAL', 'READONLY']),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const data = inviteUserSchema.parse(body)

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
                error: { message: 'Sua clínica precisa estar ativa para convidar usuários' }
            }, { status: 403 })
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

        // Create auth user first (required by FK constraint users_id_fkey -> auth.users)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email.toLowerCase(),
            email_confirm: true,
            user_metadata: { full_name: data.name }
        })

        if (authError) {
            console.error('[InviteUser] Auth user creation error:', authError)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao criar usuário no sistema: ' + authError.message }
            }, { status: 400 })
        }

        const tempUserId = authUser.user.id

        const { error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                id: tempUserId,
                email: data.email.toLowerCase(),
                full_name: data.name,
                role: data.role,
                clinic_id: currentUser.clinic_id,
                is_active: false,
                activation_status: 'pending_activation'
            })

        if (userError) {
            // Rollback: remove auth user if public.users insert fails
            await supabaseAdmin.auth.admin.deleteUser(tempUserId)
            console.error('[InviteUser] User creation error:', userError)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao criar usuário: ' + userError.message }
            }, { status: 400 })
        }

        // Generate activation token (7 days)
        const activationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        const { error: tokenError } = await supabaseAdmin
            .from('activation_tokens')
            .insert({
                user_id: tempUserId,
                clinic_id: currentUser.clinic_id,
                email: data.email.toLowerCase(),
                token: activationToken,
                type: 'team_invite',
                expires_at: expiresAt.toISOString()
            })

        if (tokenError) {
            // Rollback user
            await supabaseAdmin.from('users').delete().eq('id', tempUserId)
            await supabaseAdmin.auth.admin.deleteUser(tempUserId)
            console.error('[InviteUser] Token creation error:', tokenError)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao gerar link de convite: ' + tokenError.message }
            }, { status: 400 })
        }

        // Send invitation email
        const { sendMail } = await import('@/lib/services/mail-service')
        const activationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/ativar-conta/${activationToken}`

        const roleTranslates: Record<string, string> = {
            'CLINIC_ADMIN': 'Administrador',
            'RECEPTIONIST': 'Recepção',
            'DOCTOR': 'Médico(a)',
            'FINANCIAL': 'Financeiro',
            'READONLY': 'Apenas Leitura'
        }

        await sendMail({
            to: data.email,
            subject: `Você foi convidado para a clínica ${clinic.name} no CliniGo`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Bem-vindo ao CliniGo!</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
                        <p style="font-size: 18px; color: #1f2937;">Olá, <strong>${data.name}</strong>!</p>
                        <p style="color: #4b5563; line-height: 1.6;">
                            Você foi convidado pela clínica <strong>${clinic.name}</strong> para acessar o sistema com o perfil de <strong>${roleTranslates[data.role] || data.role}</strong>.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${activationLink}" style="background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                👉 CRIAR SUA SENHA E ACESSAR
                            </a>
                        </div>
                        
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #92400e; font-size: 14px;">
                                ⚠️ <strong>Este link expira em 7 dias.</strong>
                            </p>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px;">
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
                subject: `Convite CliniGo - ${clinic.name}`,
                template_used: 'USER_INVITE',
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
        console.error('[InviteUser] Unexpected error:', error)
        return NextResponse.json({ success: false, error: { message: 'Erro interno no servidor' } }, { status: 500 })
    }
}
