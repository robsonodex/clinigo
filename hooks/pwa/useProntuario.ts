'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProntuarioData {
  id: string
  patient_id: string
  patient_name: string
  appointment_id?: string
  chief_complaint: string
  evolution: string
  cid10_code: string
  cid10_description: string
  conduct: string
  created_at: string
  updated_at?: string
}

interface UseProntuarioReturn {
  record: ProntuarioData | null
  records: ProntuarioData[]
  loading: boolean
  saving: boolean
  error: string | null
  update: (field: keyof ProntuarioData, value: string) => void
  save: () => Promise<boolean>
  loadRecord: (id: string) => Promise<void>
  loadRecent: () => Promise<void>
}

export function useProntuario(): UseProntuarioReturn {
  const [record, setRecord] = useState<ProntuarioData | null>(null)
  const [records, setRecords] = useState<ProntuarioData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const dirtyRef = useRef(false)

  const save = useCallback(async () => {
    if (!record || !dirtyRef.current) return true
    try {
      setSaving(true)
      const supabase = createClient()

      const payload: any = {
        chief_complaint: record.chief_complaint,
        evolution: record.evolution,
        cid10_code: record.cid10_code,
        conduct: record.conduct,
        updated_at: new Date().toISOString(),
      }

      if (record.id) {
        const { error } = await supabase
          .from('medical_records')
          .update(payload)
          .eq('id', record.id) as any
        if (error) throw error
      }

      dirtyRef.current = false
      return true
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
      return false
    } finally {
      setSaving(false)
    }
  }, [record])

  // Autosave every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (dirtyRef.current) save()
    }, 30000)
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [save])

  const update = useCallback((field: keyof ProntuarioData, value: string) => {
    dirtyRef.current = true
    setRecord(prev => prev ? { ...prev, [field]: value } : null)
  }, [])

  const loadRecord = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { data, error: queryError } = await supabase
        .from('medical_records')
        .select('*')
        .eq('id', id)
        .single() as any

      if (queryError) throw queryError

      setRecord({
        id: data.id,
        patient_id: data.patient_id,
        patient_name: data.patient_name || '',
        appointment_id: data.appointment_id,
        chief_complaint: data.chief_complaint || '',
        evolution: data.evolution || '',
        cid10_code: data.cid10_code || '',
        cid10_description: data.cid10_description || '',
        conduct: data.conduct || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      })

      // Cache for offline
      try {
        localStorage.setItem(`clinigo_prontuario_${id}`, JSON.stringify(data))
      } catch {}
    } catch (err: any) {
      setError(err.message)
      // Try offline cache
      try {
        const cached = localStorage.getItem(`clinigo_prontuario_${id}`)
        if (cached) setRecord(JSON.parse(cached))
      } catch {}
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRecent = useCallback(async () => {
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

      const { data } = await supabase
        .from('medical_records')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false })
        .limit(20) as any

      const items: ProntuarioData[] = (data || []).map((d: any) => ({
        id: d.id,
        patient_id: d.patient_id,
        patient_name: d.patient_name || '',
        chief_complaint: d.chief_complaint || '',
        evolution: d.evolution || '',
        cid10_code: d.cid10_code || '',
        cid10_description: d.cid10_description || '',
        conduct: d.conduct || '',
        created_at: d.created_at,
        updated_at: d.updated_at,
      }))

      setRecords(items)

      try {
        localStorage.setItem('clinigo_prontuarios_recent', JSON.stringify(items))
      } catch {}
    } catch {
      try {
        const cached = localStorage.getItem('clinigo_prontuarios_recent')
        if (cached) setRecords(JSON.parse(cached))
      } catch {}
    } finally {
      setLoading(false)
    }
  }, [])

  return { record, records, loading, saving, error, update, save, loadRecord, loadRecent }
}
