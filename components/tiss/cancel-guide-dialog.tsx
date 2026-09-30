'use client';

import { useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    Ban,
    Loader2,
    Trash2,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

interface CancelGuideDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    guide: {
        id: string;
        guide_number: string;
        status: string;
        validation_status?: string;
        total_value?: number;
    } | null;
    onSuccess: () => void;
}

export function CancelGuideDialog({
    open,
    onOpenChange,
    guide,
    onSuccess,
}: CancelGuideDialogProps) {
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!guide) return null;

    const isSent = guide.status === 'SENT' || guide.status === 'APPROVED' || guide.status === 'PAID';
    const isValidated = guide.validation_status === 'VALID' || guide.status === 'VALID';
    const isDraft = !isSent && !isValidated;

    const handleConfirm = async () => {
        if (isValidated && reason.trim().length < 5) {
            toast.error('Informe uma justificativa com pelo menos 5 caracteres.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/tiss/guides/${guide.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason.trim() }),
            });

            const data = await res.json();
            if (!res.ok) {
                const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Falha ao excluir/cancelar guia';
                throw new Error(errorMsg);
            }

            toast.success(data.message || (isDraft ? 'Guia excluída com sucesso!' : 'Guia cancelada com sucesso!'));
            setReason('');
            onOpenChange(false);
            onSuccess();
        } catch (err: any) {
            toast.error(err.message || 'Erro durante a operação');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isSent ? (
                            <>
                                <Ban className="w-5 h-5 text-destructive" />
                                Operação Bloqueada
                            </>
                        ) : isValidated ? (
                            <>
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                Cancelar Guia Validada
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-5 h-5 text-destructive" />
                                Excluir Rascunho de Guia
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Guia número: <span className="font-mono font-semibold">{guide.guide_number}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-3 space-y-4">
                    {/* Caso 1: Guia já enviada à operadora */}
                    {isSent && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>Não é possível excluir ou cancelar esta guia</AlertTitle>
                            <AlertDescription className="text-xs mt-1">
                                Esta guia já foi enviada à operadora ou processada em lote de faturamento.
                                Para efetuar alterações, realize um processo formal de estorno ou recurso de glosa.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Caso 2: Guia validada (exige justificativa) */}
                    {isValidated && !isSent && (
                        <div className="space-y-3">
                            <Alert className="border-amber-200 bg-amber-50/50">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <AlertTitle className="text-amber-900 text-xs font-semibold">
                                    Atenção: Cancelamento com Justificativa Obrigatória
                                </AlertTitle>
                                <AlertDescription className="text-xs text-amber-800 mt-0.5">
                                    Esta guia foi validada com sucesso e está apta para faturamento.
                                    O cancelamento será registrado no log de auditoria com estorno automático de autorizações.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground">
                                    Motivo do Cancelamento <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                    placeholder="Descreva o motivo do cancelamento (mínimo 5 caracteres)..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="text-sm min-h-[90px]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Caso 3: Rascunho / Pendente sem validação */}
                    {isDraft && (
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p>
                                Tem certeza que deseja excluir esta guia em rascunho?
                            </p>
                            <p className="text-xs">
                                Esta ação liberará o número da guia e restaurará qualquer saldo de sessão vinculado.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Voltar
                    </Button>

                    {!isSent && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirm}
                            disabled={isLoading || (isValidated && reason.trim().length < 5)}
                            className="gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isValidated ? 'Confirmar Cancelamento' : 'Excluir Guia'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
