'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, AlertTriangle, CheckCircle, Paperclip, FileText, Upload, Landmark } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// C5: REGISTRAR PERDA DE RECURSO
// ============================================================================

interface LossAppealDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appealId: string | null;
    protocolNumber?: string;
    onSuccess: () => void;
}

export function LossAppealDialog({
    open,
    onOpenChange,
    appealId,
    protocolNumber,
    onSuccess,
}: LossAppealDialogProps) {
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!appealId) return;
        if (reason.length < 5) {
            toast.error('Informe a justificativa do encerramento por perda');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/tiss/appeals/${appealId}/loss`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loss_reason: reason }),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Perda de recurso registrada com sucesso');
                onSuccess();
                onOpenChange(false);
                setReason('');
            } else {
                toast.error(data.error || 'Erro ao registrar perda');
            }
        } catch {
            toast.error('Erro de conexão ao registrar perda');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Registrar Perda de Recurso
                    </DialogTitle>
                    <DialogDescription>
                        Esta ação encerrará o recurso {protocolNumber ? `(${protocolNumber})` : ''} e marcará os itens como perda definitiva na contabilidade.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="loss-reason">Motivo do Encerramento / Perda</Label>
                        <Textarea
                            id="loss-reason"
                            placeholder="Ex.: Prazo legal expirado sem envio / Recusa interna de continuidade"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirmar Perda Definitiva
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// C7: REGISTRAR ENVIO FORMAL DO RECURSO
// ============================================================================

interface SubmitAppealDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appealId: string | null;
    protocolNumber?: string;
    onSuccess: () => void;
}

export function SubmitAppealDialog({
    open,
    onOpenChange,
    appealId,
    protocolNumber,
    onSuccess,
}: SubmitAppealDialogProps) {
    const [protocol, setProtocol] = useState('');
    const [channel, setChannel] = useState<'PORTAL' | 'EMAIL' | 'FISICO' | 'OUTRO'>('PORTAL');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!appealId) return;
        if (!protocol.trim()) {
            toast.error('Informe o protocolo de envio da operadora');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/tiss/appeals/${appealId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submission_protocol: protocol,
                    submission_channel: channel,
                    notes,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Envio do recurso registrado com sucesso');
                onSuccess();
                onOpenChange(false);
                setProtocol('');
                setNotes('');
            } else {
                toast.error(data.error || 'Erro ao registrar envio');
            }
        } catch {
            toast.error('Erro de conexão ao registrar envio');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-primary" />
                        Registrar Envio do Recurso
                    </DialogTitle>
                    <DialogDescription>
                        Informe os dados de protocolo e canal de envio para a operadora.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="sub-protocol">Protocolo Operadora</Label>
                        <Input
                            id="sub-protocol"
                            placeholder="Ex.: PROTO-ANS-2026-98765"
                            value={protocol}
                            onChange={(e) => setProtocol(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Canal de Transmissão</Label>
                        <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o canal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PORTAL">Portal da Operadora</SelectItem>
                                <SelectItem value="EMAIL">Correio Eletrônico (E-mail)</SelectItem>
                                <SelectItem value="FISICO">Protocolo Físico / Correios</SelectItem>
                                <SelectItem value="OUTRO">Outro Canal Autorizado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sub-notes">Observações Adicionais (opcional)</Label>
                        <Textarea
                            id="sub-notes"
                            placeholder="Informações adicionais sobre o comprovante ou retorno"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirmar Envio
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// C8: REGISTRAR RESULTADO DO RECURSO (LIQUIDAÇÃO FINANCEIRA)
// ============================================================================

interface ResultAppealDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appeal: any | null;
    onSuccess: () => void;
}

export function ResultAppealDialog({
    open,
    onOpenChange,
    appeal,
    onSuccess,
}: ResultAppealDialogProps) {
    const [overallStatus, setOverallStatus] = useState<'ACCEPTED' | 'PARTIAL' | 'DENIED'>('ACCEPTED');
    const [itemsStatus, setItemsStatus] = useState<Record<string, { status: string; recoveredValue: number }>>({});
    const [justification, setJustification] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Inicializa itens com valores sugeridos quando o diálogo abre
    React.useEffect(() => {
        if (appeal?.items) {
            const initial: Record<string, { status: string; recoveredValue: number }> = {};
            appeal.items.forEach((it: any) => {
                initial[it.id] = {
                    status: 'ACCEPTED',
                    recoveredValue: Number(it.contested_value || it.original_glosa_value || 0),
                };
            });
            setItemsStatus(initial);
        }
    }, [appeal]);

    const handleItemStatusChange = (itemId: string, status: string, maxVal: number) => {
        setItemsStatus(prev => ({
            ...prev,
            [itemId]: {
                status,
                recoveredValue: status === 'DENIED' ? 0 : (prev[itemId]?.recoveredValue || maxVal),
            },
        }));
    };

    const handleItemRecoveredChange = (itemId: string, val: number) => {
        setItemsStatus(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                recoveredValue: val,
            },
        }));
    };

    const handleSubmit = async () => {
        if (!appeal?.id) return;

        const payloadItems = (appeal.items || []).map((it: any) => {
            const current = itemsStatus[it.id] || { status: 'ACCEPTED', recoveredValue: it.contested_value };
            return {
                item_id: it.id,
                status: current.status,
                recovered_value: Number(current.recoveredValue),
            };
        });

        setIsLoading(true);
        try {
            const res = await fetch(`/api/tiss/appeals/${appeal.id}/result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    overall_status: overallStatus,
                    items: payloadItems,
                    justification: justification || undefined,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Resultado do recurso e liquidação contábil registrados');
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(data.error || 'Erro ao registrar resultado');
            }
        } catch {
            toast.error('Erro de conexão ao processar resultado');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        Registrar Parecer do Recurso
                    </DialogTitle>
                    <DialogDescription>
                        Informe a decisão da operadora para liquidação financeira do repasse.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                    <div className="space-y-2">
                        <Label>Decisão Geral do Recurso</Label>
                        <Select value={overallStatus} onValueChange={(v) => setOverallStatus(v as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ACCEPTED">Acatado Integralmente</SelectItem>
                                <SelectItem value="PARTIAL">Acatado Parcialmente</SelectItem>
                                <SelectItem value="DENIED">Negado / Mantida Glosa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Detalhamento por Item Recorrido
                        </Label>
                        {(appeal?.items || []).map((it: any) => {
                            const cur = itemsStatus[it.id] || { status: 'ACCEPTED', recoveredValue: it.contested_value };
                            return (
                                <div key={it.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-foreground">
                                            Item {it.item_code || it.id.slice(0, 8)}
                                        </span>
                                        <span className="text-muted-foreground font-mono">
                                            Glosado: R$ {Number(it.original_glosa_value || it.contested_value).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-[11px] text-muted-foreground">Parecer do Item</Label>
                                            <Select
                                                value={cur.status}
                                                onValueChange={(val) => handleItemStatusChange(it.id, val, it.contested_value)}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ACCEPTED">Acatado</SelectItem>
                                                    <SelectItem value="PARTIAL">Parcial</SelectItem>
                                                    <SelectItem value="DENIED">Negado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label className="text-[11px] text-muted-foreground">Valor Recuperado (R$)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                max={it.contested_value}
                                                disabled={cur.status === 'DENIED'}
                                                value={cur.recoveredValue}
                                                onChange={(e) => handleItemRecoveredChange(it.id, parseFloat(e.target.value) || 0)}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="res-just">Parecer / Resumo da Operadora (opcional)</Label>
                        <Textarea
                            id="res-just"
                            placeholder="Informações técnicas da devolutiva..."
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Liquidar Financeiramente
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// C4: ANEXOS DO RECURSO (BUCKET PRIVADO DOCUMENTS)
// ============================================================================

interface AttachmentsAppealDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appeal: any | null;
    onSuccess: () => void;
}

export function AttachmentsAppealDialog({
    open,
    onOpenChange,
    appeal,
    onSuccess,
}: AttachmentsAppealDialogProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !appeal?.id) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('source_type', 'UPLOAD');

            const res = await fetch(`/api/tiss/appeals/${appeal.id}/attachments`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Anexo armazenado em bucket privado com sucesso');
                onSuccess();
            } else {
                toast.error(data.error || 'Erro ao enviar anexo');
            }
        } catch {
            toast.error('Erro de conexão ao carregar anexo');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-primary" />
                        Anexos e Justificativas do Recurso
                    </DialogTitle>
                    <DialogDescription>
                        Documentos comprobatórios armazenados em bucket privado seguro.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <Label htmlFor="appeal-file-upload" className="cursor-pointer text-sm font-medium text-primary hover:underline">
                            Selecionar arquivo comprobatório
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                            PDF, PNG ou JPEG até 10MB
                        </p>
                        <Input
                            id="appeal-file-upload"
                            type="file"
                            className="hidden"
                            accept=".pdf,image/png,image/jpeg"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                        {isUploading && (
                            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Enviando para bucket seguro...
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">
                            Anexos Vinculados ({appeal?.attachments?.length || 0})
                        </Label>
                        {appeal?.attachments?.length > 0 ? (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {appeal.attachments.map((att: any) => (
                                    <div key={att.id} className="flex items-center justify-between p-2 rounded border bg-muted/30 text-xs">
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="truncate">{att.file_name}</span>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {att.source_type}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">Nenhum anexo adicionado ainda.</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// FIN-01 / KPI-06: CONFIRMAR CRÉDITO BANCÁRIO DE ACATO + RETENÇÕES NA FONTE
// ============================================================================

interface ConfirmAppealPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appeal: any | null;
    onSuccess: () => void;
}

export function ConfirmAppealPaymentDialog({
    open,
    onOpenChange,
    appeal,
    onSuccess,
}: ConfirmAppealPaymentDialogProps) {
    const acceptedVal = Number(appeal?.accepted_value || appeal?.recovered_value || appeal?.total_recovered_value || 0);
    const alreadyReceived = Number(appeal?.bank_received_value || 0);
    const alreadyTax = Number(appeal?.tax_withheld_value || 0);
    const pendingBalance = Math.max(0, Number((acceptedVal - alreadyReceived - alreadyTax).toFixed(2)));

    const [bankReceivedValue, setBankReceivedValue] = useState<string>('');
    const [taxWithheldValue, setTaxWithheldValue] = useState<string>('0');
    const [bankReceivedAt, setBankReceivedAt] = useState<string>(new Date().toISOString().split('T')[0]);
    const [bankReference, setBankReference] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        if (open && appeal) {
            const acc = Number(appeal.accepted_value || appeal.recovered_value || appeal.total_recovered_value || 0);
            const rec = Number(appeal.bank_received_value || 0);
            const tax = Number(appeal.tax_withheld_value || 0);
            const pending = Math.max(0, Number((acc - rec - tax).toFixed(2)));
            setBankReceivedValue(pending > 0 ? pending.toFixed(2) : '');
            setTaxWithheldValue('0');
            setBankReceivedAt(new Date().toISOString().split('T')[0]);
            setBankReference('');
            setNotes('');
        }
    }, [open, appeal]);

    const handleSubmit = async () => {
        if (!appeal?.id) return;
        const receivedNum = parseFloat(bankReceivedValue.replace(',', '.')) || 0;
        const taxNum = parseFloat(taxWithheldValue.replace(',', '.')) || 0;

        if (receivedNum <= 0) {
            toast.error('Informe o valor líquido efetivamente creditado em conta.');
            return;
        }
        if (taxNum < 0) {
            toast.error('O valor de retenção na fonte não pode ser negativo.');
            return;
        }
        if (Number((receivedNum + taxNum).toFixed(2)) > Number((pendingBalance + 0.001).toFixed(2))) {
            toast.error(
                `A soma do crédito líquido + retenção (R$ ${(receivedNum + taxNum).toFixed(2)}) excede o saldo pendente de acato (R$ ${pendingBalance.toFixed(2)}).`
            );
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/tiss/appeals/${appeal.id}/confirm-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bank_received_value: Number(receivedNum.toFixed(2)),
                    tax_withheld_value: Number(taxNum.toFixed(2)),
                    bank_received_at: bankReceivedAt ? `${bankReceivedAt}T12:00:00.000Z` : undefined,
                    bank_reference: bankReference.trim() || undefined,
                    notes: notes.trim() || undefined,
                }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                toast.success(data.message || 'Crédito bancário confirmado com sucesso.');
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(data.error || 'Erro ao confirmar crédito bancário.');
            }
        } catch {
            toast.error('Erro de conexão ao confirmar crédito bancário.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <Landmark className="w-5 h-5 text-[#155E4B]" />
                        Confirmar Crédito Bancário do Acato
                    </DialogTitle>
                    <DialogDescription className="text-xs leading-relaxed">
                        Registre o depósito efetivo da operadora em conta bancária, separando o parecer de acato da entrada real de caixa (FIN-01 / KPI-06).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-1 text-xs">
                    <div className="grid grid-cols-3 gap-2 rounded-md border border-slate-200 bg-slate-50/70 p-3">
                        <div>
                            <span className="block text-[11px] text-slate-500">Valor Acatado</span>
                            <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                R$ {acceptedVal.toFixed(2)}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[11px] text-slate-500">Já Creditado</span>
                            <span className="font-mono font-semibold text-[#155E4B] tabular-nums">
                                R$ {alreadyReceived.toFixed(2)}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[11px] text-slate-500">Saldo Pendente</span>
                            <span className="font-mono font-semibold text-amber-700 tabular-nums">
                                R$ {pendingBalance.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-bank-received" className="text-xs font-medium">
                                Valor Líquido Creditado (R$) *
                            </Label>
                            <Input
                                id="confirm-bank-received"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={pendingBalance}
                                value={bankReceivedValue}
                                onChange={(e) => setBankReceivedValue(e.target.value)}
                                className="min-h-[44px] font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-bank-tax" className="text-xs font-medium">
                                Retenção na Fonte — ISS/IRRF/CSRF (R$)
                            </Label>
                            <Input
                                id="confirm-bank-tax"
                                type="number"
                                step="0.01"
                                min="0"
                                max={pendingBalance}
                                value={taxWithheldValue}
                                onChange={(e) => setTaxWithheldValue(e.target.value)}
                                className="min-h-[44px] font-mono text-sm"
                            />
                        </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed rounded-md border border-slate-200 bg-white px-3 py-2">
                        Campo opcional de retenção tributária descontada diretamente pela operadora na fonte. Apenas registro contábil de conciliação: não caracteriza glosa e não realiza emissão fiscal (NFS-e).
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-bank-date" className="text-xs font-medium">
                                Data do Crédito em Conta
                            </Label>
                            <Input
                                id="confirm-bank-date"
                                type="date"
                                value={bankReceivedAt}
                                onChange={(e) => setBankReceivedAt(e.target.value)}
                                className="min-h-[44px] text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-bank-ref" className="text-xs font-medium">
                                Referência / Extrato (opcional)
                            </Label>
                            <Input
                                id="confirm-bank-ref"
                                placeholder="Ex.: TED Operadora / Lote 04"
                                value={bankReference}
                                onChange={(e) => setBankReference(e.target.value)}
                                className="min-h-[44px] text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="confirm-bank-notes" className="text-xs font-medium">
                            Observações de Conciliação (opcional)
                        </Label>
                        <Textarea
                            id="confirm-bank-notes"
                            rows={2}
                            placeholder="Detalhes do demonstrativo bancário ou pagamento parcial..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="text-xs"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-[44px]"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirmar Crédito em Conta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
