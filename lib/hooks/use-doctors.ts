'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchDoctors, fetchDoctor, api, type Doctor } from '@/lib/api-client'
import { useRole } from '@/lib/hooks/use-auth'

/**
 * Hook to fetch doctors list
 */
export function useDoctors(clinicSlug?: string, specialty?: string | null) {
    const { role } = useRole()
    return useQuery({
        queryKey: ['doctors', clinicSlug, specialty],
        queryFn: () => fetchDoctors(clinicSlug || '', specialty),
        enabled: !!clinicSlug || role === 'SUPER_ADMIN',
    })
}

/**
 * Hook to fetch a single doctor
 */
export function useDoctor(doctorId: string) {
    return useQuery({
        queryKey: ['doctor', doctorId],
        queryFn: () => fetchDoctor(doctorId),
        enabled: !!doctorId,
    })
}

/**
 * Hook to create a new doctor
 */
export interface CreateDoctorData {
    email: string
    password: string
    full_name: string
    crm: string
    crm_state: string
    specialty: string
    consultation_price: number
    bio?: string
}

export function useCreateDoctor() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateDoctorData) => api.post<{ doctor_id: string }>('/doctors', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors'] })
            toast.success('Médico cadastrado com sucesso!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao cadastrar médico')
        },
    })
}

/**
 * Hook to update a doctor
 */
export function useUpdateDoctor() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ doctorId, data }: { doctorId: string; data: Partial<Doctor> }) =>
            api.patch<Doctor>(`/doctors/${doctorId}`, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['doctors'] })
            queryClient.invalidateQueries({ queryKey: ['doctor', variables.doctorId] })
            toast.success('Dados atualizados!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao atualizar')
        },
    })
}

/**
 * Hook to update doctor schedules
 */
export interface ScheduleInput {
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration_minutes: number
}

export function useUpdateSchedules() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ doctorId, schedules }: { doctorId: string; schedules: ScheduleInput[] }) =>
            api.post(`/doctors/${doctorId}/schedules`, { schedules }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['doctor', variables.doctorId] })
            toast.success('Horários salvos!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao salvar horários')
        },
    })
}

