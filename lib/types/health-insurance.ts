/**
 * Health Insurance Types
 * Sistema de Convênios Médicos - CliniGo
 */

export type HealthInsuranceStatus = 'ACTIVE' | 'INACTIVE'
export type HealthInsurancePlanType = 'INDIVIDUAL' | 'EMPRESARIAL' | 'COLETIVO'
export type HealthInsuranceCoverageType = 'AMBULATORIAL' | 'HOSPITALAR' | 'COMPLETO'
export type PaymentType = 'PARTICULAR' | 'CONVENIO'

// =============================================================================
// OPERADORA (Health Insurance)
// =============================================================================

export interface HealthInsurance {
    id: string
    clinic_id: string
    name: string
    code: string | null
    phone: string | null
    email: string | null
    website: string | null
    notes: string | null
    logo_url: string | null
    tiss_version?: '4.01.00' | '4.02.00' | null
    status: HealthInsuranceStatus
    deleted_at: string | null
    created_at: string
    updated_at: string
    // Virtual fields
    plans_count?: number
}

export interface CreateHealthInsuranceData {
    name: string
    code?: string
    phone?: string
    email?: string
    notes?: string
}

export interface UpdateHealthInsuranceData {
    name?: string
    code?: string
    phone?: string
    email?: string
    notes?: string
    status?: HealthInsuranceStatus
}

// =============================================================================
// PLANO (Health Insurance Plan)
// =============================================================================

export interface HealthInsurancePlan {
    id: string
    health_insurance_id: string
    name: string
    code: string | null
    type: HealthInsurancePlanType
    coverage_type: HealthInsuranceCoverageType
    notes: string | null
    status: HealthInsuranceStatus
    deleted_at: string | null
    created_at: string
    updated_at: string
    // Joined fields
    health_insurance?: HealthInsurance
    doctors_count?: number
}

export interface CreateHealthInsurancePlanData {
    health_insurance_id: string
    name: string
    code?: string
    type?: HealthInsurancePlanType
    coverage_type?: HealthInsuranceCoverageType
    notes?: string
}

export interface UpdateHealthInsurancePlanData {
    name?: string
    code?: string
    type?: HealthInsurancePlanType
    coverage_type?: HealthInsuranceCoverageType
    notes?: string
    status?: HealthInsuranceStatus
}

// =============================================================================
// VÍNCULO MÉDICO-CONVÊNIO (Doctor Health Insurance)
// =============================================================================

export interface DoctorHealthInsurance {
    id: string
    doctor_id: string
    health_insurance_plan_id: string
    consultation_price: number
    accepts_new_patients: boolean
    notes: string | null
    status: HealthInsuranceStatus
    deleted_at: string | null
    created_at: string
    updated_at: string
    // Joined fields
    plan?: HealthInsurancePlan
    insurance?: HealthInsurance
    plan_name?: string
    plan_code?: string
    plan_type?: HealthInsurancePlanType
    coverage_type?: HealthInsuranceCoverageType
    insurance_id?: string
    insurance_name?: string
    insurance_code?: string
}

export interface CreateDoctorHealthInsuranceData {
    health_insurance_plan_id: string
    consultation_price: number
    accepts_new_patients?: boolean
    notes?: string
}

export interface UpdateDoctorHealthInsuranceData {
    consultation_price?: number
    accepts_new_patients?: boolean
    notes?: string
    status?: HealthInsuranceStatus
}

// =============================================================================
// APPOINTMENT INSURANCE DATA
// =============================================================================

export interface AppointmentInsuranceData {
    payment_type: PaymentType
    health_insurance_plan_id?: string
    insurance_card_number?: string
    insurance_card_validity?: string
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface HealthInsuranceWithPlans extends HealthInsurance {
    plans: HealthInsurancePlan[]
}

export interface DoctorWithInsurances {
    id: string
    user: {
        full_name: string
        avatar_url?: string
    }
    specialty: string
    crm: string
    crm_state: string
    insurances_count: number
    insurances?: DoctorHealthInsurance[]
}
