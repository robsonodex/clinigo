'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    ShieldCheck,
    AlertTriangle,
    XCircle,
    RefreshCw,
    CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface BatchHealthScoreCardProps {
    batchId: string
}

export function BatchHealthScoreCard({ batchId }: BatchHealthScoreCardProps) {
    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['tiss-batch-preclose-score', batchId],
        queryFn: async () => {
            const res = await fetch(`/api/tiss/batches/${batchId}/pre-close`)
            if (!res.ok) return null
            const json = await res.json()
            return json.data || null
        },
        staleTime: 30_000,
    })

    if (isLoading || !data) {
        return null
    }

    const score: number = typeof data.health_score === 'number' ? data.health_score : 0
    const level: 'excelente' | 'atencao' | 'critico' = data.health_level || 'atencao'
    const checks = data.checks_summary || {}
    const totalGuides: number = data.total_guides || 0
    const blockers: any[] = Array.isArray(data.impedimentos) ? data.impedimentos : []
    const warnings: any[] = Array.isArray(data.warnings) ? data.warnings : []

    const levelStyle =
        level === 'excelente'
            ? {
                  border: 'border-[#C4E1D7]',
                  bg: 'bg-[#E6F2EE]/45',
                  text: 'text-[#114D3E]',
                  bar: 'bg-[#155E4B]',
                  badge: 'bg-[#155E4B] text-white',
                  label: 'Pronto para XML',
              }
            : level === 'atencao'
              ? {
                    border: 'border-amber-200',
                    bg: 'bg-amber-50/50',
                    text: 'text-amber-900',
                    bar: 'bg-amber-500',
                    badge: 'bg-amber-100 text-amber-900',
                    label: 'Revisar Alertas',
                }
              : {
                    border: 'border-rose-200',
                    bg: 'bg-rose-50/50',
                    text: 'text-rose-900',
                    bar: 'bg-rose-600',
                    badge: 'bg-rose-100 text-rose-900',
                    label: 'Pendências Críticas',
                }

    return (
        <Card className={`border ${levelStyle.border} ${levelStyle.bg}`}>
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className={`text-base font-semibold flex items-center gap-2 ${levelStyle.text}`}>
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            Score de Saúde do Lote TISS (Pré-XML)
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Auditoria automática de códigos TUSS, carteirinhas, validades, valores e senhas antes de gerar o arquivo XML ANS.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-auto">
                        <div className="text-right">
                            <span className={`font-mono text-2xl font-bold ${levelStyle.text}`}>
                                {score}%
                            </span>
                            <Badge className={`ml-2 text-[10px] ${levelStyle.badge}`}>
                                {levelStyle.label}
                            </Badge>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-8 px-2.5 text-xs bg-white gap-1"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Reavaliar
                        </Button>
                    </div>
                </div>

                {/* Barra de score */}
                <div className="mt-3 h-2 w-full rounded-full bg-white/80 border border-black/5 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${levelStyle.bar}`}
                        style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
                    />
                </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3 text-xs">
                {totalGuides > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {[
                            { label: 'TUSS Válido', ok: checks.valid_tuss ?? 0 },
                            { label: 'Carteirinha', ok: checks.valid_card ?? 0 },
                            { label: 'Validade OK', ok: checks.valid_card_expiry ?? 0 },
                            { label: 'Valor > R$ 0', ok: checks.valid_value ?? 0 },
                            { label: 'Data Execução', ok: checks.valid_execution_date ?? 0 },
                            { label: 'Com Senha/Auth', ok: checks.with_authorization_code ?? 0 },
                        ].map((item) => {
                            const full = item.ok >= totalGuides
                            return (
                                <div
                                    key={item.label}
                                    className="rounded-md border border-border/60 bg-white px-2.5 py-2 flex items-center justify-between gap-1"
                                >
                                    <span className="text-[11px] text-muted-foreground truncate">
                                        {item.label}
                                    </span>
                                    <span
                                        className={`font-mono text-[11px] font-semibold shrink-0 inline-flex items-center gap-0.5 ${
                                            full ? 'text-[#155E4B]' : 'text-amber-700'
                                        }`}
                                    >
                                        {full && <CheckCircle2 className="w-3 h-3" />}
                                        {item.ok}/{totalGuides}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}

                {blockers.length > 0 && (
                    <div className="rounded-lg border border-rose-200 bg-white p-3 space-y-1.5">
                        <p className="font-semibold text-rose-800 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            Impedimentos obrigatórios ({blockers.length} guia(s)):
                        </p>
                        <ul className="space-y-1 text-[11px] text-rose-900">
                            {blockers.slice(0, 6).map((b: any) => (
                                <li key={b.guide_id}>
                                    <strong>Guia {b.guide_number}</strong> ({b.patient_name || 'Paciente'}):{' '}
                                    {(b.issues || []).join(' ')}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-white p-3 space-y-1.5">
                        <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Alertas preventivos ({warnings.length} guia(s)):
                        </p>
                        <ul className="space-y-1 text-[11px] text-amber-950">
                            {warnings.slice(0, 5).map((w: any) => (
                                <li key={w.guide_id}>
                                    <strong>Guia {w.guide_number}</strong> ({w.patient_name || 'Paciente'}):{' '}
                                    {(w.warnings || []).join(' ')}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
