'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    fetchAppointments,
    fetchAppointment,
    createAppointment,
    fetchAvailableSlots,
    type CreateAppointmentData,
} from '@/lib/api-client'

/**
 * Hook to fetch appointments list
 */
export function useAppointments(params?: Record<string, string>) {
    return useQuery({
        queryKey: ['appointments', params],
        queryFn: () => fetchAppointments(params),
    })
}

/**
 * Hook to fetch a single appointment
 */
export function useAppointment(appointmentId: string) {
    return useQuery({
        queryKey: ['appointment', appointmentId],
        queryFn: () => fetchAppointment(appointmentId),
        enabled: !!appointmentId,
    })
}

/**
 * Hook to fetch available slots for a doctor on a date
 */
export function useAvailableSlots(doctorId: string, date: string | null) {
    return useQuery({
        queryKey: ['available-slots', doctorId, date],
        queryFn: () => fetchAvailableSlots(doctorId, date!),
        enabled: !!doctorId && !!date,
        staleTime: 30 * 1000, // 30 seconds
    })
}

/**
 * Hook to create a new appointment
 */
export function useCreateAppointment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateAppointmentData) => createAppointment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao criar agendamento')
        },
    })
}

/**
 * Hook to cancel an appointment
 */
export function useCancelAppointment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason: string }) => {
            const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancellation_reason: reason }),
            })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error?.message || 'Erro ao cancelar')
            }
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
            toast.success('Agendamento cancelado')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}
