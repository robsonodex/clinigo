import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const activateAccountSchema = z.object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token, password } = activateAccountSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Find valid activation token
        const { data: tokenData, error: tokenError } = await supabase
            .from('activation_tokens')
            .select('*')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (tokenError || !tokenData) {
            console.log('[ActivateAccount] Invalid or expired token')
            return NextResponse.json({
                success: false,
                error: {
                    message: 'Link de ativação inválido ou expirado. Entre em contato com o suporte.',
                    code: 'INVALID_TOKEN'
                }
            }, { status: 400 })
        }

        let userId = tokenData.user_id
        let redirectPath = '/login'

        // Handle different token types
        switch (tokenData.type) {
            case 'clinic_activation':
                // Clinic admin activation - user already exists in Supabase Auth
                if (!userId) {
                    // Need to create auth user for clinic
                    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                        email: tokenData.email,
                        password,
                        email_confirm: true
                    })

                    if (authError) {
                        console.error('[ActivateAccount] Auth user creation error:', authError)
                        return NextResponse.json({
                            success: false,
                            error: { message: 'Erro ao criar conta. Tente novamente.' }
                        }, { status: 500 })
                    }

                    userId = authUser.user.id

                    // Update user record with auth id
                    await supabase
                        .from('users')
                        .update({ id: userId })
                        .eq('email', tokenData.email)
                } else {
                    // Update existing auth user password
                    const { error: updateError } = await supabase.auth.admin.updateUserById(
                        userId,
                        { password }
                    )

                    if (updateError) {
                        console.error('[ActivateAccount] Password update error:', updateError)
                        return NextResponse.json({
                            success: false,
                            error: { message: 'Erro ao definir senha. Tente novamente.' }
                        }, { status: 500 })
                    }
                }

                // Activate clinic
                if (tokenData.clinic_id) {
                    await supabase
                        .from('clinics')
                        .update({
                            approval_status: 'active',
                            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
                        })
                        .eq('id', tokenData.clinic_id)
                }

                // Activate user
                await supabase
                    .from('users')
                    .update({ activation_status: 'active' })
                    .eq('id', userId)

                redirectPath = '/dashboard'
                break

            case 'doctor_invite':
                // Doctor activation - create auth user and update status
                if (!userId) {
                    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                        email: tokenData.email,
                        password,
                        email_confirm: true
                    })

                    if (authError) {
                        console.error('[ActivateAccount] Doctor auth creation error:', authError)
                        return NextResponse.json({
                            success: false,
                            error: { message: 'Erro ao criar conta. Tente novamente.' }
                        }, { status: 500 })
                    }

                    userId = authUser.user.id
                }

                // Update user record
                await supabase
                    .from('users')
                    .update({
                        id: userId,
                        activation_status: 'active'
                    })
                    .eq('email', tokenData.email)

                redirectPath = '/dashboard'
                break

            case 'patient_activation':
                // Patient activation - hash password and store (patients use JWT, not Supabase auth)
                const bcrypt = await import('bcryptjs')
                const hashedPassword = await bcrypt.hash(password, 12)

                await supabase
                    .from('patients')
                    .update({
                        password_hash: hashedPassword,
                        activation_status: 'active'
                    })
                    .eq('email', tokenData.email)
                    .eq('clinic_id', tokenData.clinic_id)

                redirectPath = '/paciente'
                break

            default:
                return NextResponse.json({
                    success: false,
                    error: { message: 'Tipo de token inválido' }
                }, { status: 400 })
        }

        // Mark token as used
        await supabase
            .from('activation_tokens')
            .update({
                used: true,
                used_at: new Date().toISOString()
            })
            .eq('id', tokenData.id)

        return NextResponse.json({
            success: true,
            message: 'Conta ativada com sucesso!',
            redirectPath
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: { message: error.errors[0].message }
            }, { status: 400 })
        }
        console.error('[ActivateAccount] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno do servidor' }
        }, { status: 500 })
    }
}

// GET endpoint to validate activation token
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json({
                valid: false,
                error: 'Token não fornecido'
            }, { status: 400 })
        }

        const supabase = createServiceRoleClient()

        const { data: tokenData, error } = await supabase
            .from('activation_tokens')
            .select('type, email, expires_at')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (error || !tokenData) {
            return NextResponse.json({
                valid: false,
                error: 'Token inválido ou expirado'
            })
        }

        return NextResponse.json({
            valid: true,
            type: tokenData.type,
            email: tokenData.email
        })

    } catch (error) {
        console.error('[ActivateAccount] Token validation error:', error)
        return NextResponse.json({
            valid: false,
            error: 'Erro ao validar token'
        }, { status: 500 })
    }
}
