/**
 * POST /api/super-admin/reset-password - Reset user password (Super Admin only)
 * Generates a new password and sends email notification
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/utils/errors'
import crypto from 'crypto'

interface ResetPasswordRequest {
    userId?: string
    clinicId?: string  // Reset all users of a clinic
    email?: string
}

// Generate a secure random password
function generateSecurePassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const symbols = '!@#$%&*'
    const allChars = lowercase + uppercase + numbers + symbols

    let password = ''
    // Ensure at least one of each type
    password += lowercase[crypto.randomInt(lowercase.length)]
    password += uppercase[crypto.randomInt(uppercase.length)]
    password += numbers[crypto.randomInt(numbers.length)]
    password += symbols[crypto.randomInt(symbols.length)]

    // Fill the rest
    for (let i = password.length; i < length; i++) {
        password += allChars[crypto.randomInt(allChars.length)]
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
}

export async function POST(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')

        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem resetar senhas')
        }

        const body: ResetPasswordRequest = await request.json()
        const { userId, clinicId, email } = body

        if (!userId && !clinicId && !email) {
            throw new BadRequestError('Informe userId, clinicId ou email')
        }

        const supabase = createServiceRoleClient()

        // Find user(s) to reset
        let usersToReset: { id: string; email: string; full_name: string }[] = []

        if (userId) {
            const { data: user, error } = await supabase
                .from('users')
                .select('id, email, full_name')
                .eq('id', userId)
                .single()

            if (error || !user) {
                throw new NotFoundError('Usuário')
            }
            usersToReset = [user as any]
        } else if (email) {
            const { data: user, error } = await supabase
                .from('users')
                .select('id, email, full_name')
                .eq('email', email)
                .single()

            if (error || !user) {
                throw new NotFoundError('Usuário com este email')
            }
            usersToReset = [user as any]
        } else if (clinicId) {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, email, full_name')
                .eq('clinic_id', clinicId)

            if (error || !users || users.length === 0) {
                throw new NotFoundError('Usuários desta clínica')
            }
            usersToReset = users as any[]
        }

        const results: {
            userId: string
            email: string
            fullName: string
            newPassword: string
            success: boolean
            error?: string
        }[] = []

        for (const user of usersToReset) {
            const newPassword = generateSecurePassword(12)

            try {
                // Update password in Supabase Auth
                const { error: updateError } = await supabase.auth.admin.updateUserById(
                    user.id,
                    { password: newPassword }
                )

                if (updateError) {
                    results.push({
                        userId: user.id,
                        email: user.email,
                        fullName: user.full_name,
                        newPassword: '',
                        success: false,
                        error: updateError.message
                    })
                    continue
                }

                // Send email notification using nodemailer directly (system email)
                try {
                    const nodemailer = await import('nodemailer')

                    const transporter = nodemailer.default.createTransport({
                        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
                        port: parseInt(process.env.SMTP_PORT || '587'),
                        secure: process.env.SMTP_PORT === '465',
                        auth: {
                            user: process.env.SMTP_USER || 'apikey',
                            pass: process.env.SMTP_PASSWORD || '',
                        },
                    })

                    await transporter.sendMail({
                        from: `"CliniGo" <${process.env.SMTP_FROM_EMAIL || 'contato@clinigo.app'}>`,
                        to: user.email,
                        subject: 'CliniGo - Sua senha foi redefinida',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
                                    <h1 style="color: white; margin: 0;">CliniGo</h1>
                                </div>
                                
                                <div style="padding: 30px; background: #f9fafb;">
                                    <h2 style="color: #1f2937;">Olá, ${user.full_name}!</h2>
                                    
                                    <p style="color: #4b5563;">Sua senha foi redefinida pelo administrador do sistema.</p>
                                    
                                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                                        <p style="margin: 0; color: #6b7280;">Sua nova senha:</p>
                                        <p style="font-size: 24px; font-weight: bold; color: #10b981; margin: 10px 0; font-family: monospace;">
                                            ${newPassword}
                                        </p>
                                    </div>
                                    
                                    <p style="color: #ef4444; font-weight: bold;">
                                        ⚠️ Por segurança, altere sua senha após o primeiro login.
                                    </p>
                                    
                                    <a href="https://www.clinigo.app/login" 
                                       style="display: inline-block; background: #10b981; color: white; 
                                              padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                                        Acessar CliniGo
                                    </a>
                                </div>
                                
                                <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                                    <p>Este é um email automático, não responda.</p>
                                    <p>© ${new Date().getFullYear()} CliniGo - Gestão Inteligente de Clínicas</p>
                                </div>
                            </div>
                        `
                    })
                } catch (emailError) {
                    console.error('Erro ao enviar email:', emailError)
                    // Continue - password was reset successfully
                }

                results.push({
                    userId: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    newPassword,
                    success: true
                })

            } catch (err: any) {
                results.push({
                    userId: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    newPassword: '',
                    success: false,
                    error: err.message
                })
            }
        }

        // Create audit log
        try {
            const { createAuditLog } = await import('@/lib/services/audit')
            await createAuditLog({
                action: `Senhas resetadas para ${results.filter(r => r.success).length} usuário(s)`,
                entityType: 'users',
                entityId: results[0]?.userId || 'multiple',
                severity: 'WARNING',
                metadata: {
                    users_reset: results.filter(r => r.success).map(r => r.email),
                    users_failed: results.filter(r => !r.success).map(r => r.email),
                    reset_by: 'SUPER_ADMIN',
                    reset_at: new Date().toISOString()
                }
            })
        } catch (auditError) {
            console.error('Erro ao criar log de auditoria:', auditError)
        }

        const successCount = results.filter(r => r.success).length
        const failCount = results.filter(r => !r.success).length

        return NextResponse.json({
            success: true,
            message: `${successCount} senha(s) resetada(s) com sucesso${failCount > 0 ? `, ${failCount} falha(s)` : ''}`,
            results,
            summary: {
                total: results.length,
                success: successCount,
                failed: failCount
            }
        })

    } catch (error) {
        return handleApiError(error)
    }
}
