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
            // Use partial match to invalidate ALL doctor queries regardless of params
            queryClient.invalidateQueries({ queryKey: ['doctors'], exact: false })
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
            queryClient.invalidateQueries({ queryKey: ['doctors'], exact: false })
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
            queryClient.invalidateQueries({ queryKey: ['schedules', variables.doctorId] })

            // ✅ Show detailed success message with days configured
            const days = variables.schedules.map(s => {
                const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                return dayNames[s.day_of_week]
            }).join(', ')

            if (variables.schedules.length > 0) {
                toast.success(
                    `✅ Horários salvos com sucesso!\n\n📅 Dias configurados: ${days}\n\nOs horários já estão disponíveis para agendamento.`,
                    { duration: 5000 }
                )
            } else {
                toast.success('Horários limpos! Nenhum dia de atendimento configurado.', { duration: 5000 })
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao salvar horários')
        },
    })
}

