'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Wallet, Receipt } from 'lucide-react';
import { NotaRepasseButton } from '../financial/payroll/components/NotaRepasseButton';

export default function MeuFinanceiroPage() {
    const [year, setYear] = useState(new Date().getFullYear().toString());

    // Buscar histórico (backend força doctorId se for role DOCTOR)
    const { data: historyRes, isLoading } = useQuery({
        queryKey: ['my-payroll-history', year],
        queryFn: async () => {
            const url = `/api/payroll/history?year=${year}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        }
    });

    const history = historyRes?.data || [];
    const summary = historyRes?.summary || { total_ano: 0, maior_mes: 0, menor_mes: 0 };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
            case 'PAID': return <Badge className="bg-blue-100 text-blue-800">Pago</Badge>;
            case 'PENDING_APPROVAL': return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Para o botão de Nota de Repasse, pegamos o último dia do mês correspondente
    const getMonthDates = (monthStr: string) => {
        // monthStr is like 'YYYY-MM'
        const [y, m] = monthStr.split('-');
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        return {
            periodStart: `${monthStr}-01`,
            periodEnd: `${monthStr}-${lastDay.toString().padStart(2, '0')}`
        };
    };

    return (
        <div className="space-y-6 p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
                        <Wallet className="w-8 h-8" />
                        Meu Financeiro
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Acompanhe seus repasses, deduções e baixe suas notas de fechamento.
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            {[...Array(5)].map((_, i) => {
                                const y = (new Date().getFullYear() - i).toString();
                                return <SelectItem key={y} value={y}>{y}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Sumário Anual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Líquido ({year})</p>
                            <h3 className="text-3xl font-bold text-blue-600 mt-1">{formatCurrency(summary.total_ano)}</h3>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-full">
                            <DollarSign className="w-6 h-6 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Maior Repasse no Ano</p>
                            <h3 className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(summary.maior_mes)}</h3>
                        </div>
                        <div className="p-4 bg-green-50 rounded-full">
                            <ArrowUpRight className="w-6 h-6 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Menor Repasse no Ano</p>
                            <h3 className="text-3xl font-bold text-orange-600 mt-1">{formatCurrency(summary.menor_mes)}</h3>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-full">
                            <ArrowDownRight className="w-6 h-6 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Histórico Mensal */}
            <div className="mt-8">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Fechamentos Mensais
                </h3>
                
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed">
                        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Nenhum repasse registrado no ano de {year}.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((h: any) => {
                            const { periodStart, periodEnd } = getMonthDates(h.month);
                            return (
                                <Card key={h.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-bold text-xl">{h.month}</h4>
                                                    {getStatusBadge(h.status)}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Fechamento do período: {periodStart} a {periodEnd}
                                                </p>
                                            </div>

                                            <div className="flex-1 grid grid-cols-3 gap-4 text-center md:text-right border-y md:border-y-0 md:border-l py-4 md:py-0 md:pl-6 my-4 md:my-0">
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bruto</p>
                                                    <p className="font-semibold text-lg">{formatCurrency(h.gross_production || 0)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Deduções</p>
                                                    <p className="font-semibold text-lg text-red-500">-{formatCurrency(h.deductions || 0)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Líquido</p>
                                                    <p className="font-bold text-lg text-green-600">{formatCurrency(h.net_payroll || 0)}</p>
                                                </div>
                                            </div>

                                            <div className="flex justify-end items-center">
                                                <NotaRepasseButton 
                                                    doctorId={h.doctor_id || 'me'} 
                                                    periodStart={periodStart} 
                                                    periodEnd={periodEnd} 
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
