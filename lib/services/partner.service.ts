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

        // 2. Create partner record
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
                commission_rate: 30.00,
                status: 'ACTIVE'
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

        return {
            success: true,
            partner_id: partner.id,
            referral_code: partner.referral_code
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
