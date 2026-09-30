// components/tiss/close-batch-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface CloseBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batchId: string;
    batchNumber: string;
    onSuccess: () => void;
}

export function CloseBatchDialog({
    open,
    onOpenChange,
    batchId,
    batchNumber,
    onSuccess,
}: CloseBatchDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [preCloseData, setPreCloseData] = useState<any>(null);

    const checkPreClose = async () => {
        if (!batchId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/tiss/batches/${batchId}/pre-close`);
            const json = await res.json();
            if (res.ok && json.success) {
                setPreCloseData(json.data);
            } else {
                toast.error(json.error || 'Erro ao realizar verificação prévia do lote');
            }
        } catch {
            toast.error('Erro de conexão ao verificar lote');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open && batchId) {
            checkPreClose();
        }
    }, [open, batchId]);

    const handleConfirmClose = async () => {
        setIsClosing(true);
        try {
            const res = await fetch(`/api/tiss/batches/${batchId}/close`, {
                method: 'POST',
            });
            const json = await res.json();
            if (res.ok && json.success) {
                toast.success(`Lote ${batchNumber} fechado com sucesso.`);
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(json.error || 'Erro ao fechar lote');
            }
        } catch {
            toast.error('Erro de conexão ao fechar lote');
        } finally {
            setIsClosing(false);
        }
    };

    const canClose = preCloseData?.can_close === true;
    const impedimentos = preCloseData?.impedimentos || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        Fechar Lote {batchNumber}
                    </DialogTitle>
                    <DialogDescription>
                        A verificação prévia de integridade analisa cada guia vinculada antes de autorizar o fechamento do lote.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden space-y-4 py-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground font-medium">
                                Auditando guias e verificando impeditivos cadastrais...
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* Card de Status da Verificação */}
                            {canClose ? (
                                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                                    <AlertTitle className="font-semibold text-emerald-800">
                                        Nenhum impeditivo detectado
                                    </AlertTitle>
                                    <AlertDescription className="text-xs text-emerald-700 mt-1">
                                        Todas as {preCloseData?.total_guides} guias vinculadas possuem procedimento TUSS, carteira de beneficiário e valores válidos. O lote está apto para fechamento e cálculo de integridade.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-5 w-5" />
                                    <AlertTitle className="font-semibold">
                                        Fechamento Bloqueado: Existem {impedimentos.length} guia(s) com pendências
                                    </AlertTitle>
                                    <AlertDescription className="text-xs mt-1">
                                        Corrija as inconsistências abaixo nas respectivas guias ou desvincule-as do lote para poder prosseguir.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Resumo do Lote */}
                            <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg border border-border text-sm">
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase font-medium">Guias no Lote</span>
                                    <div className="text-lg font-bold text-foreground">
                                        {preCloseData?.total_guides ?? 0}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase font-medium">Valor Total</span>
                                    <div className="text-lg font-bold text-foreground">
                                        R$ {(preCloseData?.total_value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Impeditivos se houver */}
                            {!canClose && impedimentos.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                                        Lista de Guias com Pendências Impeditivas
                                    </div>
                                    <ScrollArea className="h-48 border border-border rounded-md p-3">
                                        <div className="space-y-3">
                                            {impedimentos.map((imp: any) => (
                                                <div key={imp.guide_id} className="p-2.5 rounded bg-muted/30 border border-border/70 text-xs">
                                                    <div className="font-semibold text-foreground flex items-center justify-between">
                                                        <span>Guia: {imp.guide_number}</span>
                                                        <span className="text-muted-foreground">{imp.patient_name}</span>
                                                    </div>
                                                    <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-destructive font-medium">
                                                        {imp.issues.map((issue: string, idx: number) => (
                                                            <li key={idx}>{issue}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isClosing}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirmClose}
                        disabled={!canClose || isLoading || isClosing}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white"
                    >
                        {isClosing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Fechando Lote...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Confirmar Fechamento
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
