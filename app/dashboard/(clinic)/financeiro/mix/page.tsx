'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, RefreshCw, Download, Filter, XCircle, PieChart } from 'lucide-react';
import { toast } from 'sonner';

export default function MixReceitaPage() {
    const defaultEnd = new Date().toISOString().split('T')[0];
    const defaultStart = new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [filterApplied, setFilterApplied] = useState({ start: defaultStart, end: defaultEnd });
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const { data: response, isLoading, refetch } = useQuery({
        queryKey: ['revenue-mix', filterApplied],
        queryFn: async () => {
            const res = await fetch(`/api/financial/revenue-mix?period_start=${filterApplied.start}&period_end=${filterApplied.end}`);
            if (!res.ok) throw new Error('Erro ao buscar mix');
            return res.json();
        }
    });

    const mixData = response?.data || [];
    const summary = response?.summary || { total_value: 0, total_count: 0, sources: 0 };

    // Cores para o donut chart
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    const handleExportExcel = async () => {
        if (mixData.length === 0) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Mix de Receita');
            ws.columns = [
                { header: 'Fonte', key: 'label', width: 30 },
                { header: 'Valor Total (R$)', key: 'value', width: 20 },
                { header: '% do Total', key: 'percentage', width: 15 },
                { header: 'Atendimentos', key: 'count', width: 15 },
                { header: 'Ticket Médio (R$)', key: 'ticket', width: 20 },
            ];
            ws.getRow(1).font = { bold: true };
            mixData.forEach((m: any) => {
                ws.addRow({ label: m.label, value: m.value, percentage: `${m.percentage}%`, count: m.count, ticket: m.ticket_medio });
            });
            ws.addRow({});
            ws.addRow({ label: 'TOTAL', value: summary.total_value, count: summary.total_count });
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `mix-receita-${filterApplied.start}.xlsx`; a.click();
            toast.success('Excel exportado!');
        } catch { toast.error('Erro ao exportar'); }
        finally { setIsExportingExcel(false); }
    };

    const handleExportPDF = async () => {
        if (mixData.length === 0) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Mix de Receita — Particular vs Convênio', 14, 15);
            doc.setFontSize(10);
            doc.text(`Período: ${format(new Date(filterApplied.start), 'dd/MM/yyyy')} a ${format(new Date(filterApplied.end), 'dd/MM/yyyy')}`, 14, 22);
            (doc as any).autoTable({
                startY: 30,
                head: [['Fonte', 'Valor', '% Total', 'Atendimentos', 'Ticket Médio']],
                body: mixData.map((m: any) => [m.label, formatCurrency(m.value), `${m.percentage}%`, m.count, formatCurrency(m.ticket_medio)]),
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] }
            });
            doc.save(`mix-receita-${filterApplied.start}.pdf`);
            toast.success('PDF exportado!');
        } catch { toast.error('Erro ao exportar PDF'); }
        finally { setIsExportingPDF(false); }
    };

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            {/* Header Premium */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
                        <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Mix de Receita</h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Comparativo Particular vs Convênios</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => { refetch(); toast.success('Atualizado!'); }} 
                        disabled={isLoading}
                        className="h-10 rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportExcel} 
                        disabled={mixData.length === 0 || isExportingExcel}
                        className="h-10 rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportPDF} 
                        disabled={mixData.length === 0 || isExportingPDF}
                        className="h-10 rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
                    >
                        <Download className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/10">
                <CardContent className="p-4 flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full md:w-auto">
                        <label className="text-sm font-semibold mb-1 block text-slate-700 dark:text-slate-300">Data Inicial</label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="text-sm font-semibold mb-1 block text-slate-700 dark:text-slate-300">Data Final</label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border-slate-200 dark:border-slate-800" />
                    </div>
                    <Button 
                        onClick={() => { setFilterApplied({ start: startDate, end: endDate }); toast.success('Filtros aplicados!'); }}
                        className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5 text-sm font-semibold transition-all duration-200 border-0 flex items-center justify-center"
                    >
                        <Filter className="w-4 h-4 mr-2" /> Aplicar filtro
                    </Button>
                    <Button 
                        variant="ghost" 
                        onClick={() => { setStartDate(defaultStart); setEndDate(defaultEnd); setFilterApplied({ start: defaultStart, end: defaultEnd }); }}
                        className="h-10 rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
                    >
                        <XCircle className="w-4 h-4 mr-2" /> Limpar
                    </Button>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            ) : (
                <>
                    {/* Donut visual com CSS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Distribuição</CardTitle></CardHeader>
                            <CardContent>
                                {mixData.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">Sem dados no período</div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Barra empilhada horizontal */}
                                        <div className="h-10 rounded-lg overflow-hidden flex">
                                            {mixData.map((m: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-center text-xs text-white font-semibold transition-all"
                                                    style={{ width: `${m.percentage}%`, backgroundColor: colors[i % colors.length], minWidth: m.percentage > 2 ? 'auto' : '0' }}
                                                    title={`${m.label}: ${m.percentage}%`}
                                                >
                                                    {m.percentage >= 10 ? `${m.percentage}%` : ''}
                                                </div>
                                            ))}
                                        </div>
                                        {/* Legenda */}
                                        <div className="space-y-2 mt-4">
                                            {mixData.map((m: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                                                    <span className="text-sm flex-1">{m.label}</span>
                                                    <span className="text-sm font-semibold">{m.percentage}%</span>
                                                    <span className="text-sm text-muted-foreground">{formatCurrency(m.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Receita Total</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_value)}</p>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total de Atendimentos</p>
                                    <p className="text-2xl font-bold text-blue-600">{summary.total_count}</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Fontes de Receita</p>
                                    <p className="text-2xl font-bold text-purple-600">{summary.sources}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabela detalhada */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhamento por Fonte</CardTitle>
                            <CardDescription>Receita discriminada por tipo de pagamento</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {mixData.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">Sem dados</div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Fonte</TableHead>
                                                <TableHead className="text-right">Valor Total</TableHead>
                                                <TableHead className="text-center">% do Total</TableHead>
                                                <TableHead className="text-center">Atendimentos</TableHead>
                                                <TableHead className="text-right">Ticket Médio</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {mixData.map((m: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-semibold flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[idx % colors.length] }} />
                                                        {m.label}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(m.value)}</TableCell>
                                                    <TableCell className="text-center">{m.percentage}%</TableCell>
                                                    <TableCell className="text-center">{m.count}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(m.ticket_medio)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
