/**
 * API Client for frontend data fetching
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || ''

interface ApiError {
    message: string
    code?: string
    details?: unknown
}

interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: ApiError
    pagination?: {
        total: number
        page: number
        pageSize: number
        totalPages: number
        hasMore: boolean
    }
}

class ApiClient {
    private baseUrl: string

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
        })

        if (response.status === 204) {
            return { success: true } as ApiResponse<T>
        }

        const data = await response.json()

        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || 'Ocorreu um erro inesperado')
        }

        return data
    }

    async getFull<T>(
        endpoint: string,
        params?: Record<string, any>
    ): Promise<ApiResponse<T>> {
        const cleanParams = params
            ? Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)
            )
            : undefined

        const queryString = cleanParams ? `?${new URLSearchParams(cleanParams).toString()}` : ''
        return this.request<T>(`${endpoint}${queryString}`)
    }

    async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
        const response = await this.getFull<T>(endpoint, params)
        return response.data as T
    }

    async post<T>(endpoint: string, body?: unknown): Promise<T> {
        const response = await this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        })
        return response.data as T
    }

    async patch<T>(endpoint: string, body?: unknown): Promise<T> {
        const response = await this.request<T>(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        })
        return response.data as T
    }

    async delete<T>(endpoint: string, body?: unknown): Promise<T> {
        const response = await this.request<T>(endpoint, {
            method: 'DELETE',
            body: body ? JSON.stringify(body) : undefined,
        })
        return response.data as T
    }
}

export const api = new ApiClient('/api')

// ============================================================================
// Type-safe API functions
// ============================================================================

// Doctors
export interface DoctorDisplaySettings {
    show_duration?: boolean
    show_price?: boolean
    show_rating?: boolean
    show_teleconsulta?: boolean
    show_convenio?: boolean
}

export interface Doctor {
    id: string
    crm: string
    crm_state: string
    specialty: string
    consultation_price: number
    consultation_duration?: number
    bio?: string
    is_accepting_appointments: boolean
    display_settings?: DoctorDisplaySettings
    // Professional profile fields
    rating?: number
    review_count?: number
    experience_years?: number
    is_premium?: boolean
    bio_extended?: string
    faithful_patients_count?: number
    specialties_additional?: string[]
    certifications?: string[]
    languages?: string[]
    user: {
        full_name: string
        email: string
        avatar_url?: string
    }
}

export async function fetchDoctors(clinicIdOrSlug: string, specialty?: string | null) {
    const params: Record<string, string> = {}

    // Check if it's a UUID (clinic_id) or a slug
    if (clinicIdOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        params.clinic_id = clinicIdOrSlug
    } else if (clinicIdOrSlug) {
        params.clinic_slug = clinicIdOrSlug
    }

    if (specialty) params.specialty = specialty
    return api.get<Doctor[]>('/doctors', params)
}

export async function fetchDoctor(doctorId: string) {
    return api.get<Doctor>(`/doctors/${doctorId}`)
}

// Available Slots
export interface AvailableSlot {
    time: string
    end_time: string
    available: boolean
}

export interface AvailableSlotsResponse {
    date: string
    doctor_id: string
    available_slots: AvailableSlot[]
    total_available: number
}

export async function fetchAvailableSlots(doctorId: string, date: string) {
    return api.get<AvailableSlotsResponse>('/appointments/available-slots', {
        doctor_id: doctorId,
        date,
    })
}

// Appointments
export interface CreateAppointmentData {
    clinic_slug: string
    doctor_id: string
    appointment_date: string
    appointment_time: string
    payment_type?: 'PRIVATE' | 'HEALTH_INSURANCE'
    health_insurance_plan_id?: string
    insurance_card_number?: string
    insurance_card_validity?: string
    patient: {
        cpf: string
        full_name: string
        email: string
        phone: string
        date_of_birth?: string
    }
}

export interface PaymentInstructions {
    amount: number
    doctor_name: string
    clinic_name: string
    clinic_phone: string | null
    clinic_email: string | null
    pix_key: string | null
    bank_account: string | null
    instructions: string
}

export interface CreateAppointmentResponse {
    appointment_id: string
    status?: string
    message?: string
    // Gateway-Agnostic: instruções de pagamento em vez de URL do gateway
    payment_instructions?: PaymentInstructions
    // Legacy (mantido para compatibilidade)
    payment_url?: string
    sandbox_payment_url?: string
    preference_id?: string
}

export async function createAppointment(data: CreateAppointmentData) {
    return api.post<CreateAppointmentResponse>('/appointments', data)
}

export interface Appointment {
    id: string
    appointment_date: string
    appointment_time: string
    status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
    video_link?: string
    doctor: Doctor
    patient: {
        id: string
        full_name: string
        email: string
        phone: string
    }
    payment?: {
        id: string
        status: string
        amount: number
    }
}

export async function fetchAppointments(params?: Record<string, string>) {
    return api.get<Appointment[]>('/appointments', params)
}

export async function fetchAppointment(appointmentId: string) {
    return api.get<Appointment>(`/appointments/${appointmentId}`)
}

// Clinics
export interface Clinic {
    id: string
    name: string
    slug: string
    email: string
    phone?: string
    logo_url?: string
    primary_color?: string
    is_active: boolean
    plan_type?: string
}

export async function fetchClinicBySlug(slug: string) {
    return api.get<Clinic>(`/clinics/by-slug/${slug}`)
}

// Auth
export interface LoginData {
    email: string
    password: string
}

export interface LoginResponse {
    user: {
        id: string
        email: string
        role: string
        full_name: string
    }
    session: {
        access_token: string
        refresh_token: string
        expires_at: number
    }
}

export async function login(data: LoginData) {
    return api.post<LoginResponse>('/auth/login', data)
}

export async function logout() {
    return api.post('/auth/logout')
}

