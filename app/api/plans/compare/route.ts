/**
 * API: Compare Plans
 * GET /api/plans/compare
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, BadRequestError } from '@/lib/utils/responses'
import { createClient } from '@/lib/supabase/server'

const PLAN_DETAILS = {
    STARTER: {
        name: 'Starter',
        price: 149,
        features: {
            max_doctors: 1,
            max_units: 1,
            basic_scheduling: true,
            basic_patients: true,
            basic_medical_records: true,
            tiss: false,
            whatsapp_auto: false,
            multi_unit: false,
            marketplace: false,
            crm: false,
            api_access: false,
        },
    },
    BASICO: {
        name: 'Básico',
        price: 299,
        features: {
            max_doctors: 3,
            max_units: 1,
            basic_scheduling: true,
            basic_patients: true,
            basic_medical_records: true,
            whatsapp_auto: true,
            marketplace: true,
            financial_basic: true,
            tiss: false,
            multi_unit: false,
            crm: false,
            api_access: false,
        },
    },
    AVANCADO: {
        name: 'Avançado',
        price: 549,
        popular: true,
        features: {
            max_doctors: 10,
            max_units: 3,
            basic_scheduling: true,
            basic_patients: true,
            basic_medical_records: true,
            whatsapp_auto: true,
            marketplace: true,
            financial_basic: true,
            tiss: true,
            multi_unit: true,
            crm: true,
            advanced_reports: true,
            telemedicine: true,
            api_access: false,
            sso: false,
        },
    },
    ENTERPRISE: {
        name: 'Enterprise',
        price: 799,
        features: {
            max_doctors: 999999,
            max_units: 999999,
            basic_scheduling: true,
            basic_patients: true,
            basic_medical_records: true,
            whatsapp_auto: true,
            marketplace: true,
            financial_basic: true,
            tiss: true,
            multi_unit: true,
            crm: true,
            advanced_reports: true,
            telemedicine: true,
            api_access: true,
            sso: true,
            white_label: true,
            custom_integrations: true,
            priority_support: true,
        },
    },
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            throw new BadRequestError('Not authenticated')
        }

        // Buscar clinic_id e plano atual
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!userData?.clinic_id) {
            throw new BadRequestError('User not associated with clinic')
        }

        const { data: clinic } = await supabase
            .from('clinics')
            .select('plan_type')
            .eq('id', userData.clinic_id)
            .single()

        return successResponse({
            current_plan: clinic?.plan_type || 'STARTER',
            plans: PLAN_DETAILS,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
