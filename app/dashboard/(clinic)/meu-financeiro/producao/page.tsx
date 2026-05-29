'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, RefreshCw, Download, Filter, XCircle, BarChart3, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function MinhaProducaoPage() {
    const defaultEnd = new Date().toISOString().split('T')[0];
    const defaultStart = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [filterApplied, setFilterApplied] = useState({ start: defaultStart, end: defaultEnd });
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const { data: response, isLoading, refetch } = useQuery({
        queryKey: ['my-producao', filterApplied],
        queryFn: async () => {
            const res = await fetch(`/api/financial/my-producao?period_start=${filterApplied.start}&period_end=${filterApplied.end}`);
            if (!res.ok) throw new Error('Erro ao buscar produção');
            return res.json();
        }
    });

    const data = response?.data || null;

    const handleExportExcel = async () => {
        if (!data) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Minha Produção');
            ws.columns = [
                { header: 'Métrica', key: 'metric', width: 30 },
                { header: 'Valor', key: 'value', width: 25 },
            ];
            ws.getRow(1).font = { bold: true };
            ws.addRow({ metric: 'Atendimentos', value: data.total_atendimentos });
            ws.addRow({ metric: 'Faltas (No-show)', value: data.total_faltas });
            ws.addRow({ metric: 'Taxa No-show', value: `${data.taxa_noshow}%` });
            ws.addRow({ metric: 'Receita Total', value: data.receita_total });
            ws.addRow({ metric: 'Receita Particular', value: data.receita_particular });
            ws.addRow({ metric: 'Receita Convênio', value: data.receita_convenio });
            ws.addRow({ metric: 'Ticket Médio', value: data.ticket_medio });
            ws.addRow({ metric: 'Repasse Calculado', value: data.repasse_calculado });
            ws.addRow({ metric: 'Média CliniGo (Ticket)', value: data.clinic_avg_ticket });
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `minha-producao.xlsx`; a.click();
            toast.success('Excel exportado!');
        } catch { toast.error('Erro'); }
        finally { setIsExportingExcel(false); }
    };

    const handleExportPDF = async () => {
        if (!data) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Minha Produção Pessoal', 14, 15);
            doc.setFontSize(10);
            doc.text(`Profissional: ${data.doctor_name}`, 14, 22);
            (doc as any).autoTable({
                startY: 30,
                head: [['Métrica', 'Valor']],
                body: [
                    ['Atendimentos', data.total_atendimentos],
                    ['Faltas', data.total_faltas],
                    ['Taxa No-show', `${data.taxa_noshow}%`],
                    ['Receita Total', formatCurrency(data.receita_total)],
                    ['Particular', formatCurrency(data.receita_particular)],
                    ['Convênio', formatCurrency(data.receita_convenio)],
                    ['Ticket Médio', formatCurrency(data.ticket_medio)],
                    ['Repasse', formatCurrency(data.repasse_calculado)],
                    ['Média CliniGo', formatCurrency(data.clinic_avg_ticket)],
                ],
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] }
            });
            doc.save('minha-producao.pdf');
            toast.success('PDF exportado!');
        } catch { toast.error('Erro'); }
        finally { setIsExportingPDF(false); }
    };

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-primary" />
                        Minha Produção
                    </h1>
                    <p className="text-muted-foreground mt-1">Métricas pessoais de desempenho</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => { refetch(); toast.success('Atualizado!'); }}
                        disabled={isLoading}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={!data || isExportingExcel}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Excel</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportPDF}
                        disabled={!data || isExportingPDF}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                    >
                        <Download className="w-4 h-4 text-blue-600" />
                        <span>PDF</span>
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full md:w-auto">
                        <label className="text-sm font-medium mb-1 block">Início</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer transition-all duration-200"
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="text-sm font-medium mb-1 block">Fim</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer transition-all duration-200"
                        />
                    </div>
                    <Button
                        onClick={() => { setFilterApplied({ start: startDate, end: endDate }); toast.success('Filtros aplicados!'); }}
                        className="flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold transition-all duration-200 border-0 justify-center items-center"
                    >
                        <Filter className="w-4 h-4" />
                        <span>Aplicar</span>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => { setStartDate(defaultStart); setEndDate(defaultEnd); setFilterApplied({ start: defaultStart, end: defaultEnd }); }}
                        className="flex gap-1.5 h-10 text-sm hover:bg-slate-100 transition-all duration-200 rounded-xl px-4 font-semibold text-slate-500 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span>Limpar</span>
                    </Button>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>
            ) : !data ? (
                <div className="text-center py-12 text-muted-foreground">Sem dados no período selecionado.</div>
            ) : (
                <>
                    {/* Cards de métricas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground">Atendimentos</p>
                                <h3 className="text-3xl font-bold text-blue-600 mt-1">{data.total_atendimentos}</h3>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground">Receita Gerada</p>
                                <h3 className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(data.receita_total)}</h3>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground">Repasse Previsto</p>
                                <h3 className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(data.repasse_calculado)}</h3>
                                <Badge variant="outline" className="mt-1">{data.percentage}%</Badge>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                                <h3 className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(data.ticket_medio)}</h3>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /><p className="text-sm font-medium">Taxa de No-show</p></div>
                                <h3 className={`text-2xl font-bold ${data.taxa_noshow > 20 ? 'text-red-600' : data.taxa_noshow > 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {data.taxa_noshow}%
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">{data.total_faltas} faltas</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm font-medium mb-2">Particular vs Convênio</p>
                                <div className="h-4 rounded-full overflow-hidden flex bg-muted">
                                    {data.receita_total > 0 && (
                                        <>
                                            <div className="bg-green-500 h-full" style={{ width: `${(data.receita_particular / data.receita_total) * 100}%` }} />
                                            <div className="bg-blue-500 h-full" style={{ width: `${(data.receita_convenio / data.receita_total) * 100}%` }} />
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-between mt-2 text-xs">
                                    <span className="text-green-600">Particular: {formatCurrency(data.receita_particular)}</span>
                                    <span className="text-blue-600">Convênio: {formatCurrency(data.receita_convenio)}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm font-medium mb-2">Comparativo Média CliniGo</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm">Seu Ticket</span>
                                        <span className="font-bold">{formatCurrency(data.ticket_medio)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Média CliniGo</span>
                                        <span className="font-semibold text-muted-foreground">{formatCurrency(data.clinic_avg_ticket)}</span>
                                    </div>
                                    <Badge variant={data.ticket_medio >= data.clinic_avg_ticket ? 'default' : 'secondary'} className="mt-1">
                                        {data.ticket_medio >= data.clinic_avg_ticket ? '↑ Acima da média' : '↓ Abaixo da média'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Evolução mensal */}
                    {data.evolution && data.evolution.length > 0 && (
                        <Card>
                            <CardHeader><CardTitle>Evolução Mensal (12 meses)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-1 h-40">
                                    {data.evolution.map((m: any, i: number) => {
                                        const maxRev = Math.max(...data.evolution.map((e: any) => e.receita), 1);
                                        const height = (m.receita / maxRev) * 100;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center">
                                                <div
                                                    className="w-full bg-primary/70 hover:bg-primary rounded-t-sm transition-all"
                                                    style={{ height: `${Math.max(4, height)}%` }}
                                                    title={`${m.month}: ${formatCurrency(m.receita)} (${m.atendimentos} atend.)`}
                                                />
                                                <span className="text-[9px] text-muted-foreground mt-1 rotate-[-45deg]">{m.month.split('/')[0]}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
