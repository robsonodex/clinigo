/**
 * Database Types for CliniGo
 * Regenerate from Supabase: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
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
          plan_type: 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'
          plan_limits: Json
          is_active: boolean
          addons: Json | null
          mercadopago_access_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          email?: string | null
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          plan_type?: 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'
          plan_limits?: Json
          is_active?: boolean
          addons?: Json | null
          mercadopago_access_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['clinics']['Insert']>
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
        Insert: {
          id?: string
          email: string
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          role?: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF'
          clinic_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
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
        Insert: {
          id?: string
          clinic_id: string
          user_id: string
          specialty: string
          crm: string
          consultation_price?: number
          is_accepting_appointments?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['doctors']['Insert']>
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
        Insert: {
          id?: string
          clinic_id: string
          cpf: string
          full_name: string
          email: string
          phone: string
          date_of_birth?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['patients']['Insert']>
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
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          patient_id: string
          appointment_date: string
          appointment_time: string
          status?: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
          video_link?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
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
        Insert: {
          id?: string
          clinic_id: string
          appointment_id: string
          patient_id: string
          amount: number
          status?: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED'
          mercadopago_preference_id?: string | null
          mercadopago_external_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
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
        Insert: {
          id?: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['schedules']['Insert']>
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
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          doctor_id: string
          appointment_id?: string | null
          diagnosis?: string | null
          prescription?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['medical_records']['Insert']>
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
        Insert: {
          id?: string
          clinic_id?: string | null
          user_id?: string | null
          user_name?: string | null
          user_email?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          severity?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
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
        Insert: {
          id?: string
          clinic_id?: string | null
          name: string
          key_hash: string
          permissions?: string[]
          rate_limit?: number
          last_used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_by: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['api_keys']['Insert']>
      }
      consultations: {
        Row: {
          id: string
          appointment_id: string
          doctor_id: string
          patient_id: string
          clinic_id: string
          started_at: string | null
          ended_at: string | null
          status: string
          notes: string | null
          diagnosis: string | null
          prescription: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          doctor_id: string
          patient_id: string
          clinic_id: string
          started_at?: string | null
          ended_at?: string | null
          status?: string
          notes?: string | null
          diagnosis?: string | null
          prescription?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      Update: Partial<Database['public']['Tables']['consultations']['Insert']>
    }
    consultation_ai_analyses: {
      Row: {
        id: string
        consultation_id: string
        clinic_id: string | null
        doctor_id: string | null
        analysis_type: string
        prompt: string
        result: string | null
        model_used: string | null
        plan_type: string | null
        reasoning_enabled: boolean
        tokens_used: number
        created_at: string
      }
      Insert: {
        id?: string
        consultation_id: string
        clinic_id?: string | null
        doctor_id?: string | null
        analysis_type: string
        prompt: string
        result?: string | null
        model_used?: string | null
        plan_type?: string | null
        reasoning_enabled?: boolean
        tokens_used?: number
        created_at?: string
      }
      Update: Partial<Database['public']['Tables']['consultation_ai_analyses']['Insert']>
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
    get_clinic_kpis: {
      Args: { p_clinic_id: string; p_start_date: string; p_end_date: string }
      Returns: Json
    }
    get_revenue_by_doctor: {
      Args: { p_clinic_id: string; p_start_date: string; p_end_date: string }
      Returns: Json
    }
    get_appointments_by_day: {
      Args: { p_clinic_id: string; p_start_date: string; p_end_date: string }
      Returns: Json
    }
  }
  Enums: {
    user_role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF'
    plan_type: 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'
    appointment_status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
    payment_status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED'
  }
}
// Export type aliases for easier usage
export type UserRole = Database['public']['Enums']['user_role']
export type PlanType = Database['public']['Enums']['plan_type']
export type AppointmentStatus = Database['public']['Enums']['appointment_status']
export type PaymentStatus = Database['public']['Enums']['payment_status']
