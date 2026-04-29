'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAgenda, type AgendaItem } from '@/hooks/pwa/useAgenda'
import { SkeletonList } from '@/components/pwa/Skeleton'
import SwipeableCard from '@/components/pwa/SwipeableCard'
import { useToast } from '@/components/pwa/Toast'

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  CONFIRMED: { label: 'Confirmado', color: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  PENDING: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
  PENDING_PAYMENT: { label: 'Pgto Pendente', color: 'bg-orange-500/10 text-orange-400', dot: 'bg-orange-400' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400', dot: 'bg-red-400' },
  COMPLETED: { label: 'Atendido', color: 'bg-blue-500/10 text-blue-400', dot: 'bg-blue-400' },
  NO_SHOW: { label: 'Faltou', color: 'bg-zinc-500/10 text-zinc-400', dot: 'bg-zinc-400' },
  WAITING: { label: 'Aguardando', color: 'bg-teal-500/10 text-teal-400', dot: 'bg-teal-400' },
  IN_PROGRESS: { label: 'Em andamento', color: 'bg-purple-500/10 text-purple-400', dot: 'bg-purple-400' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: 'bg-zinc-800 text-zinc-400', dot: 'bg-zinc-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function formatTime(t: string) {
  if (!t) return '--:--'
  return t.substring(0, 5)
}

export default function AgendaPage() {
  const { appointments, loading, refresh, updateStatus } = useAgenda()
  const { toast } = useToast()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const today = new Date()
  const dateLabel = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const handleConfirm = useCallback(async (item: AgendaItem) => {
    const ok = await updateStatus(item.id, 'CONFIRMED')
    toast(ok ? `${item.patient_name} confirmado` : 'Erro ao confirmar', ok ? 'success' : 'error')
  }, [updateStatus, toast])

  const handleCancel = useCallback(async (item: AgendaItem) => {
    const ok = await updateStatus(item.id, 'CANCELLED')
    toast(ok ? `${item.patient_name} cancelado` : 'Erro ao cancelar', ok ? 'info' : 'error')
  }, [updateStatus, toast])

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    pending: appointments.filter(a => ['PENDING', 'PENDING_PAYMENT'].includes(a.status)).length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">Agenda</h1>
              <p className="text-xs text-zinc-400 capitalize">{dateLabel}</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl bg-zinc-900 active:bg-zinc-800 transition"
            >
              <svg className={`w-5 h-5 text-zinc-400 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex gap-3 mt-3 overflow-x-auto no-scrollbar">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'Confirmados', value: stats.confirmed, color: 'text-emerald-400' },
              { label: 'Pendentes', value: stats.pending, color: 'text-amber-400' },
              { label: 'Atendidos', value: stats.completed, color: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className="flex-shrink-0 bg-zinc-900 rounded-xl px-3 py-2 min-w-[80px]">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <SkeletonList count={6} />
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <svg className="w-16 h-16 mb-4 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="text-sm font-medium">Nenhuma consulta hoje</p>
          </div>
        ) : (
          appointments.map(item => (
            <SwipeableCard
              key={item.id}
              onSwipeRight={() => handleConfirm(item)}
              onSwipeLeft={() => handleCancel(item)}
            >
              <button
                onClick={() => router.push(`/m/agenda/${item.id}`)}
                className="w-full text-left p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-500/10 text-teal-400 font-bold text-sm">
                      {formatTime(item.appointment_time)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.patient_name}</p>
                      <p className="text-xs text-zinc-500">
                        {item.doctor_name && `Dr(a). ${item.doctor_name}`}
                        {item.therapy_type && ` · ${item.therapy_type}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                {item.health_insurance_name && (
                  <p className="text-xs text-zinc-500 pl-[52px]">
                    🏥 {item.health_insurance_name}
                  </p>
                )}
              </button>
            </SwipeableCard>
          ))
        )}
      </div>
    </div>
  )
}
