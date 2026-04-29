'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AgendaItem {
  id: string
  patient_name: string
  patient_phone?: string
  appointment_time: string
  appointment_date: string
  status: string
  doctor_name?: string
  health_insurance_name?: string
  therapy_type?: string
  consulting_room?: string
  notes?: string
}

interface UseAgendaReturn {
  appointments: AgendaItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateStatus: (id: string, status: string) => Promise<boolean>
}

export function useAgenda(date?: string): UseAgendaReturn {
  const [appointments, setAppointments] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = date || new Date().toISOString().split('T')[0]

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Sessão expirada'); return }

      const { data: profile } = await supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single() as any

      if (!profile?.clinic_id) { setError('Clínica não encontrada'); return }

      let query = supabase
        .from('appointments')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true })

      // Médicos veem só os próprios
      if (profile.role === 'DOCTOR') {
        query = query.eq('doctor_id', user.id)
      }

      const { data, error: queryError } = await query as any

      if (queryError) { setError(queryError.message); return }

      const items: AgendaItem[] = (data || []).map((a: any) => ({
        id: a.id,
        patient_name: a.patient_name || 'Paciente',
        patient_phone: a.patient_phone,
        appointment_time: a.appointment_time,
        appointment_date: a.appointment_date,
        status: a.status,
        doctor_name: a.doctor_name,
        health_insurance_name: a.health_insurance_name,
        therapy_type: a.therapy_type,
        consulting_room: a.consulting_room,
        notes: a.notes,
      }))

      setAppointments(items)

      // Cache for offline
      try {
        localStorage.setItem(`clinigo_agenda_${today}`, JSON.stringify(items))
      } catch {}
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar agenda')
      // Fallback to cache
      try {
        const cached = localStorage.getItem(`clinigo_agenda_${today}`)
        if (cached) setAppointments(JSON.parse(cached))
      } catch {}
    } finally {
      setLoading(false)
    }
  }, [today])

  const updateStatus = useCallback(async (id: string, status: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id) as any

      if (error) return false
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  return { appointments, loading, error, refresh: fetchAppointments, updateStatus }
}
