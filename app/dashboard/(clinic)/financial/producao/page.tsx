'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Download, 
    Users, 
    TrendingUp, 
    DollarSign, 
    Activity, 
    FileSpreadsheet, 
    FileText, 
    RefreshCcw, 
    Calendar,
    Filter,
    Wallet
} from 'lucide-react';
import { toast } from 'sonner';

interface SummaryType {
    total_atendimentos: number;
    receita_total: number;
    total_repasse?: number;
    ticket_medio_geral: number;
}

export default function ProducaoProfissionalPage() {
    const profLabel = useProfessionalLabel();
    
    // Funções utilitárias de período
    const getWeekRange = () => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Dom, 1 = Seg, ...
        // Segunda-feira da semana atual
        const monday = new Date(now);
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        monday.setDate(now.getDate() + diffToMonday);
        // Sábado da semana atual
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);

        return {
            start: monday.toISOString().split('T')[0],
            end: saturday.toISOString().split('T')[0],
        };
    };

    const getMonthRange = () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            start: first.toISOString().split('T')[0],
            end: last.toISOString().split('T')[0],
        };
    };

    const initialMonth = getMonthRange();
    const [periodStart, setPeriodStart] = useState(initialMonth.start);
    const [periodEnd, setPeriodEnd] = useState(initialMonth.end);
    const [doctorId, setDoctorId] = useState<string>('all');
    const [isExporting, setIsExporting] = useState(false);

    // Buscar lista de profissionais
    const { data: doctors } = useQuery({
        queryKey: ['doctors-list'],
        queryFn: async () => {
            const res = await fetch('/api/doctors?is_active=true');
            const json = await res.json();
            return json.data || [];
        }
    });

    // Buscar produção
    const { data: prodRes, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['financial-producao', periodStart, periodEnd, doctorId],
        queryFn: async () => {
            const url = `/api/financial/producao?period_start=${periodStart}&period_end=${periodEnd}${doctorId !== 'all' ? `&doctor_id=${doctorId}` : ''}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        }
    });

    const data = prodRes?.data || [];
    const summary: SummaryType = prodRes?.summary || { 
        total_atendimentos: 0, 
        receita_total: 0, 
        total_repasse: 0, 
        ticket_medio_geral: 0 
    };

    // Atalhos rápidos de data
    const handleSetThisWeek = () => {
        const week = getWeekRange();
        setPeriodStart(week.start);
        setPeriodEnd(week.end);
    };

    const handleSetThisMonth = () => {
        const m = getMonthRange();
        setPeriodStart(m.start);
        setPeriodEnd(m.end);
    };

    const handleSetLastMonth = () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        setPeriodStart(first.toISOString().split('T')[0]);
        setPeriodEnd(last.toISOString().split('T')[0]);
    };

    // Exportação Excel (.xlsx) profissional
    const handleExportExcel = async () => {
        if (!data || data.length === 0) {
            toast.error('Não há dados disponíveis no período para exportar.');
            return;
        }

        setIsExporting(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();
            wb.creator = 'CliniGo Gestão em Saúde';
            wb.created = new Date();

            const ws = wb.addWorksheet('Produção e Repasses');

            // Cabeçalho Principal
            ws.mergeCells('A1:H1');
            const titleCell = ws.getCell('A1');
            titleCell.value = 'CLINIGO — DEMONSTRATIVO DE PRODUÇÃO E REPASSES DE PROFISSIONAIS';
            titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            ws.getRow(1).height = 32;

            // Metadados do Relatório
            ws.getCell('A3').value = 'Período Apurado:';
            ws.getCell('B3').value = `${periodStart} até ${periodEnd}`;
            ws.getCell('A3').font = { bold: true };

            ws.getCell('D3').value = 'Data de Emissão:';
            ws.getCell('E3').value = new Date().toLocaleDateString('pt-BR');
            ws.getCell('D3').font = { bold: true };

            ws.getCell('A4').value = 'Filtro de Profissional:';
            const selectedDocObj = doctors?.find((d: any) => d.id === doctorId);
            ws.getCell('B4').value = doctorId === 'all' ? 'Todos os profissionais ativos' : (selectedDocObj?.user?.full_name || selectedDocObj?.name || 'Individual');
            ws.getCell('A4').font = { bold: true };

            // Bloco de Totais
            ws.mergeCells('A6:B6');
            ws.getCell('A6').value = 'RESUMO DO PERÍODO';
            ws.getCell('A6').font = { bold: true, color: { argb: 'FF1E293B' } };

            ws.getCell('A7').value = 'Total de Atendimentos:';
            ws.getCell('B7').value = summary.total_atendimentos;
            ws.getCell('A8').value = 'Receita Bruta Total (R$):';
            ws.getCell('B8').value = summary.receita_total;
            ws.getCell('B8').numFmt = 'R$ #,##0.00';
            ws.getCell('A9').value = 'Total Geral a Repassar (R$):';
            ws.getCell('B9').value = summary.total_repasse || 0;
            ws.getCell('B9').numFmt = 'R$ #,##0.00';
            ws.getCell('B9').font = { bold: true, color: { argb: 'FF15803D' } };

            // Cabeçalho da Tabela
            const startRow = 11;
            const headers = [
                'Profissional',
                'Especialidade',
                'Atendimentos Concluídos',
                'Faltas (No-Show)',
                'Taxa No-Show (%)',
                'Receita Bruta (R$)',
                'Ticket Médio (R$)',
                'Repasse a Receber (R$)'
            ];

            const headerRow = ws.getRow(startRow);
            headers.forEach((h, idx) => {
                const cell = headerRow.getCell(idx + 1);
                cell.value = h;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
                cell.alignment = { vertical: 'middle', horizontal: idx >= 2 ? 'right' : 'left' };
            });
            headerRow.height = 24;

            // Linhas de dados
            let currentRow = startRow + 1;
            data.forEach((row: any) => {
                const r = ws.getRow(currentRow);
                r.getCell(1).value = row.doctor_name;
                r.getCell(2).value = row.specialty;
                r.getCell(3).value = row.total_atendimentos;
                r.getCell(4).value = row.total_faltas;
                r.getCell(5).value = Number((row.taxa_noshow || 0).toFixed(1));
                r.getCell(6).value = Number(row.receita_total || 0);
                r.getCell(6).numFmt = 'R$ #,##0.00';
                r.getCell(7).value = Number(row.ticket_medio || 0);
                r.getCell(7).numFmt = 'R$ #,##0.00';
                r.getCell(8).value = Number(row.repasse_calculado || 0);
                r.getCell(8).numFmt = 'R$ #,##0.00';
                r.getCell(8).font = { bold: true, color: { argb: 'FF15803D' } };

                r.getCell(3).alignment = { horizontal: 'center' };
                r.getCell(4).alignment = { horizontal: 'center' };
                r.getCell(5).alignment = { horizontal: 'right' };
                r.getCell(6).alignment = { horizontal: 'right' };
                r.getCell(7).alignment = { horizontal: 'right' };
                r.getCell(8).alignment = { horizontal: 'right' };

                currentRow++;
            });

            // Linha de Total Geral no rodapé
            const footerRow = ws.getRow(currentRow);
            footerRow.getCell(1).value = 'TOTAL GERAL';
            footerRow.getCell(1).font = { bold: true };
            footerRow.getCell(3).value = summary.total_atendimentos;
            footerRow.getCell(3).font = { bold: true };
            footerRow.getCell(3).alignment = { horizontal: 'center' };
            footerRow.getCell(6).value = summary.receita_total;
            footerRow.getCell(6).numFmt = 'R$ #,##0.00';
            footerRow.getCell(6).font = { bold: true };
            footerRow.getCell(6).alignment = { horizontal: 'right' };
            footerRow.getCell(8).value = summary.total_repasse || 0;
            footerRow.getCell(8).numFmt = 'R$ #,##0.00';
            footerRow.getCell(8).font = { bold: true, color: { argb: 'FF15803D' } };
            footerRow.getCell(8).alignment = { horizontal: 'right' };

            // Ajustar largura das colunas
            ws.columns = [
                { width: 34 }, // Profissional
                { width: 26 }, // Especialidade
                { width: 22 }, // Atendimentos
                { width: 18 }, // Faltas
                { width: 18 }, // Taxa No-Show
                { width: 20 }, // Receita Bruta
                { width: 18 }, // Ticket Médio
                { width: 24 }, // Repasse a Receber
            ];

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `repasses_profissionais_${periodStart}_a_${periodEnd}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success('Relatório em Excel gerado com sucesso!');
        } catch (err: any) {
            console.error('[ExportExcel] Erro:', err);
            toast.error('Erro ao gerar planilha Excel: ' + (err.message || 'Tente novamente'));
        } finally {
            setIsExporting(false);
        }
    };

    // Exportação CSV com BOM UTF-8
    const handleExportCSV = () => {
        if (!data || data.length === 0) {
            toast.error('Não há dados disponíveis no período para exportar.');
            return;
        }

        const rows = [
            ['Profissional', 'Especialidade', 'Atendimentos Concluidos', 'Faltas', 'Taxa No-Show (%)', 'Receita Bruta (R$)', 'Ticket Medio (R$)', 'Repasse a Receber (R$)'],
            ...data.map((r: any) => [
                `"${r.doctor_name.replace(/"/g, '""')}"`,
                `"${(r.specialty || '').replace(/"/g, '""')}"`,
                r.total_atendimentos,
                r.total_faltas,
                (r.taxa_noshow || 0).toFixed(1),
                (r.receita_total || 0).toFixed(2),
                (r.ticket_medio || 0).toFixed(2),
                (r.repasse_calculado || 0).toFixed(2),
            ]),
            [],
            [
                '"TOTAL GERAL"',
                '""',
                summary.total_atendimentos,
                '',
                '',
                (summary.receita_total || 0).toFixed(2),
                (summary.ticket_medio_geral || 0).toFixed(2),
                (summary.total_repasse || 0).toFixed(2)
            ]
        ];

        const csvContent = rows.map((e) => e.join(';')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `repasses_profissionais_${periodStart}_a_${periodEnd}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success('Arquivo CSV exportado com sucesso!');
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        Produção e Repasses por {profLabel.singular}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Consolidado de atendimentos, faturamento bruto e valores a receber por profissional no período.
                    </p>
                </div>
                
                {/* Ações e Exportações */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => refetch()} 
                        disabled={isFetching}
                        className="h-9 min-h-[44px] sm:min-h-[36px]"
                    >
                        <RefreshCcw className={`w-4 h-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExportCSV} 
                        disabled={isExporting || data.length === 0}
                        className="h-9 min-h-[44px] sm:min-h-[36px]"
                    >
                        <FileText className="w-4 h-4 mr-1.5" />
                        Exportar CSV
                    </Button>
                    <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleExportExcel} 
                        disabled={isExporting || data.length === 0}
                        className="h-9 min-h-[44px] sm:min-h-[36px] bg-emerald-700 hover:bg-emerald-800 text-white"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                        {isExporting ? 'Exportando...' : 'Exportar Excel'}
                    </Button>
                </div>
            </div>

            {/* Painel de Filtros e Atalhos de Período */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            Filtros de Período e Profissional
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-muted-foreground mr-1">Atalhos:</span>
                            <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleSetThisWeek}
                                className="text-xs h-7 px-2.5 min-h-[44px] sm:min-h-[28px]"
                            >
                                Esta Semana
                            </Button>
                            <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleSetThisMonth}
                                className="text-xs h-7 px-2.5 min-h-[44px] sm:min-h-[28px]"
                            >
                                Este Mês
                            </Button>
                            <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleSetLastMonth}
                                className="text-xs h-7 px-2.5 min-h-[44px] sm:min-h-[28px]"
                            >
                                Mês Anterior
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Data Inicial</label>
                            <Input 
                                type="date" 
                                value={periodStart} 
                                onChange={(e) => setPeriodStart(e.target.value)} 
                                className="h-10 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Data Final</label>
                            <Input 
                                type="date" 
                                value={periodEnd} 
                                onChange={(e) => setPeriodEnd(e.target.value)} 
                                className="h-10 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">{profLabel.singular}</label>
                            <Select value={doctorId} onValueChange={setDoctorId}>
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue placeholder={`Filtrar ${profLabel.singular.toLowerCase()}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os profissionais</SelectItem>
                                    {doctors?.map((d: any) => (
                                        <SelectItem key={d.id} value={d.id}>
                                            {d.user?.full_name || d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Button 
                                className="w-full h-10 min-h-[44px] sm:min-h-[40px]" 
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Filtrar Período
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sumário de Indicadores (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-5 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg shrink-0">
                            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atendimentos</p>
                            <h3 className="text-2xl font-bold text-foreground mt-0.5">{summary.total_atendimentos}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-5 flex items-center gap-4">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg shrink-0">
                            <DollarSign className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita Bruta</p>
                            <h3 className="text-2xl font-bold text-foreground mt-0.5">
                                {formatCurrency(summary.receita_total)}
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10">
                    <CardContent className="pt-5 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg shrink-0">
                            <Wallet className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total a Repassar</p>
                            <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {formatCurrency(summary.total_repasse || 0)}
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-5 flex items-center gap-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg shrink-0">
                            <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ticket Médio Geral</p>
                            <h3 className="text-2xl font-bold text-foreground mt-0.5">
                                {formatCurrency(summary.ticket_medio_geral)}
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Produção e Repasses Detalhada */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-base font-semibold">Tabela de Produção e Repasses</CardTitle>
                            <CardDescription className="text-xs">
                                Comparativo individual de produção, faltas e repasse calculado no período selecionado.
                            </CardDescription>
                        </div>
                        {data.length > 0 && (
                            <Badge variant="secondary" className="w-fit text-xs">
                                {data.length} {data.length === 1 ? 'profissional listado' : 'profissionais listados'}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Nenhum atendimento ou produção encontrada para o período selecionado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border border-border">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="font-semibold">{profLabel.singular}</TableHead>
                                        <TableHead className="text-center font-semibold">Atendimentos</TableHead>
                                        <TableHead className="text-center font-semibold">Faltas</TableHead>
                                        <TableHead className="text-center font-semibold">Taxa No-show</TableHead>
                                        <TableHead className="text-right font-semibold">Receita Bruta</TableHead>
                                        <TableHead className="text-right font-semibold">Ticket Médio</TableHead>
                                        <TableHead className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                                            Repasse a Receber
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((row: any) => (
                                        <TableRow key={row.doctor_id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div className="font-medium text-foreground">{row.doctor_name}</div>
                                                <div className="text-xs text-muted-foreground">{row.specialty}</div>
                                            </TableCell>
                                            <TableCell className="text-center font-medium">{row.total_atendimentos}</TableCell>
                                            <TableCell className="text-center text-rose-600 dark:text-rose-400 font-medium">
                                                {row.total_faltas}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={row.taxa_noshow > 15 ? 'destructive' : 'secondary'} className="text-xs">
                                                    {row.taxa_noshow.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(row.receita_total)}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {formatCurrency(row.ticket_medio)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                                                {formatCurrency(row.repasse_calculado)}
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

