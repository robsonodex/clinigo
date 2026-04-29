'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SkeletonDetail } from '@/components/pwa/Skeleton'
import { useToast } from '@/components/pwa/Toast'

interface AppointmentDetail {
  id: string
  patient_name: string
  patient_phone?: string
  patient_email?: string
  appointment_date: string
  appointment_time: string
  status: string
  doctor_name?: string
  health_insurance_name?: string
  therapy_type?: string
  consulting_room?: string
  notes?: string
  patient_id?: string
}

export default function AgendaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<AppointmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: appt } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single() as any

      if (appt) setData(appt)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleStartConsultation() {
    if (!data) return
    const supabase = createClient()
    await supabase.from('appointments').update({ status: 'IN_PROGRESS' }).eq('id', data.id) as any
    toast('Atendimento iniciado', 'success')
    setData(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null)
  }

  async function handleComplete() {
    if (!data) return
    const supabase = createClient()
    await supabase.from('appointments').update({ status: 'COMPLETED' }).eq('id', data.id) as any
    toast('Atendimento finalizado', 'success')
    setData(prev => prev ? { ...prev, status: 'COMPLETED' } : null)
  }

  if (loading) return <SkeletonDetail />

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Consulta não encontrada</p>
    </div>
  )

  const infoRows = [
    { icon: '📅', label: 'Data', value: new Date(data.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR') },
    { icon: '🕐', label: 'Horário', value: data.appointment_time?.substring(0, 5) },
    { icon: '👨‍⚕️', label: 'Profissional', value: data.doctor_name || '-' },
    { icon: '🏥', label: 'Convênio', value: data.health_insurance_name || 'Particular' },
    { icon: '🩺', label: 'Tipo', value: data.therapy_type || '-' },
    { icon: '🚪', label: 'Sala', value: data.consulting_room || '-' },
    { icon: '📱', label: 'Telefone', value: data.patient_phone || '-' },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl active:bg-zinc-800 transition">
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Consulta</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Patient card */}
        <div className="bg-zinc-900 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-xl font-bold text-white">
              {(data.patient_name || 'P').charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">{data.patient_name}</h2>
              <p className="text-sm text-zinc-400">Status: <span className="text-teal-400 font-medium">{data.status}</span></p>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="bg-zinc-900 rounded-2xl divide-y divide-zinc-800">
          {infoRows.map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3.5">
              <span className="flex items-center gap-2 text-sm text-zinc-400">
                <span>{row.icon}</span> {row.label}
              </span>
              <span className="text-sm font-medium text-white">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="bg-zinc-900 rounded-2xl p-4">
            <p className="text-xs font-semibold text-zinc-500 mb-2">OBSERVAÇÕES</p>
            <p className="text-sm text-zinc-300">{data.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && (
            <>
              {data.status !== 'IN_PROGRESS' ? (
                <button
                  onClick={handleStartConsultation}
                  className="w-full h-14 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/20 active:scale-[0.98] transition text-base"
                >
                  ▶ Iniciar Atendimento
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition text-base"
                >
                  ✓ Finalizar Atendimento
                </button>
              )}
            </>
          )}

          {data.patient_id && (
            <button
              onClick={() => router.push(`/m/prontuarios/${data.patient_id}`)}
              className="w-full h-12 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold rounded-2xl active:bg-zinc-800 transition text-sm"
            >
              📋 Abrir Prontuário
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
