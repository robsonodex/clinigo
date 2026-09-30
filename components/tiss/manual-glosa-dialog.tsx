// components/tiss/manual-glosa-dialog.tsx
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
import { AlertCircle, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface ManualGlosaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    guide: {
        id: string;
        guide_number: string;
        patient_name?: string;
        procedure_code?: string;
        procedure_name?: string;
        total_value: number;
        glosa_value?: number;
    } | null;
    onSuccess: () => void;
}

const COMMON_ANS_REASONS = [
    { code: '1409', desc: 'Quantidade executada excede a quantidade autorizada' },
    { code: '1001', desc: 'Número da carteira do beneficiário inválido' },
    { code: '1302', desc: 'Procedimento não constante no rol de coberturas do plano' },
    { code: '1205', desc: 'Profissional executante não credenciado para o procedimento' },
    { code: '1701', desc: 'Cobrança em duplicidade de guia ou procedimento' },
    { code: '1802', desc: 'Falta de relatório médico ou justificativa técnica' },
    { code: 'OUTRAS', desc: 'Outras glosas administrativas ou contratuais' },
];

export function ManualGlosaDialog({
    open,
    onOpenChange,
    guide,
    onSuccess,
}: ManualGlosaDialogProps) {
    const [glosaCode, setGlosaCode] = useState('1409');
    const [glosaDescription, setGlosaDescription] = useState('Quantidade executada excede a quantidade autorizada');
    const [glosaType, setGlosaType] = useState<'ADMINISTRATIVA' | 'TECNICA' | 'LINEAR'>('ADMINISTRATIVA');
    const [glosaValue, setGlosaValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!guide) return null;

    const totalValue = Number(guide.total_value) || 0;
    const existingGlosa = Number(guide.glosa_value) || 0;
    const availableBalance = Math.max(0, totalValue - existingGlosa);

    const handleSelectAnsReason = (code: string) => {
        setGlosaCode(code);
        const found = COMMON_ANS_REASONS.find(r => r.code === code);
        if (found) {
            setGlosaDescription(found.desc);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numVal = parseFloat(glosaValue.replace(',', '.'));
        if (isNaN(numVal) || numVal <= 0) {
            toast.error('Informe um valor de glosa válido e maior que zero');
            return;
        }

        if (numVal > availableBalance) {
            toast.error(`O valor da glosa não pode exceder o saldo disponível da guia (R$ ${availableBalance.toFixed(2)})`);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/tiss/glosas/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guide_id: guide.id,
                    item_code: guide.procedure_code || '10101012',
                    item_description: guide.procedure_name || 'Procedimento',
                    glosa_code: glosaCode,
                    glosa_description: glosaDescription,
                    glosa_type: glosaType,
                    glosa_value: numVal,
                }),
            });

            const json = await res.json();
            if (res.ok && json.success) {
                toast.success(json.message || 'Glosa manual lançada com sucesso');
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(json.error || 'Erro ao lançar glosa manual');
            }
        } catch {
            toast.error('Erro de conexão ao lançar glosa manual');
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
                            <DollarSign className="h-5 w-5 text-destructive" />
                            Lançar Glosa Manual: Guia {guide.guide_number}
                        </DialogTitle>
                        <DialogDescription>
                            Registro de glosa apontada pela operadora com catálogo ANS e retenção contábil.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Resumo da Guia */}
                    <div className="bg-muted/40 p-3 rounded-lg border border-border text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Paciente:</span>
                            <span className="font-semibold text-foreground">{guide.patient_name || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Procedimento:</span>
                            <span className="font-semibold text-foreground">{guide.procedure_name || guide.procedure_code}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-border/60">
                            <span className="text-muted-foreground">Valor Apresentado:</span>
                            <span className="font-semibold">R$ {totalValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Saldo Disponível:</span>
                            <span className="font-bold text-emerald-700">R$ {availableBalance.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="space-y-1.5">
                            <Label htmlFor="glosaReasonSelect">Motivo do Catálogo ANS *</Label>
                            <Select value={glosaCode} onValueChange={handleSelectAnsReason}>
                                <SelectTrigger id="glosaReasonSelect">
                                    <SelectValue placeholder="Selecione o motivo ANS" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMMON_ANS_REASONS.map(r => (
                                        <SelectItem key={r.code} value={r.code}>
                                            {r.code} - {r.desc.slice(0, 45)}...
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="glosaDescription">Descrição do Motivo</Label>
                            <Input
                                id="glosaDescription"
                                value={glosaDescription}
                                onChange={(e) => setGlosaDescription(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="glosaType">Classificação</Label>
                                <Select
                                    value={glosaType}
                                    onValueChange={(val: any) => setGlosaType(val)}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger id="glosaType">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMINISTRATIVA">Administrativa</SelectItem>
                                        <SelectItem value="TECNICA">Técnica</SelectItem>
                                        <SelectItem value="LINEAR">Linear</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="glosaValue">Valor Glosado (R$) *</Label>
                                <Input
                                    id="glosaValue"
                                    type="number"
                                    step="0.01"
                                    max={availableBalance}
                                    placeholder="0,00"
                                    value={glosaValue}
                                    onChange={(e) => setGlosaValue(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
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
                            disabled={isSubmitting || !glosaValue}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Lançando Glosa...
                                </>
                            ) : (
                                'Confirmar Lançamento'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
