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
import { FileSpreadsheet, RefreshCw, Download, AlertTriangle, Users, DollarSign, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const levelConfig: Record<string, { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    leve: { label: 'Leve (1-15d)', color: 'text-yellow-600', variant: 'secondary' },
    moderado: { label: 'Moderado (16-30d)', color: 'text-orange-600', variant: 'default' },
    grave: { label: 'Grave (31d+)', color: 'text-red-600', variant: 'destructive' },
};

export default function InadimplenciaPage() {
    const [levelFilter, setLevelFilter] = useState('all');
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const { data: response, isLoading, refetch } = useQuery({
        queryKey: ['debtors', levelFilter],
        queryFn: async () => {
            const res = await fetch('/api/financial/debtors');
            if (!res.ok) throw new Error('Erro ao buscar inadimplentes');
            return res.json();
        }
    });

    const allDebtors = response?.data || [];
    const summary = response?.summary || { total_overdue: 0, total_debtors: 0, percent_compromised: 0 };
    const debtors = levelFilter === 'all' ? allDebtors : allDebtors.filter((d: any) => d.level === levelFilter);

    const handleExportExcel = async () => {
        if (debtors.length === 0) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Inadimplência');
            ws.columns = [
                { header: 'Paciente', key: 'patient', width: 35 },
                { header: 'Valor Total (R$)', key: 'value', width: 18 },
                { header: 'Maior Atraso (dias)', key: 'days', width: 20 },
                { header: 'Parcelas', key: 'count', width: 12 },
                { header: 'Nível', key: 'level', width: 15 },
            ];
            ws.getRow(1).font = { bold: true };
            debtors.forEach((d: any) => {
                ws.addRow({ patient: d.patient_name, value: d.total_value, days: d.max_days_overdue, count: d.entries_count, level: d.level });
            });
            ws.addRow({});
            ws.addRow({ patient: 'TOTAL', value: debtors.reduce((s: number, d: any) => s + d.total_value, 0) });
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `inadimplencia-${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
            toast.success('Excel exportado!');
        } catch { toast.error('Erro ao exportar'); }
        finally { setIsExportingExcel(false); }
    };

    const handleExportPDF = async () => {
        if (debtors.length === 0) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Relatório de Inadimplência', 14, 15);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);
            (doc as any).autoTable({
                startY: 30,
                head: [['Paciente', 'Valor Total', 'Atraso (dias)', 'Parcelas', 'Nível']],
                body: debtors.map((d: any) => [d.patient_name, formatCurrency(d.total_value), `${d.max_days_overdue}d`, d.entries_count, d.level]),
                theme: 'grid',
                headStyles: { fillColor: [220, 38, 38] }
            });
            doc.save(`inadimplencia-${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('PDF exportado!');
        } catch { toast.error('Erro ao exportar PDF'); }
        finally { setIsExportingPDF(false); }
    };

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        Inadimplência
                    </h1>
                    <p className="text-muted-foreground mt-1">Pacientes com parcelas em atraso</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => { refetch(); toast.success('Atualizado!'); }} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel} disabled={debtors.length === 0 || isExportingExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF} disabled={debtors.length === 0 || isExportingPDF}>
                        <Download className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total em Atraso</p>
                            <h3 className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(summary.total_overdue)}</h3>
                        </div>
                        <div className="p-4 bg-red-50 rounded-full"><DollarSign className="w-6 h-6 text-red-500" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Pacientes Inadimplentes</p>
                            <h3 className="text-3xl font-bold text-orange-600 mt-1">{summary.total_debtors}</h3>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-full"><Users className="w-6 h-6 text-orange-500" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">% do Faturamento Comprometido</p>
                            <h3 className="text-3xl font-bold text-yellow-600 mt-1">{summary.percent_compromised}%</h3>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-full"><TrendingDown className="w-6 h-6 text-yellow-500" /></div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtro por nível */}
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex items-end gap-4">
                    <div className="w-full md:w-64">
                        <label className="text-sm font-medium mb-1 block">Filtrar por nível</label>
                        <Select value={levelFilter} onValueChange={setLevelFilter}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os níveis</SelectItem>
                                <SelectItem value="leve">🟡 Leve (1-15 dias)</SelectItem>
                                <SelectItem value="moderado">🟠 Moderado (16-30 dias)</SelectItem>
                                <SelectItem value="grave">🔴 Grave (31+ dias)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Inadimplentes</CardTitle>
                    <CardDescription>Pacientes ordenados pelo maior valor em aberto</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : debtors.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">Nenhum paciente inadimplente encontrado. 🎉</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Paciente</TableHead>
                                        <TableHead className="text-right">Valor Total</TableHead>
                                        <TableHead className="text-center">Maior Atraso</TableHead>
                                        <TableHead className="text-center">Parcelas</TableHead>
                                        <TableHead className="text-center">Nível</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {debtors.map((d: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-semibold">{d.patient_name}</TableCell>
                                            <TableCell className="text-right font-bold text-red-600">{formatCurrency(d.total_value)}</TableCell>
                                            <TableCell className="text-center">{d.max_days_overdue} dias</TableCell>
                                            <TableCell className="text-center">{d.entries_count}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={levelConfig[d.level]?.variant || 'default'}>
                                                    {levelConfig[d.level]?.label || d.level}
                                                </Badge>
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
