'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert, ExternalLink, PenTool, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DoctorPendingTermsBanner() {
    const { data } = useQuery<{ pending_signatures: any[]; doctor_id?: string }>({
        queryKey: ['my-pending-signatures'],
        queryFn: async () => {
            const res = await fetch('/api/professional-signatures?pending_for_current_user=true')
            if (!res.ok) return { pending_signatures: [] }
            return res.json()
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
    })

    const pendingList = data?.pending_signatures || []

    if (pendingList.length === 0) return null

    const firstPending = pendingList[0]

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 sm:py-2.5 transition-all animate-in fade-in duration-300">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <PenTool className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <strong className="font-semibold block sm:inline mr-1 text-foreground">
                            {pendingList.length === 1
                                ? 'Documento Contratual Pendente de Assinatura:'
                                : `${pendingList.length} Documentos Contratuais Pendentes:`}
                        </strong>
                        <span className="text-muted-foreground">
                            {firstPending.title} {pendingList.length > 1 && `(+${pendingList.length - 1} outro(s))`}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        size="sm"
                        asChild
                        className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs gap-1.5 w-full sm:w-auto"
                    >
                        <a
                            href={`/assinar/${firstPending.signing_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Revisar e Assinar Agora</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    )
}
