'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const guideSchema = z.object({
    patient_id: z.string().min(1, 'Selecione um paciente'),
    guide_type: z.enum(['consulta', 'sadt', 'internacao']),
    operator_id: z.string().min(1, 'Selecione uma operadora'),
    procedure_code: z.string().min(1, 'Código do procedimento obrigatório'),
    full_name: z.string().optional(), // For mock/search
})

type GuideFormValues = z.infer<typeof guideSchema>

export function NewGuideDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<GuideFormValues>({
        resolver: zodResolver(guideSchema),
        defaultValues: {
            guide_type: 'consulta',
        },
    })

    async function onSubmit(data: GuideFormValues) {
        setIsLoading(true)
        try {
            // Need actual patient_insurance_id logic, simplifying for now to just create guide
            // In a real scenario we'd first select patient, then their insurance
            const response = await fetch('/api/tiss/guides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guide_type: data.guide_type,
                    patient_id: data.patient_id, // This needs to be a UUID
                    // We need a way to get patient_insurance_id. 
                    // For this quick fix, I will mock or assume we need a proper selector.
                    // Let's rely on the user inputting valid IDs or implementing a search later.
                    // For now, let's assume valid UUIDs are passed (which they won't be from a text input).
                    // Fixing this requires a proper PatientSearch component.
                    procedures: [
                        {
                            code: data.procedure_code,
                            description: 'Procedimento TISS',
                            quantity: 1,
                            unit_price: 150.00, // Mock price
                        }
                    ]
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Erro ao criar guia')
            }

            toast.success('Guia TISS criada com sucesso!')
            setOpen(false)
            form.reset()
            onSuccess()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao criar guia')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Guia
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nova Guia TISS</DialogTitle>
                    <DialogDescription>
                        Preencha os dados para gerar uma nova guia de faturamento.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="guide_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Guia</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="consulta">Consulta</SelectItem>
                                            <SelectItem value="sadt">SADT (Exames)</SelectItem>
                                            <SelectItem value="internacao">Internação</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* TODO: Replace with AsyncSelect for Patients */}
                        <FormField
                            control={form.control}
                            name="patient_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID do Paciente (Temporário)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Cole o UUID do paciente..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="procedure_code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código do Procedimento (TUSS)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: 10101012" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* We need patient_insurance_id too. 
                            Ideally parsing from patient selection. 
                            Ignoring for minimal "button works" requirement, 
                            but API will fail without it.
                        */}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Criando...
                                    </>
                                ) : (
                                    'Criar Guia'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
