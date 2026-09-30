// components/tiss/link-guides-dialog.tsx
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface LinkGuidesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batchId: string;
    batchNumber: string;
    onSuccess: () => void;
}

export function LinkGuidesDialog({
    open,
    onOpenChange,
    batchId,
    batchNumber,
    onSuccess,
}: LinkGuidesDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [data, setData] = useState<any>(null);
    const [selectedEligible, setSelectedEligible] = useState<string[]>([]);
    const [selectedLinked, setSelectedLinked] = useState<string[]>([]);

    const fetchGuides = async () => {
        if (!batchId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/tiss/batches/${batchId}/guides`);
            const json = await res.json();
            if (res.ok && json.success) {
                setData(json.data);
                setSelectedEligible([]);
                setSelectedLinked([]);
            } else {
                toast.error(json.error || 'Erro ao carregar guias do lote');
            }
        } catch {
            toast.error('Erro de conexão ao carregar guias');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open && batchId) {
            fetchGuides();
        }
    }, [open, batchId]);

    const handleLink = async () => {
        if (selectedEligible.length === 0) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tiss/batches/${batchId}/guides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'link',
                    guide_ids: selectedEligible,
                }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                toast.success(json.message || 'Guias vinculadas com sucesso');
                await fetchGuides();
                onSuccess();
            } else {
                toast.error(json.error || 'Erro ao vincular guias');
            }
        } catch {
            toast.error('Erro de conexão ao vincular guias');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnlink = async () => {
        if (selectedLinked.length === 0) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tiss/batches/${batchId}/guides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'unlink',
                    guide_ids: selectedLinked,
                }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                toast.success(json.message || 'Guias desvinculadas com sucesso');
                await fetchGuides();
                onSuccess();
            } else {
                toast.error(json.error || 'Erro ao desvincular guias');
            }
        } catch {
            toast.error('Erro de conexão ao desvincular guias');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isBatchOpen = data?.summary?.is_batch_open ?? true;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-6">
                        <DialogTitle className="text-lg font-semibold">
                            Vincular Guias ao Lote {batchNumber}
                        </DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchGuides}
                            disabled={isLoading}
                            className="h-8 w-8"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <DialogDescription>
                        Gerencie a composição de guias e acompanhe o totalizador financeiro em tempo real.
                    </DialogDescription>
                </DialogHeader>

                {/* Resumo ao Vivo */}
                <div className="grid grid-cols-2 gap-4 py-2 bg-muted/40 p-4 rounded-lg border border-border">
                    <div>
                        <div className="text-xs text-muted-foreground uppercase font-medium">Guias no Lote</div>
                        <div className="text-xl font-bold text-foreground">
                            {data?.summary?.linked_count ?? 0} guias
                        </div>
                        <div className="text-sm font-semibold text-emerald-700">
                            R$ {(data?.summary?.linked_value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground uppercase font-medium">Disponíveis para Vínculo</div>
                        <div className="text-xl font-bold text-foreground">
                            {data?.summary?.eligible_count ?? 0} guias
                        </div>
                        <div className="text-sm font-semibold text-muted-foreground">
                            R$ {(data?.summary?.eligible_value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {!isBatchOpen && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-md">
                        Atenção: Este lote está fechado ou enviado. Para adicionar ou remover guias, reabra o lote antes.
                    </div>
                )}

                {/* Listas Lado a Lado */}
                <div className="grid grid-cols-2 gap-4 flex-1 min-h-[300px] overflow-hidden">
                    {/* Coluna 1: Guias no Lote */}
                    <div className="border border-border rounded-lg flex flex-col">
                        <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
                            <span className="font-medium text-sm">Guias Vinculadas ({data?.linked_guides?.length || 0})</span>
                            {isBatchOpen && selectedLinked.length > 0 && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleUnlink}
                                    disabled={isSubmitting}
                                    className="h-7 text-xs"
                                >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Remover ({selectedLinked.length})
                                </Button>
                            )}
                        </div>
                        <ScrollArea className="flex-1 p-3">
                            {isLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : data?.linked_guides?.length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                    Nenhuma guia vinculada a este lote.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data?.linked_guides?.map((guide: any) => (
                                        <div
                                            key={guide.id}
                                            className="flex items-start gap-2 p-2 rounded border border-border/60 hover:bg-muted/30"
                                        >
                                            {isBatchOpen && (
                                                <Checkbox
                                                    checked={selectedLinked.includes(guide.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedLinked([...selectedLinked, guide.id]);
                                                        } else {
                                                            setSelectedLinked(selectedLinked.filter(id => id !== guide.id));
                                                        }
                                                    }}
                                                    className="mt-1"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0 text-xs">
                                                <div className="font-semibold text-foreground truncate">{guide.guide_number}</div>
                                                <div className="text-muted-foreground truncate">{guide.patient_name}</div>
                                                <div className="text-muted-foreground truncate">{guide.procedure_name || guide.procedure_code}</div>
                                                <div className="font-medium text-emerald-700 mt-0.5">
                                                    R$ {Number(guide.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Coluna 2: Guias Elegíveis */}
                    <div className="border border-border rounded-lg flex flex-col">
                        <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
                            <span className="font-medium text-sm">Disponíveis ({data?.eligible_guides?.length || 0})</span>
                            {isBatchOpen && selectedEligible.length > 0 && (
                                <Button
                                    size="sm"
                                    onClick={handleLink}
                                    disabled={isSubmitting}
                                    className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Vincular ({selectedEligible.length})
                                </Button>
                            )}
                        </div>
                        <ScrollArea className="flex-1 p-3">
                            {isLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : data?.eligible_guides?.length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                    Nenhuma guia elegível encontrada para vinculação.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data?.eligible_guides?.map((guide: any) => (
                                        <div
                                            key={guide.id}
                                            className="flex items-start gap-2 p-2 rounded border border-border/60 hover:bg-muted/30"
                                        >
                                            {isBatchOpen && (
                                                <Checkbox
                                                    checked={selectedEligible.includes(guide.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedEligible([...selectedEligible, guide.id]);
                                                        } else {
                                                            setSelectedEligible(selectedEligible.filter(id => id !== guide.id));
                                                        }
                                                    }}
                                                    className="mt-1"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0 text-xs">
                                                <div className="font-semibold text-foreground truncate">{guide.guide_number}</div>
                                                <div className="text-muted-foreground truncate">{guide.patient_name}</div>
                                                <div className="text-muted-foreground truncate">{guide.procedure_name || guide.procedure_code}</div>
                                                <div className="font-medium text-foreground mt-0.5">
                                                    R$ {Number(guide.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
