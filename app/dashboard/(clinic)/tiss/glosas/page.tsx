// app/dashboard/(clinic)/tiss/glosas/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, TrendingDown, Scale, FileSpreadsheet, RefreshCw, Download, Filter, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContestGlosaDialog } from '@/components/tiss/contest-glosa-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function GlosasPage() {
    const defaultEnd = new Date().toISOString().split('T')[0];
    const defaultStart = new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [filterApplied, setFilterApplied] = useState({ start: defaultStart, end: defaultEnd });
    
    const [selectedGlosa, setSelectedGlosa] = useState<{ id: string, value: number, code: string } | null>(null);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    // Buscar glosas
    const { data: glosas, isLoading, refetch } = useQuery({
        queryKey: ['tiss-glosas', filterApplied],
        queryFn: async () => {
            const response = await fetch(`/api/tiss/glosas?startDate=${filterApplied.start}&endDate=${filterApplied.end}`);
            if (!response.ok) throw new Error('Erro ao buscar glosas');
            const result = await response.json();
            return result.data || [];
        },
    });

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
        if (!glosas || glosas.length === 0) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Glosas TISS');
            
            worksheet.columns = [
                { header: 'Código', key: 'code', width: 15 },
                { header: 'Descrição', key: 'desc', width: 40 },
                { header: 'Categoria', key: 'cat', width: 20 },
                { header: 'Valor Glosado', key: 'val', width: 20 },
                { header: 'Status', key: 'status', width: 20 },
            ];
            
            glosas.forEach((g: any) => {
                worksheet.addRow({
                    code: g.glosa_code || '-',
                    desc: g.glosa_description,
                    cat: g.category,
                    val: g.glosa_value,
                    status: g.contest_status || 'Sem Recurso'
                });
            });
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `glosas-tiss-${filterApplied.start}-a-${filterApplied.end}.xlsx`;
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
        if (!glosas || glosas.length === 0) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            
            const doc = new jsPDF();
            doc.text(`Relatório de Glosas TISS - ${format(new Date(filterApplied.start), 'dd/MM/yyyy')} a ${format(new Date(filterApplied.end), 'dd/MM/yyyy')}`, 14, 15);
            
            const tableData = glosas.map((g: any) => [
                g.glosa_code || '-',
                g.glosa_description.substring(0, 40) + '...',
                g.category,
                formatCurrency(g.glosa_value),
                g.contest_status || 'Sem Recurso'
            ]);
            
            (doc as any).autoTable({
                head: [['Código', 'Descrição', 'Categoria', 'Valor Glosado', 'Status']],
                body: tableData,
                startY: 25,
            });
            
            doc.save(`glosas-tiss-${filterApplied.start}-a-${filterApplied.end}.pdf`);
            toast.success('PDF exportado com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao gerar PDF');
        } finally {
            setIsExportingPDF(false);
        }
    };

    // Calcular estatísticas
    const stats = glosas ? {
        total: glosas.length,
        totalValue: glosas.reduce((sum: number, g: any) => sum + g.glosa_value, 0),
        canAppeal: glosas.filter((g: any) => g.can_appeal && (!g.contest_status || g.contest_status === 'NONE')).length,
        byCategory: glosas.reduce((acc: any, g: any) => {
            acc[g.category] = (acc[g.category] || 0) + 1;
            return acc;
        }, {}),
    } : null;

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Análise de Glosas</h1>
                    <p className="text-muted-foreground mt-1">
                        Gestão e acompanhamento de glosas nas guias TISS
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
                        disabled={!glosas || glosas.length === 0 || isExportingExcel}
                    >
                        <FileSpreadsheet className={`w-4 h-4 mr-2 ${isExportingExcel ? 'animate-pulse' : ''}`} />
                        Exportar Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportPDF}
                        disabled={!glosas || glosas.length === 0 || isExportingPDF}
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

            {/* Stats */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
            ) : stats ? (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Total de Glosas</CardDescription>
                            <CardTitle className="text-3xl">{stats.total}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                {stats.canAppeal} podem ser recorridas
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Valor Glosado</CardDescription>
                            <CardTitle className="text-3xl">
                                {formatCurrency(stats.totalValue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-xs text-destructive">
                                <TrendingDown className="mr-1 h-3 w-3" />
                                Perda financeira
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Principal Motivo</CardDescription>
                            <CardTitle className="text-lg">
                                {Object.keys(stats.byCategory)[0] || 'N/A'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                {stats.byCategory[Object.keys(stats.byCategory)[0]] || 0} ocorrências
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Recursos Pendentes</CardDescription>
                            <CardTitle className="text-3xl">{stats.canAppeal}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Prazo para recurso ativo
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {/* Tabela */}
            <Card>
                <CardHeader>
                    <CardTitle>Glosas Recentes</CardTitle>
                    <CardDescription>Últimas glosas registradas e status do recurso</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                        </div>
                    ) : glosas && glosas.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {glosas.map((glosa: any) => (
                                    <TableRow key={glosa.id}>
                                        <TableCell className="font-mono text-sm">
                                            {glosa.glosa_code || '-'}
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            {glosa.glosa_description}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{glosa.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-destructive">
                                            -{formatCurrency(glosa.glosa_value)}
                                        </TableCell>
                                        <TableCell>
                                            {glosa.contest_status === 'REVERSED' ? (
                                                <Badge className="bg-green-600">Revertida</Badge>
                                            ) : glosa.contest_status === 'IN_REVIEW' ? (
                                                <Badge className="bg-amber-500">Em Análise</Badge>
                                            ) : glosa.contest_status === 'CLOSED' ? (
                                                <Badge variant="destructive">Recurso Negado</Badge>
                                            ) : !glosa.can_appeal ? (
                                                <Badge variant="secondary">Irrecorrível</Badge>
                                            ) : (
                                                <Badge variant="secondary">Sem Recurso</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {glosa.can_appeal && (!glosa.contest_status || glosa.contest_status === 'NONE') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedGlosa({
                                                        id: glosa.id,
                                                        code: glosa.glosa_code,
                                                        value: glosa.glosa_value
                                                    })}
                                                >
                                                    <Scale className="h-4 w-4 mr-1" />
                                                    Recorrer
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="font-semibold text-lg">Nenhuma glosa registrada</h3>
                            <p className="text-muted-foreground text-sm">
                                Isso é ótimo! Suas guias estão sendo aprovadas.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ContestGlosaDialog
                open={selectedGlosa !== null}
                onOpenChange={(open) => !open && setSelectedGlosa(null)}
                glosaId={selectedGlosa?.id || null}
                glosaCode={selectedGlosa?.code || ''}
                glosaValue={selectedGlosa?.value || 0}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
