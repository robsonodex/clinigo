// components/tiss/batch-list-table.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    MoreHorizontal,
    Eye,
    FileText,
    Send,
    Trash2,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TissBatch, TissBatchStatus } from '@/types/tiss';
import { toast } from 'sonner';

// ============================================
// HELPER: BADGE DE STATUS
// ============================================

function getStatusBadge(status: TissBatchStatus) {
    const variants: Record<TissBatchStatus, { label: string; variant: any; icon: any }> = {
        DRAFT: {
            label: 'Rascunho',
            variant: 'secondary' as const,
            icon: Clock,
        },
        VALIDATING: {
            label: 'Validando',
            variant: 'default' as const,
            icon: Clock,
        },
        VALID: {
            label: 'Válido',
            variant: 'default' as const,
            icon: CheckCircle2,
        },
        INVALID: {
            label: 'Com Erros',
            variant: 'destructive' as const,
            icon: XCircle,
        },
        SENT: {
            label: 'Enviado',
            variant: 'default' as const,
            icon: Send,
        },
        PROCESSING: {
            label: 'Processando',
            variant: 'default' as const,
            icon: Clock,
        },
        APPROVED: {
            label: 'Aprovado',
            variant: 'default' as const,
            icon: CheckCircle2,
        },
        PARTIAL: {
            label: 'Aprovado Parcial',
            variant: 'default' as const,
            icon: AlertCircle,
        },
        DENIED: {
            label: 'Negado',
            variant: 'destructive' as const,
            icon: XCircle,
        },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
}

// ============================================
// PROPS
// ============================================

interface BatchListTableProps {
    batches: TissBatch[];
    isLoading: boolean;
    onRefresh: () => void;
}

// ============================================
// COMPONENTE
// ============================================

export function BatchListTable({ batches, isLoading, onRefresh }: BatchListTableProps) {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Deletar lote
    const handleDelete = async (batch: TissBatch) => {
        if (batch.status !== 'DRAFT') {
            toast.error('Apenas lotes em rascunho podem ser deletados');
            return;
        }

        if (!confirm(`Deletar lote ${batch.batch_number}? Esta ação não pode ser desfeita.`)) {
            return;
        }

        setDeletingId(batch.id);

        try {
            const response = await fetch(`/api/tiss/batches/${batch.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao deletar lote');
            }

            toast.success('Lote deletado com sucesso');
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao deletar lote');
        } finally {
            setDeletingId(null);
        }
    };

    // Ver detalhes
    const handleViewDetails = (batchId: string) => {
        router.push(`/dashboard/tiss/batches/${batchId}`);
    };

    // Loading state
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Empty state
    if (batches.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Nenhum lote encontrado</h3>
                    <p className="text-muted-foreground text-sm text-center max-w-md">
                        Crie seu primeiro lote TISS para começar o faturamento com as operadoras de saúde.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Número do Lote</TableHead>
                            <TableHead>Operadora</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead className="text-center">Guias</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batches.map((batch) => (
                            <TableRow
                                key={batch.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleViewDetails(batch.id)}
                            >
                                <TableCell className="font-medium">
                                    {batch.batch_number}
                                    {batch.protocol_number && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Protocolo: {batch.protocol_number}
                                        </div>
                                    )}
                                </TableCell>

                                <TableCell>
                                    {batch.insurance_company_name || '-'}
                                </TableCell>

                                <TableCell>
                                    {String(batch.reference_month).padStart(2, '0')}/{batch.reference_year}
                                </TableCell>

                                <TableCell className="text-center">
                                    <Badge variant="outline">
                                        {batch.total_guides}
                                    </Badge>
                                </TableCell>

                                <TableCell className="text-right font-medium">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(batch.total_value || 0)}

                                    {batch.glosa_value > 0 && (
                                        <div className="text-xs text-destructive mt-1">
                                            Glosa: R$ {new Intl.NumberFormat('pt-BR').format(batch.glosa_value)}
                                            ({batch.glosa_percentage.toFixed(1)}%)
                                        </div>
                                    )}
                                </TableCell>

                                <TableCell>
                                    {getStatusBadge(batch.status)}
                                </TableCell>

                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuSeparator />

                                            <DropdownMenuItem onClick={() => handleViewDetails(batch.id)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Ver Detalhes
                                            </DropdownMenuItem>

                                            {batch.xml_file_url && (
                                                <DropdownMenuItem onClick={() => window.open(batch.xml_file_url!, '_blank')}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Baixar XML
                                                </DropdownMenuItem>
                                            )}

                                            {batch.status === 'DRAFT' && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(batch)}
                                                        disabled={deletingId === batch.id}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {deletingId === batch.id ? 'Deletando...' : 'Deletar Lote'}
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
