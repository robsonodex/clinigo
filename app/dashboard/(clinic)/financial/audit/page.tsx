// app/dashboard/(clinic)/financial/audit/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Search,
    Loader2,
    DollarSign,
    ShieldAlert,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Finding {
    id: string;
    finding_type: string;
    severity: string;
    entity_type: string;
    description: string;
    difference_value: number | null;
    status: string;
    created_at: string;
}

interface Summary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total_value_at_risk: number;
}

const SEVERITY_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    CRITICAL: { label: 'Crítico', color: 'bg-red-100 text-red-800', icon: <ShieldAlert className="w-3 h-3" /> },
    HIGH: { label: 'Alto', color: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="w-3 h-3" /> },
    MEDIUM: { label: 'Médio', color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="w-3 h-3" /> },
    LOW: { label: 'Baixo', color: 'bg-blue-100 text-blue-800', icon: <AlertTriangle className="w-3 h-3" /> },
};

const TYPE_LABELS: Record<string, string> = {
    MISSING_PAYMENT: 'Consulta sem lançamento financeiro',
    ORPHAN_PAYMENT: 'Lançamento sem consulta',
    VALUE_MISMATCH: 'Divergência de valor',
    CONTRACT_DIVERGENCE: 'Repasse divergente do contrato',
    MISSING_AUTHORIZATION: 'Procedimento sem autorização',
};

export default function AuditPage() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState('OPEN');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['audit-findings', status],
        queryFn: async () => {
            const res = await fetch(`/api/audit/findings?status=${status}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return { findings: json.data as Finding[], summary: json.summary as Summary };
        },
    });

    const runAuditMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/audit/findings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days_back: 7 }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        },
        onSuccess: (result) => {
            toast.success(`Auditoria concluída! ${result.findings_created} inconsistências encontradas.`);
            refetch();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const findings = data?.findings || [];
    const summary = data?.summary;

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Auditoria Financeira</h1>
                    <p className="text-muted-foreground">
                        Inconsistências e divergências detectadas automaticamente
                    </p>
                </div>
                <Button onClick={() => runAuditMutation.mutate()} disabled={runAuditMutation.isPending}>
                    {runAuditMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 mr-2" />
                    )}
                    Executar Auditoria
                </Button>
            </div>

            {/* Summary Cards */}
            {!isLoading && summary && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total</CardDescription>
                            <CardTitle className="text-2xl">{summary.total}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-red-200 bg-red-50">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-red-700">Críticas</CardDescription>
                            <CardTitle className="text-2xl text-red-700">{summary.critical}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-orange-200 bg-orange-50">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-orange-700">Altas</CardDescription>
                            <CardTitle className="text-2xl text-orange-700">{summary.high}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Médias</CardDescription>
                            <CardTitle className="text-2xl">{summary.medium}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Baixas</CardDescription>
                            <CardTitle className="text-2xl">{summary.low}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-yellow-800">Valor em Risco</CardDescription>
                            <CardTitle className="text-lg text-yellow-800">
                                {formatCurrency(summary.total_value_at_risk)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            )}

            {/* Findings Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Inconsistências Detectadas</CardTitle>
                    <CardDescription>
                        Clique em uma inconsistência para ver detalhes e tomar ação
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : findings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                            <p>Nenhuma inconsistência encontrada</p>
                            <p className="text-sm">Clique em &quot;Executar Auditoria&quot; para verificar novamente</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Gravidade</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead className="text-right">Data</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {findings.map((finding) => {
                                    const severity = SEVERITY_MAP[finding.severity] || SEVERITY_MAP.MEDIUM;

                                    return (
                                        <TableRow key={finding.id}>
                                            <TableCell>
                                                <Badge className={severity.color}>
                                                    {severity.icon}
                                                    <span className="ml-1">{severity.label}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {TYPE_LABELS[finding.finding_type] || finding.finding_type}
                                            </TableCell>
                                            <TableCell className="max-w-md truncate">
                                                {finding.description}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {finding.difference_value ? (
                                                    <span className="text-red-600">
                                                        {formatCurrency(Math.abs(finding.difference_value))}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {new Date(finding.created_at).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
