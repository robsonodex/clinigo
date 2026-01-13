//components/tiss/import-errors-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, XCircle, FileQuestion, Info } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface ImportErrorsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batchId: string;
    batchNumber: string;
}

export function ImportErrorsDialog({
    open,
    onOpenChange,
    batchId,
    batchNumber,
}: ImportErrorsDialogProps) {
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<any>(null);

    useEffect(() => {
        if (open) {
            fetchErrors();
        }
    }, [open, batchId]);

    const fetchErrors = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/tiss/batches/${batchId}/errors`);
            const data = await response.json();

            if (data.success) {
                setErrors(data.data);
            } else {
                toast.error('Erro ao carregar erros');
            }
        } catch (error) {
            toast.error('Erro ao buscar erros de importação');
        } finally {
            setLoading(false);
        }
    };

    const markAsResolved = async (errorId: string, status: 'RESOLVED' | 'IGNORED') => {
        try {
            const response = await fetch(`/api/tiss/batches/${batchId}/errors/${errorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resolution_status: status,
                    resolution_notes: status === 'IGNORED' ? 'Ignorado pelo usuário' : 'Resolvido manualmente',
                }),
            });

            if (response.ok) {
                toast.success(status === 'RESOLVED' ? 'Marcado como resolvido' : 'Ignorado');
                fetchErrors(); // Recarregar
            } else {
                toast.error('Erro ao atualizar');
            }
        } catch (error) {
            toast.error('Erro na requisição');
        }
    };

    if (loading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Erros de Importação - Lote {batchNumber}</DialogTitle>
                        <DialogDescription>Carregando...</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    if (!errors) return null;

    const { summary, errors: grouped } = errors;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Erros de Importação - Lote {batchNumber}</DialogTitle>
                    <DialogDescription>
                        {summary.total_errors === 0
                            ? '✅ Nenhum erro encontrado. Todas as guias foram processadas corretamente.'
                            : `${summary.total_errors} erro(s) encontrado(s) durante a importação.`
                        }
                    </DialogDescription>
                </DialogHeader>

                {summary.total_errors === 0 ? (
                    <Alert>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription>
                            Todas as guias do retorno foram encontradas e atualizadas com sucesso.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            <div className="border rounded-lg p-4">
                                <div className="text-sm text-muted-foreground">Guias Órfãs</div>
                                <div className="text-2xl font-bold text-orange-600">{summary.orphan_guides}</div>
                                <div className="text-xs text-muted-foreground">Não encontradas no lote</div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <div className="text-sm text-muted-foreground">Erros de Update</div>
                                <div className="text-2xl font-bold text-red-600">{summary.update_errors}</div>
                                <div className="text-xs text-muted-foreground">Falha ao atualizar</div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <div className="text-sm text-muted-foreground">Validação</div>
                                <div className="text-2xl font-bold text-yellow-600">{summary.validation_errors}</div>
                                <div className="text-xs text-muted-foreground">Dados inválidos</div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <div className="text-sm text-muted-foreground">Pendentes</div>
                                <div className="text-2xl font-bold">{summary.pending_errors}</div>
                                <div className="text-xs text-muted-foreground">Aguardando resolução</div>
                            </div>
                        </div>

                        {/* Tabs por tipo de erro */}
                        <Tabs defaultValue="orphan" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="orphan">
                                    Órfãs ({grouped.orphan_guides.length})
                                </TabsTrigger>
                                <TabsTrigger value="update">
                                    Update ({grouped.update_failures.length})
                                </TabsTrigger>
                                <TabsTrigger value="validation">
                                    Validação ({grouped.validation_errors.length})
                                </TabsTrigger>
                                <TabsTrigger value="other">
                                    Outros ({grouped.other.length})
                                </TabsTrigger>
                            </TabsList>

                            {/* Guias Órfãs */}
                            <TabsContent value="orphan">
                                <Alert className="mb-4">
                                    <FileQuestion className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Guias Órfãs:</strong> presentes no arquivo de retorno mas não encontradas neste lote.
                                        Verifique se pertencem a outro lote ou se há erro no número da guia.
                                    </AlertDescription>
                                </Alert>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Número da Guia</TableHead>
                                            <TableHead>Guia Operadora</TableHead>
                                            <TableHead>Status no Retorno</TableHead>
                                            <TableHead>Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {grouped.orphan_guides.map((err: any) => (
                                            <TableRow key={err.id}>
                                                <TableCell className="font-mono">{err.guide_number_from_xml}</TableCell>
                                                <TableCell className="font-mono">
                                                    {err.error_details?.operadora_guide_number || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        err.error_details?.status === 'APPROVED' ? 'default' :
                                                            err.error_details?.status === 'DENIED' ? 'destructive' : 'secondary'
                                                    }>
                                                        {err.error_details?.status || 'UNKNOWN'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {err.resolution_status === 'PENDING' && (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => markAsResolved(err.id, 'IGNORED')}
                                                            >
                                                                Ignorar
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {err.resolution_status !== 'PENDING' && (
                                                        <Badge variant="outline">{err.resolution_status}</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>

                            {/* Erros de Update */}
                            <TabsContent value="update">
                                <Alert className="mb-4" variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Erros de Update:</strong> falha ao atualizar guias no banco.
                                        Geralmente causado por violação de constraint ou tipo de dado inválido.
                                    </AlertDescription>
                                </Alert>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Número da Guia</TableHead>
                                            <TableHead>Erro</TableHead>
                                            <TableHead>Detalhes</TableHead>
                                            <TableHead>Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {grouped.update_failures.map((err: any) => (
                                            <TableRow key={err.id}>
                                                <TableCell className="font-mono">{err.guide_number_from_xml}</TableCell>
                                                <TableCell className="text-red-600">{err.error_code}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                                                    {err.error_message}
                                                </TableCell>
                                                <TableCell>
                                                    {err.resolution_status === 'PENDING' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => markAsResolved(err.id, 'IGNORED')}
                                                        >
                                                            Ignorar
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>

                            {/* Erros de Validação */}
                            <TabsContent value="validation">
                                <Alert className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Erros de Validação:</strong> dados do XML malformados ou ausentes.
                                    </AlertDescription>
                                </Alert>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Guia</TableHead>
                                            <TableHead>Problema</TableHead>
                                            <TableHead>Mensagem</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {grouped.validation_errors.map((err: any) => (
                                            <TableRow key={err.id}>
                                                <TableCell>{err.guide_number_from_xml}</TableCell>
                                                <TableCell>{err.error_code}</TableCell>
                                                <TableCell>{err.error_message}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>

                            {/* Outros */}
                            <TabsContent value="other">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Mensagem</TableHead>
                                            <TableHead>Data</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {grouped.other.map((err: any) => (
                                            <TableRow key={err.id}>
                                                <TableCell>{err.error_type}</TableCell>
                                                <TableCell>{err.error_message}</TableCell>
                                                <TableCell>{new Date(err.created_at).toLocaleString('pt-BR')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        </Tabs>
                    </>
                )}

                <div className="flex justify-end mt-4">
                    <Button onClick={() => onOpenChange(false)}>Fechar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
