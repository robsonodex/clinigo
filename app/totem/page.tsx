'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TotemEntryPage() {
    const router = useRouter()
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function detectClinic() {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    setError('Autentique-se no painel para acessar o totem.')
                    setLoading(false)
                    return
                }

                const { data: profile } = await (supabase as any)
                    .from('users')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single()

                if (!profile?.clinic_id) {
                    setError('Nenhuma clínica vinculada.')
                    setLoading(false)
                    return
                }

                router.replace(`/totem/${profile.clinic_id}`)
            } catch {
                setError('Erro ao detectar clínica.')
                setLoading(false)
            }
        }

        detectClinic()
    }, [router])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 select-none"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
        >
            {loading ? (
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white/10 border-t-white/50 rounded-full animate-spin mb-6 mx-auto" />
                    <p className="text-white/40 text-sm">Carregando...</p>
                </div>
            ) : error ? (
                <div className="text-center max-w-sm">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-6 text-white/25">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h1 className="text-xl font-light text-white mb-3">Totem</h1>
                    <p className="text-white/40 text-sm mb-8">{error}</p>
                    <a href="/dashboard"
                        className="inline-block px-6 py-2.5 rounded-lg text-sm text-white/70 border border-white/15 hover:border-white/30 transition-colors"
                    >
                        Ir para o painel
                    </a>
                </div>
            ) : null}
        </div>
    )
}
