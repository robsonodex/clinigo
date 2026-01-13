'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
    ChevronLeft,
    Loader2,
    Building2,
    CheckCircle2,
    MessageSquare,
    CreditCard,
    Video,
    Users,
    ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ButtonManualCharge, PaymentHistoryList } from '../components/ClinicBillingHelpers'

interface Clinic {
    id: string
    name: string
    slug: string
    email: string
    phone: string
    cnpj: string
    plan_type: string
    is_active: boolean
    addons: {
        whatsapp: boolean
        prepaid_booking: boolean
        telemedicine: boolean
        extra_doctors: number
    }
}

export default function ClinicDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const clinicId = params.clinicId as string

    const { data: clinic, isLoading, error } = useQuery<Clinic>({
        queryKey: ['admin-clinic', clinicId],
        queryFn: () => api.get(`/clinics/${clinicId}`),
    })

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Clinic>) => api.patch(`/clinics/${clinicId}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-clinic', clinicId] })
            toast.success('Clínica atualizada com sucesso')
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao atualizar clínica')
        }
    })

    const handleToggleAddon = (addon: keyof Clinic['addons'], value: boolean) => {
        if (!clinic) return
        updateMutation.mutate({
            addons: {
                ...clinic.addons,
                [addon]: value
            }
        })
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        )
    }

    if (error || !clinic) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold">Clínica não encontrada</h2>
                <Link href="/dashboard/clinicas">
                    <Button variant="link">Voltar para listagem</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/clinicas">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{clinic.name}</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        /{clinic.slug} • {clinic.email}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Badge variant={clinic.is_active ? 'success' : 'destructive'}>
                        {clinic.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">{clinic.plan_type}</Badge>
                </div>
            </div>

            <Tabs defaultValue="addons" className="w-full">
                <TabsList>
                    <TabsTrigger value="info">Informações</TabsTrigger>
                    <TabsTrigger value="addons">Add-ons & Premium</TabsTrigger>
                    <TabsTrigger value="billing">Faturamento</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados Cadastrais</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome</Label>
                                    <Input value={clinic.name} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label>CNPJ</Label>
                                    <Input value={clinic.cnpj || 'Não informado'} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={clinic.email} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input value={clinic.phone || 'Não informado'} readOnly />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="addons" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-green-500" />
                                        <CardTitle>WhatsApp Oficial</CardTitle>
                                    </div>
                                    <Switch
                                        checked={clinic.addons?.whatsapp || false}
                                        onCheckedChange={(v) => handleToggleAddon('whatsapp', v)}
                                        disabled={updateMutation.isPending}
                                    />
                                </div>
                                <CardDescription>
                                    Ativa o disparo automático de mensagens via API da Meta (Business).
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <p className="text-xs text-muted-foreground">Preço: R$ 79,00/mês + taxas por mensagem</p>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-blue-500" />
                                        <CardTitle>Pagamento Antecipado</CardTitle>
                                    </div>
                                    <Switch
                                        checked={clinic.addons?.prepaid_booking || false}
                                        onCheckedChange={(v) => handleToggleAddon('prepaid_booking', v)}
                                        disabled={updateMutation.isPending}
                                    />
                                </div>
                                <CardDescription>
                                    Obriga o pagamento via PIX ou Cartão no momento do agendamento.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <p className="text-xs text-muted-foreground">Preço: R$ 49,00/mês</p>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Video className="h-5 w-5 text-purple-500" />
                                        <CardTitle>Teleconsulta Integrada</CardTitle>
                                    </div>
                                    <Switch
                                        checked={clinic.addons?.telemedicine || false}
                                        onCheckedChange={(v) => handleToggleAddon('telemedicine', v)}
                                        disabled={updateMutation.isPending}
                                    />
                                </div>
                                <CardDescription>
                                    Libera sala de vídeo própria e ferramentas de teleatendimento.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <p className="text-xs text-muted-foreground">Preço: R$ 49,00/mês</p>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-orange-500" />
                                        <CardTitle>Médicos Adicionais</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            className="w-20"
                                            value={clinic.addons?.extra_doctors || 0}
                                            onChange={(e) => handleToggleAddon('extra_doctors', parseInt(e.target.value))}
                                            disabled={updateMutation.isPending}
                                        />
                                    </div>
                                </div>
                                <CardDescription>
                                    Aumenta o limite de profissionais ativos na clínica.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <p className="text-xs text-muted-foreground">Preço: R$ 29,00/mês por médico extra</p>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="billing" className="pt-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestão de Assinatura</CardTitle>
                            <CardDescription>Gerencie o plano e status de pagamento da clínica.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Plano Atual</Label>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-base py-1 px-3">
                                            {clinic.plan_type}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status Financeiro</Label>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={clinic.is_active ? 'success' : 'destructive'} className="text-base py-1 px-3 w-fit">
                                            {clinic.is_active ? 'EM DIA' : 'PENDENTE'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 p-4 rounded-lg border">
                                <h3 className="font-semibold mb-2">Ações Rápidas</h3>
                                <div className="flex flex-wrap gap-4">
                                    <ButtonManualCharge clinicId={clinic.id} />
                                    <Link href={`https://www.mercadopago.com.br/activities`} target="_blank">
                                        <Button variant="outline">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Ver no Mercado Pago
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico (Últimos Pagamentos)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PaymentHistoryList clinicId={clinic.id} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
