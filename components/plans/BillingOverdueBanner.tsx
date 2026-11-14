'use client'

import { AlertTriangle, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useRole } from '@/lib/hooks/use-auth'
import {
    type BillingBannerAudience,
    formatDateBr,
    getTodayBrtStr,
    normalizeDateStr,
} from '@/lib/utils/billing-banner'

interface BillingOverdueBannerProps {
    dueDate: string | null
    audience?: BillingBannerAudience
}

export function BillingOverdueBanner({ dueDate, audience = 'all' }: BillingOverdueBannerProps) {
    const { role } = useRole()
    const canManageBilling = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN'

    if (audience === 'admin_only' && !canManageBilling) {
        return null
    }

    const todayStr = getTodayBrtStr()
    const dueDateClean = normalizeDateStr(dueDate)
    const formattedDate = formatDateBr(dueDateClean) || dueDate || ''

    const isDueToday = dueDateClean === todayStr
    const isUpcoming = Boolean(dueDateClean && dueDateClean > todayStr)
    const isWarningTone = isDueToday || isUpcoming

    const titleText = isDueToday
        ? 'Fatura com Vencimento Hoje: '
        : isUpcoming
            ? 'Aviso de Faturamento: '
            : canManageBilling
                ? 'Suspensão de Serviços: '
                : 'Suspensão Iminente: '

    const bodyText = canManageBilling
        ? isDueToday
            ? `A mensalidade da sua clínica vence hoje (${formattedDate}). Regularize para manter o acesso contínuo aos serviços.`
            : isUpcoming
                ? `A mensalidade da sua clínica vence em ${formattedDate}. Regularize para manter o acesso contínuo aos serviços.`
                : `Mensalidade vencida em ${formattedDate}. Regularize o pagamento para evitar a suspensão dos serviços.`
        : isDueToday
            ? `A mensalidade da clínica vence hoje (${formattedDate}). Por favor, solicite ao administrador para regularizar.`
            : isUpcoming
                ? `A mensalidade da clínica vence em ${formattedDate}. Por favor, solicite ao administrador para regularizar.`
                : 'O acesso da clínica será restringido por fatura em aberto. Solicite ao administrador que regularize.'

    // Touch-friendly area (min-h-[44px]) for active element (PWA Rule)
    return (
        <div
            className={
                isWarningTone
                    ? 'bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4 text-amber-900 dark:text-amber-200'
                    : 'bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg px-4 py-3 mb-4 text-red-900 dark:text-red-200'
            }
        >
            <div className="flex items-center justify-between gap-4 flex-wrap text-sm">
                <div className="flex items-center gap-2.5">
                    <AlertTriangle
                        className={
                            isWarningTone
                                ? 'w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0'
                                : 'w-5 h-5 text-red-600 dark:text-red-400 shrink-0'
                        }
                    />
                    <div>
                        <span className="font-semibold">{titleText}</span>
                        <span>{bodyText}</span>
                    </div>
                </div>
                {canManageBilling && (
                    <Link
                        href="/dashboard/configuracoes/assinatura"
                        className={
                            isWarningTone
                                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-4 py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 min-h-[44px] min-w-[120px]'
                                : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 min-h-[44px] min-w-[120px]'
                        }
                    >
                        <CreditCard className="w-4 h-4" />
                        Pagar Agora
                    </Link>
                )}
            </div>
        </div>
    )
}

