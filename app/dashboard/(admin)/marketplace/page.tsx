'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
    Store,
    Search,
    Plus,
    Star,
    Download,
    Settings,
    CheckCircle2,
    Tag,
    Package,
    Zap,
    Globe,
    CreditCard,
    Video,
    Calendar,
} from 'lucide-react'

interface MarketplaceApp {
    id: string
    name: string
    description: string
    category: string
    price: number
    rating: number
    installs: number
    icon: React.ComponentType<{ className?: string }>
    installed: boolean
}

const apps: MarketplaceApp[] = [
    {
        id: '1',
        name: 'WhatsApp Business API',
        description: 'Integração oficial para envio automático de mensagens',
        category: 'Comunicação',
        price: 99,
        rating: 4.8,
        installs: 1250,
        icon: Zap,
        installed: false,
    },
    {
        id: '2',
        name: 'Telemedicina Avançada',
        description: 'Recursos extras de videochamada com IA',
        category: 'Consultas',
        price: 149,
        rating: 4.6,
        installs: 890,
        icon: Video,
        installed: true,
    },
    {
        id: '3',
        name: 'Agenda Google Sync',
        description: 'Sincronização bidirecional com Google Calendar',
        category: 'Produtividade',
        price: 0,
        rating: 4.9,
        installs: 2100,
        icon: Calendar,
        installed: true,
    },
    {
        id: '4',
        name: 'Gateway de Pagamento Extra',
        description: 'Adicione Stripe, PagSeguro e outros gateways',
        category: 'Pagamentos',
        price: 79,
        rating: 4.5,
        installs: 650,
        icon: CreditCard,
        installed: false,
    },
    {
        id: '5',
        name: 'Prontuário com IA',
        description: 'Transcrição automática e sugestões de diagnóstico',
        category: 'Prontuário',
        price: 199,
        rating: 4.7,
        installs: 420,
        icon: Globe,
        installed: false,
    },
]

export default function MarketplacePage() {
    const { toast } = useToast()
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState('all')

    const filteredApps = apps.filter((app) =>
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.description.toLowerCase().includes(search.toLowerCase())
    )

    const installedApps = apps.filter((app) => app.installed)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Store className="w-7 h-7" />
                        Marketplace
                    </h1>
                    <p className="text-muted-foreground">
                        Extensões e integrações para sua plataforma
                    </p>
                </div>
                <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Publicar Extensão
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{apps.length}</div>
                        <p className="text-sm text-muted-foreground">Extensões disponíveis</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{installedApps.length}</div>
                        <p className="text-sm text-muted-foreground">Instaladas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{apps.filter((a) => a.price === 0).length}</div>
                        <p className="text-sm text-muted-foreground">Gratuitas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                            {apps.reduce((acc, a) => acc + a.installs, 0).toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Instalações totais</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar extensões..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="installed">Instaladas</TabsTrigger>
                    <TabsTrigger value="free">Gratuitas</TabsTrigger>
                    <TabsTrigger value="paid">Pagas</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredApps.map((app) => (
                            <Card key={app.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-3 bg-primary/10 rounded-lg">
                                            <app.icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold">{app.name}</h3>
                                                {app.installed && (
                                                    <Badge variant="success" className="text-xs">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Instalado
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {app.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {app.category}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                    {app.rating}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {app.installs.toLocaleString()} installs
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                        <span className="font-semibold">
                                            {app.price === 0 ? (
                                                <span className="text-green-600">Grátis</span>
                                            ) : (
                                                `R$ ${app.price}/mês`
                                            )}
                                        </span>
                                        {app.installed ? (
                                            <Button variant="outline" size="sm">
                                                <Settings className="w-4 h-4 mr-1" />
                                                Configurar
                                            </Button>
                                        ) : (
                                            <Button size="sm">
                                                <Download className="w-4 h-4 mr-1" />
                                                Instalar
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="installed" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {installedApps.map((app) => (
                            <Card key={app.id}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-3 bg-green-100 rounded-lg">
                                            <app.icon className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{app.name}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {app.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button variant="outline" size="sm" className="flex-1">
                                            <Settings className="w-4 h-4 mr-1" />
                                            Configurar
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-red-600">
                                            Desinstalar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="free" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {apps.filter((a) => a.price === 0).map((app) => (
                            <Card key={app.id}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-3 bg-primary/10 rounded-lg">
                                            <app.icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{app.name}</h3>
                                            <Badge variant="success" className="text-xs mt-1">
                                                Gratuito
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="paid" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {apps.filter((a) => a.price > 0).map((app) => (
                            <Card key={app.id}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-3 bg-primary/10 rounded-lg">
                                            <app.icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{app.name}</h3>
                                            <p className="font-medium text-primary mt-1">
                                                R$ {app.price}/mês
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
