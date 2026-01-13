// app/dashboard/(clinic)/tiss/glosas/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function GlosasPage() {
    // Buscar glosas
    const { data: glosas, isLoading } = useQuery({
        queryKey: ['tiss-glosas'],
        queryFn: async () => {
            const response = await fetch('/api/tiss/glosas');
            if (!response.ok) throw new Error('Erro ao buscar glosas');
            const result = await response.json();
            return result.data || [];
        },
    });

    // Calcular estatísticas
    const stats = glosas ? {
        total: glosas.length,
        totalValue: glosas.reduce((sum: number, g: any) => sum + g.glosa_value, 0),
        canAppeal: glosas.filter((g: any) => g.can_appeal && !g.appeal_status).length,
        byCategory: glosas.reduce((acc: any, g: any) => {
            acc[g.category] = (acc[g.category] || 0) + 1;
            return acc;
        }, {}),
    } : null;

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Análise de Glosas</h1>
                <p className="text-muted-foreground mt-1">
                    Gestão e acompanhamento de glosas nas guias TISS
                </p>
            </div>

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
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 0,
                                }).format(stats.totalValue)}
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
                    <CardDescription>Últimas glosas registradas</CardDescription>
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
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Recurso</TableHead>
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
                                            -R$ {new Intl.NumberFormat('pt-BR').format(glosa.glosa_value)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={glosa.glosa_type === 'TOTAL' ? 'destructive' : 'default'}>
                                                {glosa.glosa_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {glosa.can_appeal ? (
                                                <Badge variant="default">Possível</Badge>
                                            ) : (
                                                <Badge variant="secondary">Não</Badge>
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
        </div>
    );
}
