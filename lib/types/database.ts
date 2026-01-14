/**
 * Database Type Definitions
 * TypeScript interfaces for Supabase database tables
 */

// Financial Types
export interface FinancialEntry {
    id: string
    clinic_id: string
    type: 'income' | 'expense'
    amount: number
    description: string | null
    category: string | null
    payment_method: string | null
    appointment_id: string | null
    created_by: string
    date: string
    payment_proof_url: string | null
    cancelled_by: string | null
    cancellation_reason: string | null
    cancelled_at: string | null
    created_at: string
    updated_at: string
}

// Appointment Types
export interface Appointment {
    id: string
    clinic_id: string
    patient_id: string
    doctor_id: string
    appointment_date: string
    scheduled_at: string
    duration: number
    status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
    appointment_type: string | null
    notes: string | null
    checked_in_at: string | null
    checked_in_by: string | null
    priority_level: number
    waiting_room_notes: string | null
    ticket_number: string | null
    created_at: string
    updated_at: string
}

// Patient Types
export interface Patient {
    id: string
    clinic_id: string | null
    full_name: string
    cpf: string | null
    rg: string | null
    birth_date: string | null
    gender: string | null
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    state: string | null
    zip_code: string | null
    health_insurance: string | null
    insurance_number: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

// Walk-in Registration Types
export interface WalkInRegistration {
    id: string
    patient_id: string
    doctor_id: string | null
    created_by: string | null
    urgency_level: 'normal' | 'priority' | 'urgent'
    reason: string | null
    status: 'waiting' | 'triage' | 'in_service' | 'completed' | 'cancelled'
    arrival_time: string
    triage_start_time: string | null
    service_start_time: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
    notes: string | null
}

// Document Types
export interface PatientDocument {
    id: string
    patient_id: string
    uploaded_by: string | null
    file_name: string
    file_url: string
    file_size: number | null
    file_type: string | null
    category: string | null
    tags: string[] | null
    description: string | null
    created_at: string
    updated_at: string
}

// User/Profile Types
export interface UserProfile {
    id: string
    email: string
    role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'PATIENT'
    clinic_id: string | null
    name: string | null
    created_at: string
    updated_at: string
}

// Medical Record Types
export interface MedicalRecord {
    id: string
    patient_id: string
    doctor_id: string
    clinic_id: string
    appointment_id: string | null
    consultation_date: string
    chief_complaint: string | null
    history_present_illness: string | null
    physical_examination: string | null
    diagnosis: string | null
    treatment_plan: string | null
    prescriptions: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

// Security Types
export interface LoginAttempt {
    id: string
    email: string
    ip_address: string | null
    success: boolean
    failure_reason: string | null
    user_agent: string | null
    created_at: string
}

export interface LGPDConsent {
    id: string
    patient_id: string | null
    consent_type: 'data_processing' | 'marketing' | 'data_sharing'
    granted: boolean
    granted_at: string | null
    revoked_at: string | null
    ip_address: string | null
    created_at: string
    updated_at: string
}

// Supabase Response Types
export interface SupabaseResponse<T> {
    data: T | null
    error: SupabaseError | null
}

export interface SupabaseError {
    message: string
    details: string | null
    hint: string | null
    code: string
}
