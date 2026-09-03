'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, RefreshCw, Download, TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjecaoPage() {
    const [days, setDays] = useState('30');
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const { data: response, isLoading, refetch } = useQuery({
        queryKey: ['projection', days],
        queryFn: async () => {
            const res = await fetch(`/api/financial/projection?days=${days}`);
            if (!res.ok) throw new Error('Erro ao buscar projeção');
            return res.json();
        }
    });

    const projection = response?.data || [];
    const summary = response?.summary || { saldo_atual: 0, total_revenue: 0, total_expenses: 0, final_balance: 0, best_day: null, best_day_revenue: 0 };

    const handleExportExcel = async () => {
        if (projection.length === 0) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Projeção de Caixa');
            ws.columns = [
                { header: 'Data', key: 'date', width: 15 },
                { header: 'Receitas (R$)', key: 'revenue', width: 18 },
                { header: 'Despesas (R$)', key: 'expenses', width: 18 },
                { header: 'Saldo (R$)', key: 'balance', width: 18 },
            ];
            ws.getRow(1).font = { bold: true };
            projection.forEach((d: any) => {
                ws.addRow({ date: format(new Date(d.date + 'T12:00:00'), 'dd/MM/yyyy'), revenue: d.revenue, expenses: d.expenses, balance: d.balance });
            });
            ws.addRow({});
            ws.addRow({ date: 'TOTAIS', revenue: summary.total_revenue, expenses: summary.total_expenses, balance: summary.final_balance });
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `projecao-caixa-${days}d.xlsx`; a.click();
            toast.success('Excel exportado!');
        } catch { toast.error('Erro ao exportar'); }
        finally { setIsExportingExcel(false); }
    };

    const handleExportPDF = async () => {
        if (projection.length === 0) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text(`Projeção de Caixa - Próximos ${days} dias`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Saldo atual: ${formatCurrency(summary.saldo_atual)}`, 14, 22);
            (doc as any).autoTable({
                startY: 30,
                head: [['Data', 'Receitas', 'Despesas', 'Saldo']],
                body: projection.map((d: any) => [
                    format(new Date(d.date + 'T12:00:00'), 'dd/MM/yyyy'),
                    formatCurrency(d.revenue),
                    formatCurrency(d.expenses),
                    formatCurrency(d.balance)
                ]),
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] }
            });
            doc.save(`projecao-caixa-${days}d.pdf`);
            toast.success('PDF exportado!');
        } catch { toast.error('Erro ao exportar PDF'); }
        finally { setIsExportingPDF(false); }
    };

    // Encontrar saldo mínimo e máximo para visualização
    const minBalance = Math.min(...(projection.length > 0 ? projection.map((d: any) => d.balance) : [0]));
    const maxBalance = Math.max(...(projection.length > 0 ? projection.map((d: any) => d.balance) : [0]));

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <Calendar className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Projeção de Caixa</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Previsão de receitas e despesas futuras</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => { refetch(); toast.success('Atualizado!'); }} 
                        disabled={isLoading}
                        className="h-9 rounded-md px-3 text-xs font-medium border-border shadow-xs hover:bg-muted/50 flex items-center justify-center"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportExcel} 
                        disabled={projection.length === 0 || isExportingExcel}
                        className="h-9 rounded-md px-3 text-xs font-medium border-border shadow-xs hover:bg-muted/50 flex items-center justify-center"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportPDF} 
                        disabled={projection.length === 0 || isExportingPDF}
                        className="h-9 rounded-md px-3 text-xs font-medium border-border shadow-xs hover:bg-muted/50 flex items-center justify-center"
                    >
                        <Download className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Seletor de período */}
            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/10">
                <CardContent className="p-4 flex items-end gap-4">
                    <div className="w-full md:w-48">
                        <label className="text-sm font-semibold mb-1 block text-slate-700 dark:text-slate-300">Período de projeção</label>
                        <Select value={days} onValueChange={setDays}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">7 dias</SelectItem>
                                <SelectItem value="15">15 dias</SelectItem>
                                <SelectItem value="30">30 dias</SelectItem>
                                <SelectItem value="60">60 dias</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
                            <h3 className={`text-2xl font-bold mt-1 ${summary.saldo_atual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(summary.saldo_atual)}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full"><Wallet className="w-5 h-5 text-blue-500" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Receita Prevista</p>
                            <h3 className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.total_revenue)}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-full"><TrendingUp className="w-5 h-5 text-green-500" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Despesas Previstas</p>
                            <h3 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.total_expenses)}</h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-full"><TrendingDown className="w-5 h-5 text-red-500" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Saldo Projetado</p>
                            <h3 className={`text-2xl font-bold mt-1 ${summary.final_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(summary.final_balance)}
                            </h3>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-full"><Calendar className="w-5 h-5 text-purple-500" /></div>
                    </CardContent>
                </Card>
            </div>

            {/* Barra visual de progresso do saldo */}
            {projection.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Evolução do Saldo</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-px h-40">
                            {projection.filter((_: any, i: number) => i % Math.max(1, Math.floor(projection.length / 60)) === 0).map((d: any, i: number) => {
                                const range = maxBalance - minBalance || 1;
                                const height = ((d.balance - minBalance) / range) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                                        <div
                                            className={`w-full rounded-t-sm transition-all ${d.balance >= 0 ? 'bg-green-400 hover:bg-green-500' : 'bg-red-400 hover:bg-red-500'}`}
                                            style={{ height: `${Math.max(4, height)}%` }}
                                            title={`${format(new Date(d.date + 'T12:00:00'), 'dd/MM')}: ${formatCurrency(d.balance)}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>{projection.length > 0 ? format(new Date(projection[0].date + 'T12:00:00'), 'dd/MM') : ''}</span>
                            <span>{projection.length > 0 ? format(new Date(projection[projection.length - 1].date + 'T12:00:00'), 'dd/MM') : ''}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabela diária */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento Diário</CardTitle>
                    <CardDescription>Projeção dia a dia para os próximos {days} dias</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    ) : projection.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">Sem dados de projeção.</div>
                    ) : (
                        <div className="rounded-md border max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Receitas</TableHead>
                                        <TableHead className="text-right">Despesas</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projection.map((d: any, idx: number) => (
                                        <TableRow key={idx} className={d.revenue > 0 || d.expenses > 0 ? '' : 'opacity-50'}>
                                            <TableCell>{format(new Date(d.date + 'T12:00:00'), 'dd/MM/yyyy (EEE)')}</TableCell>
                                            <TableCell className="text-right text-green-600">{d.revenue > 0 ? formatCurrency(d.revenue) : '-'}</TableCell>
                                            <TableCell className="text-right text-red-600">{d.expenses > 0 ? formatCurrency(d.expenses) : '-'}</TableCell>
                                            <TableCell className={`text-right font-semibold ${d.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                {formatCurrency(d.balance)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
