'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProntuario } from '@/hooks/pwa/useProntuario'
import { SkeletonList } from '@/components/pwa/Skeleton'

export default function ProntuariosPage() {
  const { records, loading, loadRecent } = useProntuario()
  const router = useRouter()

  useEffect(() => { loadRecent() }, [loadRecent])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-white">Prontuários</h1>
          <p className="text-xs text-zinc-400">Registros recentes</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <SkeletonList count={5} />
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <svg className="w-16 h-16 mb-4 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-sm font-medium">Nenhum prontuário encontrado</p>
          </div>
        ) : (
          records.map(r => (
            <button
              key={r.id}
              onClick={() => router.push(`/m/prontuarios/${r.id}`)}
              className="w-full text-left bg-zinc-900 rounded-2xl p-4 active:bg-zinc-800 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm">
                  {(r.patient_name || 'P').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.patient_name || 'Paciente'}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {r.chief_complaint || 'Sem queixa registrada'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] text-zinc-500">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  {r.cid10_code && (
                    <span className="inline-block mt-1 text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                      {r.cid10_code}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
