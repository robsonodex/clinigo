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
    ShieldCheck,
    PenTool,
    Loader2,
    RotateCcw,
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    const [validatingId, setValidatingId] = useState<string | null>(null);
    const [signingId, setSigningId] = useState<string | null>(null);
    const [undoBatch, setUndoBatch] = useState<TissBatch | null>(null);
    const [isUndoing, setIsUndoing] = useState(false);

    // Registro de Envio do Lote
    const [submitBatch, setSubmitBatch] = useState<TissBatch | null>(null);
    const [submissionDate, setSubmissionDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [submissionChannel, setSubmissionChannel] = useState<string>('PORTAL_OPERADORA');
    const [protocolNumber, setProtocolNumber] = useState<string>('');
    const [submissionNotes, setSubmissionNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Desfazer retorno com confirmação
    const handleUndoReturn = async () => {
        if (!undoBatch) return;
        setIsUndoing(true);
        try {
            const res = await fetch(`/api/tiss/returns/${undoBatch.id}/undo`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Falha ao desfazer retorno');
            }
            toast.success(data.message || 'Retorno desfeito com sucesso');
            setUndoBatch(null);
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao desfazer retorno');
        } finally {
            setIsUndoing(false);
        }
    };

    // Registrar Envio do Lote à Operadora
    const handleRegisterSubmission = async () => {
        if (!submitBatch) return;
        if (!protocolNumber.trim()) {
            toast.error('Informe o número de protocolo ou comprovante');
            return;
        }
        setIsSubmitting(true);
        try {
            const formattedNotes = submissionNotes
                ? `${submissionNotes} [Canal: ${submissionChannel}]`
                : `[Canal: ${submissionChannel}]`;

            const res = await fetch(`/api/tiss/batches/${submitBatch.id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submission_date: submissionDate,
                    protocol_number: protocolNumber.trim(),
                    notes: formattedNotes,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Falha ao registrar envio do lote');
            }
            toast.success('Envio do lote registrado com sucesso');
            setSubmitBatch(null);
            setProtocolNumber('');
            setSubmissionNotes('');
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao registrar envio');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Validação estrutural do XML do lote
    const handleValidateXSD = async (batch: TissBatch) => {
        if (!batch.id) {
            toast.error('Lote inválido');
            return;
        }

        setValidatingId(batch.id);

        try {
            const response = await fetch('/api/tiss/validate-xsd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch_id: batch.id }),
            });

            const result = await response.json();

            if (result.valid) {
                const isOfficial = result.validation_mode === 'XSD_OFICIAL';
                toast.success(isOfficial ? 'Validação XSD oficial aprovada' : 'Validação concluída', {
                    description: isOfficial
                        ? `Validação realizada contra schema XSD oficial. Schema ${result.schemaVersion}`
                        : `Validação estrutural simplificada (não substitui a validação oficial da operadora). Schema ${result.schemaVersion}`,
                });
            } else {
                toast.error(`Pendências na estrutura: ${result.errors.length}`, {
                    description: result.errors[0]?.message || 'Verifique o XML',
                });
            }
        } catch (error: any) {
            toast.error('Erro ao validar XML do lote');
        } finally {
            setValidatingId(null);
        }
    };

    // Assinar lote digitalmente
    const handleSign = async (batch: TissBatch) => {
        // Abrir dialog para upload de certificado
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pfx,.p12';
        fileInput.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const password = prompt('Digite a senha do certificado:');
            if (!password) return;

            setSigningId(batch.id);

            try {
                // Converter arquivo para base64
                const buffer = await file.arrayBuffer();
                const base64 = btoa(
                    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                );

                const response = await fetch(`/api/tiss/batches/${batch.id}/sign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ certificate: base64, password }),
                });

                const result = await response.json();

                if (result.success) {
                    toast.success('Lote assinado com sucesso!', {
                        description: `Certificado: ${result.certificateInfo.commonName}`,
                    });
                    onRefresh();
                } else {
                    toast.error(result.error || 'Erro ao assinar', {
                        description: result.details || '',
                    });
                }
            } catch (error: any) {
                toast.error('Erro ao assinar lote');
            } finally {
                setSigningId(null);
            }
        };

        fileInput.click();
    };

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
                            <TableHead>Versão</TableHead>
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
                                            ({(batch.glosa_percentage ?? 0).toFixed(1)}%)
                                        </div>
                                    )}
                                </TableCell>

                                <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                        {batch.tiss_version_used ? (
                                            <Badge variant="secondary" className="text-xs w-fit">
                                                v{batch.tiss_version_used}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                        {batch.hash_algorithm && (
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {batch.hash_algorithm === 'LEGACY_SHA256_JSON' ? 'SHA-256' : 'MD5'}
                                            </span>
                                        )}
                                    </div>
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

                                            {/* Validação Estrutural */}
                                            <DropdownMenuItem
                                                onClick={() => handleValidateXSD(batch)}
                                                disabled={validatingId === batch.id}
                                            >
                                                {validatingId === batch.id ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                                )}
                                                {validatingId === batch.id ? 'Validando...' : 'Validação Estrutural'}
                                            </DropdownMenuItem>

                                            {/* Registrar Envio à Operadora */}
                                            {['DRAFT', 'VALID'].includes(batch.status) && (
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSubmitBatch(batch);
                                                        setSubmissionDate(new Date().toISOString().split('T')[0]);
                                                        setProtocolNumber(batch.protocol_number || '');
                                                        setSubmissionNotes('');
                                                    }}
                                                    className="text-emerald-700 dark:text-emerald-400 font-medium cursor-pointer"
                                                >
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Registrar Envio do Lote
                                                </DropdownMenuItem>
                                            )}

                                            {/* Assinatura Digital */}
                                            <DropdownMenuItem
                                                onClick={() => handleSign(batch)}
                                                disabled={signingId === batch.id || batch.status === 'SENT'}
                                            >
                                                {signingId === batch.id ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <PenTool className="mr-2 h-4 w-4" />
                                                )}
                                                {signingId === batch.id ? 'Assinando...' : 'Assinar Digitalmente'}
                                            </DropdownMenuItem>

                                            {/* Desfazer Retorno */}
                                            {['APPROVED', 'PARTIAL', 'DENIED'].includes(batch.status) && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setUndoBatch(batch)}
                                                        className="text-destructive focus:text-destructive cursor-pointer"
                                                    >
                                                        <RotateCcw className="mr-2 h-4 w-4" />
                                                        Desfazer Retorno
                                                    </DropdownMenuItem>
                                                </>
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

            {/* Modal Padrão de Confirmação para Desfazer Retorno */}
            <AlertDialog open={!!undoBatch} onOpenChange={(open) => !open && setUndoBatch(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Desfazer Conciliação de Retorno?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação estornará os lançamentos contábeis de retorno do Lote nº <strong>{undoBatch?.batch_number}</strong>, cancelará as glosas associadas e restaurará o lote e suas guias para o status <strong>Enviado</strong>.
                            <br /><br />
                            A operação só é permitida se a competência contábil não estiver fechada e não houver recursos ativos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUndoing}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUndoReturn}
                            disabled={isUndoing}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isUndoing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Desfazendo...
                                </>
                            ) : (
                                'Confirmar Desfazimento'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Registro de Envio do Lote à Operadora */}
            <Dialog open={!!submitBatch} onOpenChange={(open) => !open && setSubmitBatch(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold flex items-center gap-2">
                            <Send className="w-5 h-5 text-emerald-600" />
                            Registrar Envio do Lote à Operadora
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Informe os dados do protocolo e canal utilizados para envio do Lote nº <strong>{submitBatch?.batch_number}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Data do Envio</Label>
                            <Input
                                type="date"
                                value={submissionDate}
                                onChange={(e) => setSubmissionDate(e.target.value)}
                                className="h-10 text-xs min-h-[44px]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Canal de Envio</Label>
                            <Select
                                value={submissionChannel}
                                onValueChange={setSubmissionChannel}
                            >
                                <SelectTrigger className="h-10 text-xs min-h-[44px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PORTAL_OPERADORA">Portal Web da Operadora</SelectItem>
                                    <SelectItem value="WEBSERVICE">WebService TISS Automático</SelectItem>
                                    <SelectItem value="EMAIL">E-mail Institucional</SelectItem>
                                    <SelectItem value="CORREIO_FISICO">Correspondência Física / Malote</SelectItem>
                                    <SelectItem value="OUTRO">Outro Meio Homologado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Número de Protocolo / Recibo *</Label>
                            <Input
                                placeholder="Ex: PROT-2026-987654"
                                value={protocolNumber}
                                onChange={(e) => setProtocolNumber(e.target.value)}
                                className="h-10 text-xs font-mono min-h-[44px]"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Número gerado pelo portal ou recibo fornecido pela operadora.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Observações / Anotações</Label>
                            <Input
                                placeholder="Ex: Arquivo enviado e validado sem erros no portal"
                                value={submissionNotes}
                                onChange={(e) => setSubmissionNotes(e.target.value)}
                                className="h-10 text-xs min-h-[44px]"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setSubmitBatch(null)}
                            disabled={isSubmitting}
                            className="h-10 text-xs min-h-[44px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleRegisterSubmission}
                            disabled={isSubmitting}
                            className="h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    Registrando...
                                </>
                            ) : (
                                'Confirmar Envio'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
