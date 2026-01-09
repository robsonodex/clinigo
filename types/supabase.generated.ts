/**
 * Manual Database Types for CliniGo
 * These types should be regenerated from Supabase when tables are created
 * Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.generated.ts
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            clinics: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    email: string | null
                    phone: string | null
                    address: string | null
                    logo_url: string | null
                    plan_type: 'BASIC' | 'PRO' | 'ENTERPRISE'
                    plan_limits: Json
                    is_active: boolean
                    addons: Json | null
                    mercadopago_access_token: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Partial<Database['public']['Tables']['clinics']['Row']>
                Update: Partial<Database['public']['Tables']['clinics']['Row']>
            }
            users: {
                Row: {
                    id: string
                    email: string
                    full_name: string
                    phone: string | null
                    avatar_url: string | null
                    role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF'
                    clinic_id: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: Partial<Database['public']['Tables']['users']['Row']>
                Update: Partial<Database['public']['Tables']['users']['Row']>
            }
            doctors: {
                Row: {
                    id: string
                    clinic_id: string
                    user_id: string
                    specialty: string
                    crm: string
                    consultation_price: number
                    is_accepting_appointments: boolean
                    is_active: boolean
                    user?: { full_name: string }
                    created_at: string
                    updated_at: string
                }
                Insert: Partial<Database['public']['Tables']['doctors']['Row']>
                Update: Partial<Database['public']['Tables']['doctors']['Row']>
            }
            patients: {
                Row: {
                    id: string
                    clinic_id: string
                    cpf: string
                    full_name: string
                    email: string
                    phone: string
                    date_of_birth: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Partial<Database['public']['Tables']['patients']['Row']>
                Update: Partial<Database['public']['Tables']['patients']['Row']>
            }
            appointments: {
                Row: {
                    id: string
                    clinic_id: string
                    doctor_id: string
                    patient_id: string
                    appointment_date: string
                    appointment_time: string
                    status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
                    video_link: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                    patient?: Database['public']['Tables']['patients']['Row']
                    doctor?: Database['public']['Tables']['doctors']['Row']
                }
                Insert: Partial<Database['public']['Tables']['appointments']['Row']>
                Update: Partial<Database['public']['Tables']['appointments']['Row']>
            }
            payments: {
                Row: {
                    id: string
                    clinic_id: string
                    appointment_id: string
                    patient_id: string
                    amount: number
                    status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED'
                    mercadopago_preference_id: string | null
                    mercadopago_external_reference: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Partial<Database['public']['Tables']['payments']['Row']>
                Update: Partial<Database['public']['Tables']['payments']['Row']>
            }
            schedules: {
                Row: {
                    id: string
                    doctor_id: string
                    day_of_week: number
                    start_time: string
                    end_time: string
                    slot_duration: number
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: Partial<Database['public']['Tables']['schedules']['Row']>
                Update: Partial<Database['public']['Tables']['schedules']['Row']>
            }
            medical_records: {
                Row: {
                    id: string
                    clinic_id: string
                    patient_id: string
                    doctor_id: string
                    appointment_id: string | null
                    diagnosis: string | null
                    prescription: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Partial<Database['public']['Tables']['medical_records']['Row']>
                Update: Partial<Database['public']['Tables']['medical_records']['Row']>
            }
            audit_logs: {
                Row: {
                    id: string
                    clinic_id: string | null
                    user_id: string | null
                    user_name: string | null
                    user_email: string | null
                    action: string
                    entity_type: string | null
                    entity_id: string | null
                    ip_address: string | null
                    user_agent: string | null
                    severity: string
                    created_at: string
                }
                Insert: Partial<Database['public']['Tables']['audit_logs']['Row']>
                Update: Partial<Database['public']['Tables']['audit_logs']['Row']>
            }
            api_keys: {
                Row: {
                    id: string
                    clinic_id: string | null
                    name: string
                    key_hash: string
                    permissions: string[]
                    rate_limit: number
                    last_used_at: string | null
                    expires_at: string | null
                    is_active: boolean
                    created_by: string
                    created_at: string
                }
                Insert: Partial<Database['public']['Tables']['api_keys']['Row']>
                Update: Partial<Database['public']['Tables']['api_keys']['Row']>
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_available_slots: {
                Args: { p_doctor_id: string; p_date: string }
                Returns: { slot_time: string }[]
            }
            is_slot_available: {
                Args: { p_doctor_id: string; p_date: string; p_time: string }
                Returns: boolean
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}
