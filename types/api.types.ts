/**
 * API Request and Response Types
 */
import type {
    AppointmentStatus,
    PaymentStatus,
    UserRole
} from './database.types'

// ============================================================================
// Common Types
// ============================================================================

export interface ApiSuccessResponse<T> {
    success: true
    data: T
}

export interface ApiErrorResponse {
    success: false
    error: {
        message: string
        code?: string
        details?: unknown
    }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export interface PaginationMeta {
    total: number
    page: number
    pageSize: number
    totalPages: number
    hasMore: boolean
}

export interface PaginatedResponse<T> extends ApiSuccessResponse<T[]> {
    pagination: PaginationMeta
}

// ============================================================================
// Auth Types
// ============================================================================

export interface LoginRequest {
    email: string
    password: string
}

export interface LoginResponse {
    user: {
        id: string
        email: string
        role: UserRole
    }
    session: {
        access_token: string
        refresh_token: string
        expires_at: number
    }
}

export interface SignupRequest {
    email: string
    password: string
    full_name: string
    clinic_id?: string
    role?: UserRole
}

// ============================================================================
// Appointment Types
// ============================================================================

export interface CreateAppointmentRequest {
    clinic_slug: string
    doctor_id: string
    appointment_date: string
    appointment_time: string
    patient: {
        cpf: string
        full_name: string
        email: string
        phone: string
        date_of_birth?: string
    }
}

export interface CreateAppointmentResponse {
    appointment_id: string
    payment_url: string
    sandbox_payment_url?: string
    preference_id: string
    qr_code_base64?: string
}

export interface AvailableSlotsRequest {
    doctor_id: string
    date: string
}

export interface AvailableSlotsResponse {
    date: string
    doctor_id: string
    available_slots: Array<{
        time: string
        end_time: string
        available: boolean
    }>
}

export interface CancelAppointmentRequest {
    cancellation_reason: string
}

export interface CancelAppointmentResponse {
    appointment_id: string
    status: AppointmentStatus
    refund_status?: 'refunded' | 'not_eligible' | 'pending'
    message: string
}

// ============================================================================
// Doctor Types
// ============================================================================

export interface CreateDoctorRequest {
    email: string
    password: string
    full_name: string
    crm: string
    crm_state: string
    specialty: string
    consultation_price: number
    bio?: string
}

export interface CreateDoctorResponse {
    doctor_id: string
    user_id: string
    message: string
}

export interface ScheduleInput {
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration_minutes: number
}

export interface UpdateSchedulesRequest {
    schedules: ScheduleInput[]
}

// ============================================================================
// Clinic Types
// ============================================================================

export interface CreateClinicRequest {
    name: string
    slug: string
    email: string
    cnpj?: string
    phone?: string
    address?: {
        street?: string
        number?: string
        complement?: string
        neighborhood?: string
        city?: string
        state?: string
        zip?: string
    }
    plan_type?: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
}

export interface UpdateClinicRequest {
    name?: string
    email?: string
    phone?: string
    address?: Record<string, string>
    is_active?: boolean
    mercadopago_access_token?: string
    mercadopago_public_key?: string
    logo_url?: string
    primary_color?: string
}

// ============================================================================
// Payment Types
// ============================================================================

export interface CreatePaymentPreferenceRequest {
    appointment_id: string
}

export interface CreatePaymentPreferenceResponse {
    preference_id: string
    init_point: string
    sandbox_init_point: string
    qr_code_base64?: string
}

export interface MercadoPagoWebhookPayload {
    id: number
    live_mode: boolean
    type: string
    date_created: string
    user_id: number
    api_version: string
    action: string
    data: {
        id: string
    }
}

// ============================================================================
// Consultation Types
// ============================================================================

export interface CreateConsultationRequest {
    appointment_id: string
    notes?: string
    prescriptions?: string
    diagnosis?: string
    follow_up?: string
    files?: Array<{
        name: string
        url: string
        type: string
        size?: number
    }>
}

export interface UpdateConsultationRequest {
    notes?: string
    prescriptions?: string
    diagnosis?: string
    follow_up?: string
    files?: Array<{
        name: string
        url: string
        type: string
        size?: number
    }>
    ended_at?: string
    duration_minutes?: number
}

// ============================================================================
// Video Types
// ============================================================================

export interface GenerateVideoLinkRequest {
    appointment_id: string
}

export interface GenerateVideoLinkResponse {
    video_link: string
    meeting_id: string
}
