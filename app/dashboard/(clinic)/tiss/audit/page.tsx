'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, RefreshCw, Search, ArrowRight, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TissAuditPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [entityType, setEntityType] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['tiss-global-audit', page, pageSize, entityType],
        queryFn: async () => {
            const url = new URL('/api/tiss/audit', window.location.origin);
            url.searchParams.set('limit', String(pageSize));
            url.searchParams.set('offset', String(page * pageSize));
            if (entityType !== 'ALL') {
                url.searchParams.set('entityType', entityType);
            }
            const res = await fetch(url.toString());
            if (!res.ok) throw new Error('Erro ao buscar auditoria');
            return res.json();
        },
    });

    const entries = data?.data || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const formatActionName = (action: string) => {
        return action
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Clock className="h-6 w-6 text-primary" />
                        Trilha de Auditoria do Faturamento (F2)
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Histórico completo e imutável de operações executadas em guias, lotes, retornos e recursos.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Tipo de Entidade</label>
                            <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas as entidades" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todas as entidades</SelectItem>
                                    <SelectItem value="tiss_guide">Guias TISS</SelectItem>
                                    <SelectItem value="tiss_batch">Lotes TISS</SelectItem>
                                    <SelectItem value="tiss_glosa">Glosas</SelectItem>
                                    <SelectItem value="tiss_glosa_contest">Recursos de Glosa</SelectItem>
                                    <SelectItem value="clinic">Configurações da Clínica</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Logs */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Data e Hora</TableHead>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Ação Realizada</TableHead>
                                <TableHead>Entidade</TableHead>
                                <TableHead>Detalhes / Motivo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                    </TableRow>
                                ))
                            ) : entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm font-medium">Nenhum registro de auditoria encontrado</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry: any) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span>{entry.user_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <span className="font-medium text-foreground">
                                                {formatActionName(entry.action)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                            {entry.entity_type}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {entry.metadata?.reason && (
                                                <div className="text-foreground">
                                                    <span className="font-medium">Motivo: </span>
                                                    {entry.metadata.reason}
                                                </div>
                                            )}
                                            {entry.metadata?.previous_state && entry.metadata?.new_state && (
                                                <div className="flex items-center gap-1.5 font-mono mt-0.5">
                                                    <span>{String(entry.metadata.previous_state)}</span>
                                                    <ArrowRight className="h-3 w-3" />
                                                    <span className="font-medium text-foreground">{String(entry.metadata.new_state)}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-border">
                            <span className="text-xs text-muted-foreground">
                                Exibindo {page * pageSize + 1} a {Math.min((page + 1) * pageSize, total)} de {total} registros
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 0}
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                >
                                    Anterior
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                    Página {page + 1} de {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Próxima
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
