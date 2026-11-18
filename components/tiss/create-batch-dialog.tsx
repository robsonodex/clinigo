'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

const createBatchSchema = z.object({
    insurance_company_id: z.string().uuid('Selecione uma operadora'),
    reference_month: z.number().min(1).max(12),
    reference_year: z.number().min(2020).max(2050),
    care_type: z.enum(['AMBULATORIAL_TERAPIAS', 'CONSULTAS_PROCEDIMENTOS']).default('AMBULATORIAL_TERAPIAS'),
    notes: z.string().max(1000).optional(),
});

type CreateBatchFormData = z.infer<typeof createBatchSchema>;

interface CreateBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateBatchDialog({ open, onOpenChange, onSuccess }: CreateBatchDialogProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);

    const form = useForm<CreateBatchFormData>({
        resolver: zodResolver(createBatchSchema),
        defaultValues: {
            reference_month: new Date().getMonth() + 1,
            reference_year: new Date().getFullYear(),
            care_type: 'AMBULATORIAL_TERAPIAS',
            notes: '',
        },
    });

    const watchedInsuranceId = form.watch('insurance_company_id');

    const { data: insurances, isLoading: isLoadingInsurances } = useQuery({
        queryKey: ['health-insurances'],
        queryFn: async () => {
            const response = await fetch('/api/health-insurances');
            if (!response.ok) throw new Error('Erro ao buscar operadoras');
            const result = await response.json();
            return result.data || [];
        },
        enabled: open,
    });

    const { data: releasedAccounts, isLoading: isLoadingAccounts } = useQuery({
        queryKey: ['tiss-released-accounts', watchedInsuranceId],
        queryFn: async () => {
            const params = new URLSearchParams({ billing_stage: 'LIBERADA' });
            if (watchedInsuranceId) params.set('health_insurance_id', watchedInsuranceId);
            const res = await fetch(`/api/tiss/accounts?${params.toString()}`);
            if (!res.ok) return [];
            const json = await res.json();
            return json.data || [];
        },
        enabled: open && step === 2 && Boolean(watchedInsuranceId),
    });

    useEffect(() => {
        if (!open) {
            setStep(1);
            setSelectedGuideIds([]);
        }
    }, [open]);

    const selectedSummary = useMemo(() => {
        const rows = (releasedAccounts || []).filter((a: any) => selectedGuideIds.includes(a.id));
        const total = rows.reduce((acc: number, r: any) => acc + Number(r.total_value || 0), 0);
        return { count: rows.length, total };
    }, [releasedAccounts, selectedGuideIds]);

    const handleNextStep = async () => {
        const valid = await form.trigger(['insurance_company_id', 'reference_month', 'reference_year', 'care_type']);
        if (!valid) return;
        setStep(2);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedGuideIds([]);
            return;
        }
        setSelectedGuideIds((releasedAccounts || []).map((a: any) => a.id));
    };

    const onSubmit = async (data: CreateBatchFormData) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/tiss/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    insurance_company_id: data.insurance_company_id,
                    reference_month: data.reference_month,
                    reference_year: data.reference_year,
                    care_type: data.care_type,
                    notes: data.notes || undefined,
                    released_guide_ids: selectedGuideIds,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                const errorMsg = typeof error.error === 'string' ? error.error : error.error?.message || error.message || 'Erro ao criar remessa';
                throw new Error(errorMsg);
            }

            const result = await response.json();
            toast.success('Remessa TISS criada com sucesso', {
                description: `Remessa ${result.data?.batch_number || ''} criada com ${selectedGuideIds.length} conta(s) vinculada(s).`,
            });

            form.reset();
            setSelectedGuideIds([]);
            setStep(1);
            onSuccess();
        } catch (error: any) {
            toast.error('Erro ao criar remessa', {
                description: error.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const months = [
        { value: 1, label: 'Janeiro' },
        { value: 2, label: 'Fevereiro' },
        { value: 3, label: 'Março' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Maio' },
        { value: 6, label: 'Junho' },
        { value: 7, label: 'Julho' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Setembro' },
        { value: 10, label: 'Outubro' },
        { value: 11, label: 'Novembro' },
        { value: 12, label: 'Dezembro' },
    ];

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nova Remessa TISS ({step === 1 ? 'Passo 1 de 2' : 'Passo 2 de 2'})</DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? 'Defina operadora, competência e tipo de atendimento para a nova remessa XML.'
                            : 'Processos: Selecionar Contas Liberadas para Faturamento para compor esta remessa.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {step === 1 ? (
                            <>
                                <FormField
                                    control={form.control}
                                    name="insurance_company_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Operadora de Saúde *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingInsurances}>
                                                <FormControl>
                                                    <SelectTrigger className="min-h-[44px]">
                                                        <SelectValue placeholder="Selecione a operadora" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {insurances?.map((insurance: any) => (
                                                        <SelectItem key={insurance.id} value={insurance.id}>
                                                            {insurance.name} {insurance.code ? `(ANS ${insurance.code})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Apenas contas liberadas desta operadora estarão disponíveis no próximo passo.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="reference_month"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Mês de Competência *</FormLabel>
                                                <Select
                                                    onValueChange={(v) => field.onChange(parseInt(v))}
                                                    value={field.value?.toString()}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="min-h-[44px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {months.map((m) => (
                                                            <SelectItem key={m.value} value={m.value.toString()}>
                                                                {m.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="reference_year"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Ano *</FormLabel>
                                                <Select
                                                    onValueChange={(v) => field.onChange(parseInt(v))}
                                                    value={field.value?.toString()}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="min-h-[44px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {years.map((y) => (
                                                            <SelectItem key={y} value={y.toString()}>
                                                                {y}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="care_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Atendimento *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="min-h-[44px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="AMBULATORIAL_TERAPIAS">Ambulatorial / Terapias</SelectItem>
                                                    <SelectItem value="CONSULTAS_PROCEDIMENTOS">Consultas / Procedimentos</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Observações da Remessa (opcional)</FormLabel>
                                            <FormControl>
                                                <Textarea rows={2} placeholder="Referência interna ou competência..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-3">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="select-all-released"
                                            checked={
                                                (releasedAccounts || []).length > 0 &&
                                                selectedGuideIds.length === (releasedAccounts || []).length
                                            }
                                            onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                                        />
                                        <label htmlFor="select-all-released" className="text-xs font-medium cursor-pointer">
                                            Selecionar Todas ({(releasedAccounts || []).length} liberadas)
                                        </label>
                                    </div>
                                    <div className="text-xs font-semibold text-emerald-700">
                                        Selecionadas: {selectedSummary.count} | Total:{' '}
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                            selectedSummary.total
                                        )}
                                    </div>
                                </div>

                                <div className="max-h-[280px] overflow-y-auto rounded-md border border-border divide-y divide-border">
                                    {isLoadingAccounts ? (
                                        <div className="p-6 text-center text-xs text-muted-foreground">
                                            Carregando contas liberadas...
                                        </div>
                                    ) : (releasedAccounts || []).length === 0 ? (
                                        <div className="p-6 text-center text-xs text-muted-foreground">
                                            Nenhuma conta no status "Liberada para Faturamento" encontrada para esta operadora. Você pode salvar a remessa em rascunho e vincular depois em Processos.
                                        </div>
                                    ) : (
                                        (releasedAccounts || []).map((acc: any) => (
                                            <label
                                                key={acc.id}
                                                className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Checkbox
                                                        checked={selectedGuideIds.includes(acc.id)}
                                                        onCheckedChange={(checked) =>
                                                            setSelectedGuideIds((prev) =>
                                                                checked
                                                                    ? Array.from(new Set([...prev, acc.id]))
                                                                    : prev.filter((x) => x !== acc.id)
                                                            )
                                                        }
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-semibold truncate">
                                                            {acc.patient_name} — Guia {acc.guide_number}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {acc.procedure_code} • {acc.execution_date}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs font-mono shrink-0">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        Number(acc.total_value || 0)
                                                    )}
                                                </Badge>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="flex-wrap gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-[44px]"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>

                            {step === 2 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-[44px] gap-1"
                                    onClick={() => setStep(1)}
                                    disabled={isSubmitting}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Voltar
                                </Button>
                            )}

                            {step === 1 ? (
                                <Button type="button" className="min-h-[44px] gap-1" onClick={handleNextStep}>
                                    Avançar
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button type="submit" className="min-h-[44px]" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Salvar Remessa
                                        </>
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
