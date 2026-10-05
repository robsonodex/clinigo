// components/tiss/manual-glosa-dialog.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { AlertCircle, Loader2, DollarSign, Search, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface GuideData {
    id: string;
    guide_number: string;
    patient_name?: string;
    procedure_code?: string;
    procedure_name?: string;
    total_value: number;
    glosa_value?: number;
    available_balance?: number;
}

interface ManualGlosaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    guide?: GuideData | null;
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
    guide: propGuide,
    onSuccess,
}: ManualGlosaDialogProps) {
    const [selectedGuide, setSelectedGuide] = useState<GuideData | null>(propGuide || null);
    const [searchTerm, setSearchTerm] = useState('');
    const [guidesList, setGuidesList] = useState<GuideData[]>([]);
    const [isLoadingGuides, setIsLoadingGuides] = useState(false);

    const [glosaCode, setGlosaCode] = useState('1409');
    const [glosaDescription, setGlosaDescription] = useState('Quantidade executada excede a quantidade autorizada');
    const [glosaType, setGlosaType] = useState<'ADMINISTRATIVA' | 'TECNICA' | 'LINEAR'>('ADMINISTRATIVA');
    const [glosaValue, setGlosaValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sincronizar prop quando fornecida
    useEffect(() => {
        if (propGuide) {
            setSelectedGuide(propGuide);
        } else if (open && !selectedGuide) {
            fetchAvailableGuides('');
        }
    }, [propGuide, open]);

    // Reset ao fechar
    useEffect(() => {
        if (!open) {
            if (!propGuide) setSelectedGuide(null);
            setGlosaValue('');
            setSearchTerm('');
        }
    }, [open, propGuide]);

    const fetchAvailableGuides = async (query = '') => {
        setIsLoadingGuides(true);
        try {
            const url = query.trim()
                ? `/api/tiss/guides/available-for-glosa?q=${encodeURIComponent(query.trim())}`
                : '/api/tiss/guides/available-for-glosa';
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                setGuidesList(json.data || []);
            }
        } catch {
            // Falha silenciosa de listagem
        } finally {
            setIsLoadingGuides(false);
        }
    };

    const activeGuide = selectedGuide || propGuide || null;
    const totalValue = Number(activeGuide?.total_value) || 0;
    const existingGlosa = Number(activeGuide?.glosa_value) || 0;
    const availableBalance = activeGuide?.available_balance !== undefined
        ? activeGuide.available_balance
        : Math.max(0, totalValue - existingGlosa);

    const handleSelectAnsReason = (code: string) => {
        setGlosaCode(code);
        const found = COMMON_ANS_REASONS.find(r => r.code === code);
        if (found) {
            setGlosaDescription(found.desc);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeGuide) {
            toast.error('Selecione uma guia para aplicar a glosa');
            return;
        }

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
                    guide_id: activeGuide.id,
                    item_code: activeGuide.procedure_code || '10101012',
                    item_description: activeGuide.procedure_name || 'Procedimento',
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-destructive" />
                            Lançar Glosa Manual (R3)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Registro de glosa apontada pela operadora com catálogo ANS e retenção contábil automática.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Seleção de Guia se não fornecida previamente */}
                    {!propGuide && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">1. Selecionar Guia para Glosar *</Label>
                            
                            {activeGuide ? (
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200">
                                    <div className="text-xs space-y-0.5">
                                        <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" />
                                            Guia nº {activeGuide.guide_number}
                                        </div>
                                        <div className="text-muted-foreground">{activeGuide.patient_name || 'Paciente não identificado'}</div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedGuide(null)}
                                        className="h-7 text-xs"
                                    >
                                        Trocar Guia
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Buscar pelo número da guia ou nome do paciente..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                fetchAvailableGuides(e.target.value);
                                            }}
                                            className="pl-8 text-xs h-9"
                                        />
                                    </div>

                                    <div className="border rounded-md max-h-40 overflow-y-auto divide-y text-xs bg-background">
                                        {isLoadingGuides ? (
                                            <div className="p-3 text-center text-muted-foreground flex items-center justify-center gap-2">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Carregando guias...
                                            </div>
                                        ) : guidesList.length === 0 ? (
                                            <div className="p-3 text-center text-muted-foreground">
                                                Nenhuma guia elegível encontrada com saldo disponível.
                                            </div>
                                        ) : (
                                            guidesList.map((g) => (
                                                <button
                                                    key={g.id}
                                                    type="button"
                                                    onClick={() => setSelectedGuide(g)}
                                                    className="w-full text-left p-2.5 hover:bg-muted/60 transition-colors flex items-center justify-between"
                                                >
                                                    <div>
                                                        <span className="font-semibold">Guia {g.guide_number}</span>
                                                        <span className="text-muted-foreground ml-2">({g.patient_name})</span>
                                                    </div>
                                                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                                                        Saldo: R$ {(g.available_balance || 0).toFixed(2)}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Resumo da Guia Selecionada */}
                    {activeGuide && (
                        <div className="bg-muted/40 p-3 rounded-lg border border-border text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Guia:</span>
                                <span className="font-semibold text-foreground">{activeGuide.guide_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Paciente:</span>
                                <span className="font-semibold text-foreground">{activeGuide.patient_name || '-'}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-border/60">
                                <span className="text-muted-foreground">Valor Apresentado:</span>
                                <span className="font-semibold">R$ {totalValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Saldo Disponível para Glosa:</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">R$ {availableBalance.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Dados da Glosa */}
                    <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                            <Label htmlFor="glosaReasonSelect" className="text-xs font-semibold">2. Motivo do Catálogo ANS *</Label>
                            <Select value={glosaCode} onValueChange={handleSelectAnsReason}>
                                <SelectTrigger id="glosaReasonSelect" className="text-xs h-9">
                                    <SelectValue placeholder="Selecione o motivo ANS" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMMON_ANS_REASONS.map(r => (
                                        <SelectItem key={r.code} value={r.code} className="text-xs">
                                            {r.code} - {r.desc.slice(0, 48)}...
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="glosaDescription" className="text-xs font-semibold">Descrição do Motivo</Label>
                            <Input
                                id="glosaDescription"
                                value={glosaDescription}
                                onChange={(e) => setGlosaDescription(e.target.value)}
                                disabled={isSubmitting}
                                className="text-xs h-9"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="glosaType" className="text-xs font-semibold">Classificação</Label>
                                <Select
                                    value={glosaType}
                                    onValueChange={(val: any) => setGlosaType(val)}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger id="glosaType" className="text-xs h-9">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMINISTRATIVA" className="text-xs">Administrativa</SelectItem>
                                        <SelectItem value="TECNICA" className="text-xs">Técnica</SelectItem>
                                        <SelectItem value="LINEAR" className="text-xs">Linear</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="glosaValue" className="text-xs font-semibold">Valor Glosado (R$) *</Label>
                                <Input
                                    id="glosaValue"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={availableBalance > 0 ? availableBalance : undefined}
                                    placeholder="0,00"
                                    value={glosaValue}
                                    onChange={(e) => setGlosaValue(e.target.value)}
                                    disabled={isSubmitting || !activeGuide}
                                    className="text-xs h-9 font-mono"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t border-border flex items-center justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="text-xs h-9"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !glosaValue || !activeGuide}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-9 min-h-[44px]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Lançando Glosa...
                                </>
                            ) : (
                                'Confirmar Lançamento (R3)'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
