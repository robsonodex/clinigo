// app/dashboard/(clinic)/tiss/batches/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, FileText, Calendar, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateBatchDialog } from '@/components/tiss/create-batch-dialog';
import { BatchListTable } from '@/components/tiss/batch-list-table';
import type { TissBatch, TissBatchStatus } from '@/types/tiss';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function TissBatchesPage() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Filtros
    const [statusFilter, setStatusFilter] = useState<TissBatchStatus | 'ALL'>('ALL');
    const [insuranceFilter, setInsuranceFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [periodFilter, setPeriodFilter] = useState<string>('ALL');

    // Buscar lotes
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['tiss-batches', statusFilter, insuranceFilter, searchQuery, periodFilter],
        queryFn: async () => {
            const params = new URLSearchParams();

            if (statusFilter !== 'ALL') params.append('status', statusFilter);
            if (insuranceFilter !== 'ALL') params.append('insurance_company_id', insuranceFilter);
            if (searchQuery) params.append('search', searchQuery);
            if (periodFilter !== 'ALL') {
                const [year, month] = periodFilter.split('-');
                params.append('reference_year', year);
                params.append('reference_month', month);
            }

            const response = await fetch(`/api/tiss/batches?${params.toString()}`);
            if (!response.ok) throw new Error('Erro ao buscar lotes');

            const result = await response.json();
            return result.data as TissBatch[];
        },
    });

    // Buscar operadoras para filtro
    const { data: insurances } = useQuery({
        queryKey: ['health-insurances'],
        queryFn: async () => {
            const response = await fetch('/api/health-insurances');
            if (!response.ok) throw new Error('Erro ao buscar operadoras');

            const result = await response.json();
            return result.data || [];
        },
    });

    // Calcular estatísticas
    const stats = data ? {
        total: data.length,
        draft: data.filter(b => b.status === 'DRAFT').length,
        sent: data.filter(b => b.status === 'SENT' || b.status === 'PROCESSING').length,
        approved: data.filter(b => b.status === 'APPROVED' || b.status === 'PARTIAL').length,
        denied: data.filter(b => b.status === 'DENIED').length,
        totalValue: data.reduce((sum, b) => sum + (b.total_value || 0), 0),
        approvedValue: data.reduce((sum, b) => sum + (b.approved_value || 0), 0),
    } : null;

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Lotes TISS</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerenciamento de faturamento de convênios
                    </p>
                </div>

                <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Lote
                </Button>
            </div>

            {/* Stats Cards */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-3">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : stats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Total de Lotes</CardDescription>
                            <CardTitle className="text-3xl">{stats.total}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                {stats.draft} em rascunho
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Aguardando Retorno</CardDescription>
                            <CardTitle className="text-3xl">{stats.sent}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Enviados para operadora
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Valor Total Faturado</CardDescription>
                            <CardTitle className="text-3xl">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 0,
                                }).format(stats.totalValue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                {stats.approved} lotes aprovados
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Taxa de Aprovação</CardDescription>
                            <CardTitle className="text-3xl">
                                {stats.total > 0
                                    ? Math.round((stats.approvedValue / stats.totalValue) * 100)
                                    : 0}%
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                R$ {new Intl.NumberFormat('pt-BR').format(stats.approvedValue)} recebido
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Busca */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por número ou protocolo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Status */}
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Status</SelectItem>
                                <SelectItem value="DRAFT">Rascunho</SelectItem>
                                <SelectItem value="VALID">Validado</SelectItem>
                                <SelectItem value="INVALID">Com Erros</SelectItem>
                                <SelectItem value="SENT">Enviado</SelectItem>
                                <SelectItem value="PROCESSING">Processando</SelectItem>
                                <SelectItem value="APPROVED">Aprovado</SelectItem>
                                <SelectItem value="PARTIAL">Aprovado Parcial</SelectItem>
                                <SelectItem value="DENIED">Negado</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Operadora */}
                        <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Operadora" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas as Operadoras</SelectItem>
                                {insurances?.map((ins: any) => (
                                    <SelectItem key={ins.id} value={ins.id}>
                                        {ins.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Período */}
                        <Select value={periodFilter} onValueChange={setPeriodFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Períodos</SelectItem>
                                <SelectItem value="2026-01">Janeiro/2026</SelectItem>
                                <SelectItem value="2025-12">Dezembro/2025</SelectItem>
                                <SelectItem value="2025-11">Novembro/2025</SelectItem>
                                {/* TODO: Gerar dinamicamente últimos 12 meses */}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Lotes */}
            <BatchListTable
                batches={data || []}
                isLoading={isLoading}
                onRefresh={refetch}
            />

            {/* Dialog de Criação */}
            <CreateBatchDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={() => {
                    refetch();
                    setIsCreateDialogOpen(false);
                }}
            />
        </div>
    );
}
