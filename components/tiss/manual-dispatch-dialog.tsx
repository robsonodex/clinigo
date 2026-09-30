// components/tiss/manual-dispatch-dialog.tsx
'use client';

import { useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Send, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ManualDispatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batchId: string;
    batchNumber: string;
    onSuccess: () => void;
}

export function ManualDispatchDialog({
    open,
    onOpenChange,
    batchId,
    batchNumber,
    onSuccess,
}: ManualDispatchDialogProps) {
    const [protocolNumber, setProtocolNumber] = useState('');
    const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0]);
    const [dispatchChannel, setDispatchChannel] = useState<'PORTAL' | 'CORREIOS' | 'MENSAGEIRO' | 'EMAIL'>('PORTAL');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!protocolNumber.trim() || protocolNumber.trim().length < 3) {
            toast.error('Informe um protocolo válido com pelo menos 3 caracteres');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('protocol_number', protocolNumber.trim());
            formData.append('submission_date', submissionDate);
            formData.append('dispatch_channel', dispatchChannel);
            if (proofFile) {
                formData.append('proof_file', proofFile);
            }

            const res = await fetch(`/api/tiss/batches/${batchId}/manual-dispatch`, {
                method: 'POST',
                body: formData,
            });

            const json = await res.json();
            if (res.ok && json.success) {
                toast.success(json.message || `Envio manual do lote ${batchNumber} registrado com sucesso.`);
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(json.error || 'Erro ao registrar envio manual');
            }
        } catch {
            toast.error('Erro de conexão ao registrar envio');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                            <Send className="h-5 w-5 text-muted-foreground" />
                            Registrar Envio Manual: Lote {batchNumber}
                        </DialogTitle>
                        <DialogDescription>
                            Grave os dados formais de protocolo e comprovante de envio emitidos pela operadora.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-1 text-sm">
                        <div className="space-y-1.5">
                            <Label htmlFor="protocolNumber">Número do Protocolo / Recibo *</Label>
                            <Input
                                id="protocolNumber"
                                placeholder="Ex: 2026-PROT-987654"
                                value={protocolNumber}
                                onChange={(e) => setProtocolNumber(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="submissionDate">Data de Envio *</Label>
                                <Input
                                    id="submissionDate"
                                    type="date"
                                    value={submissionDate}
                                    onChange={(e) => setSubmissionDate(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dispatchChannel">Canal de Envio *</Label>
                                <Select
                                    value={dispatchChannel}
                                    onValueChange={(val: any) => setDispatchChannel(val)}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger id="dispatchChannel">
                                        <SelectValue placeholder="Selecione o canal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PORTAL">Portal da Operadora</SelectItem>
                                        <SelectItem value="CORREIOS">Correios / AR</SelectItem>
                                        <SelectItem value="MENSAGEIRO">Mensageiro / Portador</SelectItem>
                                        <SelectItem value="EMAIL">E-mail Corporativo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                            <Label htmlFor="proofFile">Comprovante de Envio (Privado)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="proofFile"
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.xml"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            setProofFile(e.target.files[0]);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="cursor-pointer file:cursor-pointer text-xs"
                                />
                            </div>
                            <span className="text-xs text-muted-foreground block">
                                O arquivo será armazenado com isolamento multitenant no bucket privado com link assinado curto.
                            </span>
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !protocolNumber.trim()}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Gravando Envio...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Registrar Envio
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
