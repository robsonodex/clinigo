/**
 * Appointment Actions with Optimistic Updates
 * UI updates instantly before server response
 */
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface Appointment {
    id: string
    payment_status?: string
    [key: string]: any
}

export function useAppointmentActions() {
    const queryClient = useQueryClient()

    // Optimistic payment confirmation
    const confirmPayment = useMutation({
        mutationFn: async (appointmentId: string) => {
            const response = await fetch(`/api/appointments/${appointmentId}/confirm-payment`, {
                method: 'POST',
            })
            if (!response.ok) throw new Error('Failed to confirm payment')
            return response.json()
        },
        // Update instantâneo na UI (antes da resposta)
        onMutate: async (appointmentId) => {
            // Cancel queries para evitar conflitos
            await queryClient.cancelQueries({ queryKey: ['appointments'] })

            // Snapshot do estado anterior
            const previousAppointments = queryClient.getQueryData(['appointments'])

            // Update otimista
            queryClient.setQueryData(['appointments'], (old: Appointment[] | undefined) =>
                old?.map((apt) =>
                    apt.id === appointmentId
                        ? { ...apt, payment_status: 'PAID' }
                        : apt
                ) || []
            )

            return { previousAppointments }
        },
        // Reverter se falhar
        onError: (err, variables, context) => {
            if (context?.previousAppointments) {
                queryClient.setQueryData(['appointments'], context.previousAppointments)
            }
            toast.error('Erro ao confirmar pagamento')
            console.error('Payment confirmation error:', err)
        },
        onSuccess: () => {
            toast.success('Pagamento confirmado!')
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
        },
    })

    // Optimistic appointment cancellation
    const cancelAppointment = useMutation({
        mutationFn: async (appointmentId: string) => {
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CANCELLED' }),
            })
            if (!response.ok) throw new Error('Failed to cancel appointment')
            return response.json()
        },
        onMutate: async (appointmentId) => {
            await queryClient.cancelQueries({ queryKey: ['appointments'] })
            const previousAppointments = queryClient.getQueryData(['appointments'])

            queryClient.setQueryData(['appointments'], (old: Appointment[] | undefined) =>
                old?.map((apt) =>
                    apt.id === appointmentId
                        ? { ...apt, status: 'CANCELLED' }
                        : apt
                ) || []
            )

            return { previousAppointments }
        },
        onError: (err, variables, context) => {
            if (context?.previousAppointments) {
                queryClient.setQueryData(['appointments'], context.previousAppointments)
            }
            toast.error('Erro ao cancelar agendamento')
            console.error('Cancel appointment error:', err)
        },
        onSuccess: () => {
            toast.success('Agendamento cancelado')
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
        },
    })

    return {
        confirmPayment,
        cancelAppointment,
    }
}
