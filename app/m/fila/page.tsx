'use client'

import { useCallback, useState } from 'react'
import { useFila } from '@/hooks/pwa/useFila'
import { SkeletonList } from '@/components/pwa/Skeleton'
import { useToast } from '@/components/pwa/Toast'

export default function FilaPage() {
  const { queue, loading, refresh, callNext } = useFila()
  const { toast } = useToast()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const handleCall = useCallback(async (id: string, name: string) => {
    const ok = await callNext(id)
    toast(ok ? `${name} chamado para atendimento` : 'Erro ao chamar paciente', ok ? 'success' : 'error')
  }, [callNext, toast])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">Fila de Espera</h1>
            <p className="text-xs text-zinc-400">{queue.length} paciente{queue.length !== 1 ? 's' : ''} aguardando</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="p-2 rounded-xl bg-zinc-900 active:bg-zinc-800 transition">
            <svg className={`w-5 h-5 text-zinc-400 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <SkeletonList count={4} />
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <svg className="w-16 h-16 mb-4 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
            <p className="text-sm font-medium">Nenhum paciente na fila</p>
            <p className="text-xs text-zinc-600 mt-1">A fila atualiza em tempo real</p>
          </div>
        ) : (
          queue.map((item, idx) => (
            <div key={item.id} className="bg-zinc-900 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 font-bold text-sm">
                    {idx + 1}º
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.patient_name}</p>
                    <p className="text-xs text-zinc-500">
                      {item.appointment_time?.substring(0, 5)}
                      {item.doctor_name && ` · Dr(a). ${item.doctor_name}`}
                    </p>
                  </div>
                </div>
                {item.wait_minutes !== undefined && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    item.wait_minutes > 30 ? 'bg-red-500/10 text-red-400' :
                    item.wait_minutes > 15 ? 'bg-amber-500/10 text-amber-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {item.wait_minutes}min
                  </span>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleCall(item.id, item.patient_name)}
                  className="flex-1 h-10 bg-teal-600 text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition"
                >
                  Chamar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
