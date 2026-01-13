// app/dashboard/(clinic)/tiss/reports/loss-analysis/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    AlertTriangle,
    Search,
    Filter,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LossReport {
    period: { start: string; end: string };
    summary: {
        billed_value: number;
        received_value: number;
        glosa_value: number;
        glosa_rate: number;
        total_guides: number;
    };
    by_insurance: Array<{
        name: string;
        billed: number;
        approved: number;
        glosa: number;
        glosa_rate: number;
        count: number;
    }>;
    top_glosas: Array<{
        procedure: string;
        code: string;
        count: number;
        total: number;
    }>;
}

export default function LossAnalysisPage() {
    const [filters, setFilters] = useState({
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        insurance_company: '',
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['tiss-loss-report', filters],
        queryFn: async () => {
            const params = new URLSearchParams({
                start_date: filters.start_date,
                end_date: filters.end_date,
            });
            if (filters.insurance_company) {
                params.append('insurance_company', filters.insurance_company);
            }

            const res = await fetch(`/api/tiss/reports/loss-analysis?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data as LossReport;
        },
    });

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Relatório de Perda Financeira</h1>
                    <p className="text-muted-foreground">
                        Análise detalhada de glosas e faturamento TISS
                    </p>
                </div>
                <Button onClick={() => refetch()} variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Data Início</Label>
                            <Input
                                type="date"
                                value={filters.start_date}
                                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Fim</Label>
                            <Input
                                type="date"
                                value={filters.end_date}
                                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Operadora</Label>
                            <Input
                                placeholder="Todas"
                                value={filters.insurance_company}
                                onChange={(e) => setFilters(prev => ({ ...prev, insurance_company: e.target.value }))}
                            />
                        </div>
                        <Button onClick={() => refetch()}>
                            <Search className="w-4 h-4 mr-2" />
                            Filtrar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            ) : data ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Faturado</CardDescription>
                            <CardTitle className="text-2xl text-blue-600">
                                {formatCurrency(data.summary.billed_value)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Recebido</CardDescription>
                            <CardTitle className="text-2xl text-green-600">
                                {formatCurrency(data.summary.received_value)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-red-200 bg-red-50">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-red-700">Perda (Glosas)</CardDescription>
                            <CardTitle className="text-2xl text-red-700">
                                {formatCurrency(data.summary.glosa_value)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Índice de Glosa</CardDescription>
                            <CardTitle className={`text-2xl ${data.summary.glosa_rate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                                {data.summary.glosa_rate.toFixed(1)}%
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Insurance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Glosa por Operadora</CardTitle>
                        <CardDescription>Operadoras com maior índice de rejeição</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10" />
                                <Skeleton className="h-10" />
                                <Skeleton className="h-10" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Operadora</TableHead>
                                        <TableHead className="text-right">Faturado</TableHead>
                                        <TableHead className="text-right">Glosa</TableHead>
                                        <TableHead className="text-right">%</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.by_insurance.map((ins, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{ins.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(ins.billed)}</TableCell>
                                            <TableCell className="text-right text-red-600">{formatCurrency(ins.glosa)}</TableCell>
                                            <TableCell className="text-right">{ins.glosa_rate.toFixed(1)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Top Glosas */}
                <Card>
                    <CardHeader>
                        <CardTitle>Maiores Motivos de Glosa</CardTitle>
                        <CardDescription>Procedimentos mais impactados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10" />
                                <Skeleton className="h-10" />
                                <Skeleton className="h-10" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Procedimento</TableHead>
                                        <TableHead className="text-right">Qtd</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.top_glosas.map((item, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">{item.procedure}</p>
                                                    <p className="text-xs text-muted-foreground">{item.code}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{item.count}</TableCell>
                                            <TableCell className="text-right text-red-600">{formatCurrency(item.total)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
