'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileSpreadsheet, RefreshCw, Download, History, ChevronDown, Trophy, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function MeuHistoricoPage() {
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const { data: response, isLoading, refetch } = useQuery({
        queryKey: ['my-history', year],
        queryFn: async () => {
            const res = await fetch(`/api/payroll/my-history?year=${year}`);
            if (!res.ok) throw new Error('Erro ao buscar histórico');
            return res.json();
        }
    });

    const history = response?.data || [];
    const summary = response?.summary || { total_year: 0, best_month: '-', best_month_value: 0, percentage: 0, months_count: 0 };

    const handleExportExcel = async () => {
        if (history.length === 0) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet(`Histórico ${year}`);
            ws.columns = [
                { header: 'Mês', key: 'month', width: 15 },
                { header: 'Atendimentos', key: 'atendimentos', width: 15 },
                { header: 'Valor Bruto (R$)', key: 'bruto', width: 20 },
                { header: 'Repasse (R$)', key: 'repasse', width: 20 },
                { header: 'Status', key: 'status', width: 12 },
            ];
            ws.getRow(1).font = { bold: true };
            history.forEach((h: any) => {
                ws.addRow({ month: h.month_label, atendimentos: h.total_atendimentos, bruto: h.total_bruto, repasse: h.total_repasse, status: h.status });
            });
            ws.addRow({});
            ws.addRow({ month: 'TOTAL', repasse: summary.total_year });
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `meu-historico-${year}.xlsx`; a.click();
            toast.success('Excel exportado!');
        } catch { toast.error('Erro ao exportar'); }
        finally { setIsExportingExcel(false); }
    };

    const handleExportPDF = async () => {
        if (history.length === 0) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text(`Meu Histórico de Repasses — ${year}`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Percentual de repasse: ${summary.percentage}%`, 14, 22);
            (doc as any).autoTable({
                startY: 30,
                head: [['Mês', 'Atendimentos', 'Valor Bruto', 'Repasse', 'Status']],
                body: history.map((h: any) => [h.month_label, h.total_atendimentos, formatCurrency(h.total_bruto), formatCurrency(h.total_repasse), h.status]),
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] }
            });
            doc.save(`meu-historico-${year}.pdf`);
            toast.success('PDF exportado!');
        } catch { toast.error('Erro ao exportar PDF'); }
        finally { setIsExportingPDF(false); }
    };

    const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <History className="w-8 h-8 text-primary" />
                        Meu Histórico de Repasses
                    </h1>
                    <p className="text-muted-foreground mt-1">Detalhamento mensal dos seus repasses</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => { refetch(); toast.success('Atualizado!'); }} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel} disabled={history.length === 0 || isExportingExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF} disabled={history.length === 0 || isExportingPDF}>
                        <Download className="w-4 h-4 mr-2" /> PDF
                    </Button>
                </div>
            </div>

            {/* Filtro de ano */}
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex items-end gap-4">
                    <div className="w-full md:w-40">
                        <label className="text-sm font-medium mb-1 block">Ano</label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Cards resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total do Ano</p>
                            <h3 className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.total_year)}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-full"><TrendingUp className="w-5 h-5 text-green-500" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Melhor Mês</p>
                            <h3 className="text-2xl font-bold text-blue-600 mt-1">{summary.best_month}</h3>
                            <p className="text-sm text-muted-foreground">{formatCurrency(summary.best_month_value)}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full"><Trophy className="w-5 h-5 text-blue-500" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm font-medium text-muted-foreground">Percentual de Repasse</p>
                        <h3 className="text-2xl font-bold text-purple-600 mt-1">{summary.percentage}%</h3>
                        <p className="text-sm text-muted-foreground">{summary.months_count} meses com repasse</p>
                    </CardContent>
                </Card>
            </div>

            {/* Timeline de meses */}
            <Card>
                <CardHeader><CardTitle>Detalhamento Mensal</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">Nenhum repasse encontrado em {year}.</div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((h: any) => (
                                <Collapsible key={h.month} open={expandedMonth === h.month} onOpenChange={() => setExpandedMonth(expandedMonth === h.month ? null : h.month)}>
                                    <CollapsibleTrigger className="w-full">
                                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="text-lg font-bold text-primary">{h.month_label}</div>
                                                <Badge variant={h.status === 'pago' ? 'default' : 'secondary'}>{h.status}</Badge>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Bruto</p>
                                                    <p className="font-semibold">{formatCurrency(h.total_bruto)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Repasse</p>
                                                    <p className="font-bold text-green-600">{formatCurrency(h.total_repasse)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Atend.</p>
                                                    <p className="font-semibold">{h.total_atendimentos}</p>
                                                </div>
                                                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedMonth === h.month ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="mt-2 border rounded-lg p-4 bg-muted/20">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Data</TableHead>
                                                        <TableHead>Paciente</TableHead>
                                                        <TableHead>Tipo</TableHead>
                                                        <TableHead className="text-right">Valor</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {h.appointments?.map((a: any, i: number) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{a.date}</TableCell>
                                                            <TableCell>{a.patient}</TableCell>
                                                            <TableCell><Badge variant="outline">{a.insurance}</Badge></TableCell>
                                                            <TableCell className="text-right">{formatCurrency(a.value)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
