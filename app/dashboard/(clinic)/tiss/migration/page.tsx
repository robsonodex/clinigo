'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Clock, History } from 'lucide-react';
import { TISS_TRANSITION_DATE } from '@/lib/types/tiss-versions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';

export default function TissMigrationDashboard() {
    const supabase = createClient();

    // Buscar dados de adoção
    const { data: adoptionData, isLoading: loadingAdoption } = useQuery({
        queryKey: ['tiss-adoption'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vw_tiss_version_adoption')
                .select('*')
                .single();

            if (error) throw error;
            return data;
        },
    });

    // Buscar histórico de migração
    const { data: migrationLogs, isLoading: loadingLogs } = useQuery({
        queryKey: ['migration-logs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('entity_type', 'TISS_MIGRATION')
                .eq('action', 'AUTO_MIGRATE_VERSION')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data;
        },
    });

    const transitionDate = new Date(TISS_TRANSITION_DATE);
    const daysUntilTransition = Math.ceil((transitionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const isPastDeadline = daysUntilTransition <= 0;

    const stats = adoptionData || {
        total_insurances: 0,
        v4_01_00_count: 0,
        v4_02_00_count: 0,
        adoption_rate: 0
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Status da Migração TISS</h1>
                    <p className="text-muted-foreground mt-1">
                        Acompanhamento da transição para versão 4.02.00
                    </p>
                </div>
            </div>

            {/* Alert Status */}
            {!isPastDeadline ? (
                <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Contagem Regressiva</AlertTitle>
                    <AlertDescription>
                        Faltam <strong>{daysUntilTransition} dias</strong> para a migração obrigatória para TISS 4.02.00 (01/12/2026).
                        A migração será executada automaticamente nesta data.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="default" className="border-green-500 bg-green-50 text-green-900">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Prazo Encerrado</AlertTitle>
                    <AlertDescription className="text-green-700">
                        A data de transição já passou. Todas as operadoras deveriam estar utilizando a versão 4.02.00.
                    </AlertDescription>
                </Alert>
            )}

            {/* Cards de Estatísticas */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total de Operadoras</CardDescription>
                        <CardTitle className="text-3xl">
                            {loadingAdoption ? <Skeleton className="h-8 w-16" /> : stats.total_insurances}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Versão 4.01.00 (Legado)</CardDescription>
                        <CardTitle className="text-3xl text-yellow-600">
                            {loadingAdoption ? <Skeleton className="h-8 w-16" /> : stats.v4_01_00_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">
                            Ainda não migradas
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Versão 4.02.00 (Nova)</CardDescription>
                        <CardTitle className="text-3xl text-green-600">
                            {loadingAdoption ? <Skeleton className="h-8 w-16" /> : stats.v4_02_00_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">
                            {loadingAdoption ? (
                                <Skeleton className="h-4 w-24" />
                            ) : (
                                `${stats.adoption_rate.toFixed(1)}% de adoção`
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Log de Execução */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Histórico de Execução Automática
                    </CardTitle>
                    <CardDescription>
                        Registros do job de migração automática
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Detalhes</TableHead>
                                <TableHead>Usuário</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingLogs ? (
                                Array(3).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    </TableRow>
                                ))
                            ) : migrationLogs?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                        Nenhuma execução registrada até o momento.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                migrationLogs?.map((log: any) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={log.action === 'AUTO_MIGRATE_ERROR' ? 'destructive' : 'default'}>
                                                {log.action === 'AUTO_MIGRATE_VERSION' ? 'SUCESSO' : 'ERRO'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-md truncate" title={JSON.stringify(log.metadata)}>
                                            {log.metadata ? (log.metadata.description || JSON.stringify(log.metadata)) : '-'}
                                        </TableCell>
                                        <TableCell>Sistema (Cron)</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
