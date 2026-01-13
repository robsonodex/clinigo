'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

const legalTermSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Título obrigatório'),
    type: z.string().min(1, 'Tipo obrigatório'),
    description: z.string().optional(),
    content: z.string().optional(),
    status: z.enum(['published', 'draft']),
    is_required: z.boolean().default(false),
})

type LegalTermFormValues = z.infer<typeof legalTermSchema>

interface EditTermDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: LegalTermFormValues | null
    onSuccess: () => void
}

export function EditTermDialog({
    open,
    onOpenChange,
    initialData,
    onSuccess,
}: EditTermDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<LegalTermFormValues>({
        resolver: zodResolver(legalTermSchema),
        defaultValues: {
            title: '',
            type: 'privacy',
            description: '',
            content: '',
            status: 'draft',
            is_required: false,
        },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                id: initialData.id,
                title: initialData.title,
                type: initialData.type,
                description: initialData.description || '',
                content: initialData.content || '',
                status: initialData.status as 'published' | 'draft',
                is_required: initialData.is_required,
            })
        } else {
            form.reset({
                title: '',
                type: 'privacy',
                description: '',
                content: '',
                status: 'draft',
                is_required: false,
            })
        }
    }, [initialData, form])

    async function onSubmit(data: LegalTermFormValues) {
        setIsLoading(true)
        try {
            const response = await fetch('/api/legal/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                throw new Error('Erro ao salvar documento')
            }

            toast.success('Documento salvo com sucesso!')
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            toast.error('Erro ao salvar documento')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{initialData?.id ? 'Editar Termo' : 'Novo Termo'}</DialogTitle>
                    <DialogDescription>
                        Defina o conteúdo e status do termo legal.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Título</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Termos de Uso" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo Sistema</FormLabel>
                                        <FormControl>
                                            <Input placeholder="SLUG (ex: terms)" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição Curta</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Regras gerais da plataforma" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conteúdo do Termo</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Cole o texto legal aqui..."
                                            className="min-h-[200px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <FormField
                                control={form.control}
                                name="is_required"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between space-y-0 gap-3">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Obrigatório</FormLabel>
                                            <div className="text-sm text-muted-foreground">
                                                Paciente deve aceitar para seguir?
                                            </div>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between space-y-0 gap-3">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Publicado</FormLabel>
                                            <div className="text-sm text-muted-foreground">
                                                Visível para pacientes?
                                            </div>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value === 'published'}
                                                onCheckedChange={(checked) => field.onChange(checked ? 'published' : 'draft')}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar Documento'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
