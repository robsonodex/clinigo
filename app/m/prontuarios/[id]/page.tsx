'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useProntuario } from '@/hooks/pwa/useProntuario'
import { SkeletonDetail } from '@/components/pwa/Skeleton'
import { useToast } from '@/components/pwa/Toast'

export default function ProntuarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { record, loading, saving, error, update, save, loadRecord } = useProntuario()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => { loadRecord(id) }, [id, loadRecord])

  async function handleSave() {
    const ok = await save()
    toast(ok ? 'Prontuário salvo' : (error || 'Erro ao salvar'), ok ? 'success' : 'error')
  }

  if (loading) return <SkeletonDetail />

  if (!record) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Prontuário não encontrado</p>
    </div>
  )

  const fields = [
    { key: 'chief_complaint' as const, label: 'Queixa Principal', rows: 3, placeholder: 'Descreva a queixa...' },
    { key: 'evolution' as const, label: 'Evolução', rows: 5, placeholder: 'Evolução do atendimento...' },
    { key: 'cid10_code' as const, label: 'CID-10', rows: 1, placeholder: 'Ex: F41.1' },
    { key: 'conduct' as const, label: 'Conduta', rows: 3, placeholder: 'Conduta adotada...' },
  ]

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl active:bg-zinc-800 transition">
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Prontuário</h1>
              <p className="text-xs text-zinc-400">{record.patient_name}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Autosave indicator */}
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <div className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          {saving ? 'Salvando...' : 'Salvamento automático a cada 30s'}
        </div>

        {fields.map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {f.label}
            </label>
            {f.rows === 1 ? (
              <input
                type="text"
                value={record[f.key] || ''}
                onChange={e => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-base placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition"
              />
            ) : (
              <textarea
                value={record[f.key] || ''}
                onChange={e => update(f.key, e.target.value)}
                rows={f.rows}
                placeholder={f.placeholder}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-base placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition resize-none"
              />
            )}
          </div>
        ))}

        {record.updated_at && (
          <p className="text-xs text-zinc-600 text-center pt-4">
            Última atualização: {new Date(record.updated_at).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  )
}
