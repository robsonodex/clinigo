/**
 * CLINIGO PREMIUM - Supabase Realtime for Slot Updates
 * Anti-overbooking system enhancement
 * 
 * Listens to slot lock changes and updates UI in real-time
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

export interface SlotLockUpdate {
    doctor_id: string
    slot_datetime: string
    lock_status: 'ACTIVE' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED'
    locked_by: string
    expires_at: string
}

interface UseRealtimeSlotLocksOptions {
    doctorId: string
    onLockAcquired?: (lock: SlotLockUpdate) => void
    onLockReleased?: (lock: SlotLockUpdate) => void
    onLockConfirmed?: (lock: SlotLockUpdate) => void
}

/**
 * Hook to subscribe to real-time slot lock updates
 */
export function useRealtimeSlotLocks({
    doctorId,
    onLockAcquired,
    onLockReleased,
    onLockConfirmed
}: UseRealtimeSlotLocksOptions) {

    const [activeLocks, setActiveLocks] = useState<SlotLockUpdate[]>([])
    const { toast } = useToast()
    const supabase = createClient()

    useEffect(() => {
        // Fetch initial active locks
        const fetchInitialLocks = async () => {
            const { data } = await supabase
                .from('appointment_slot_locks')
                .select('doctor_id, slot_datetime, lock_status, locked_by, expires_at')
                .eq('doctor_id', doctorId)
                .eq('lock_status', 'ACTIVE')
                .gt('expires_at', new Date().toISOString())

            if (data) {
                setActiveLocks(data as SlotLockUpdate[])
            }
        }

        fetchInitialLocks()

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`slot-locks:${doctorId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'appointment_slot_locks',
                    filter: `doctor_id=eq.${doctorId}`,
                },
                (payload) => {
                    const lock = payload.new as SlotLockUpdate

                    setActiveLocks((prev) => [...prev, lock])

                    onLockAcquired?.(lock)

                    // Show toast notification
                    toast({
                        title: '📌 Horário reservado',
                        description: `${new Date(lock.slot_datetime).toLocaleString('pt-BR')} - por outro usuário`,
                        duration: 3000,
                    })
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'appointment_slot_locks',
                    filter: `doctor_id=eq.${doctorId}`,
                },
                (payload) => {
                    const lock = payload.new as SlotLockUpdate

                    setActiveLocks((prev) => {
                        // Remove if expired/confirmed/cancelled
                        if (lock.lock_status !== 'ACTIVE') {
                            onLockReleased?.(lock)

                            if (lock.lock_status === 'CONFIRMED') {
                                onLockConfirmed?.(lock)

                                toast({
                                    title: '✅ Agendamento confirmado',
                                    description: `${new Date(lock.slot_datetime).toLocaleString('pt-BR')}`,
                                    duration: 2000,
                                })
                            }

                            return prev.filter(
                                (l) =>
                                    !(l.doctor_id === lock.doctor_id && l.slot_datetime === lock.slot_datetime)
                            )
                        }

                        // Update existing lock
                        return prev.map((l) =>
                            l.doctor_id === lock.doctor_id && l.slot_datetime === lock.slot_datetime
                                ? lock
                                : l
                        )
                    })
                }
            )
            .subscribe()

        // Cleanup subscription
        return () => {
            supabase.removeChannel(channel)
        }
    }, [doctorId, supabase, toast])

    return {
        activeLocks,
        isSlotLocked: (slotDatetime: string) => {
            return activeLocks.some(
                (lock) =>
                    lock.slot_datetime === slotDatetime &&
                    new Date(lock.expires_at) > new Date()
            )
        },
    }
}
