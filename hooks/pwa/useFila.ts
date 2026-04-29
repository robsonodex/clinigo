'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface FilaItem {
  id: string
  patient_name: string
  appointment_time: string
  status: string
  checked_in_at?: string
  consulting_room?: string
  doctor_name?: string
  wait_minutes?: number
}

interface UseFilaReturn {
  queue: FilaItem[]
  loading: boolean
  count: number
  refresh: () => Promise<void>
  callNext: (id: string) => Promise<boolean>
}

export function useFila(): UseFilaReturn {
  const [queue, setQueue] = useState<FilaItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', user.id)
        .single() as any

      if (!profile?.clinic_id) return

      const today = new Date().toISOString().split('T')[0]

      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .eq('appointment_date', today)
        .in('status', ['WAITING', 'CHECKED_IN', 'IN_QUEUE', 'CONFIRMED'])
        .order('appointment_time', { ascending: true }) as any

      const now = Date.now()
      const items: FilaItem[] = (data || []).map((a: any) => ({
        id: a.id,
        patient_name: a.patient_name || 'Paciente',
        appointment_time: a.appointment_time,
        status: a.status,
        checked_in_at: a.checked_in_at,
        consulting_room: a.consulting_room,
        doctor_name: a.doctor_name,
        wait_minutes: a.checked_in_at
          ? Math.round((now - new Date(a.checked_in_at).getTime()) / 60000)
          : undefined,
      }))

      setQueue(items)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    fetchQueue()

    const supabase = createClient()
    const channel = supabase
      .channel('pwa-fila')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
      }, () => {
        fetchQueue()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchQueue])

  const callNext = useCallback(async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'IN_PROGRESS' })
        .eq('id', id) as any

      if (error) return false
      setQueue(prev => prev.filter(q => q.id !== id))
      return true
    } catch {
      return false
    }
  }, [])

  return { queue, loading, count: queue.length, refresh: fetchQueue, callNext }
}
