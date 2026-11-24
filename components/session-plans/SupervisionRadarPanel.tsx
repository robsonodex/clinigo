'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Award,
    ClipboardCheck,
    Copy,
    ExternalLink,
    RefreshCw,
    Scale,
    TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRole } from '@/lib/hooks/use-auth'
import type { SupervisionRadarReport } from '@/lib/session-plans/supervision-radar'

const SPECIALTY_LABELS: Record<string, string> = {
    intervencao_precoce_aba: 'ABA / Intervenção Precoce',
    psicologia: 'Psicologia',
    fonoaudiologia: 'Fonoaudiologia',
    terapia_ocupacional: 'Terapia Ocupacional',
    fisioterapia: 'Fisioterapia',
    psicomotricidade: 'Psicomotricidade',
}

const CLINICAL_SUPERVISION_ROLES = new Set(['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'])

export function SupervisionRadarPanel() {
    const { role, isSuperAdmin, isImpersonating, isLoading: roleLoading } = useRole()
    const effectiveRole = isSuperAdmin && !isImpersonating ? 'SUPER_ADMIN' : (role || '').toUpperCase()
    const canSeeClinicalSupervision = !roleLoading && CLINICAL_SUPERVISION_ROLES.has(effectiveRole)

    const [days, setDays] = useState<30 | 60 | 90>(60)
    const [activeTab, setActiveTab] = useState<'stagnation' | 'promotions' | 'calibration'>('stagnation')

    const { data, isLoading, isFetching, refetch } = useQuery<SupervisionRadarReport | null>({
        queryKey: ['terapia-supervision-radar', days],
        queryFn: async () => {
            const res = await fetch(`/api/terapia/supervision-radar?days=${days}`)
            if (!res.ok) return null
            const json = await res.json()
            return json.success ? json.data : null
        },
        enabled: canSeeClinicalSupervision,
        staleTime: 60_000,
    })

    if (!canSeeClinicalSupervision) {
        return null
    }

    const copyDraftSummary = async () => {
        if (!data?.clinicalDraftSummary) return
        try {
            await navigator.clipboard.writeText(data.clinicalDraftSummary)
            toast.success('Rascunho técnico copiado para a área de transferência.')
        } catch {
            toast.error('Não foi possível copiar o texto.')
        }
    }

    if (isLoading) {
        return (
            <Card className="border-border bg-card shadow-xs">
                <CardContent className="py-8 text-center text-xs text-muted-foreground">
                    Analisando evolução longitudinal, estagnação e calibração da equipe...
                </CardContent>
            </Card>
        )
    }

    if (!data) {
        return null
    }

    const comp = data.periodComparison

    return (
        <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <TrendingUp className="w-4 h-4 text-[#155E4B]" />
                            Mesa de Supervisão Clínica — Radar ABA & PEI
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Semáforo automático de estagnação, metas prontas para promoção, descalibração entre aplicadores e comparativo de níveis de suporte.
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {([30, 60, 90] as const).map((d) => (
                            <Button
                                key={d}
                                type="button"
                                size="sm"
                                variant={days === d ? 'default' : 'outline'}
                                onClick={() => setDays(d)}
                                className={`h-8 px-2.5 text-xs ${
                                    days === d ? 'bg-[#155E4B] hover:bg-[#0F4C3A] text-white' : ''
                                }`}
                            >
                                {d} dias
                            </Button>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-8 px-2.5 text-xs gap-1"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* KPIs de Supervisão */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="rounded-lg border border-border bg-[#FAFAF8] p-3">
                        <p className="text-[11px] text-muted-foreground">Independência Média ({comp.recentDays}d)</p>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-bold tabular-nums text-foreground">
                                {comp.recentAvgIndependencePct}%
                            </span>
                            {comp.deltaIndependencePct !== null && (
                                <span
                                    className={`text-xs font-semibold inline-flex items-center ${
                                        comp.deltaIndependencePct >= 0 ? 'text-[#155E4B]' : 'text-rose-700'
                                    }`}
                                >
                                    {comp.deltaIndependencePct >= 0 ? (
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    ) : (
                                        <ArrowDownRight className="w-3.5 h-3.5" />
                                    )}
                                    {comp.deltaIndependencePct >= 0 ? '+' : ''}
                                    {comp.deltaIndependencePct} p.p.
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Nível de suporte médio: {comp.recentAvgHelpScore || '-'} / 6
                            {comp.promptFadingImproved ? ' (autonomia em alta)' : ''}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setActiveTab('stagnation')}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                            activeTab === 'stagnation'
                                ? 'border-amber-400 bg-amber-50/70'
                                : 'border-border bg-[#FAFAF8] hover:border-amber-300'
                        }`}
                    >
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Estagnação / Regressão
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-amber-900">
                            {data.stagnationAlerts.length}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Metas para revisar critério</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('promotions')}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                            activeTab === 'promotions'
                                ? 'border-[#155E4B] bg-[#E6F2EE]/70'
                                : 'border-border bg-[#FAFAF8] hover:border-[#155E4B]/50'
                        }`}
                    >
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-[#155E4B]" />
                            Prontas p/ Promoção
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-[#114D3E]">
                            {data.promotionsReady.length}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Critério &ge;80% &times; 3 sessões</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('calibration')}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                            activeTab === 'calibration'
                                ? 'border-blue-400 bg-blue-50/70'
                                : 'border-border bg-[#FAFAF8] hover:border-blue-300'
                        }`}
                    >
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-blue-700" />
                            Calibração de Equipe
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-blue-900">
                            {data.calibrationGaps.length}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Divergência &ge;25 p.p. entre aplicadores</p>
                    </button>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Síntese Técnica Assistida */}
                <div className="rounded-lg border border-[#C4E1D7] bg-[#E6F2EE]/40 p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 text-xs">
                        <p className="font-semibold text-[#114D3E] flex items-center gap-1.5">
                            <ClipboardCheck className="w-3.5 h-3.5 text-[#155E4B]" />
                            Rascunho de Análise Clínica do Período (Apoio à Decisão do Supervisor)
                        </p>
                        <p className="text-slate-700 leading-relaxed">{data.clinicalDraftSummary}</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyDraftSummary}
                        className="h-8 px-2.5 text-xs bg-white shrink-0 gap-1"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar texto
                    </Button>
                </div>

                {/* Lista da aba ativa */}
                {activeTab === 'stagnation' && (
                    <div className="space-y-2">
                        {data.stagnationAlerts.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">
                                Nenhum alerta de estagnação ou regressão identificado no período selecionado.
                            </p>
                        ) : (
                            data.stagnationAlerts.map((item, idx) => (
                                <div
                                    key={`${item.patientId}-${item.code}-${idx}`}
                                    className="rounded-lg border border-amber-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <strong className="text-foreground">{item.patientName}</strong>
                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                {item.code}
                                            </Badge>
                                            <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 text-[10px]">
                                                {item.reasonLabel}
                                            </Badge>
                                        </div>
                                        <p className="text-slate-700 truncate">
                                            {item.title} · Último: <strong>{item.latestPct}%</strong> ({item.latestSupportLabel}) ·{' '}
                                            {SPECIALTY_LABELS[item.especialidade] || item.especialidade}
                                        </p>
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="h-8 text-xs shrink-0 gap-1">
                                        <Link href={`/dashboard/pacientes/${item.patientId}/planos-sessao/${item.especialidade}`}>
                                            Revisar PEI
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'promotions' && (
                    <div className="space-y-2">
                        {data.promotionsReady.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">
                                Nenhuma meta atingiu o critério de domínio (&ge;80% em 3 sessões consecutivas) neste período.
                            </p>
                        ) : (
                            data.promotionsReady.map((item, idx) => (
                                <div
                                    key={`${item.patientId}-${item.code}-${idx}`}
                                    className="rounded-lg border border-[#C4E1D7] bg-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <strong className="text-foreground">{item.patientName}</strong>
                                            <Badge variant="outline" className="font-mono text-[10px] bg-[#E6F2EE] text-[#114D3E]">
                                                {item.code}
                                            </Badge>
                                            <Badge className="bg-[#155E4B] text-white text-[10px]">
                                                Domínio {item.latestPct}% ({item.consecutiveMasterySessions}x)
                                            </Badge>
                                        </div>
                                        <p className="text-slate-700 truncate">
                                            {item.title} · Suporte: {item.latestSupportLabel} ·{' '}
                                            {SPECIALTY_LABELS[item.especialidade] || item.especialidade}
                                        </p>
                                    </div>
                                    <Button asChild size="sm" className="h-8 text-xs bg-[#155E4B] hover:bg-[#0F4C3A] text-white shrink-0 gap-1">
                                        <Link href={`/dashboard/pacientes/${item.patientId}/planos-sessao/${item.especialidade}`}>
                                            Promover / Manutenção
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'calibration' && (
                    <div className="space-y-2">
                        {data.calibrationGaps.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">
                                Nenhuma divergência relevante (&ge;25 p.p.) detectada entre aplicadores no mesmo objetivo.
                            </p>
                        ) : (
                            data.calibrationGaps.map((gap, idx) => (
                                <div
                                    key={`${gap.patientId}-${gap.code}-${idx}`}
                                    className="rounded-lg border border-blue-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <strong className="text-foreground">{gap.patientName}</strong>
                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                {gap.code}
                                            </Badge>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200 text-[10px]">
                                                Diferença de {gap.gapPct} p.p.
                                            </Badge>
                                        </div>
                                        <p className="text-slate-700">
                                            {gap.title} — <strong>{gap.highApplicatorName}</strong> ({gap.highAvgPct}%) vs{' '}
                                            <strong>{gap.lowApplicatorName}</strong> ({gap.lowAvgPct}%)
                                        </p>
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="h-8 text-xs shrink-0 gap-1">
                                        <Link href={`/dashboard/pacientes/${gap.patientId}/planos-sessao/${gap.especialidade}`}>
                                            Abrir PEI
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
