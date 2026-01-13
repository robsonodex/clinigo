import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

const patientRegisterSchema = z.object({
    full_name: z.string().min(3, 'Nome completo é obrigatório'),
    cpf: z.string().min(11, 'CPF é obrigatório'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(10, 'Telefone é obrigatório'),
    date_of_birth: z.string().optional(),
    gender: z.string().optional(),
    address: z.object({
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
    }).optional(),
    // Clinic context (optional - for self-registration)
    clinic_id: z.string().uuid().optional(),
    clinic_slug: z.string().optional(),
})

// Validate CPF format
function validateCPF(cpf: string): boolean {
    const cleaned = cpf.replace(/\D/g, '')
    if (cleaned.length !== 11) return false
    if (/^(\d)\1+$/.test(cleaned)) return false
    // Basic validation - could be enhanced with checksum validation
    return true
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const data = patientRegisterSchema.parse(body)

        const cleanCPF = data.cpf.replace(/\D/g, '')

        if (!validateCPF(data.cpf)) {
            return NextResponse.json({
                success: false,
                error: { message: 'CPF inválido' }
            }, { status: 400 })
        }

        const supabaseAdmin = createServiceRoleClient() as any

        let clinicId = data.clinic_id
        let clinicName = 'CliniGo'

        // Get clinic from slug if provided
        if (!clinicId && data.clinic_slug) {
            const { data: clinic } = await supabaseAdmin
                .from('clinics')
                .select('id, name')
                .eq('slug', data.clinic_slug)
                .single()

            if (clinic) {
                clinicId = clinic.id
                clinicName = clinic.name
            }
        }

        // If from authenticated clinic admin
        if (!clinicId) {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data: currentUser } = await supabaseAdmin
                    .from('users')
                    .select('clinic_id, clinics!users_clinic_id_fkey(name)')
                    .eq('id', user.id)
                    .single()

                if (currentUser?.clinic_id) {
                    clinicId = currentUser.clinic_id
                    clinicName = (currentUser.clinics as any)?.name || 'CliniGo'
                }
            }
        }

        if (!clinicId) {
            return NextResponse.json({
                success: false,
                error: { message: 'Clínica não identificada. Acesse pelo link da sua clínica.' }
            }, { status: 400 })
        }

        // Check if patient already exists in this clinic
        const { data: existingPatient } = await supabaseAdmin
            .from('patients')
            .select('id, password_hash')
            .eq('clinic_id', clinicId)
            .eq('cpf', cleanCPF)
            .maybeSingle()

        if (existingPatient) {
            if (existingPatient.password_hash) {
                return NextResponse.json({
                    success: false,
                    error: { message: 'Este CPF já está cadastrado nesta clínica. Faça login ou recupere sua senha.' }
                }, { status: 400 })
            }
            // Patient exists but no password - update and send activation
        }

        let patientId = existingPatient?.id

        if (!patientId) {
            // Create patient
            const { data: patient, error: patientError } = await supabaseAdmin
                .from('patients')
                .insert({
                    clinic_id: clinicId,
                    cpf: cleanCPF,
                    full_name: data.full_name,
                    email: data.email.toLowerCase(),
                    phone: data.phone,
                    date_of_birth: data.date_of_birth,
                    gender: data.gender,
                    address: data.address || {},
                    activation_status: 'pending_activation'
                })
                .select()
                .single()

            if (patientError) {
                console.error('[PatientRegister] Patient creation error:', patientError)
                return NextResponse.json({
                    success: false,
                    error: { message: 'Erro ao criar paciente: ' + patientError.message }
                }, { status: 400 })
            }

            patientId = patient.id
        } else {
            // Update existing patient
            await supabaseAdmin
                .from('patients')
                .update({
                    full_name: data.full_name,
                    email: data.email.toLowerCase(),
                    phone: data.phone,
                    date_of_birth: data.date_of_birth,
                    gender: data.gender,
                    address: data.address || {},
                    activation_status: 'pending_activation'
                })
                .eq('id', patientId)
        }

        // Generate activation token (7 days)
        const activationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        await supabaseAdmin
            .from('activation_tokens')
            .insert({
                clinic_id: clinicId,
                email: data.email.toLowerCase(),
                token: activationToken,
                type: 'patient_activation',
                expires_at: expiresAt.toISOString()
            })

        // Send welcome email
        const { sendMail } = await import('@/lib/services/mail-service')
        const activationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/ativar-conta/${activationToken}`

        await sendMail({
            to: data.email,
            subject: `🩺 Bem-vindo à ${clinicName} - CliniGo`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                    <div style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🩺 Bem-vindo à ${clinicName}!</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
                        <p style="font-size: 18px; color: #1f2937;">Olá, <strong>${data.full_name}</strong>!</p>
                        <p style="color: #4b5563; line-height: 1.6;">
                            Você foi cadastrado na ${clinicName} através do CliniGo. Agora você pode agendar consultas online 24/7!
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${activationLink}" style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);">
                                👉 CRIAR SUA SENHA
                            </a>
                        </div>
                        
                        <div style="background: #faf5ff; border-radius: 10px; padding: 20px; margin: 20px 0;">
                            <h4 style="color: #7e22ce; margin: 0 0 10px 0;">📱 Dados de Acesso:</h4>
                            <p style="margin: 5px 0; color: #374151;"><strong>Portal:</strong> clinigo.app/paciente</p>
                            <p style="margin: 5px 0; color: #374151;"><strong>CPF:</strong> ${data.cpf}</p>
                            <p style="margin: 5px 0; color: #374151;"><strong>Senha:</strong> Criar no link acima</p>
                        </div>
                        
                        <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin: 20px 0;">
                            <h4 style="color: #166534; margin: 0 0 10px 0;">Com sua conta você pode:</h4>
                            <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li>✅ Agendar consultas online</li>
                                <li>✅ Ver histórico médico</li>
                                <li>✅ Receber lembretes automáticos</li>
                                <li>✅ Fazer teleconsultas</li>
                            </ul>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                            Este e-mail foi enviado pela ${clinicName} através do CliniGo.
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
                subject: `Bem-vindo - ${clinicName}`,
                template_used: 'PATIENT_WELCOME',
                status: 'sent',
                sent_at: new Date().toISOString(),
                clinic_id: clinicId
            })

        return NextResponse.json({
            success: true,
            message: 'Cadastro realizado! Verifique seu e-mail para criar sua senha.',
            patientId
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: { message: error.errors[0].message } }, { status: 400 })
        }
        console.error('[PatientRegister] Unexpected error:', error)
        return NextResponse.json({ success: false, error: { message: 'Erro interno no servidor' } }, { status: 500 })
    }
}
