// app/dashboard/(clinic)/financial/payroll/report/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    ArrowLeft, BarChart3, Download, FileSpreadsheet,
    TrendingDown, TrendingUp, Users, DollarSign,
    ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface DoctorSummary {
    doctor_id: string;
    doctor_name: string;
    doctor_crm: string;
    specialty: string;
    total_appointments: number;
    gross_revenue: number;
    gross_payroll: number;
    inss_retention: number;
    irrf_retention: number;
    iss_retention: number;
    net_payroll: number;
    sheets: {
        id: string;
        reference_month: string;
        status: string;
        net_payroll: number;
        total_appointments: number;
        payment_date?: string;
    }[];
}

interface ReportTotals {
    total_appointments: number;
    gross_revenue: number;
    gross_payroll: number;
    total_deductions: number;
    net_payroll: number;
    clinic_retained: number;
    retention_rate: string;
}

interface ReportData {
    period: { from: string; to: string };
    totals: ReportTotals;
    status_breakdown: Record<string, number>;
    by_doctor: DoctorSummary[];
    total_doctors: number;
    total_sheets: number;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    OPEN: { label: 'Aberto', color: 'bg-gray-100 text-gray-700' },
    PENDING_APPROVAL: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700' },
    APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
    PAID: { label: 'Pago', color: 'bg-blue-100 text-blue-700' },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
};

function getCurrentMonthRange() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        from: first.toISOString().split('T')[0],
        to: last.toISOString().split('T')[0],
    };
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function PayrollReportPage() {
    const profLabel = useProfessionalLabel();
    const defaults = getCurrentMonthRange();

    const [filters, setFilters] = useState({
        from: defaults.from,
        to: defaults.to,
        doctor_id: '',
        status: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [expandedDoctors, setExpandedDoctors] = useState<Set<string>>(new Set());

    // ─── query ──────────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['payroll-report', filters],
        enabled: submitted,
        queryFn: async () => {
            const params = new URLSearchParams({ from: filters.from, to: filters.to });
            if (filters.doctor_id) params.set('doctor_id', filters.doctor_id);
            if (filters.status) params.set('status', filters.status);
            const res = await fetch(`/api/payroll/report?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data as ReportData;
        },
    });

    // ─── export Excel (CSV) ─────────────────────────────────────────────────
    const handleExportCSV = () => {
        if (!data?.by_doctor) return;
        const rows = [
            ['Profissional', 'CRM', 'Especialidade', 'Atendimentos',
                'Receita Bruta', 'Repasse Bruto', 'Impostos', 'Líquido'],
            ...data.by_doctor.map((d) => [
                d.doctor_name, d.doctor_crm, d.specialty,
                d.total_appointments,
                d.gross_revenue.toFixed(2),
                d.gross_payroll.toFixed(2),
                (d.inss_retention + d.irrf_retention + d.iss_retention).toFixed(2),
                d.net_payroll.toFixed(2),
            ]),
            [],
            ['TOTAL', '', '', data.totals.total_appointments,
                data.totals.gross_revenue.toFixed(2),
                data.totals.gross_payroll.toFixed(2),
                data.totals.total_deductions.toFixed(2),
                data.totals.net_payroll.toFixed(2)],
        ];
        const csv = rows.map((r) => r.join(';')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repasses_${filters.from}_${filters.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Exportação CSV concluída!');
    };

    const toggleDoctor = (id: string) => {
        setExpandedDoctors((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/financial/payroll">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-primary" />
                            Relatório de Repasses
                        </h1>
                        <p className="text-muted-foreground">
                            Visão consolidada de repasses por período
                        </p>
                    </div>
                </div>
                {data && (
                    <Button variant="outline" onClick={handleExportCSV}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Exportar CSV
                    </Button>
                )}
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Data Inicial</Label>
                            <Input
                                type="date"
                                value={filters.from}
                                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Final</Label>
                            <Input
                                type="date"
                                value={filters.to}
                                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? '' : v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="OPEN">Aberto</SelectItem>
                                    <SelectItem value="PENDING_APPROVAL">Aguardando Aprovação</SelectItem>
                                    <SelectItem value="APPROVED">Aprovado</SelectItem>
                                    <SelectItem value="PAID">Pago</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button
                                className="w-full"
                                onClick={() => setSubmitted(true)}
                                disabled={!filters.from || !filters.to}
                            >
                                <Search className="w-4 h-4 mr-2" />
                                Gerar Relatório
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Loading */}
            {isLoading && (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
            )}

            {/* Erro */}
            {isError && (
                <Card className="border-destructive">
                    <CardContent className="pt-6 text-destructive text-center">
                        Erro ao carregar relatório. Verifique os filtros e tente novamente.
                    </CardContent>
                </Card>
            )}

            {/* Resultados */}
            {data && !isLoading && (
                <>
                    {/* KPIs consolidados */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" /> {profLabel.plural}
                                </CardDescription>
                                <CardTitle className="text-2xl">{data.total_doctors}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5" /> Receita Bruta
                                </CardDescription>
                                <CardTitle className="text-xl">
                                    {formatCurrency(data.totals.gross_revenue)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Total Repassado
                                </CardDescription>
                                <CardTitle className="text-xl text-red-600">
                                    {formatCurrency(data.totals.net_payroll)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-green-50 border-green-200">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1 text-green-700">
                                    <TrendingUp className="w-3.5 h-3.5" /> Retido pela Clínica
                                </CardDescription>
                                <CardTitle className="text-xl text-green-700">
                                    {formatCurrency(data.totals.clinic_retained)}
                                    <span className="text-sm font-normal ml-2 opacity-70">
                                        ({data.totals.retention_rate}%)
                                    </span>
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Status breakdown */}
                    {Object.keys(data.status_breakdown).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm text-muted-foreground">
                                    Distribuição por Status ({data.total_sheets} folhas)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(data.status_breakdown).map(([status, count]) => {
                                        const s = STATUS_LABEL[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' };
                                        return (
                                            <Badge key={status} className={s.color}>
                                                {s.label}: {count}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tabela por médico */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhamento por {profLabel.singular}</CardTitle>
                            <CardDescription>
                                Clique na linha para expandir as folhas do período
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.by_doctor.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum repasse encontrado para o período selecionado.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{profLabel.singular}</TableHead>
                                            <TableHead className="text-center">Atend.</TableHead>
                                            <TableHead className="text-right">Receita</TableHead>
                                            <TableHead className="text-right">Rep. Bruto</TableHead>
                                            <TableHead className="text-right">Impostos</TableHead>
                                            <TableHead className="text-right font-bold">Líquido</TableHead>
                                            <TableHead className="w-8" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.by_doctor.map((doc) => {
                                            const isExpanded = expandedDoctors.has(doc.doctor_id);
                                            const totalTax = doc.inss_retention + doc.irrf_retention + doc.iss_retention;
                                            return (
                                                <>
                                                    <TableRow
                                                        key={doc.doctor_id}
                                                        className="cursor-pointer hover:bg-muted/50"
                                                        onClick={() => toggleDoctor(doc.doctor_id)}
                                                    >
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{doc.doctor_name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    CRM {doc.doctor_crm} • {doc.specialty}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {doc.total_appointments}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {formatCurrency(doc.gross_revenue)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {formatCurrency(doc.gross_payroll)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            -{formatCurrency(totalTax)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-green-600">
                                                            {formatCurrency(doc.net_payroll)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {isExpanded
                                                                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                                                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                            }
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Folhas expandidas */}
                                                    {isExpanded && doc.sheets.map((sheet) => {
                                                        const sheetMonth = new Date(sheet.reference_month + 'T12:00:00')
                                                            .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                                        const sheetStatus = STATUS_LABEL[sheet.status] ?? STATUS_LABEL.OPEN;
                                                        return (
                                                            <TableRow key={sheet.id} className="bg-muted/30">
                                                                <TableCell colSpan={2} className="pl-8">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm text-muted-foreground capitalize">
                                                                            {sheetMonth}
                                                                        </span>
                                                                        <Badge className={`text-xs ${sheetStatus.color}`}>
                                                                            {sheetStatus.label}
                                                                        </Badge>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm">
                                                                    {sheet.total_appointments} atend.
                                                                </TableCell>
                                                                <TableCell colSpan={2} />
                                                                <TableCell className="text-right font-medium text-green-600 text-sm">
                                                                    {formatCurrency(sheet.net_payroll)}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Link href={`/dashboard/financial/payroll/${sheet.id}`}>
                                                                        <Button variant="ghost" size="sm" className="text-xs h-6">
                                                                            <Download className="w-3 h-3 mr-1" />
                                                                            Ver
                                                                        </Button>
                                                                    </Link>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Totais */}
                    <Separator />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            Período: {new Date(data.period.from + 'T12:00:00').toLocaleDateString('pt-BR')} a
                            {' '}{new Date(data.period.to + 'T12:00:00').toLocaleDateString('pt-BR')}
                            {' '}• {data.total_sheets} folhas • {data.total_doctors} {profLabel.plural.toLowerCase()}
                        </span>
                        <Button variant="outline" size="sm" onClick={handleExportCSV}>
                            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                            Exportar CSV
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
