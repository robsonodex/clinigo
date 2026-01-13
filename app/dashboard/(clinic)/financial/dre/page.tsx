// app/dashboard/(clinic)/financial/dre/page.tsx
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calculator,
    Loader2,
    FileText,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DREData {
    period: { start: string; end: string };
    revenue: {
        total: number;
        private: number;
        insurance: number;
    };
    expenses: {
        total: number;
        payroll: number;
        by_category: Record<string, number>;
    };
    result: {
        net_profit: number;
        profit_margin: number;
    };
    kpis: {
        total_appointments: number;
        average_ticket: number;
    };
}

function getMonthOptions() {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        months.push({ value, label });
    }
    return months;
}

export default function DREPage() {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [data, setData] = useState<DREData | null>(null);

    const generateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/financial/dre', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month: selectedMonth }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data as DREData;
        },
        onSuccess: (result) => {
            setData(result);
            toast.success('DRE gerado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const monthOptions = getMonthOptions();
    const isProfitable = (data?.result.net_profit || 0) > 0;

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">DRE - Demonstração de Resultados</h1>
                    <p className="text-muted-foreground">
                        Análise de receitas, despesas e resultado do período
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {monthOptions.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                        {generateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Calculator className="w-4 h-4 mr-2" />
                        )}
                        Gerar DRE
                    </Button>
                </div>
            </div>

            {generateMutation.isPending ? (
                <div className="space-y-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            ) : !data ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Selecione um mês e clique em &quot;Gerar DRE&quot;</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Result Card */}
                    <Card className={isProfitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {isProfitable ? (
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                ) : (
                                    <TrendingDown className="w-6 h-6 text-red-600" />
                                )}
                                <span className={isProfitable ? 'text-green-700' : 'text-red-700'}>
                                    Resultado do Período
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className={`text-sm ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                        Lucro/Prejuízo Líquido
                                    </p>
                                    <p className={`text-4xl font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                                        {isProfitable ? '+' : ''}{formatCurrency(data.result.net_profit)}
                                    </p>
                                </div>
                                <div>
                                    <p className={`text-sm ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                        Margem de Lucro
                                    </p>
                                    <p className={`text-4xl font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                                        {data.result.profit_margin.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Revenue & Expenses */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Revenue */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg text-green-700">Receitas</CardTitle>
                                <CardDescription>Faturamento do período</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="pb-4 border-b">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">Consultas Particulares</span>
                                        <span className="font-medium">{formatCurrency(data.revenue.private)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">Convênios</span>
                                        <span className="font-medium">{formatCurrency(data.revenue.insurance)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">Total de Receitas</span>
                                    <span className="text-2xl font-bold text-green-600">
                                        {formatCurrency(data.revenue.total)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Expenses */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg text-red-700">Despesas</CardTitle>
                                <CardDescription>Custos do período</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="pb-4 border-b">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">Repasses Médicos</span>
                                        <span className="font-medium">{formatCurrency(data.expenses.payroll)}</span>
                                    </div>
                                    {Object.entries(data.expenses.by_category).map(([cat, val]) => (
                                        <div key={cat} className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-muted-foreground">{cat}</span>
                                            <span className="font-medium">{formatCurrency(val)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">Total de Despesas</span>
                                    <span className="text-2xl font-bold text-red-600">
                                        {formatCurrency(data.expenses.total)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total de Atendimentos</CardDescription>
                                <CardTitle className="text-3xl">{data.kpis.total_appointments}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Ticket Médio</CardDescription>
                                <CardTitle className="text-3xl">{formatCurrency(data.kpis.average_ticket)}</CardTitle>
                            </CardHeader>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
