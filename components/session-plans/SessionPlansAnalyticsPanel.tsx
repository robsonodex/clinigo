'use client'

import React, { useMemo, useState } from 'react'
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
    ComposedChart,
    Bar,
} from 'recharts'
import {
    TrendingUp,
    Award,
    Target,
    AlertTriangle,
    Download,
    Activity,
    CheckCircle2,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
    computeSessionPlansAnalytics,
    type ObjectiveMasteryStatus,
} from '@/lib/session-plans/learning-curve'

interface SessionPlansAnalyticsPanelProps {
    patientName: string
    specialtyName: string
    councilName: string
    clinicName: string
    sessoes: any[]
}

const CHART_PALETTE = ['#155E4B', '#0E7490', '#B45309', '#4338CA', '#9F1239', '#475569']

const STATUS_BADGE_MAP: Record<
    ObjectiveMasteryStatus,
    { label: string; className: string }
> = {
    dominada: {
        label: 'Meta Dominada (≥80% × 3)',
        className: 'bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7]',
    },
    em_aquisicao: {
        label: 'Em Aquisição',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    atencao: {
        label: 'Revisar Dica / Suporte',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    sem_dados: {
        label: 'Sem Coleta',
        className: 'bg-slate-50 text-slate-500 border-slate-200',
    },
}

export function SessionPlansAnalyticsPanel({
    patientName,
    specialtyName,
    councilName,
    clinicName,
    sessoes,
}: SessionPlansAnalyticsPanelProps) {
    const [selectedCode, setSelectedCode] = useState<string>('all')
    const [chartView, setChartView] = useState<'curva' | 'suporte'>('curva')
    const [isExportingPdf, setIsExportingPdf] = useState(false)

    const analytics = useMemo(() => computeSessionPlansAnalytics(sessoes), [sessoes])

    const activeObjectiveCodes = useMemo(() => {
        if (selectedCode === 'all') {
            return analytics.objectives.slice(0, 6).map((o) => o.code)
        }
        return [selectedCode]
    }, [selectedCode, analytics.objectives])

    const handleExportProgressPdf = async () => {
        try {
            setIsExportingPdf(true)
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const brand = clinicName?.trim() || 'CliniGo Terapias'
            const todayStr = new Date().toLocaleDateString('pt-BR')

            // Cabeçalho Institucional White-Label
            doc.setFillColor(21, 94, 75)
            doc.rect(0, 0, 210, 26, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(14)
            doc.text(brand, 14, 12)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9.5)
            doc.text(`Relatório Longitudinal de Evolução Clínica (PEI) · ${specialtyName}`, 14, 19)
            doc.text(`Emitido em ${todayStr}`, 196, 19, { align: 'right' })

            // Identificação
            doc.setTextColor(15, 31, 27)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(11)
            doc.text(`Paciente: ${patientName}`, 14, 36)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(75, 91, 86)
            doc.text(
                `Área: ${specialtyName} (${councilName}) · Sessões analisadas: ${analytics.totalSessions} · Tentativas coletadas: ${analytics.totalTrials}`,
                14,
                42
            )

            // Resumo de KPIs
            const kpiBoxY = 48
            const kpis = [
                { label: 'Independência Média', value: `${analytics.avgIndependencePct}%` },
                { label: 'Metas Dominadas', value: `${analytics.masteredCount}` },
                { label: 'Em Aquisição', value: `${analytics.inProgressCount}` },
                { label: 'Interferentes / Sessão', value: `${analytics.avgInterferingPerSession}` },
            ]
            kpis.forEach((kpi, idx) => {
                const x = 14 + idx * 46
                doc.setFillColor(248, 250, 249)
                doc.setDrawColor(220, 228, 224)
                doc.roundedRect(x, kpiBoxY, 43, 18, 2, 2, 'FD')
                doc.setFontSize(7.5)
                doc.setTextColor(75, 91, 86)
                doc.text(kpi.label, x + 3, kpiBoxY + 6)
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(12)
                doc.setTextColor(21, 94, 75)
                doc.text(kpi.value, x + 3, kpiBoxY + 14)
                doc.setFont('helvetica', 'normal')
            })

            // Tabela de Metas do PEI
            let cursorY = 76
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10.5)
            doc.setTextColor(15, 31, 27)
            doc.text('Evolução por Meta Terapêutica (Critério de Domínio: ≥80% em 3 sessões consecutivas)', 14, cursorY)
            cursorY += 6

            // Header da tabela
            doc.setFillColor(230, 242, 238)
            doc.rect(14, cursorY, 182, 7, 'F')
            doc.setFontSize(8)
            doc.setTextColor(17, 77, 62)
            doc.text('Código / Meta', 16, cursorY + 4.8)
            doc.text('Inicial', 112, cursorY + 4.8)
            doc.text('Atual', 128, cursorY + 4.8)
            doc.text('Suporte Atual', 143, cursorY + 4.8)
            doc.text('Status', 173, cursorY + 4.8)
            cursorY += 10

            doc.setFont('helvetica', 'normal')
            doc.setTextColor(15, 31, 27)

            for (const obj of analytics.objectives) {
                if (cursorY > 270) {
                    doc.addPage()
                    cursorY = 20
                }
                const shortTitle = `${obj.code} — ${obj.title}`.slice(0, 56)
                const statusLabel =
                    obj.status === 'dominada'
                        ? 'Dominada'
                        : obj.status === 'atencao'
                          ? 'Revisar'
                          : 'Aquisição'

                doc.setFontSize(8)
                doc.text(shortTitle, 16, cursorY)
                doc.text(`${obj.baselinePct}%`, 112, cursorY)
                doc.text(`${obj.latestPct}%`, 128, cursorY)
                doc.text(obj.latestHelpLabel.slice(0, 16), 143, cursorY)
                doc.text(statusLabel, 173, cursorY)

                doc.setDrawColor(235, 238, 236)
                doc.line(14, cursorY + 2.5, 196, cursorY + 2.5)
                cursorY += 7.5
            }

            // Rodapé LGPD
            doc.setFontSize(7.5)
            doc.setTextColor(110, 122, 118)
            doc.text(
                `Documento clínico confidencial protegido pela LGPD · Gerado por ${brand} via plataforma CliniGo.`,
                14,
                288
            )

            const safePatient = patientName
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]+/g, '_')
                .slice(0, 40)
            doc.save(`Evolucao_PEI_${safePatient}_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success('Relatório de evolução (PDF) exportado com sucesso.')
        } catch (err: any) {
            toast.error(err?.message || 'Não foi possível gerar o PDF de evolução.')
        } finally {
            setIsExportingPdf(false)
        }
    }

    return (
        <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60 bg-[#FAFAF8]">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#0F1F1B]">
                            <TrendingUp className="w-4 h-4 text-[#155E4B]" />
                            Curva de Aprendizagem, Redução de Suporte e Metas do PEI
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Acompanhamento longitudinal de independência, tentativas DTT/NET e domínio automático (≥80% em 3 sessões seguidas).
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-md border border-border bg-white p-0.5">
                            <button
                                type="button"
                                onClick={() => setChartView('curva')}
                                className={`min-h-[34px] px-3 rounded text-xs font-medium transition-colors ${
                                    chartView === 'curva'
                                        ? 'bg-[#155E4B] text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Curva de Metas
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartView('suporte')}
                                className={`min-h-[34px] px-3 rounded text-xs font-medium transition-colors ${
                                    chartView === 'suporte'
                                        ? 'bg-[#155E4B] text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Ajuda e Interferentes
                            </button>
                        </div>

                        {analytics.objectives.length > 0 && chartView === 'curva' && (
                            <Select value={selectedCode} onValueChange={setSelectedCode}>
                                <SelectTrigger className="h-9 w-[210px] text-xs bg-white">
                                    <SelectValue placeholder="Filtrar objetivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Principais objetivos (até 6)</SelectItem>
                                    {analytics.objectives.map((obj) => (
                                        <SelectItem key={obj.code} value={obj.code}>
                                            {obj.code} — {obj.title.slice(0, 34)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleExportProgressPdf}
                            disabled={isExportingPdf || analytics.objectives.length === 0}
                            className="h-9 gap-1.5 text-xs bg-white"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isExportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-6">
                {/* 4 KPIs Executivos */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-border/70 bg-[#FAFAF8] p-3.5">
                        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                            <span>Independência Média</span>
                            <Activity className="w-3.5 h-3.5 text-[#155E4B]" />
                        </div>
                        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[#0F1F1B]">
                            {analytics.avgIndependencePct}%
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {analytics.timeline.length} sessões com dados
                        </p>
                    </div>

                    <div className="rounded-lg border border-[#C4E1D7] bg-[#E6F2EE]/50 p-3.5">
                        <div className="flex items-center justify-between text-[11px] font-medium text-[#114D3E]">
                            <span>Metas Dominadas</span>
                            <Award className="w-3.5 h-3.5 text-[#155E4B]" />
                        </div>
                        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[#114D3E]">
                            {analytics.masteredCount}
                        </p>
                        <p className="text-[11px] text-[#114D3E]/80 mt-0.5">
                            Critério ≥80% em 3 sessões
                        </p>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-[#FAFAF8] p-3.5">
                        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                            <span>Tentativas DTT / NET</span>
                            <Target className="w-3.5 h-3.5 text-[#155E4B]" />
                        </div>
                        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[#0F1F1B]">
                            {analytics.totalTrials}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {analytics.objectives.length} metas monitoradas
                        </p>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-[#FAFAF8] p-3.5">
                        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                            <span>Interferentes / Sessão</span>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[#0F1F1B]">
                            {analytics.avgInterferingPerSession}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {analytics.attentionCount > 0
                                ? `${analytics.attentionCount} meta(s) em atenção`
                                : 'Evolução estável'}
                        </p>
                    </div>
                </div>

                {/* Área do Gráfico */}
                {analytics.timeline.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-2 bg-[#FAFAF8]">
                        <TrendingUp className="w-7 h-7 mx-auto text-muted-foreground/60" />
                        <p className="text-sm font-medium text-foreground">
                            Ainda não há medições quantitativas registradas nas sessões
                        </p>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Abra uma folha de sessão e utilize o <strong>Modo Tatame (1 Toque)</strong> ou registre o desempenho dos objetivos para gerar automaticamente a curva de aprendizagem e o domínio de metas.
                        </p>
                    </div>
                ) : (
                    <div className="h-[310px] w-full rounded-lg border border-border/60 bg-white p-3">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartView === 'curva' ? (
                                <LineChart
                                    data={analytics.timeline}
                                    margin={{ top: 14, right: 20, left: 0, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E6E8E5" />
                                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#4B5B56' }} />
                                    <YAxis
                                        domain={[0, 100]}
                                        tickFormatter={(v) => `${v}%`}
                                        tick={{ fontSize: 11, fill: '#4B5B56' }}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`${value}%`, 'Independência']}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #E6E8E5',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <ReferenceLine
                                        y={80}
                                        stroke="#155E4B"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: 'Domínio 80%',
                                            position: 'insideTopRight',
                                            fill: '#155E4B',
                                            fontSize: 10,
                                        }}
                                    />
                                    {activeObjectiveCodes.map((code, idx) => (
                                        <Line
                                            key={code}
                                            type="monotone"
                                            dataKey={code}
                                            name={code}
                                            stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                                            strokeWidth={2.2}
                                            dot={{ r: 3.5 }}
                                            activeDot={{ r: 5.5 }}
                                            connectNulls
                                        />
                                    ))}
                                </LineChart>
                            ) : (
                                <ComposedChart
                                    data={analytics.helpAndInterferingSeries}
                                    margin={{ top: 14, right: 20, left: 0, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E6E8E5" />
                                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#4B5B56' }} />
                                    <YAxis
                                        yAxisId="help"
                                        domain={[1, 6]}
                                        reversed
                                        tick={{ fontSize: 11, fill: '#4B5B56' }}
                                        label={{
                                            value: 'Suporte (1=Indep.)',
                                            angle: -90,
                                            position: 'insideLeft',
                                            fontSize: 10,
                                            fill: '#4B5B56',
                                        }}
                                    />
                                    <YAxis
                                        yAxisId="interfering"
                                        orientation="right"
                                        allowDecimals={false}
                                        tick={{ fontSize: 11, fill: '#9A3412' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #E6E8E5',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar
                                        yAxisId="interfering"
                                        dataKey="interferingTotal"
                                        name="Comportamentos Interferentes"
                                        fill="#F59E0B"
                                        opacity={0.75}
                                        radius={[4, 4, 0, 0]}
                                        barSize={24}
                                    />
                                    <Line
                                        yAxisId="help"
                                        type="monotone"
                                        dataKey="avgHelpScore"
                                        name="Nível de Ajuda (1=Indep. → 6=Fís. Total)"
                                        stroke="#155E4B"
                                        strokeWidth={2.4}
                                        dot={{ r: 4 }}
                                    />
                                </ComposedChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Quadro de Metas do PEI */}
                {analytics.objectives.length > 0 && (
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Status das Metas Ativas no PEI ({analytics.objectives.length})
                            </h4>
                            <span className="text-[11px] text-muted-foreground">
                                Clique no filtro acima para isolar qualquer curva
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {analytics.objectives.map((obj) => {
                                const badge = STATUS_BADGE_MAP[obj.status]
                                return (
                                    <div
                                        key={obj.code}
                                        className="rounded-lg border border-border/70 bg-white p-3.5 space-y-2.5 hover:border-[#155E4B]/40 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-[11px] font-semibold text-[#155E4B]">
                                                        {obj.code}
                                                    </span>
                                                    {obj.status === 'dominada' && (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#155E4B] shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs font-semibold text-[#0F1F1B] truncate mt-0.5">
                                                    {obj.title}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] shrink-0 font-medium ${badge.className}`}
                                            >
                                                {badge.label}
                                            </Badge>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-muted-foreground">
                                                    Suporte: <strong className="text-foreground">{obj.latestHelpLabel}</strong>
                                                </span>
                                                <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#0F1F1B]">
                                                    {obj.latestPct}%
                                                    {obj.deltaPct > 0 ? (
                                                        <span className="inline-flex items-center text-[#155E4B]">
                                                            <ArrowUpRight className="w-3 h-3" />+{obj.deltaPct}%
                                                        </span>
                                                    ) : obj.deltaPct < 0 ? (
                                                        <span className="inline-flex items-center text-amber-700">
                                                            <ArrowDownRight className="w-3 h-3" />{obj.deltaPct}%
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-muted-foreground">
                                                            <Minus className="w-3 h-3" />0%
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        obj.status === 'dominada'
                                                            ? 'bg-[#155E4B]'
                                                            : obj.status === 'atencao'
                                                              ? 'bg-amber-500'
                                                              : 'bg-teal-600'
                                                    }`}
                                                    style={{ width: `${Math.min(100, Math.max(4, obj.latestPct))}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                                            <span>
                                                {obj.sessionsCount} sessão(ões) · {obj.totalTrials} tentativa(s)
                                            </span>
                                            <span>
                                                Sequência ≥80%: <strong>{obj.consecutiveMasterySessions}/3</strong>
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
