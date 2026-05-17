'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * ImpersonationBanner — Barra laranja fixa no topo
 * Exibe em TODAS as páginas do dashboard quando cookie de impersonation está ativo
 * Lê cookie "impersonation_clinic_name" (httpOnly: false para JS ler)
 */
export function ImpersonationBanner() {
    const router = useRouter()
    const [clinicName, setClinicName] = useState<string | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [ending, setEnding] = useState(false)

    useEffect(() => {
        // Ler cookies não-httpOnly do document.cookie
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=')
            if (key) acc[key] = decodeURIComponent(value || '')
            return acc
        }, {} as Record<string, string>)

        if (cookies['impersonation_clinic_name']) {
            setClinicName(cookies['impersonation_clinic_name'])
        }
        // session_id é httpOnly, vamos buscar via API se necessário
        // Na prática, basta verificar se o clinic_name cookie existe
    }, [])

    const handleEndSession = async () => {
        setEnding(true)
        try {
            // Buscar sessão ativa para pegar o ID
            const listRes = await fetch('/api/super-admin/impersonation')
            if (listRes.ok) {
                const listData = await listRes.json()
                const activeSessions = (listData.data?.sessions || []).filter(
                    (s: any) => !s.ended_at
                )
                if (activeSessions.length > 0) {
                    await fetch(`/api/super-admin/impersonation/${activeSessions[0].id}`, {
                        method: 'DELETE',
                    })
                }
            }

            // Limpar cookie client-side como fallback
            document.cookie = 'impersonation_clinic_name=; path=/; max-age=0'

            // Redirecionar para Master Hub
            router.push('/system-master-hub')
            router.refresh()
        } catch (error) {
            console.error('Erro ao encerrar impersonation:', error)
            alert('Erro ao encerrar sessão. Tente novamente.')
        } finally {
            setEnding(false)
        }
    }

    if (!clinicName) return null

    return (
        <div className="sticky top-0 z-[60] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2.5 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                    <span className="font-semibold text-sm">
                        ⚠️ Operando como{' '}
                        <span className="font-bold underline decoration-2 underline-offset-2">
                            {clinicName}
                        </span>
                    </span>
                    <span className="text-xs opacity-80 ml-2 hidden sm:inline">
                        (Modo Impersonation — suas ações afetam esta clínica)
                    </span>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEndSession}
                    disabled={ending}
                    className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:text-white font-semibold"
                >
                    {ending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                        <LogOut className="h-4 w-4 mr-1" />
                    )}
                    Encerrar sessão
                </Button>
            </div>
        </div>
    )
}
