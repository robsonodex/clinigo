/**
 * Partner Service - CliniGo
 * Handles partner registration, validation, and dashboard operations
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export interface PartnerRegistration {
    full_name: string
    email: string
    cpf: string
    phone: string
    pix_key_type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'
    pix_key: string
    cnpj?: string
    company_name?: string
    password: string
    confirm_password?: string // Only used for validation, not stored
    terms_accepted: boolean
    terms_accepted_ip?: string
}

export interface PartnerDashboard {
    partner_id: string
    full_name: string
    referral_code: string
    pix_key: string
    pix_key_type: string
    status: string
    commission_rate: number
    total_clinics: number
    active_clinics: number
    total_earned: number
    pending_commissions: number
    this_month_estimate: number
}

export interface PartnerClinic {
    id: string
    clinic_id: string
    referral_code_used: string
    status: string
    created_at: string
    clinic: {
        id: string
        name: string
        plan_type: string
        subscription_status?: string
    }
}

/**
 * Generate a unique referral code for a partner
 */
export async function generateReferralCode(fullName: string): Promise<string> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc('generate_referral_code', {
        p_name: fullName
    })

    if (error) {
        // Fallback: generate code locally
        const firstName = fullName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        return `${firstName}-${randomNum}`
    }

    return data
}

/**
 * Register a new partner
 */
export async function registerPartner(data: PartnerRegistration): Promise<{
    success: boolean
    partner_id?: string
    referral_code?: string
    error?: string
}> {
    const supabase = createServiceRoleClient()

    try {
        // 1. Generate referral code
        const referralCode = await generateReferralCode(data.full_name)

        // 2. Create Supabase auth user with password
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                role: 'PARTNER',
                full_name: data.full_name
            }
        })

        if (authError) {
            console.error('[PARTNER] Auth user creation error:', authError)

            if (authError.message.includes('already been registered')) {
                return { success: false, error: 'Este email já está cadastrado' }
            }

            return { success: false, error: 'Erro ao criar conta de usuário' }
        }

        // 3. Create partner record with terms acceptance and user_id
        const { data: partner, error: partnerError } = await supabase
            .from('partners')
            .insert({
                full_name: data.full_name,
                email: data.email,
                cpf: data.cpf,
                phone: data.phone,
                pix_key_type: data.pix_key_type,
                pix_key: data.pix_key,
                cnpj: data.cnpj || null,
                company_name: data.company_name || null,
                referral_code: referralCode,
                commission_rate: 35.00,
                status: 'ACTIVE',
                user_id: authUser.user.id, // Link to auth user
                terms_accepted_at: data.terms_accepted ? new Date().toISOString() : null,
                terms_version: '1.0',
                terms_accepted_ip: data.terms_accepted_ip || null
            })
            .select('id, referral_code')
            .single()

        if (partnerError) {
            console.error('[PARTNER] Registration error:', partnerError)

            // Handle duplicate errors
            if (partnerError.code === '23505') {
                if (partnerError.message.includes('email')) {
                    return { success: false, error: 'Este email já está cadastrado como parceiro' }
                }
                if (partnerError.message.includes('cpf')) {
                    return { success: false, error: 'Este CPF já está cadastrado como parceiro' }
                }
            }

            return { success: false, error: partnerError.message }
        }

        // 4. Update user_metadata to include partner_id for future auth checks
        await supabase.auth.admin.updateUserById(authUser.user.id, {
            user_metadata: {
                role: 'PARTNER',
                full_name: data.full_name,
                partner_id: partner?.id
            }
        })

        // 3. Send email notification to admin about new partner
        try {
            await sendPartnerRegistrationNotification({
                full_name: data.full_name,
                email: data.email,
                cpf: data.cpf,
                phone: data.phone,
                pix_key_type: data.pix_key_type,
                pix_key: data.pix_key,
                cnpj: data.cnpj,
                company_name: data.company_name,
                referral_code: partner?.referral_code || referralCode
            })
        } catch (emailError) {
            // Don't fail registration if email fails
            console.error('[PARTNER] Email notification error:', emailError)
        }

        return {
            success: true,
            partner_id: partner?.id,
            referral_code: partner?.referral_code
        }
    } catch (error: any) {
        console.error('[PARTNER] Registration exception:', error)
        return { success: false, error: error.message || 'Erro ao registrar parceiro' }
    }
}

/**
 * Get partner dashboard data
 */
export async function getPartnerDashboard(partnerId: string): Promise<PartnerDashboard | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('vw_partner_dashboard')
        .select('*')
        .eq('partner_id', partnerId)
        .single()

    if (error) {
        console.error('[PARTNER] Dashboard fetch error:', error)
        return null
    }

    return data as PartnerDashboard
}

/**
 * Validate a referral code
 */
export async function validateReferralCode(code: string): Promise<{
    valid: boolean
    partner: { id: string; full_name: string; referral_code: string } | null
}> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
        .from('partners')
        .select('id, full_name, referral_code, status')
        .eq('referral_code', code.toUpperCase())
        .eq('status', 'ACTIVE')
        .single()

    if (error || !data) {
        return { valid: false, partner: null }
    }

    return {
        valid: true,
        partner: {
            id: data.id,
            full_name: data.full_name,
            referral_code: data.referral_code
        }
    }
}

/**
 * Get clinics linked to a partner
 */
export async function getPartnerClinics(partnerId: string): Promise<PartnerClinic[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clinic_referrals')
        .select(`
            id,
            clinic_id,
            referral_code_used,
            status,
            created_at,
            clinic:clinics(
                id,
                name,
                plan_type,
                subscription_status
            )
        `)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[PARTNER] Clinics fetch error:', error)
        return []
    }

    return (data || []) as PartnerClinic[]
}

/**
 * Create clinic-partner referral link
 */
export async function createClinicReferral(
    clinicId: string,
    referralCode: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient()

    // 1. Validate referral code and get partner
    const validation = await validateReferralCode(referralCode)

    if (!validation.valid || !validation.partner) {
        return { success: false, error: 'Código de parceiro inválido' }
    }

    // 2. Create referral link
    const { error } = await supabase
        .from('clinic_referrals')
        .insert({
            clinic_id: clinicId,
            partner_id: validation.partner.id,
            referral_code_used: referralCode.toUpperCase(),
            status: 'PENDING'
        })

    if (error) {
        // Clinic already has a partner
        if (error.code === '23505') {
            return { success: false, error: 'Esta clínica já possui um parceiro vinculado' }
        }

        console.error('[PARTNER] Referral creation error:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Activate clinic referral after first payment
 */
export async function activateClinicReferral(clinicId: string): Promise<void> {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
        .from('clinic_referrals')
        .update({
            status: 'ACTIVE',
            first_payment_date: new Date().toISOString()
        })
        .eq('clinic_id', clinicId)
        .eq('status', 'PENDING')

    if (error) {
        console.error('[PARTNER] Referral activation error:', error)
    }
}

/**
 * Get partner by user ID
 */
export async function getPartnerByUserId(userId: string): Promise<{ id: string; referral_code: string } | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('partners')
        .select('id, referral_code')
        .eq('user_id', userId)
        .single()

    if (error || !data) {
        return null
    }

    return data
}

/**
 * Send email notification to admin when a new partner registers
 */
async function sendPartnerRegistrationNotification(partner: {
    full_name: string
    email: string
    cpf: string
    phone: string
    pix_key_type: string
    pix_key: string
    cnpj?: string
    company_name?: string
    referral_code: string
}): Promise<void> {
    const { sendMail } = await import('@/lib/services/mail-service')

    // Format CPF for display
    const formatCPF = (cpf: string) => {
        const cleaned = cpf.replace(/\D/g, '')
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }

    // Format phone for display
    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '')
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
        }
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }

    const registrationDate = new Date().toLocaleString('pt-BR', {
        dateStyle: 'full',
        timeStyle: 'short'
    })

    const adminEmail = process.env.ADMIN_EMAIL || 'contato@clinigo.app'

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Novo Parceiro Cadastrado</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #0f172a;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center; border-bottom: 1px solid #334155;">
            <h1 style="color: #14b8a6; margin: 0; font-size: 24px;">🎉 Novo Parceiro Cadastrado!</h1>
            <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">${registrationDate}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
            <h2 style="color: #f1f5f9; margin: 0 0 20px 0; font-size: 18px;">Dados do Parceiro</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8; width: 40%;">Nome Completo</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f1f5f9; font-weight: 500;">${partner.full_name}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8;">Email</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #14b8a6;">${partner.email}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8;">CPF</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f1f5f9;">${formatCPF(partner.cpf)}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8;">Telefone</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f1f5f9;">${formatPhone(partner.phone)}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8;">Código de Parceiro</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155;">
                        <span style="background-color: #14b8a6; color: #0f172a; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-family: monospace;">${partner.referral_code}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8;">Chave Pix (${partner.pix_key_type})</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f1f5f9;">${partner.pix_key}</td>
                </tr>
                ${partner.cnpj ? `
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8;">CNPJ</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f1f5f9;">${partner.cnpj}</td>
                </tr>
                ` : ''}
                ${partner.company_name ? `
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8;">Razão Social</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f1f5f9;">${partner.company_name}</td>
                </tr>
                ` : ''}
            </table>

            <!-- Info Box -->
            <div style="background-color: #14b8a6; background: linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(20, 184, 166, 0.05) 100%); border: 1px solid rgba(20, 184, 166, 0.3); border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="color: #14b8a6; margin: 0; font-size: 14px;">
                    ✅ <strong>Termos aceitos:</strong> O parceiro aceitou os termos de parceria comercial (versão 1.0)
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #0f172a; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
            <p style="color: #64748b; margin: 0; font-size: 12px;">
                CliniGo - Sistema de Gestão para Clínicas<br>
                Este é um email automático, não responda.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim()

    await sendMail({
        to: adminEmail,
        subject: `🤝 Novo Parceiro: ${partner.full_name} [${partner.referral_code}]`,
        html
    })

    console.log(`[PARTNER] Registration notification sent to ${adminEmail} for partner ${partner.referral_code}`)
}
