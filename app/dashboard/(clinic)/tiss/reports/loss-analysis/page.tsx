'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BarChart3,
    Building2,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    Printer,
    RefreshCw,
    RotateCcw,
    Search,
    ShieldAlert,
    TrendingDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { TissPresetHelpButton } from '@/components/tiss/tiss-contextual-help';

interface LossReportInsuranceRow {
    id?: string;
    name: string;
    billed: number;
    approved: number;
    glosa: number;
    glosa_rate: number;
    count: number;
    glosed_count?: number;
}

interface LossReportProcedureRow {
    procedure?: string;
    name?: string;
    code: string;
    count: number;
    total: number;
    share?: number;
}

interface LossReportReasonRow {
    code: string;
    description: string;
    count: number;
    total: number;
    appealable: number;
    irrecoverable: number;
    share: number;
}

interface LossReport {
    period: { start?: string; end?: string; startDate?: string; endDate?: string };
    summary: {
        billed_value: number;
        received_value?: number;
        approved_value?: number;
        glosa_value: number;
        glosa_rate: number;
        approval_rate?: number;
        total_guides: number;
        glosed_guides?: number;
        appealable_value?: number;
        irrecoverable_value?: number;
    };
    available_insurances?: Array<{ id: string; name: string; code?: string | null }>;
    by_insurance?: LossReportInsuranceRow[];
    top_glosas?: LossReportProcedureRow[];
    top_glosed_procedures?: LossReportProcedureRow[];
    top_reasons?: LossReportReasonRow[];
}

type PresetPeriodKey = 'current_month' | 'last_30_days' | 'last_90_days' | 'current_year';

function formatIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getPresetRange(preset: PresetPeriodKey): { start_date: string; end_date: string } {
    const today = new Date();
    const end = formatIsoDate(today);

    if (preset === 'current_month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start_date: formatIsoDate(start), end_date: end };
    }
    if (preset === 'last_30_days') {
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        return { start_date: formatIsoDate(start), end_date: end };
    }
    if (preset === 'last_90_days') {
        const start = new Date(today);
        start.setDate(today.getDate() - 90);
        return { start_date: formatIsoDate(start), end_date: end };
    }
    const start = new Date(today.getFullYear(), 0, 1);
    return { start_date: formatIsoDate(start), end_date: end };
}

function formatBrDate(iso?: string): string {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '-';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}

export default function LossAnalysisPage() {
    const defaultRange = useMemo(() => getPresetRange('current_month'), []);
    const [activePreset, setActivePreset] = useState<PresetPeriodKey | 'custom'>('current_month');
    const [draftFilters, setDraftFilters] = useState({
        start_date: defaultRange.start_date,
        end_date: defaultRange.end_date,
        insurance_company: '',
    });
    const [appliedFilters, setAppliedFilters] = useState({
        start_date: defaultRange.start_date,
        end_date: defaultRange.end_date,
        insurance_company: '',
    });
    const [isExporting, setIsExporting] = useState(false);

    const { data, isLoading, isFetching, isError, error, refetch } = useQuery<LossReport>({
        queryKey: ['tiss-loss-report', appliedFilters],
        queryFn: async () => {
            const params = new URLSearchParams({
                start_date: appliedFilters.start_date,
                end_date: appliedFilters.end_date,
            });
            if (appliedFilters.insurance_company) {
                params.append('insurance_company', appliedFilters.insurance_company);
            }

            const res = await fetch(`/api/tiss/reports/loss-analysis?${params.toString()}`);
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Não foi possível carregar o relatório de perdas.');
            }
            return json.data as LossReport;
        },
        retry: 1,
    });

    const summary = data?.summary;
    const billedValue = Number(summary?.billed_value ?? 0);
    const receivedValue = Number(summary?.received_value ?? summary?.approved_value ?? 0);
    const glosaValue = Number(summary?.glosa_value ?? 0);
    const glosaRate = Number(summary?.glosa_rate ?? 0);
    const approvalRate = Number(
        summary?.approval_rate ?? (billedValue > 0 ? (receivedValue / billedValue) * 100 : 0)
    );
    const totalGuides = Number(summary?.total_guides ?? 0);
    const glosedGuides = Number(summary?.glosed_guides ?? 0);
    const appealableValue = Number(summary?.appealable_value ?? 0);
    const irrecoverableValue = Number(summary?.irrecoverable_value ?? 0);

    const byInsurance: LossReportInsuranceRow[] = Array.isArray(data?.by_insurance)
        ? data.by_insurance
        : [];
    const topGlosas: LossReportProcedureRow[] = Array.isArray(data?.top_glosas)
        ? data.top_glosas
        : Array.isArray(data?.top_glosed_procedures)
            ? data.top_glosed_procedures
            : [];
    const topReasons: LossReportReasonRow[] = Array.isArray(data?.top_reasons)
        ? data.top_reasons
        : [];
    const availableInsurances = Array.isArray(data?.available_insurances)
        ? data.available_insurances
        : [];

    const hasCustomFilters =
        appliedFilters.insurance_company !== '' ||
        appliedFilters.start_date !== defaultRange.start_date ||
        appliedFilters.end_date !== defaultRange.end_date;

    const handleSelectPreset = (preset: PresetPeriodKey) => {
        const range = getPresetRange(preset);
        setActivePreset(preset);
        const next = {
            ...draftFilters,
            start_date: range.start_date,
            end_date: range.end_date,
        };
        setDraftFilters(next);
        setAppliedFilters(next);
    };

    const handleApplyFilters = () => {
        if (!draftFilters.start_date || !draftFilters.end_date) {
            toast.error('Informe a data inicial e a data final.');
            return;
        }
        if (draftFilters.start_date > draftFilters.end_date) {
            toast.error('A data inicial não pode ser maior que a data final.');
            return;
        }
        setAppliedFilters({ ...draftFilters });
    };

    const handleClearFilters = () => {
        const range = getPresetRange('current_month');
        const next = {
            start_date: range.start_date,
            end_date: range.end_date,
            insurance_company: '',
        };
        setActivePreset('current_month');
        setDraftFilters(next);
        setAppliedFilters(next);
        toast.success('Filtros restaurados para o mês atual.');
    };

    const handleDrilldownInsurance = (insuranceName: string) => {
        const next = {
            ...appliedFilters,
            insurance_company: insuranceName,
        };
        setDraftFilters(next);
        setAppliedFilters(next);
        toast.info(`Filtro aplicado para a operadora ${insuranceName}.`);
    };

    const handleExportCSV = () => {
        if (!data) return;
        setIsExporting(true);
        try {
            const sep = ';';
            const lines: string[] = [
                `Relatório de Perda Financeira TISS${sep}Período: ${formatBrDate(appliedFilters.start_date)} a ${formatBrDate(appliedFilters.end_date)}`,
                '',
                `Indicador${sep}Valor`,
                `Total Faturado${sep}${billedValue.toFixed(2).replace('.', ',')}`,
                `Valor Aprovado / Recebido${sep}${receivedValue.toFixed(2).replace('.', ',')}`,
                `Perda por Glosas${sep}${glosaValue.toFixed(2).replace('.', ',')}`,
                `Índice de Glosa (%)${sep}${glosaRate.toFixed(2).replace('.', ',')}`,
                `Guias Analisadas${sep}${totalGuides}`,
                `Guias com Glosa${sep}${glosedGuides}`,
                `Saldo Recuperável em Recurso${sep}${appealableValue.toFixed(2).replace('.', ',')}`,
                `Glosa Irrecuperável${sep}${irrecoverableValue.toFixed(2).replace('.', ',')}`,
                '',
                `Operadora${sep}Guias${sep}Faturado${sep}Aprovado${sep}Glosa${sep}Índice (%)`,
                ...byInsurance.map(
                    (ins) =>
                        `"${String(ins.name || '').replace(/"/g, '""')}"${sep}${ins.count}${sep}${Number(ins.billed || 0).toFixed(2).replace('.', ',')}${sep}${Number(ins.approved || 0).toFixed(2).replace('.', ',')}${sep}${Number(ins.glosa || 0).toFixed(2).replace('.', ',')}${sep}${Number(ins.glosa_rate || 0).toFixed(2).replace('.', ',')}`
                ),
                '',
                `Código TUSS${sep}Procedimento${sep}Ocorrências${sep}Valor Glosado${sep}Participação (%)`,
                ...topGlosas.map(
                    (item) =>
                        `${item.code}${sep}"${String(item.procedure || item.name || '').replace(/"/g, '""')}"${sep}${item.count}${sep}${Number(item.total || 0).toFixed(2).replace('.', ',')}${sep}${Number(item.share || 0).toFixed(1).replace('.', ',')}`
                ),
            ];

            const blob = new Blob(['\uFEFF' + lines.join('\n')], {
                type: 'text/csv;charset=utf-8;',
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bi-perdas-tiss-${appliedFilters.start_date}-a-${appliedFilters.end_date}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Relatório CSV exportado com sucesso.');
        } catch {
            toast.error('Não foi possível exportar o arquivo CSV.');
        } finally {
            setIsExporting(false);
        }
    };

    const glosaBenchmark = useMemo(() => {
        if (glosaRate <= 5) {
            return {
                label: 'Dentro da meta ANS (<= 5,0%)',
                badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                valueClass: 'text-emerald-700',
                Icon: CheckCircle2,
            };
        }
        if (glosaRate <= 10) {
            return {
                label: 'Atenção (5,1% a 10,0%)',
                badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
                valueClass: 'text-amber-700',
                Icon: AlertCircle,
            };
        }
        return {
            label: 'Crítico (acima de 10,0%)',
            badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
            valueClass: 'text-rose-700',
            Icon: ShieldAlert,
        };
    }, [glosaRate]);

    const BenchmarkIcon = glosaBenchmark.Icon;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-6 py-4 sm:py-6">
            {/* Cabeçalho Corporativo */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            asChild
                            variant="ghost"
                            className="h-8 px-2.5 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md"
                        >
                            <Link href="/dashboard/tiss" prefetch={false}>
                                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                                <span>Faturamento TISS</span>
                            </Link>
                        </Button>
                        <span className="text-xs text-muted-foreground">/</span>
                        <span className="text-xs font-medium text-foreground">BI de Perdas</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <BarChart3 className="w-6 h-6 text-slate-700 shrink-0" />
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                            Relatório de Perda Financeira e Glosas
                        </h1>
                        <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 text-slate-700 border-slate-200">
                            {formatBrDate(appliedFilters.start_date)} a {formatBrDate(appliedFilters.end_date)}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Análise executiva de faturamento TISS, recuperação de recursos e impacto por operadora e procedimento TUSS
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
                    <TissPresetHelpButton topicKey="tiss-controle-glosas" triggerLabel="Ajuda BI" />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleExportCSV}
                        disabled={isLoading || isExporting || !data}
                        className="h-9 min-h-[36px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                        <span>{isExporting ? 'Exportando...' : 'Exportar CSV'}</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.print()}
                        disabled={isLoading}
                        className="h-9 min-h-[36px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                    >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        <span>Imprimir</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="h-9 min-h-[36px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isFetching ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                    </Button>
                </div>
            </div>

            {/* Painel de Filtros e Atalhos de Período */}
            <Card className="border-border shadow-none print:hidden">
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/70">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground mr-1">Período rápido:</span>
                            {(
                                [
                                    { key: 'current_month', label: 'Mês Atual' },
                                    { key: 'last_30_days', label: 'Últimos 30 dias' },
                                    { key: 'last_90_days', label: 'Últimos 90 dias' },
                                    { key: 'current_year', label: 'Ano Atual' },
                                ] as Array<{ key: PresetPeriodKey; label: string }>
                            ).map((preset) => (
                                <Button
                                    key={preset.key}
                                    type="button"
                                    variant={activePreset === preset.key ? 'default' : 'outline'}
                                    onClick={() => handleSelectPreset(preset.key)}
                                    className="h-8 px-3 text-xs font-medium rounded-md shadow-none"
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                        {hasCustomFilters && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleClearFilters}
                                className="h-8 px-3 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md"
                            >
                                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                <span>Limpar filtros</span>
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                        <div className="lg:col-span-3 space-y-1.5">
                            <Label htmlFor="loss-start-date" className="text-xs font-medium text-muted-foreground">
                                Data Inicial
                            </Label>
                            <Input
                                id="loss-start-date"
                                type="date"
                                value={draftFilters.start_date}
                                onChange={(e) => {
                                    setActivePreset('custom');
                                    setDraftFilters((prev) => ({ ...prev, start_date: e.target.value }));
                                }}
                                className="h-10 text-base sm:text-xs"
                            />
                        </div>

                        <div className="lg:col-span-3 space-y-1.5">
                            <Label htmlFor="loss-end-date" className="text-xs font-medium text-muted-foreground">
                                Data Final
                            </Label>
                            <Input
                                id="loss-end-date"
                                type="date"
                                value={draftFilters.end_date}
                                onChange={(e) => {
                                    setActivePreset('custom');
                                    setDraftFilters((prev) => ({ ...prev, end_date: e.target.value }));
                                }}
                                className="h-10 text-base sm:text-xs"
                            />
                        </div>

                        <div className="lg:col-span-4 space-y-1.5">
                            <Label htmlFor="loss-insurance" className="text-xs font-medium text-muted-foreground">
                                Operadora de Saúde
                            </Label>
                            {availableInsurances.length > 0 ? (
                                <Select
                                    value={draftFilters.insurance_company || '__ALL__'}
                                    onValueChange={(val) =>
                                        setDraftFilters((prev) => ({
                                            ...prev,
                                            insurance_company: val === '__ALL__' ? '' : val,
                                        }))
                                    }
                                >
                                    <SelectTrigger id="loss-insurance" className="h-10 text-xs">
                                        <SelectValue placeholder="Todas as operadoras" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__ALL__">Todas as operadoras</SelectItem>
                                        {availableInsurances.map((ins) => (
                                            <SelectItem key={ins.id} value={ins.name}>
                                                {ins.name} {ins.code ? `(${ins.code})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="loss-insurance"
                                    placeholder="Todas as operadoras..."
                                    value={draftFilters.insurance_company}
                                    onChange={(e) =>
                                        setDraftFilters((prev) => ({ ...prev, insurance_company: e.target.value }))
                                    }
                                    className="h-10 text-base sm:text-xs"
                                />
                            )}
                        </div>

                        <div className="lg:col-span-2">
                            <Button
                                type="button"
                                onClick={handleApplyFilters}
                                disabled={isFetching}
                                className="w-full h-10 px-4 gap-1.5 text-xs font-medium rounded-md shadow-none"
                            >
                                <Search className="w-3.5 h-3.5 shrink-0" />
                                <span>Aplicar Filtros</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Estado de Erro */}
            {isError && (
                <Card className="border-rose-200 bg-rose-50/40 shadow-none">
                    <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h2 className="text-sm font-semibold text-foreground">
                                    Não foi possível carregar o relatório de perdas
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {error instanceof Error
                                        ? error.message
                                        : 'Ocorreu uma instabilidade ao consultar os dados do período selecionado.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                onClick={() => refetch()}
                                className="h-9 px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                            >
                                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                                <span>Tentar novamente</span>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="h-9 px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                            >
                                <Link href="/dashboard/tiss" prefetch={false}>
                                    <span>Voltar ao Faturamento</span>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* KPIs Executivos */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                    {[0, 1, 2, 3, 4].map((idx) => (
                        <Card key={idx} className="shadow-none">
                            <CardHeader className="pb-2 space-y-2">
                                <Skeleton className="h-3.5 w-28" />
                                <Skeleton className="h-7 w-36" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-3.5 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : !isError ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                    <Card className="border-border shadow-none">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium text-muted-foreground">
                                Total Faturado
                            </CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums text-foreground">
                                {formatCurrency(billedValue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground tabular-nums">
                                {totalGuides} {totalGuides === 1 ? 'guia analisada' : 'guias analisadas'} no período
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-none">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium text-muted-foreground">
                                Aprovado / Recebido
                            </CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums text-emerald-700">
                                {formatCurrency(receivedValue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground tabular-nums">
                                Taxa de aprovação: {approvalRate.toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-rose-200/80 bg-rose-50/30 shadow-none">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium text-rose-800">
                                Perda por Glosas
                            </CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums text-rose-700">
                                {formatCurrency(glosaValue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-rose-800/80 tabular-nums">
                                {glosedGuides} {glosedGuides === 1 ? 'guia impactada' : 'guias impactadas'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-none">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium text-muted-foreground">
                                Índice de Glosa
                            </CardDescription>
                            <CardTitle className={`text-2xl font-semibold tabular-nums ${glosaBenchmark.valueClass}`}>
                                {glosaRate.toFixed(1)}%
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Badge variant="outline" className={`gap-1 text-[11px] font-medium ${glosaBenchmark.badgeClass}`}>
                                <BenchmarkIcon className="w-3 h-3 shrink-0" />
                                <span>{glosaBenchmark.label}</span>
                            </Badge>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-none">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium text-muted-foreground">
                                Saldo Recuperável em Recurso
                            </CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                {formatCurrency(appealableValue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground tabular-nums">
                                Irrecuperável: {formatCurrency(irrecoverableValue)}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {/* Estado Vazio Acionável */}
            {!isLoading && !isError && totalGuides === 0 && topReasons.length === 0 ? (
                <Card className="border-border shadow-none">
                    <CardContent className="py-12 px-6 text-center space-y-4">
                        <div className="mx-auto w-11 h-11 rounded-md border border-border bg-muted/40 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1 max-w-lg mx-auto">
                            <h2 className="text-base font-semibold text-foreground">
                                Nenhuma guia TISS encontrada no período selecionado
                            </h2>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Não há guias com data de execução entre {formatBrDate(appliedFilters.start_date)} e{' '}
                                {formatBrDate(appliedFilters.end_date)}
                                {appliedFilters.insurance_company
                                    ? ` para a operadora ${appliedFilters.insurance_company}`
                                    : ''}.
                                Amplie o período de consulta ou acesse a Elaboração de Contas para liberar novas guias.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSelectPreset('last_90_days')}
                                className="h-9 px-3.5 text-xs font-medium rounded-md shadow-none"
                            >
                                Consultar Últimos 90 dias
                            </Button>
                            <Button
                                asChild
                                className="h-9 px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                            >
                                <Link href="/dashboard/tiss" prefetch={false}>
                                    <span>Ir para Elaboração de Contas</span>
                                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : !isError ? (
                <>
                    {/* Grade Analítica: Operadoras e Procedimentos TUSS */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Glosa por Operadora */}
                        <Card className="border-border shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-border/70">
                                <div>
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-slate-600 shrink-0" />
                                        <span>Glosa por Operadora</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Comparativo de faturamento, aprovação e rejeição por convênio
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
                                    {byInsurance.length} {byInsurance.length === 1 ? 'operadora' : 'operadoras'}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="p-4 space-y-2.5">
                                        <Skeleton className="h-9 w-full" />
                                        <Skeleton className="h-9 w-full" />
                                        <Skeleton className="h-9 w-full" />
                                    </div>
                                ) : byInsurance.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        Nenhuma movimentação por operadora neste período.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Operadora</TableHead>
                                                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Guias</TableHead>
                                                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Faturado</TableHead>
                                                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Glosa</TableHead>
                                                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider w-[120px]">Índice</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {byInsurance.map((ins, i) => {
                                                    const rate = Number(ins.glosa_rate ?? 0);
                                                    const barWidth = Math.min(100, Math.max(rate > 0 ? 4 : 0, rate));
                                                    const barColor =
                                                        rate > 10 ? 'bg-rose-600' : rate > 5 ? 'bg-amber-500' : 'bg-emerald-600';
                                                    return (
                                                        <TableRow key={`${ins.name}-${i}`}>
                                                            <TableCell className="font-medium text-xs">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDrilldownInsurance(ins.name)}
                                                                    className="text-left hover:underline text-foreground font-medium"
                                                                    title={`Filtrar relatório por ${ins.name}`}
                                                                >
                                                                    {ins.name}
                                                                </button>
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                                                {ins.count}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs tabular-nums">
                                                                {formatCurrency(Number(ins.billed ?? 0))}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs tabular-nums font-medium text-rose-700">
                                                                {formatCurrency(Number(ins.glosa ?? 0))}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="space-y-1">
                                                                    <span className="text-xs font-semibold tabular-nums">
                                                                        {rate.toFixed(1)}%
                                                                    </span>
                                                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                                                                        <div
                                                                            className={`h-full ${barColor}`}
                                                                            style={{ width: `${barWidth}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Procedimentos TUSS com Glosa */}
                        <Card className="border-border shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-border/70">
                                <div>
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-slate-600 shrink-0" />
                                        <span>Procedimentos TUSS com Maior Impacto</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Ranking dos procedimentos que mais concentraram perdas por glosa
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
                                    Top {topGlosas.length}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="p-4 space-y-2.5">
                                        <Skeleton className="h-9 w-full" />
                                        <Skeleton className="h-9 w-full" />
                                        <Skeleton className="h-9 w-full" />
                                    </div>
                                ) : topGlosas.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        Nenhum procedimento glosado no período analisado.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Procedimento</TableHead>
                                                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Qtd.</TableHead>
                                                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Valor Glosado</TableHead>
                                                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider w-[110px]">Participação</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {topGlosas.map((item, i) => {
                                                    const share = Number(item.share ?? 0);
                                                    const barWidth = Math.min(100, Math.max(share > 0 ? 4 : 0, share));
                                                    return (
                                                        <TableRow key={`${item.code}-${i}`}>
                                                            <TableCell>
                                                                <div className="space-y-0.5">
                                                                    <p className="font-medium text-xs text-foreground">
                                                                        {item.procedure || item.name || item.code}
                                                                    </p>
                                                                    <p className="text-[11px] font-mono text-muted-foreground">
                                                                        TUSS {item.code}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                                                {item.count}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs tabular-nums font-medium text-rose-700">
                                                                {formatCurrency(Number(item.total ?? 0))}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="space-y-1">
                                                                    <span className="text-xs font-medium tabular-nums">
                                                                        {share.toFixed(1)}%
                                                                    </span>
                                                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-slate-700 dark:bg-slate-300"
                                                                            style={{ width: `${barWidth}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabela de Motivos ANS (Tabela 38) */}
                    <Card className="border-border shadow-none">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70">
                            <div>
                                <CardTitle className="text-sm font-semibold">
                                    Principais Motivos ANS de Glosa (Tabela 38)
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Detalhamento dos motivos registrados no período separados entre saldo recuperável e perda irrecuperável
                                </CardDescription>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                className="h-9 px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none shrink-0 print:hidden"
                            >
                                <Link href="/dashboard/tiss/glosas" prefetch={false}>
                                    <span>Abrir Controle de Glosas</span>
                                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-4 space-y-2.5">
                                    <Skeleton className="h-9 w-full" />
                                    <Skeleton className="h-9 w-full" />
                                </div>
                            ) : topReasons.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    Nenhum motivo individual de glosa registrado na Tabela 38 ANS durante este período.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[110px]">Código ANS</TableHead>
                                                <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Descrição do Motivo</TableHead>
                                                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Ocorrências</TableHead>
                                                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Recuperável</TableHead>
                                                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Irrecuperável</TableHead>
                                                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Total Glosado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {topReasons.map((reason, idx) => (
                                                <TableRow key={`${reason.code}-${idx}`}>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono text-[11px]">
                                                            {reason.code}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-foreground">
                                                        {reason.description}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                                        {reason.count}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs tabular-nums font-medium text-emerald-700">
                                                        {formatCurrency(reason.appealable)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                                        {formatCurrency(reason.irrecoverable)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs tabular-nums font-semibold text-rose-700">
                                                        {formatCurrency(reason.total)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    );
}
