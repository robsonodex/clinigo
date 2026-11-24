'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    AlertTriangle,
    Building2,
    Clock,
    Download,
    RefreshCw,
    ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import type { OperatorIntelligenceReport } from '@/lib/tiss/operator-intelligence'

export function OperatorIntelligenceCard() {
    const { data, isLoading, isFetching, refetch } = useQuery<OperatorIntelligenceReport | null>({
        queryKey: ['tiss-operator-intelligence'],
        queryFn: async () => {
            const res = await fetch('/api/tiss/operator-intelligence')
            if (!res.ok) return null
            const json = await res.json()
            return json.success ? json.data : null
        },
        staleTime: 1000 * 60 * 3,
    })

    const handleExportCsv = () => {
        if (!data || data.operators.length === 0) return
        const headers = [
            'Operadora',
            'Lotes',
            'Faturado',
            'Glosado',
            'Taxa Glosa (%)',
            'Irrecuperavel',
            'Recuperavel',
            'Prazo Retorno (dias)',
            'Margem Estimada (%)',
        ]
        const rows = data.operators.map((o) => [
            `"${o.operatorName.replace(/"/g, '""')}"`,
            o.batchesCount,
            o.billedValue.toFixed(2),
            o.glosaValue.toFixed(2),
            o.glosaRatePct.toFixed(1),
            o.irrecoverableValue.toFixed(2),
            o.appealableValue.toFixed(2),
            o.avgReturnDays ?? '',
            o.netMarginEstimatePct.toFixed(1),
        ])
        const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `raio-x-operadoras-tiss-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (isLoading || !data) {
        return null
    }

    return (
        <div className="space-y-4">
            {/* Raio-X por Operadora */}
            <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Building2 className="w-4 h-4 text-[#155E4B]" />
                            Raio-X de Rentabilidade por Operadora (Histórico Real)
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Compare taxa de glosa, prazo real de retorno (DSO), margem retida e os 3 motivos ANS mais frequentes de cada convênio.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 print:hidden">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleExportCsv}
                            disabled={data.operators.length === 0}
                            className="h-9 px-3 text-xs gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Exportar CSV
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-9 px-3 text-xs gap-1.5"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {data.operators.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                            Ainda não há lotes TISS registrados para comparar operadoras.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="text-[11px] font-semibold uppercase">Operadora</TableHead>
                                        <TableHead className="text-right text-[11px] font-semibold uppercase">Lotes</TableHead>
                                        <TableHead className="text-right text-[11px] font-semibold uppercase">Faturado</TableHead>
                                        <TableHead className="text-right text-[11px] font-semibold uppercase">Glosa (%)</TableHead>
                                        <TableHead className="text-right text-[11px] font-semibold uppercase">Prazo Retorno</TableHead>
                                        <TableHead className="text-right text-[11px] font-semibold uppercase">Margem Retida</TableHead>
                                        <TableHead className="text-[11px] font-semibold uppercase">Principais Motivos ANS</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.operators.map((op) => (
                                        <TableRow key={op.operatorId || op.operatorName}>
                                            <TableCell className="text-xs font-semibold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <span>{op.operatorName}</span>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            op.riskLevel === 'alto'
                                                                ? 'bg-rose-50 text-rose-800 border-rose-200 text-[10px]'
                                                                : op.riskLevel === 'moderado'
                                                                ? 'bg-amber-50 text-amber-800 border-amber-200 text-[10px]'
                                                                : 'bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7] text-[10px]'
                                                        }
                                                    >
                                                        {op.riskLevel === 'alto'
                                                            ? 'Atenção Alta'
                                                            : op.riskLevel === 'moderado'
                                                            ? 'Moderado'
                                                            : 'Saudável'}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-xs tabular-nums">
                                                {op.batchesCount}
                                            </TableCell>
                                            <TableCell className="text-right text-xs tabular-nums font-medium">
                                                {formatCurrency(op.billedValue)}
                                            </TableCell>
                                            <TableCell className="text-right text-xs tabular-nums font-semibold text-rose-700">
                                                {op.glosaRatePct.toFixed(1)}%
                                                <div className="text-[10px] font-normal text-muted-foreground">
                                                    {formatCurrency(op.glosaValue)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                                {op.avgReturnDays !== null ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {op.avgReturnDays}d
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-xs tabular-nums font-semibold text-[#155E4B]">
                                                {op.netMarginEstimatePct.toFixed(1)}%
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                                                {op.topReasons.length === 0 ? (
                                                    <span>Sem glosas registradas</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {op.topReasons.map((r) => (
                                                            <Badge
                                                                key={r.code}
                                                                variant="outline"
                                                                title={r.description}
                                                                className="font-mono text-[10px]"
                                                            >
                                                                {r.code} ({r.count}x)
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Memória Anti-Glosa Aprendida */}
            {data.antiGlosaMemory.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/40 shadow-xs">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-950">
                            <ShieldCheck className="w-4 h-4 text-[#155E4B]" />
                            Memória Anti-Glosa por Operadora ({data.antiGlosaMemory.length} padrões aprendidos)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Padrões recorrentes detectados no histórico da clínica e aplicados automaticamente como alertas preventivos antes de fechar próximos lotes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-1">
                        {data.antiGlosaMemory.slice(0, 6).map((rule, idx) => (
                            <div
                                key={`${rule.operatorName}-${rule.glosaCode}-${idx}`}
                                className="rounded-lg border border-amber-200/80 bg-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                                <div className="space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <strong className="text-foreground">{rule.operatorName}</strong>
                                        <Badge variant="outline" className="font-mono text-[10px]">
                                            ANS {rule.glosaCode}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                            {rule.occurrences}x · {formatCurrency(rule.totalGlosedValue)}
                                        </span>
                                    </div>
                                    <p className="text-slate-700 pl-5">{rule.recommendation}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

