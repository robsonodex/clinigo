// app/dashboard/(clinic)/financial/dre-costcenter/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
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
    TrendingDown,
    Building2,
    DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

export default function DRECostCenterPage() {
    const defaultEnd = new Date().toISOString().split('T')[0];
    const defaultStart = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [filterApplied, setFilterApplied] = useState({ start: defaultStart, end: defaultEnd });
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const { data: reportRes, isLoading, refetch } = useQuery({
        queryKey: ['dre-costcenter-report', filterApplied],
        queryFn: async () => {
            const url = `/api/reports?type=dre_costcenter&startDate=${filterApplied.start}&endDate=${filterApplied.end}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Erro ao buscar dados DRE por Centro de Custo');
            const json = await res.json();
            return json;
        }
    });

    const dreData = reportRes?.data || [];
    const summary = reportRes?.summary || { totalExpenses: 0 };
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
        if (!dreData || dreData.length === 0) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('DRE Centro de Custo');
            
            worksheet.columns = [
                { header: 'Centro de Custo', key: 'category', width: 40 },
                { header: 'Qtd de Despesas', key: 'count', width: 20 },
                { header: 'Total (R$)', key: 'total', width: 20 },
            ];
            
            dreData.forEach((item: any) => {
                worksheet.addRow({
                    category: item.category,
                    count: item.count,
                    total: item.total
                });
            });
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dre-centrocusto-${filterApplied.start}-a-${filterApplied.end}.xlsx`;
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
        if (!dreData || dreData.length === 0) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            
            const doc = new jsPDF();
            doc.text(`DRE por Centro de Custo - ${format(new Date(filterApplied.start), 'dd/MM/yyyy')} a ${format(new Date(filterApplied.end), 'dd/MM/yyyy')}`, 14, 15);
            
            const tableData = dreData.map((item: any) => [
                item.category,
                item.count.toString(),
                formatCurrency(item.total)
            ]);
            
            (doc as any).autoTable({
                head: [['Centro de Custo', 'Qtd Registros', 'Total Gasto']],
                body: tableData,
                startY: 25,
            });
            
            doc.save(`dre-centrocusto-${filterApplied.start}-a-${filterApplied.end}.pdf`);
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
                        <Building2 className="w-8 h-8 text-primary" />
                        DRE por Centro de Custo
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Análise de despesas categorizadas no período selecionado.
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
                        disabled={!dreData || dreData.length === 0 || isExportingExcel}
                    >
                        <FileSpreadsheet className={`w-4 h-4 mr-2 ${isExportingExcel ? 'animate-pulse' : ''}`} />
                        Exportar Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportPDF}
                        disabled={!dreData || dreData.length === 0 || isExportingPDF}
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
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total de Despesas do Período</p>
                            <h3 className="text-3xl font-bold text-red-600 mt-1">
                                {formatCurrency(summary.totalExpenses)}
                            </h3>
                        </div>
                        <div className="p-4 bg-red-50 rounded-full">
                            <TrendingDown className="w-6 h-6 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Centros de Custo Ativos</p>
                            <h3 className="text-3xl font-bold text-gray-700 mt-1">
                                {dreData.length}
                            </h3>
                        </div>
                        <div className="p-4 bg-gray-100 rounded-full">
                            <Building2 className="w-6 h-6 text-gray-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Resultados */}
            <Card>
                <CardHeader>
                    <CardTitle>Despesas por Categoria</CardTitle>
                    <CardDescription>Resumo dos valores alocados em cada centro de custo.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : dreData.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Nenhuma despesa encontrada no período selecionado.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Centro de Custo</TableHead>
                                        <TableHead className="text-center">Qtd. Lançamentos</TableHead>
                                        <TableHead className="text-right">Total Gasto</TableHead>
                                        <TableHead className="text-right">Representatividade</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dreData.map((item: any, idx: number) => {
                                        const percentage = summary.totalExpenses > 0 
                                            ? ((item.total / summary.totalExpenses) * 100).toFixed(1) 
                                            : '0.0';
                                        
                                        return (
                                            <TableRow key={idx}>
                                                <TableCell className="font-semibold">{item.category}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary">{item.count}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-red-600">
                                                    {formatCurrency(item.total)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {percentage}%
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
    );
}
