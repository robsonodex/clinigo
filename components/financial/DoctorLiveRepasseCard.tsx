'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
    CheckCircle2,
    Clock,
    FileSignature,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

export function DoctorLiveRepasseCard() {
    const [showPendingList, setShowPendingList] = useState(false)

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['doctor-my-live-summary'],
        queryFn: async () => {
            const res = await fetch('/api/payroll/my-summary')
            if (!res.ok) return null
            const json = await res.json()
            return json.success ? json.data : null
        },
        staleTime: 60_000,
    })

    if (isLoading || !data || !data.evolution_compliance) {
        return null
    }

    const comp = data.evolution_compliance
    const pendingList: any[] = Array.isArray(comp.pending_appointments) ? comp.pending_appointments : []

    return (
        <Card className="border border-[#C4E1D7] bg-[#FAFAF8] shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 bg-white rounded-t-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#0F1F1B]">
                            <FileSignature className="w-4 h-4 text-[#155E4B]" />
                            Meu Repasse em Tempo Real (Mês Atual)
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Acompanhe o valor já confirmado por evoluções assinadas e os atendimentos pendentes de assinatura para fechamento ágil.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Badge
                            variant="outline"
                            className="bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7] font-mono text-xs"
                        >
                            Conformidade: {comp.compliance_rate}%
                        </Badge>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-8 px-2 text-xs gap-1"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-[#C4E1D7] bg-[#E6F2EE]/55 p-4">
                        <div className="flex items-center justify-between text-xs font-medium text-[#114D3E]">
                            <span>Liberado (Evolução Assinada)</span>
                            <CheckCircle2 className="w-4 h-4 text-[#155E4B]" />
                        </div>
                        <p className="mt-1.5 text-2xl font-bold text-[#114D3E] tabular-nums">
                            {formatCurrency(comp.repasse_liberado || 0)}
                        </p>
                        <p className="text-[11px] text-[#114D3E]/80 mt-0.5">
                            {comp.with_signed_evolution} de {comp.total_completed} atendimento(s) concluído(s)
                        </p>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
                        <div className="flex items-center justify-between text-xs font-medium text-amber-900">
                            <span>Aguardando Evolução Assinada</span>
                            <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="mt-1.5 text-2xl font-bold text-amber-900 tabular-nums">
                            {formatCurrency(comp.repasse_aguardando_evolucao || 0)}
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                            {comp.pending_evolution_count} atendimento(s) para evoluir/assinar
                        </p>
                    </div>

                    <div className="rounded-lg border border-border bg-white p-4 flex flex-col justify-between">
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">
                                Produção Prevista no Mês ({data.percentage || 0}%)
                            </div>
                            <p className="mt-1.5 text-2xl font-bold text-[#0F1F1B] tabular-nums">
                                {formatCurrency(data.current_month?.repasse_calculado || 0)}
                            </p>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[#155E4B] transition-all"
                                style={{ width: `${Math.min(100, Math.max(0, comp.compliance_rate))}%` }}
                            />
                        </div>
                    </div>
                </div>

                {pendingList.length > 0 && (
                    <div className="rounded-lg border border-border bg-white overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowPendingList((v) => !v)}
                            className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#0F1F1B] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                        >
                            <span>
                                Ver {pendingList.length} atendimento(s) aguardando evolução assinada
                            </span>
                            {showPendingList ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                        </button>

                        {showPendingList && (
                            <div className="divide-y divide-border border-t border-border">
                                {pendingList.map((item: any) => (
                                    <div
                                        key={item.appointment_id}
                                        className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                    >
                                        <div>
                                            <span className="font-semibold text-[#0F1F1B]">
                                                {item.patient_name}
                                            </span>
                                            <span className="text-muted-foreground ml-2">
                                                Atendimento em{' '}
                                                {item.appointment_date
                                                    ? item.appointment_date.split('-').reverse().join('/')
                                                    : '-'}
                                            </span>
                                            {item.estimated_repasse > 0 && (
                                                <span className="font-mono text-[#114D3E] ml-2">
                                                    ({formatCurrency(item.estimated_repasse)})
                                                </span>
                                            )}
                                        </div>

                                        <Button
                                            asChild
                                            size="sm"
                                            className="h-8 px-3 text-xs bg-[#155E4B] hover:bg-[#0F493A] text-white gap-1 self-start sm:self-auto"
                                        >
                                            <Link href={`/dashboard/prontuarios?patientId=${item.patient_id}`}>
                                                Evoluir agora
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
