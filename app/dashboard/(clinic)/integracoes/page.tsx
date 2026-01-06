'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
    Globe,
    Zap,
    CreditCard,
    Video,
    Calendar,
    Mail,
    MessageCircle,
    CheckCircle2,
    AlertCircle,
    Settings,
    ExternalLink,
    Link2,
    Key,
    RefreshCcw,
    ChevronRight,
} from 'lucide-react'

interface Integration {
    id: string
    name: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    category: 'payment' | 'video' | 'calendar' | 'email' | 'messaging' | 'analytics'
    status: 'connected' | 'disconnected' | 'error'
    plan: 'BASICO' | 'PROFISSIONAL' | 'ENTERPRISE'
}

const integrations: Integration[] = [
    {
        id: 'mercadopago',
        name: 'Mercado Pago',
        description: 'Pagamentos via PIX e cartão de crédito',
        icon: CreditCard,
        category: 'payment',
        status: 'connected',
        plan: 'BASICO',
    },
    {
        id: 'googlemeet',
        name: 'Google Meet',
        description: 'Videochamadas automáticas',
        icon: Video,
        category: 'video',
        status: 'connected',
        plan: 'BASICO',
    },
    {
        id: 'googlecalendar',
        name: 'Google Calendar',
        description: 'Sincronização de agenda',
        icon: Calendar,
        category: 'calendar',
        status: 'disconnected',
        plan: 'PROFISSIONAL',
    },
    {
        id: 'resend',
        name: 'Resend/SendGrid',
        description: 'Envio de emails transacionais',
        icon: Mail,
        category: 'email',
        status: 'connected',
        plan: 'BASICO',
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp Business API',
        description: 'Notificações automáticas via WhatsApp',
        icon: MessageCircle,
        category: 'messaging',
        status: 'disconnected',
        plan: 'PROFISSIONAL',
    },
    {
        id: 'posthog',
        name: 'PostHog',
        description: 'Analytics e métricas de uso',
        icon: Zap,
        category: 'analytics',
        status: 'connected',
        plan: 'BASICO',
    },
]

export default function IntegracoesPage() {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('all')

    const getStatusBadge = (status: Integration['status']) => {
        switch (status) {
            case 'connected':
                return (
                    <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Conectado
                    </Badge>
                )
            case 'disconnected':
                return (
                    <Badge variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Desconectado
                    </Badge>
                )
            case 'error':
                return (
                    <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Erro
                    </Badge>
                )
        }
    }

    const getPlanBadge = (plan: Integration['plan']) => {
        switch (plan) {
            case 'BASICO':
                return null
            case 'PROFISSIONAL':
                return (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                        PRO
                    </Badge>
                )
            case 'ENTERPRISE':
                return (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                        ENT
                    </Badge>
                )
        }
    }

    const categories = [
        { id: 'all', name: 'Todas' },
        { id: 'payment', name: 'Pagamentos' },
        { id: 'video', name: 'Videochamada' },
        { id: 'calendar', name: 'Calendário' },
        { id: 'email', name: 'Email' },
        { id: 'messaging', name: 'Mensagens' },
        { id: 'analytics', name: 'Analytics' },
    ]

    const filteredIntegrations =
        activeTab === 'all'
            ? integrations
            : integrations.filter((i) => i.category === activeTab)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Globe className="w-7 h-7" />
                    Integrações
                </h1>
                <p className="text-muted-foreground">
                    Conecte serviços externos à sua clínica
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            {integrations.filter((i) => i.status === 'connected').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Conectadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{integrations.length}</div>
                        <p className="text-sm text-muted-foreground">Disponíveis</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">
                            {integrations.filter((i) => i.status === 'disconnected').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Disponíveis para ativar</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">
                            {integrations.filter((i) => i.status === 'error').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Com erro</p>
                    </CardContent>
                </Card>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                    <Button
                        key={cat.id}
                        variant={activeTab === cat.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveTab(cat.id)}
                    >
                        {cat.name}
                    </Button>
                ))}
            </div>

            {/* Integrations Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredIntegrations.map((integration) => (
                    <Card key={integration.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <integration.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{integration.name}</h3>
                                            {getPlanBadge(integration.plan)}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {integration.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                {getStatusBadge(integration.status)}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        toast({
                                            title: 'Configurar integração',
                                            description: `Abrindo configurações de ${integration.name}`,
                                        })
                                    }
                                >
                                    <Settings className="w-4 h-4 mr-1" />
                                    Configurar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* API Section */}
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        API REST
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            Enterprise
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Integre com seus sistemas existentes via API
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Com o plano Enterprise, você tem acesso a uma API REST completa para
                        integrar o CliniGo com seus sistemas de gestão hospitalar, ERPs e outras
                        plataformas.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver Documentação
                        </Button>
                        <Button>
                            Fazer Upgrade
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Webhooks */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Link2 className="w-5 h-5" />
                        Webhooks
                    </CardTitle>
                    <CardDescription>
                        Receba notificações em tempo real sobre eventos
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                        <Label className="text-sm font-medium">URL do Webhook</Label>
                        <div className="flex gap-2 mt-2">
                            <Input placeholder="https://seu-sistema.com/webhook" />
                            <Button variant="outline">
                                Testar
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Eventos disponíveis:</Label>
                        <div className="grid gap-2 md:grid-cols-2">
                            {[
                                'appointment.created',
                                'appointment.confirmed',
                                'appointment.cancelled',
                                'payment.received',
                                'payment.refunded',
                                'patient.created',
                            ].map((event) => (
                                <div
                                    key={event}
                                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                >
                                    <code className="text-sm">{event}</code>
                                    <Switch />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button>Salvar Configurações</Button>
                </CardContent>
            </Card>
        </div>
    )
}
