// app/dashboard/(clinic)/financial/ltv/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
    Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    FileSpreadsheet, 
    RefreshCw, 
    Download, 
    Filter, 
    XCircle,
    TrendingUp,
    Users
} from 'lucide-react';
import { toast } from 'sonner';

export default function LTVReportPage() {
    // Definimos por padrão os últimos 12 meses
    const defaultEnd = new Date().toISOString().split('T')[0];
    const defaultStart = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [filterApplied, setFilterApplied] = useState({ start: defaultStart, end: defaultEnd });
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const { data: reportRes, isLoading, refetch } = useQuery({
        queryKey: ['ltv-report', filterApplied],
        queryFn: async () => {
            const url = `/api/reports?type=ltv&startDate=${filterApplied.start}&endDate=${filterApplied.end}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Erro ao buscar dados de LTV');
            const json = await res.json();
            return json;
        }
    });

    const ltvData = reportRes?.data || [];
    const summary = reportRes?.summary || { totalLTV: 0, avgLTV: 0 };
    const hasActiveFilter = startDate !== defaultStart || endDate !== defaultEnd;

    const handleApplyFilter = () => {
        setFilterApplied({ start: startDate, end: endDate });
        toast.success('Filtros aplicados com sucesso!');
    };

    const handleClearFilter = () => {
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
        setFilterApplied({ start: defaultStart, end: defaultEnd });
        toast.info('Filtros removidos!');
    };

    const handleExportExcel = async () => {
        if (!ltvData || ltvData.length === 0) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Relatório LTV');
            
            worksheet.columns = [
                { header: 'Paciente', key: 'name', width: 40 },
                { header: 'Paciente Desde', key: 'since', width: 20 },
                { header: 'LTV Total (R$)', key: 'ltv', width: 20 },
            ];
            
            ltvData.forEach((h: any) => {
                worksheet.addRow({
                    name: h.name,
                    since: format(new Date(h.since), 'dd/MM/yyyy'),
                    ltv: h.ltv
                });
            });
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio-ltv-${filterApplied.start}-a-${filterApplied.end}.xlsx`;
            a.click();
            toast.success('Excel exportado com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao gerar Excel');
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportPDF = async () => {
        if (!ltvData || ltvData.length === 0) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            
            const doc = new jsPDF();
            doc.text(`Relatório LTV (Lifetime Value) - ${format(new Date(filterApplied.start), 'dd/MM/yyyy')} a ${format(new Date(filterApplied.end), 'dd/MM/yyyy')}`, 14, 15);
            
            const tableData = ltvData.map((h: any) => [
                h.name,
                format(new Date(h.since), 'dd/MM/yyyy'),
                formatCurrency(h.ltv)
            ]);
            
            (doc as any).autoTable({
                head: [['Paciente', 'Paciente Desde', 'LTV Total']],
                body: tableData,
                startY: 25,
            });
            
            doc.save(`relatorio-ltv-${filterApplied.start}-a-${filterApplied.end}.pdf`);
            toast.success('PDF exportado com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao gerar PDF');
        } finally {
            setIsExportingPDF(false);
        }
    };

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-primary" />
                        Relatório LTV (Lifetime Value)
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Análise de valor vitalício dos pacientes no período selecionado.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => { refetch(); toast.success('Dados atualizados!'); }}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportExcel}
                        disabled={!ltvData || ltvData.length === 0 || isExportingExcel}
                    >
                        <FileSpreadsheet className={`w-4 h-4 mr-2 ${isExportingExcel ? 'animate-pulse' : ''}`} />
                        Exportar Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportPDF}
                        disabled={!ltvData || ltvData.length === 0 || isExportingPDF}
                    >
                        <Download className={`w-4 h-4 mr-2 ${isExportingPDF ? 'animate-bounce' : ''}`} />
                        Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full md:w-auto">
                        <label className="text-sm font-medium mb-1 block">Data Inicial</label>
                        <Input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="text-sm font-medium mb-1 block">Data Final</label>
                        <Input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button onClick={handleApplyFilter} disabled={isLoading}>
                            <Filter className="w-4 h-4 mr-2" />
                            Aplicar filtro
                        </Button>
                        {hasActiveFilter && (
                            <Button variant="ghost" onClick={handleClearFilter}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Limpar filtros
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Sumário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">LTV Total do Período</p>
                            <h3 className="text-3xl font-bold text-green-600 mt-1">
                                {formatCurrency(summary.totalLTV)}
                            </h3>
                        </div>
                        <div className="p-4 bg-green-50 rounded-full">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Ticket Médio por Paciente</p>
                            <h3 className="text-3xl font-bold text-blue-600 mt-1">
                                {formatCurrency(summary.avgLTV)}
                            </h3>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-full">
                            <Users className="w-6 h-6 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Resultados */}
            <Card>
                <CardHeader>
                    <CardTitle>Listagem de Pacientes (Ranking)</CardTitle>
                    <CardDescription>Pacientes ordenados pelo maior valor gerado para a clínica.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : ltvData.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Nenhum dado financeiro encontrado no período selecionado.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Posição</TableHead>
                                        <TableHead>Paciente</TableHead>
                                        <TableHead>Paciente Desde</TableHead>
                                        <TableHead className="text-right">LTV Acumulado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ltvData.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium text-muted-foreground">
                                                #{idx + 1}
                                            </TableCell>
                                            <TableCell className="font-semibold">{item.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {format(new Date(item.since), 'dd/MM/yyyy')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-600">
                                                {formatCurrency(item.ltv)}
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
