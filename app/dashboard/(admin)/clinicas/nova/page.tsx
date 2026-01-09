'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClinicSchema, type CreateClinicData } from '@/lib/validations/clinic'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewClinicPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<CreateClinicData>({
        resolver: zodResolver(createClinicSchema),
        defaultValues: {
            name: '',
            slug: '',
            cnpj: '',
            email: '',
            phone: '',
            plan_type: 'BASIC',
            address: {},
            admin_name: '',
            admin_email: '',
            admin_password: '',
        },
    })

    async function onSubmit(data: CreateClinicData) {
        setIsLoading(true)
        try {
            await api.post('/clinics', data)
            toast.success('Clínica criada com sucesso!')
            router.push('/dashboard/clinicas')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Erro ao criar clínica')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/clinicas">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Nova Clínica</h1>
                    <p className="text-muted-foreground">Preencha os dados para criar uma nova conta.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dados da Clínica</CardTitle>
                    <CardDescription>
                        Informações básicas e configuração do plano.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome da Clínica</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Clínica Saúde Total" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Slug (URL)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="clinica-saude-total" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Usado em clinigo.com.br/<b>slug</b>
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cnpj"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CNPJ (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="00.000.000/0000-00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email de Contato</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="contato@clinica.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone</FormLabel>
                                            <FormControl>
                                                <Input placeholder="(11) 99999-9999" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="plan_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Plano Inicial</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um plano" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="BASIC">Básico</SelectItem>
                                                <SelectItem value="PRO">Profissional</SelectItem>
                                                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Define os limites iniciais de uso.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="border-t pt-4 mt-4">
                                <h3 className="font-semibold mb-4">Administrador Inicial (Opcional)</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Se preenchido, um usuário admin será criado automaticamente para esta clínica.
                                </p>
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="admin_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome do Admin</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Admin da Silva" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="admin_email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email de Login</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" placeholder="admin@clinica.com" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="admin_password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Senha Temporária</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="******" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Criar Clínica
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}

