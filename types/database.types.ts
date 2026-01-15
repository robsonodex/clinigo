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
          theme: Json | null
          public_page_settings: Json | null
          created_at: string
          updated_at: string
          subscription_due_date?: string | null
          last_payment_date?: string | null
          payment_status?: string | null
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
          theme?: Json | null
          public_page_settings?: Json | null
          created_at?: string
          updated_at?: string
          subscription_due_date?: string | null
          last_payment_date?: string | null
          payment_status?: string | null
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
          consultation_duration: number
          display_settings: Json | null
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
          consultation_duration?: number
          display_settings?: Json | null
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
      financial_entries: {
        Row: {
          id: string
          clinic_id: string
          type: 'income' | 'expense'
          category: string
          description: string
          amount: number
          payment_method: string | null
          status: 'pending' | 'paid' | 'cancelled'
          paid_at: string | null
          reference_type: string | null
          reference_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          type: 'income' | 'expense'
          category: string
          description: string
          amount: number
          payment_method?: string | null
          status?: 'pending' | 'paid' | 'cancelled'
          paid_at?: string | null
          reference_type?: string | null
          reference_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['financial_entries']['Insert']>
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
          chief_complaint: string | null
          present_illness: string | null
          physical_exam: string | null
          treatment_plan: string | null
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
          chief_complaint?: string | null
          present_illness?: string | null
          physical_exam?: string | null
          treatment_plan?: string | null
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
      import_jobs: {
        Row: {
          id: string
          clinic_id: string
          import_type: string
          status: string
          file_url: string
          total_rows: number
          processed_rows: number
          successful_rows: number
          failed_rows: number
          validation_errors: Json | null
          processing_errors: Json | null
          field_mapping: Json | null
          started_at: string | null
          completed_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          import_type: string
          status?: string
          file_url: string
          total_rows?: number
          processed_rows?: number
          successful_rows?: number
          failed_rows?: number
          validation_errors?: Json | null
          processing_errors?: Json | null
          field_mapping?: Json | null
          started_at?: string | null
          completed_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['import_jobs']['Insert']>
      },
      import_logs: {
        Row: {
          id: string
          import_job_id: string
          row_number: number
          action: string
          entity_id: string | null
          error_message: string | null
          row_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          import_job_id: string
          row_number: number
          action: string
          entity_id?: string | null
          error_message?: string | null
          row_data?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['import_logs']['Insert']>
      },
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
        },
        Update: Partial<Database['public']['Tables']['consultations']['Insert']>
      },
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
        },
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
        },
        Update: Partial<Database['public']['Tables']['consultation_ai_analyses']['Insert']>
      },
      clinic_automation_configs: {
        Row: {
          id: string
          clinic_id: string
          automation_type: string
          is_enabled: boolean
          config: Json
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          automation_type: string
          is_enabled?: boolean
          config?: Json
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['clinic_automation_configs']['Insert']>
      }
      appointment_slot_locks: {
        Row: {
          id: string
          doctor_id: string
          slot_datetime: string
          locked_by: string
          lock_status: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          slot_datetime: string
          locked_by: string
          lock_status?: string
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['appointment_slot_locks']['Insert']>
      }
      appointment_lock_audit: {
        Row: {
          id: string
          lock_id: string
          action: string
          user_id: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          lock_id: string
          action: string
          user_id: string
          metadata?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['appointment_lock_audit']['Insert']>
      }
      doctor_health_insurances: {
        Row: {
          id: string
          doctor_id: string
          health_insurance_plan_id: string
          consultation_price: number
          accepts_new_patients: boolean
          notes: string | null
          status: string
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          health_insurance_plan_id: string
          consultation_price?: number
          accepts_new_patients?: boolean
          notes?: string | null
          status?: string
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['doctor_health_insurances']['Insert']>
      }
    },
    Views: {
      [_ in never]: never
    },
    Functions: {
      get_available_slots: {
        Args: { p_doctor_id: string; p_date: string }
        Returns: { slot_time: string }[]
      },
      is_slot_available: {
        Args: { p_doctor_id: string; p_date: string; p_time: string }
        Returns: boolean
      },
      get_clinic_kpis: {
        Args: { p_clinic_id: string; p_start_date: string; p_end_date: string }
        Returns: Json
      },
      get_revenue_by_doctor: {
        Args: { p_clinic_id: string; p_start_date: string; p_end_date: string }
        Returns: Json
      },
      get_appointments_by_day: {
        Args: { p_clinic_id: string; p_start_date: string; p_end_date: string }
        Returns: Json
      }
    },
    Enums: {
      user_role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF',
      plan_type: 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK',
      appointment_status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
      payment_status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED'
    }
  }
}

// Export type aliases for easier usage
export type UserRole = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF'
export type PlanType = 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'
export type AppointmentStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED'
