'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRole } from '@/lib/hooks/use-auth'

interface BillingOverdueBannerProps {
    dueDate: string | null
}

export function BillingOverdueBanner({ dueDate }: BillingOverdueBannerProps) {
    const { role } = useRole()
    
    const formattedDate = dueDate ? (() => {
        const parts = dueDate.split('T')[0].split('-')
        if (parts.length !== 3) return dueDate
        const [year, month, day] = parts
        return `${day}/${month}/${year}`
    })() : ''

    const isClinicAdmin = role === 'CLINIC_ADMIN'

    // Touch-friendly area (min-h-[44px]) for active element (PWA Rule)
    return (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4 text-amber-850 dark:text-amber-200">
            <div className="flex items-center justify-between gap-4 flex-wrap text-sm">
                <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                        <span className="font-semibold">Fatura Pendente: </span>
                        <span>
                            {isClinicAdmin 
                                ? `A mensalidade da sua clínica venceu em ${formattedDate}. Acesse a área de faturamento para regularizar.`
                                : `A mensalidade da clínica venceu em ${formattedDate}. Por favor, solicite ao administrador para regularizar.`
                            }
                        </span>
                    </div>
                </div>
                {isClinicAdmin && (
                    <Link
                        href="/dashboard/configuracoes/assinatura"
                        className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-4 py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 min-h-[44px] min-w-[120px]"
                    >
                        Pagar Fatura
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                )}
            </div>
        </div>
    )
}
