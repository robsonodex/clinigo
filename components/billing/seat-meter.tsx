'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Shield, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export interface SeatUsageData {
    plan: string
    includedSeats: number | null
    activeSeats: number
    extraSeats: number
    unitPriceCents: number
    monthlyBaseCents: number
    monthlyExtraCents: number
    monthlyTotalCents: number
    isWaived: boolean
    mode: 'off' | 'shadow' | 'enforce'
}

interface SeatMeterProps {
    className?: string
    onRefreshNeeded?: () => void
}

function formatBRL(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100)
}

export function SeatMeter({ className = '' }: SeatMeterProps) {
    const [usage, setUsage] = useState<SeatUsageData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchUsage = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/billing/seat-usage')
            if (!res.ok) {
                throw new Error('Falha ao carregar uso de licenças')
            }
            const json = await res.json()
            if (json.success && json.data) {
                setUsage(json.data)
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao consultar licenças')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUsage()
    }, [fetchUsage])

    if (loading) {
        return (
            <div className={`p-4 rounded-lg border border-slate-200 bg-white space-y-3 ${className}`}>
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2 w-full" />
            </div>
        )
    }

    if (error || !usage) {
        return null
    }

    const isEnterprise = usage.includedSeats === null
    const included = usage.includedSeats ?? 0
    const active = usage.activeSeats
    const extra = usage.extraSeats

    // Cálculo da porcentagem de uso
    const usagePercentage = isEnterprise ? 100 : Math.min(100, Math.round((active / (included || 1)) * 100))

    // Cor sóbria da barra de progresso conforme especificação:
    // neutra até 80%, âmbar de 80% a 100%, azul institucional acima
    let progressBarColor = 'bg-slate-600'
    if (!isEnterprise) {
        if (active > included) {
            progressBarColor = 'bg-blue-600'
        } else if (usagePercentage >= 80) {
            progressBarColor = 'bg-amber-500'
        }
    }

    return (
        <div className={`p-4 rounded-lg border border-slate-200 bg-white shadow-sm space-y-3 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-semibold text-slate-900">
                        {isEnterprise ? 'Licenças ilimitadas' : `${active} de ${included} licenças em uso`}
                    </span>
                </div>
                {extra > 0 && (
                    <Badge variant="outline" className="text-xs font-medium border-blue-200 bg-blue-50 text-blue-700">
                        {extra} adicional{extra > 1 ? 'is' : ''}
                    </Badge>
                )}
            </div>

            {/* Barra de progresso */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-full transition-all duration-300 ${progressBarColor}`}
                    style={{ width: `${isEnterprise ? 100 : Math.min(100, usagePercentage)}%` }}
                />
            </div>

            {/* Informações complementares */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1 pt-1">
                {isEnterprise ? (
                    <span>Plano Enterprise com acesso irrestrito para toda a equipe médica e administrativa.</span>
                ) : (
                    <>
                        <span>
                            {active <= included
                                ? `${included - active} licença${included - active === 1 ? '' : 's'} restante${included - active === 1 ? '' : 's'} incluída${included - active === 1 ? '' : 's'}`
                                : 'Capacidade base atingida. Licenças adicionais ativas.'}
                        </span>
                        {extra > 0 && (
                            <span className="font-medium text-slate-800">
                                Licenças adicionais: {extra} x {formatBRL(usage.unitPriceCents)} = {formatBRL(usage.monthlyExtraCents)}/mês
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
