'use client'

import { useEffect, useState } from 'react'
import { Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TrialBannerProps {
    trialEndsAt: string | null
    approvalStatus: string | null
}

export function TrialBanner({ trialEndsAt, approvalStatus }: TrialBannerProps) {
    const [daysLeft, setDaysLeft] = useState<number | null>(null)

    useEffect(() => {
        if (approvalStatus !== 'trial' || !trialEndsAt) return

        const endDate = new Date(trialEndsAt)
        const now = new Date()
        const diffMs = endDate.getTime() - now.getTime()
        const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
        setDaysLeft(diffDays)
    }, [trialEndsAt, approvalStatus])

    // Only show for trial clinics
    if (approvalStatus !== 'trial' || daysLeft === null) return null

    // Color scheme based on urgency
    const getColors = () => {
        if (daysLeft <= 2) return {
            bg: 'bg-red-50 dark:bg-red-950/30',
            border: 'border-red-300 dark:border-red-800',
            icon: 'text-red-600 dark:text-red-400',
            title: 'text-red-900 dark:text-red-200',
            text: 'text-red-700 dark:text-red-300',
            btn: 'bg-red-600 hover:bg-red-700 text-white',
        }
        if (daysLeft <= 4) return {
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            border: 'border-amber-300 dark:border-amber-800',
            icon: 'text-amber-600 dark:text-amber-400',
            title: 'text-amber-900 dark:text-amber-200',
            text: 'text-amber-700 dark:text-amber-300',
            btn: 'bg-amber-600 hover:bg-amber-700 text-white',
        }
        return {
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            border: 'border-emerald-300 dark:border-emerald-800',
            icon: 'text-emerald-600 dark:text-emerald-400',
            title: 'text-emerald-900 dark:text-emerald-200',
            text: 'text-emerald-700 dark:text-emerald-300',
            btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        }
    }

    const colors = getColors()
    const formattedDate = new Date(trialEndsAt!).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })

    return (
        <div className={`${colors.bg} ${colors.border} border rounded-lg px-4 py-3 mb-4`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Clock className={`w-5 h-5 ${colors.icon} shrink-0`} />
                    <div>
                        <p className={`font-semibold text-sm ${colors.title}`}>
                            Teste grátis: {daysLeft === 0 ? 'último dia!' : `faltam ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`}
                        </p>
                        <p className={`text-xs ${colors.text}`}>
                            Seu acesso expira em {formattedDate}
                        </p>
                    </div>
                </div>
                <Link
                    href="/dashboard/configuracoes/plano"
                    className={`${colors.btn} px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0`}
                >
                    Escolher Plano
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    )
}
