'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
    Activity,
    FileSignature,
    CreditCard,
    Users,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function ClinicOperationalRadar() {
    const [showCardAlerts, setShowCardAlerts] = useState(false)

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['dashboard-operational-radar'],
        queryFn: async () => {
            const res = await fetch('/api/dashboard/operational-alerts')
            if (!res.ok) return null
            const json = await res.json()
            return json.success ? json.data : null
        },
        staleTime: 1000 * 60 * 3,
    })

    if (isLoading || !data) {
        return null
    }

    const cardAlerts: any[] = Array.isArray(data.insurance_card_alerts) ? data.insurance_card_alerts : []

    return (
        <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Activity className="w-4 h-4 text-[#155E4B]" />
                            Radar Operacional da Clínica
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Ações práticas para acelerar faturamento, manter carteirinhas em dia antes da sessão e preencher janelas com a fila de espera.
                        </CardDescription>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="h-8 px-2.5 text-xs gap-1 self-start sm:self-auto"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 1. Evoluções para assinar (30 dias) */}
                    <div className="rounded-lg border border-border bg-[#FAFAF8] p-4 flex flex-col justify-between gap-3">
                        <div>
                            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                <span>Evoluções para Assinar (30d)</span>
                                <FileSignature className="w-4 h-4 text-[#155E4B]" />
                            </div>
                            <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">
                                {data.pending_evolutions_30d}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                em {data.completed_sessions_30d} atendimentos concluídos
                            </p>
                        </div>

                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 w-full justify-between text-xs bg-white"
                        >
                            <Link href="/dashboard/terapia/conformidade-evolucao">
                                <span>Ver conformidade</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </Button>
                    </div>

                    {/* 2. Semáforo de Carteirinhas (próximos 7 dias) */}
                    <div className="rounded-lg border border-border bg-[#FAFAF8] p-4 flex flex-col justify-between gap-3">
                        <div>
                            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                <span>Carteirinhas (Próximos 7 dias)</span>
                                <CreditCard className="w-4 h-4 text-[#155E4B]" />
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                                <p className="text-2xl font-bold text-foreground tabular-nums">
                                    {data.insurance_card_alerts_count}
                                </p>
                                {data.insurance_card_alerts_count === 0 ? (
                                    <Badge className="bg-[#E6F2EE] text-[#114D3E] hover:bg-[#E6F2EE] text-[10px] gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Tudo em dia
                                    </Badge>
                                ) : (
                                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px]">
                                        Revisar antes da sessão
                                    </Badge>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Vencidas, vencendo em 30d ou sem número
                            </p>
                        </div>

                        {cardAlerts.length > 0 ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCardAlerts((v) => !v)}
                                className="h-8 w-full justify-between text-xs bg-white"
                            >
                                <span>{showCardAlerts ? 'Ocultar pacientes' : 'Listar pacientes'}</span>
                                {showCardAlerts ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                )}
                            </Button>
                        ) : (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8 w-full justify-between text-xs bg-white"
                            >
                                <Link href="/dashboard/tiss">
                                    <span>Abrir módulo TISS</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </Button>
                        )}
                    </div>

                    {/* 3. Fila de Espera Ativa */}
                    <div className="rounded-lg border border-border bg-[#FAFAF8] p-4 flex flex-col justify-between gap-3">
                        <div>
                            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                <span>Fila de Espera Ativa</span>
                                <Users className="w-4 h-4 text-[#155E4B]" />
                            </div>
                            <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">
                                {data.waiting_list_active_count}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Pacientes prontos para encaixe em janelas livres
                            </p>
                        </div>

                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 w-full justify-between text-xs bg-white"
                        >
                            <Link href="/dashboard/terapia/fila-espera">
                                <span>Abrir fila de espera</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Lista expansível de pacientes com carteirinha para regularizar antes da sessão */}
                {showCardAlerts && cardAlerts.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-white divide-y divide-border overflow-hidden">
                        {cardAlerts.map((alert: any) => (
                            <div
                                key={alert.patient_id}
                                className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-foreground">
                                        {alert.patient_name}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={
                                            alert.issue_type === 'expired'
                                                ? 'bg-rose-50 text-rose-800 border-rose-200 text-[10px]'
                                                : 'bg-amber-50 text-amber-800 border-amber-200 text-[10px]'
                                        }
                                    >
                                        {alert.issue_label}
                                    </Badge>
                                    <span className="text-[11px] text-muted-foreground">
                                        Sessão em {alert.appointment_date.split('-').reverse().join('/')}
                                    </span>
                                </div>
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 text-[11px] self-start sm:self-auto"
                                >
                                    <Link href={`/dashboard/pacientes/${alert.patient_id}`}>
                                        Abrir ficha
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
