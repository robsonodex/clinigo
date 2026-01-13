// components/tiss/create-batch-dialog.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';

// ============================================
// SCHEMA DE VALIDAÇÃO
// ============================================

const createBatchSchema = z.object({
    insurance_company_id: z.string().min(1, 'Selecione uma operadora'),
    reference_month: z.number().min(1).max(12),
    reference_year: z.number().min(2020).max(2030),
    auto_include_appointments: z.boolean().default(false),
});

type CreateBatchFormData = z.infer<typeof createBatchSchema>;

// ============================================
// PROPS
// ============================================

interface CreateBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

// ============================================
// COMPONENTE
// ============================================

export function CreateBatchDialog({ open, onOpenChange, onSuccess }: CreateBatchDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form
    const form = useForm<CreateBatchFormData>({
        resolver: zodResolver(createBatchSchema),
        defaultValues: {
            reference_month: new Date().getMonth() + 1, // Mês atual
            reference_year: new Date().getFullYear(),
            auto_include_appointments: true,
        },
    });

    // Buscar operadoras
    const { data: insurances, isLoading: isLoadingInsurances } = useQuery({
        queryKey: ['health-insurances'],
        queryFn: async () => {
            const response = await fetch('/api/health-insurances');
            if (!response.ok) throw new Error('Erro ao buscar operadoras');

            const result = await response.json();
            return result.data || [];
        },
        enabled: open, // Só busca quando dialog está aberto
    });

    // Submit
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
                    // Se auto_include_appointments for true, backend buscará appointments COMPLETED do período
                    // TODO: Implementar lógica de busca de appointments no backend
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao criar lote');
            }

            const result = await response.json();

            toast.success('Lote TISS criado com sucesso', {
                description: `Lote ${result.data.batch_number} criado`,
            });

            form.reset();
            onSuccess();
        } catch (error: any) {
            toast.error('Erro ao criar lote', {
                description: error.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Gerar lista de meses
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

    // Gerar lista de anos (últimos 3 anos + próximo ano)
    const currentYear = new Date().getFullYear();
    const years = [
        currentYear - 2,
        currentYear - 1,
        currentYear,
        currentYear + 1,
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Criar Novo Lote TISS</DialogTitle>
                    <DialogDescription>
                        Crie um novo lote de guias para faturamento junto à operadora de saúde.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Operadora */}
                        <FormField
                            control={form.control}
                            name="insurance_company_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Operadora de Saúde *</FormLabel>
                                    <Select
                                        disabled={isLoadingInsurances}
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a operadora" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {insurances?.map((insurance: any) => (
                                                <SelectItem key={insurance.id} value={insurance.id}>
                                                    {insurance.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Operadora para a qual o lote será enviado
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Mês de Referência */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="reference_month"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mês *</FormLabel>
                                        <Select
                                            onValueChange={(value) => field.onChange(parseInt(value))}
                                            defaultValue={String(field.value)}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Mês" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {months.map((month) => (
                                                    <SelectItem key={month.value} value={String(month.value)}>
                                                        {month.label}
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
                                            onValueChange={(value) => field.onChange(parseInt(value))}
                                            defaultValue={String(field.value)}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Ano" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {years.map((year) => (
                                                    <SelectItem key={year} value={String(year)}>
                                                        {year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Auto-incluir consultas */}
                        <FormField
                            control={form.control}
                            name="auto_include_appointments"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Incluir consultas automaticamente
                                        </FormLabel>
                                        <FormDescription>
                                            Adiciona automaticamente todas as consultas completas do período selecionado
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Criando...' : 'Criar Lote'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
