// app/dashboard/(clinic)/tiss/batches/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    FileText,
    Send,
    Download,
    Upload,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GuideListTable } from '@/components/tiss/guide-list-table';
import { ValidationErrorsList } from '@/components/tiss/validation-errors-list';
import { UploadReturnDialog } from '@/components/tiss/upload-return-dialog';
import { toast } from 'sonner';

export default function BatchDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isGeneratingXML, setIsGeneratingXML] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

    // Buscar detalhes do lote
    const { data, isLoading } = useQuery({
        queryKey: ['tiss-batch', params.id],
        queryFn: async () => {
            const response = await fetch(`/api/tiss/batches/${params.id}`);
            if (!response.ok) throw new Error('Erro ao buscar lote');
            const result = await response.json();
            return result.data;
        },
    });

    const batch = data?.batch;
    const guides = data?.guides || [];
    const stats = data?.stats;
    const validationErrors = data?.validation_errors || [];

    // Validar lote
    const validateBatch = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/tiss/guides/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch_id: params.id }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            return response.json();
        },
        onSuccess: (result) => {
            if (result.data.is_valid) {
                toast.success('Lote validado com sucesso!');
            } else {
                toast.warning(`Validação concluída com ${result.data.total_errors} erro(s)`);
            }
            queryClient.invalidateQueries({ queryKey: ['tiss-batch', params.id] });
        },
        onError: (error: any) => {
            toast.error('Erro ao validar lote', { description: error.message });
        },
    });

    // Gerar XML
    const handleGenerateXML = async () => {
        setIsGeneratingXML(true);

        try {
            const response = await fetch(`/api/tiss/batches/${params.id}/generate-xml`, {
                method: 'POST',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            const result = await response.json();

            toast.success('XML gerado com sucesso!', {
                description: `${result.data.guide_count} guias incluídas`,
            });

            queryClient.invalidateQueries({ queryKey: ['tiss-batch', params.id] });
        } catch (error: any) {
            toast.error('Erro ao gerar XML', { description: error.message });
        } finally {
            setIsGeneratingXML(false);
        }
    };

    // Marcar como enviado
    const handleSubmit = async () => {
        const protocol = prompt('Digite o número do protocolo de envio (opcional):');

        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/tiss/batches/${params.id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    protocol_number: protocol || undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            toast.success('Lote marcado como enviado!');
            queryClient.invalidateQueries({ queryKey: ['tiss-batch', params.id] });
        } catch (error: any) {
            toast.error('Erro ao enviar lote', { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-12 w-64" />
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!batch) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">Lote não encontrado</h3>
            </div>
        );
    }

    const canGenerateXML = batch.status === 'DRAFT' || batch.status === 'VALID';
    const canSubmit = batch.status === 'VALID' && batch.xml_file_url;
    const canUploadReturn = batch.status === 'SENT' || batch.status === 'PROCESSING';
    const hasErrors = validationErrors.filter((e: any) => e.severity === 'ERROR').length > 0;

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Lote {batch.batch_number}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {batch.insurance_company_name} • {batch.reference_month}/{batch.reference_year}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {batch.xml_file_url && (
                        <Button variant="outline" onClick={() => window.open(batch.xml_file_url, '_blank')}>
                            <Download className="mr-2 h-4 w-4" />
                            Baixar XML
                        </Button>
                    )}

                    {canGenerateXML && (
                        <Button onClick={handleGenerateXML} disabled={isGeneratingXML || hasErrors}>
                            {isGeneratingXML ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                            ) : (
                                <><FileText className="mr-2 h-4 w-4" /> Gerar XML</>
                            )}
                        </Button>
                    )}

                    {canSubmit && (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                            ) : (
                                <><Send className="mr-2 h-4 w-4" /> Marcar como Enviado</>
                            )}
                        </Button>
                    )}

                    {canUploadReturn && (
                        <Button onClick={() => setIsUploadDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Retorno
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total de Guias</CardDescription>
                        <CardTitle className="text-3xl">{stats?.total_guides || 0}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">
                            {stats?.pending_count || 0} pendentes • {stats?.approved_count || 0} aprovadas
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Valor Total</CardDescription>
                        <CardTitle className="text-3xl">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                            }).format(stats?.total_value || 0)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.glosa_value > 0 && (
                            <div className="text-xs text-destructive">
                                Glosa: R$ {new Intl.NumberFormat('pt-BR').format(stats.glosa_value)}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Status</CardDescription>
                        <CardTitle className="text-xl">{batch.status}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => validateBatch.mutate()}
                            disabled={validateBatch.isPending}
                        >
                            {validateBatch.isPending ? 'Validando...' : 'Validar Novamente'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Erros de Validação */}
            {validationErrors.length > 0 && (
                <Alert variant={hasErrors ? 'destructive' : 'default'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                        {hasErrors ? 'Erros de Validação' : 'Avisos de Validação'}
                    </AlertTitle>
                    <AlertDescription>
                        {hasErrors
                            ? 'Corrija os erros antes de gerar o XML'
                            : 'Revise os avisos antes do envio'}
                    </AlertDescription>
                </Alert>
            )}

            {validationErrors.length > 0 && (
                <ValidationErrorsList errors={validationErrors} batchId={params.id} />
            )}

            {/* Guias */}
            <Card>
                <CardHeader>
                    <CardTitle>Guias do Lote</CardTitle>
                    <CardDescription>
                        {guides.length} guia(s) neste lote
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <GuideListTable guides={guides} batchId={params.id} />
                </CardContent>
            </Card>

            {/* Upload Return Dialog */}
            <UploadReturnDialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
                batchId={params.id}
                onSuccess={() => {
                    setIsUploadDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['tiss-batch', params.id] });
                }}
            />
        </div>
    );
}
