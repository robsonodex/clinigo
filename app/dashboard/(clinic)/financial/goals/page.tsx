'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Target, TrendingUp, TrendingDown, Edit3, Download, RefreshCw, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as ExcelJS from 'exceljs';

const saveFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export default function GoalsDashboard() {
    const queryClient = useQueryClient();
    const currentDate = new Date();
    const [year, setYear] = useState<number>(currentDate.getFullYear());
    const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);

    const [isEditing, setIsEditing] = useState(false);
    const [editRevenue, setEditRevenue] = useState('');
    const [editExpenses, setEditExpenses] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const { data: goals, isLoading, refetch } = useQuery({
        queryKey: ['financial-goals', year, month],
        queryFn: async () => {
            const res = await fetch(`/api/reports/goals?year=${year}&month=${month}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        }
    });

    const mutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch('/api/reports/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
            toast.success('Metas atualizadas com sucesso!');
            setIsEditing(false);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao salvar metas');
        }
    });

    const handleEdit = () => {
        setEditRevenue(goals?.target_revenue?.toString() || '0');
        setEditExpenses(goals?.target_expenses?.toString() || '0');
        setIsEditing(true);
    };

    const handleSave = () => {
        mutation.mutate({
            year,
            month,
            target_revenue: Number(editRevenue),
            target_expenses: Number(editExpenses)
        });
    };

    const exportPDF = () => {
        if (!goals) return;
        const doc = new (jsPDF as any)();
        
        doc.setFontSize(18);
        doc.text('Relatório: Previsto vs Realizado', 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Período: ${month.toString().padStart(2, '0')}/${year}`, 14, 30);
        
        doc.autoTable({
            startY: 40,
            head: [['Categoria', 'Meta (Previsto)', 'Realizado', 'Progresso']],
            body: [
                ['Faturamento', formatCurrency(goals.target_revenue), formatCurrency(goals.actual_revenue), `${goals.target_revenue > 0 ? ((goals.actual_revenue / goals.target_revenue) * 100).toFixed(1) : 0}%`],
                ['Despesas', formatCurrency(goals.target_expenses), formatCurrency(goals.actual_expenses), `${goals.target_expenses > 0 ? ((goals.actual_expenses / goals.target_expenses) * 100).toFixed(1) : 0}%`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        });

        doc.save(`metas-${year}-${month}.pdf`);
        toast.success('PDF exportado!');
    };

    const exportExcel = async () => {
        if (!goals) return;
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Previsto vs Realizado');

            worksheet.columns = [
                { header: 'Categoria', key: 'cat', width: 20 },
                { header: 'Meta (Previsto)', key: 'target', width: 20 },
                { header: 'Realizado', key: 'actual', width: 20 },
                { header: 'Progresso (%)', key: 'prog', width: 15 }
            ];

            worksheet.addRow({
                cat: 'Faturamento',
                target: goals.target_revenue,
                actual: goals.actual_revenue,
                prog: goals.target_revenue > 0 ? (goals.actual_revenue / goals.target_revenue) * 100 : 0
            });

            worksheet.addRow({
                cat: 'Despesas',
                target: goals.target_expenses,
                actual: goals.actual_expenses,
                prog: goals.target_expenses > 0 ? (goals.actual_expenses / goals.target_expenses) * 100 : 0
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveFile(new Blob([buffer]), `metas-${year}-${month}.xlsx`);
            toast.success('Excel exportado com sucesso!');
        } catch (error) {
            toast.error('Erro ao exportar Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const calculateProgress = (actual: number, target: number) => {
        if (target <= 0) return 0;
        const perc = (actual / target) * 100;
        return perc > 100 ? 100 : perc;
    };

    return (
        <div className="space-y-6 p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projeção de Faturamento</h1>
                    <p className="text-muted-foreground mt-1">Previsto vs Realizado do Dashboard Executivo</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Select value={month.toString()} onValueChange={(val) => setMonth(Number(val))}>
                        <SelectTrigger className="w-[140px] bg-white">
                            <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <SelectItem key={i+1} value={(i+1).toString()}>
                                    {new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Select value={year.toString()} onValueChange={(val) => setYear(Number(val))}>
                        <SelectTrigger className="w-[100px] bg-white">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportExcel} disabled={isLoading || isExporting || !goals}>
                        <Download className="w-4 h-4 mr-2" />
                        Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportPDF} disabled={isLoading || !goals}>
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="h-48 animate-pulse bg-gray-50" />
                    <Card className="h-48 animate-pulse bg-gray-50" />
                </div>
            ) : goals ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card de Faturamento */}
                    <Card className="border-t-4 border-t-green-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg flex items-center text-green-700">
                                        <TrendingUp className="w-5 h-5 mr-2" />
                                        Faturamento
                                    </CardTitle>
                                    <CardDescription>Acompanhamento de Receitas</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Realizado</p>
                                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(goals.actual_revenue)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground mb-1">Meta (Previsto)</p>
                                    {isEditing ? (
                                        <Input 
                                            type="number" 
                                            value={editRevenue} 
                                            onChange={e => setEditRevenue(e.target.value)} 
                                            className="w-32 text-right"
                                        />
                                    ) : (
                                        <p className="text-xl font-semibold text-gray-600">{formatCurrency(goals.target_revenue)}</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-green-600">
                                        {goals.target_revenue > 0 ? ((goals.actual_revenue / goals.target_revenue) * 100).toFixed(1) : 0}% Atingido
                                    </span>
                                    <span className="text-muted-foreground">
                                        Faltam: {formatCurrency(Math.max(0, goals.target_revenue - goals.actual_revenue))}
                                    </span>
                                </div>
                                <Progress value={calculateProgress(goals.actual_revenue, goals.target_revenue)} className="h-3 bg-green-100" indicatorColor="bg-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card de Despesas */}
                    <Card className="border-t-4 border-t-red-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg flex items-center text-red-700">
                                        <TrendingDown className="w-5 h-5 mr-2" />
                                        Despesas
                                    </CardTitle>
                                    <CardDescription>Controle de Gastos</CardDescription>
                                </div>
                                {!isEditing ? (
                                    <Button variant="ghost" size="sm" onClick={handleEdit} className="h-8">
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        Editar Metas
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancelar</Button>
                                        <Button variant="default" size="sm" onClick={handleSave} disabled={mutation.isPending}>
                                            Salvar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Realizado</p>
                                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(goals.actual_expenses)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground mb-1">Teto (Previsto)</p>
                                    {isEditing ? (
                                        <Input 
                                            type="number" 
                                            value={editExpenses} 
                                            onChange={e => setEditExpenses(e.target.value)} 
                                            className="w-32 text-right"
                                        />
                                    ) : (
                                        <p className="text-xl font-semibold text-gray-600">{formatCurrency(goals.target_expenses)}</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-red-600">
                                        {goals.target_expenses > 0 ? ((goals.actual_expenses / goals.target_expenses) * 100).toFixed(1) : 0}% Consumido
                                    </span>
                                    <span className="text-muted-foreground">
                                        Disponível: {formatCurrency(Math.max(0, goals.target_expenses - goals.actual_expenses))}
                                    </span>
                                </div>
                                {/* Para despesas, usamos vermelho. Se passar de 100%, fica vermelho escuro (opcional) */}
                                <Progress value={calculateProgress(goals.actual_expenses, goals.target_expenses)} className="h-3 bg-red-100" indicatorColor="bg-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : null}
        </div>
    );
}
