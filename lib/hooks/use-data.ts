/**
 * Optimized Data Fetching Hooks with Caching
 * These hooks use TanStack Query with proper caching strategies
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Appointment, type Doctor, type Clinic } from '@/lib/api-client'

// ============================================================================
// CACHE TIMES (in milliseconds)
// ============================================================================
const CACHE_TIMES = {
    // Rarely changes - cache longer
    doctors: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 }, // 5min stale, 10min gc
    clinicSettings: { staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000 }, // 10min stale
    healthInsurances: { staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000 },

    // Changes frequently - shorter cache
    appointments: { staleTime: 1 * 60 * 1000, gcTime: 5 * 60 * 1000 }, // 1min stale
    patients: { staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000 }, // 2min stale

    // Real-time data - minimal cache
    dashboardStats: { staleTime: 30 * 1000, gcTime: 2 * 60 * 1000 }, // 30sec stale
}

// ============================================================================
// APPOINTMENTS HOOKS
// ============================================================================
interface AppointmentFilters {
    status?: string
    doctor_id?: string
    patient_id?: string
    date_from?: string
    date_to?: string
}

export function useAppointments(filters?: AppointmentFilters) {
    return useQuery({
        queryKey: ['appointments', filters],
        queryFn: async () => {
            const params: Record<string, string> = {}
            if (filters?.status) params.status = filters.status
            if (filters?.doctor_id) params.doctor_id = filters.doctor_id
            if (filters?.patient_id) params.patient_id = filters.patient_id
            if (filters?.date_from) params.date_from = filters.date_from
            if (filters?.date_to) params.date_to = filters.date_to

            return api.get<Appointment[]>('/appointments', params)
        },
        ...CACHE_TIMES.appointments,
        refetchOnWindowFocus: false,
    })
}

export function useAppointment(id: string | null) {
    return useQuery({
        queryKey: ['appointment', id],
        queryFn: () => api.get<Appointment>(`/appointments/${id}`),
        enabled: !!id,
        staleTime: 30 * 1000, // 30 seconds for single appointment
    })
}

// ============================================================================
// DOCTORS HOOKS
// ============================================================================
export function useDoctors(clinicId?: string) {
    return useQuery({
        queryKey: ['doctors', clinicId],
        queryFn: () => api.get<Doctor[]>('/doctors', clinicId ? { clinic_id: clinicId } : undefined),
        ...CACHE_TIMES.doctors,
        refetchOnWindowFocus: false,
    })
}

export function useDoctor(doctorId: string | null) {
    return useQuery({
        queryKey: ['doctor', doctorId],
        queryFn: () => api.get<Doctor>(`/doctors/${doctorId}`),
        enabled: !!doctorId,
        ...CACHE_TIMES.doctors,
    })
}

// ============================================================================
// PATIENTS HOOKS
// ============================================================================
interface PatientFilters {
    search?: string
    page?: number
    limit?: number
}

interface Patient {
    id: string
    full_name: string
    cpf: string | null
    phone: string
    email: string | null
    clinic_id: string
    is_active: boolean
}

interface PaginatedResponse<T> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export function usePatients(filters?: PatientFilters) {
    return useQuery({
        queryKey: ['patients', filters],
        queryFn: async () => {
            const params: Record<string, string> = {}
            if (filters?.search) params.search = filters.search
            if (filters?.page) params.page = String(filters.page)
            if (filters?.limit) params.limit = String(filters.limit)

            return api.get<PaginatedResponse<Patient>>('/patients', params)
        },
        ...CACHE_TIMES.patients,
        refetchOnWindowFocus: false,
    })
}

export function usePatient(patientId: string | null) {
    return useQuery({
        queryKey: ['patient', patientId],
        queryFn: () => api.get<Patient>(`/patients/${patientId}`),
        enabled: !!patientId,
        staleTime: 60 * 1000, // 1 minute
    })
}

// ============================================================================
// CLINIC HOOKS
// ============================================================================
export function useClinic(clinicId: string | null) {
    return useQuery({
        queryKey: ['clinic', clinicId],
        queryFn: () => api.get<Clinic>(`/clinics/${clinicId}`),
        enabled: !!clinicId,
        ...CACHE_TIMES.clinicSettings,
        refetchOnWindowFocus: false,
    })
}

export function useClinicBySlug(slug: string | null) {
    return useQuery({
        queryKey: ['clinic-by-slug', slug],
        queryFn: () => api.get<Clinic>(`/clinics/by-slug/${slug}`),
        enabled: !!slug,
        ...CACHE_TIMES.clinicSettings,
        refetchOnWindowFocus: false,
    })
}

// ============================================================================
// HEALTH INSURANCE HOOKS
// ============================================================================
interface HealthInsurance {
    id: string
    name: string
    code: string
    is_active: boolean
}

export function useHealthInsurances() {
    return useQuery({
        queryKey: ['health-insurances'],
        queryFn: () => api.get<HealthInsurance[]>('/health-insurances'),
        ...CACHE_TIMES.healthInsurances,
        refetchOnWindowFocus: false,
    })
}

// ============================================================================
// DASHBOARD STATS HOOKS
// ============================================================================
interface DashboardStats {
    appointments_today: number
    appointments_pending: number
    patients_total: number
    revenue_month: number
}

export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
        ...CACHE_TIMES.dashboardStats,
        refetchOnWindowFocus: true, // Refresh when user returns
    })
}

// ============================================================================
// MUTATION HELPERS
// ============================================================================
export function useInvalidateQueries() {
    const queryClient = useQueryClient()

    return {
        invalidateAppointments: () =>
            queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        invalidatePatients: () =>
            queryClient.invalidateQueries({ queryKey: ['patients'] }),
        invalidateDoctors: () =>
            queryClient.invalidateQueries({ queryKey: ['doctors'] }),
        invalidateAll: () =>
            queryClient.invalidateQueries(),
    }
}
