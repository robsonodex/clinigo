/**
 * Database Types for Supabase
 * These types are based on the database schema from database.sql
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type PlanType = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
export type UserRole = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR'
export type AppointmentStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
export type NotificationType = 'EMAIL' | 'WHATSAPP' | 'SMS'
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface Database {
    public: {
        Tables: {
            clinics: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    cnpj: string | null
                    email: string
                    phone: string | null
                    address: Json
                    plan_type: PlanType
                    plan_limits: Json
                    is_active: boolean
                    mercadopago_access_token: string | null
                    mercadopago_public_key: string | null
                    logo_url: string | null
                    primary_color: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    cnpj?: string | null
                    email: string
                    phone?: string | null
                    address?: Json
                    plan_type?: PlanType
                    plan_limits?: Json
                    is_active?: boolean
                    mercadopago_access_token?: string | null
                    mercadopago_public_key?: string | null
                    logo_url?: string | null
                    primary_color?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    cnpj?: string | null
                    email?: string
                    phone?: string | null
                    address?: Json
                    plan_type?: PlanType
                    plan_limits?: Json
                    is_active?: boolean
                    mercadopago_access_token?: string | null
                    mercadopago_public_key?: string | null
                    logo_url?: string | null
                    primary_color?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            users: {
                Row: {
                    id: string
                    clinic_id: string | null
                    email: string
                    full_name: string
                    role: UserRole
                    avatar_url: string | null
                    phone: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    clinic_id?: string | null
                    email: string
                    full_name: string
                    role: UserRole
                    avatar_url?: string | null
                    phone?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string | null
                    email?: string
                    full_name?: string
                    role?: UserRole
                    avatar_url?: string | null
                    phone?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            doctors: {
                Row: {
                    id: string
                    user_id: string
                    clinic_id: string
                    crm: string
                    crm_state: string
                    specialty: string
                    bio: string | null
                    consultation_price: number
                    is_accepting_appointments: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    clinic_id: string
                    crm: string
                    crm_state: string
                    specialty: string
                    bio?: string | null
                    consultation_price: number
                    is_accepting_appointments?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    clinic_id?: string
                    crm?: string
                    crm_state?: string
                    specialty?: string
                    bio?: string | null
                    consultation_price?: number
                    is_accepting_appointments?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            schedules: {
                Row: {
                    id: string
                    doctor_id: string
                    clinic_id: string
                    day_of_week: number
                    start_time: string
                    end_time: string
                    slot_duration_minutes: number
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    doctor_id: string
                    clinic_id: string
                    day_of_week: number
                    start_time: string
                    end_time: string
                    slot_duration_minutes?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    doctor_id?: string
                    clinic_id?: string
                    day_of_week?: number
                    start_time?: string
                    end_time?: string
                    slot_duration_minutes?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
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
                    gender: string | null
                    address: Json
                    health_insurance: Json
                    created_at: string
                    updated_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    clinic_id: string
                    cpf: string
                    full_name: string
                    email: string
                    phone: string
                    date_of_birth?: string | null
                    gender?: string | null
                    address?: Json
                    health_insurance?: Json
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
                Update: {
                    id?: string
                    clinic_id?: string
                    cpf?: string
                    full_name?: string
                    email?: string
                    phone?: string
                    date_of_birth?: string | null
                    gender?: string | null
                    address?: Json
                    health_insurance?: Json
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
            }
            appointments: {
                Row: {
                    id: string
                    clinic_id: string
                    doctor_id: string
                    patient_id: string
                    appointment_date: string
                    appointment_time: string
                    status: AppointmentStatus
                    cancellation_reason: string | null
                    cancelled_at: string | null
                    cancelled_by: string | null
                    video_link: string | null
                    video_room_id: string | null
                    reminder_sent_at: string | null
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
                    status?: AppointmentStatus
                    cancellation_reason?: string | null
                    cancelled_at?: string | null
                    cancelled_by?: string | null
                    video_link?: string | null
                    video_room_id?: string | null
                    reminder_sent_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string
                    doctor_id?: string
                    patient_id?: string
                    appointment_date?: string
                    appointment_time?: string
                    status?: AppointmentStatus
                    cancellation_reason?: string | null
                    cancelled_at?: string | null
                    cancelled_by?: string | null
                    video_link?: string | null
                    video_room_id?: string | null
                    reminder_sent_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            payments: {
                Row: {
                    id: string
                    clinic_id: string
                    appointment_id: string
                    patient_id: string
                    amount: number
                    payment_method: PaymentMethod | null
                    status: PaymentStatus
                    mercadopago_payment_id: string | null
                    mercadopago_preference_id: string | null
                    mercadopago_external_reference: string | null
                    paid_at: string | null
                    refunded_at: string | null
                    expires_at: string | null
                    refund_reason: string | null
                    refund_amount: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    clinic_id: string
                    appointment_id: string
                    patient_id: string
                    amount: number
                    payment_method?: PaymentMethod | null
                    status?: PaymentStatus
                    mercadopago_payment_id?: string | null
                    mercadopago_preference_id?: string | null
                    mercadopago_external_reference?: string | null
                    paid_at?: string | null
                    refunded_at?: string | null
                    expires_at?: string | null
                    refund_reason?: string | null
                    refund_amount?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string
                    appointment_id?: string
                    patient_id?: string
                    amount?: number
                    payment_method?: PaymentMethod | null
                    status?: PaymentStatus
                    mercadopago_payment_id?: string | null
                    mercadopago_preference_id?: string | null
                    mercadopago_external_reference?: string | null
                    paid_at?: string | null
                    refunded_at?: string | null
                    expires_at?: string | null
                    refund_reason?: string | null
                    refund_amount?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            consultations: {
                Row: {
                    id: string
                    clinic_id: string
                    appointment_id: string
                    doctor_id: string
                    patient_id: string
                    started_at: string | null
                    ended_at: string | null
                    duration_minutes: number | null
                    notes: string | null
                    prescriptions: string | null
                    diagnosis: string | null
                    follow_up: string | null
                    files: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    clinic_id: string
                    appointment_id: string
                    doctor_id: string
                    patient_id: string
                    started_at?: string | null
                    ended_at?: string | null
                    duration_minutes?: number | null
                    notes?: string | null
                    prescriptions?: string | null
                    diagnosis?: string | null
                    follow_up?: string | null
                    files?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string
                    appointment_id?: string
                    doctor_id?: string
                    patient_id?: string
                    started_at?: string | null
                    ended_at?: string | null
                    duration_minutes?: number | null
                    notes?: string | null
                    prescriptions?: string | null
                    diagnosis?: string | null
                    follow_up?: string | null
                    files?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            notifications: {
                Row: {
                    id: string
                    clinic_id: string
                    appointment_id: string | null
                    patient_id: string | null
                    type: NotificationType
                    template: string
                    recipient_email: string | null
                    recipient_phone: string | null
                    subject: string | null
                    body: string | null
                    status: NotificationStatus
                    sent_at: string | null
                    error_message: string | null
                    retry_count: number
                    external_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    clinic_id: string
                    appointment_id?: string | null
                    patient_id?: string | null
                    type: NotificationType
                    template: string
                    recipient_email?: string | null
                    recipient_phone?: string | null
                    subject?: string | null
                    body?: string | null
                    status?: NotificationStatus
                    sent_at?: string | null
                    error_message?: string | null
                    retry_count?: number
                    external_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string
                    appointment_id?: string | null
                    patient_id?: string | null
                    type?: NotificationType
                    template?: string
                    recipient_email?: string | null
                    recipient_phone?: string | null
                    subject?: string | null
                    body?: string | null
                    status?: NotificationStatus
                    sent_at?: string | null
                    error_message?: string | null
                    retry_count?: number
                    external_id?: string | null
                    created_at?: string
                }
                system_settings: {
                    Row: {
                        key: string
                        value: Json
                        updated_at: string | null
                        updated_by: string | null
                    }
                    Insert: {
                        key: string
                        value: Json
                        updated_at?: string | null
                        updated_by?: string | null
                    }
                    Update: {
                        key?: string
                        value?: Json
                        updated_at?: string | null
                    }
                }
            }
            Functions: {
                check_slot_availability: {
                    Args: {
                        p_doctor_id: string
                        p_date: string
                        p_time: string
                    }
                    Returns: boolean
                }
                get_available_slots: {
                    Args: {
                        p_doctor_id: string
                        p_date: string
                    }
                    Returns: {
                        slot_time: string
                        slot_end_time: string
                    }[]
                }
                get_doctor_schedule_for_week: {
                    Args: {
                        p_doctor_id: string
                        p_start_date?: string
                    }
                    Returns: {
                        schedule_date: string
                        day_name: string
                        available_slots: number
                        total_slots: number
                    }[]
                }
                can_cancel_appointment: {
                    Args: {
                        p_appointment_id: string
                    }
                    Returns: {
                        can_cancel: boolean
                        eligible_for_refund: boolean
                        reason: string
                    }[]
                }
                get_clinic_stats: {
                    Args: {
                        p_clinic_id: string
                        p_start_date?: string
                        p_end_date?: string
                    }
                    Returns: {
                        total_appointments: number
                        confirmed_appointments: number
                        completed_appointments: number
                        cancelled_appointments: number
                        no_show_appointments: number
                        total_revenue: number
                        pending_payments: number
                        total_patients: number
                        new_patients: number
                    }[]
                }
                search_patients: {
                    Args: {
                        p_clinic_id: string
                        p_search: string
                        p_limit?: number
                    }
                    Returns: Database['public']['Tables']['patients']['Row'][]
                }
            }
            Enums: {
                plan_type: PlanType
                user_role: UserRole
                appointment_status: AppointmentStatus
                payment_method: PaymentMethod
                payment_status: PaymentStatus
                notification_type: NotificationType
                notification_status: NotificationStatus
            }
        }
    }
}
