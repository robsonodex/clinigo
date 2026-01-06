'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
    Activity,
    Database,
    Server,
    Wifi,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCcw,
    Zap,
    HardDrive,
    Globe,
} from 'lucide-react'

interface HealthCheck {
    service: string
    status: 'healthy' | 'degraded' | 'down'
    latency?: number
    lastCheck: string
    details?: string
}

export default function HealthPage() {
    const { toast } = useToast()
    const [isChecking, setIsChecking] = useState(false)
    const [lastRefresh, setLastRefresh] = useState(new Date())

    // Mock health checks
    const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
        {
            service: 'Supabase Database',
            status: 'healthy',
            latency: 45,
            lastCheck: new Date().toISOString(),
            details: 'PostgreSQL 15 - 100% uptime',
        },
        {
            service: 'Supabase Auth',
            status: 'healthy',
            latency: 32,
            lastCheck: new Date().toISOString(),
            details: 'JWT tokens working correctly',
        },
        {
            service: 'Mercado Pago API',
            status: 'healthy',
            latency: 120,
            lastCheck: new Date().toISOString(),
            details: 'Payment processing available',
        },
        {
            service: 'Google Calendar API',
            status: 'healthy',
            latency: 85,
            lastCheck: new Date().toISOString(),
            details: 'Calendar integration active',
        },
        {
            service: 'Email Service (Resend)',
            status: 'healthy',
            latency: 150,
            lastCheck: new Date().toISOString(),
            details: 'Email delivery working',
        },
        {
            service: 'Redis Cache',
            status: 'healthy',
            latency: 5,
            lastCheck: new Date().toISOString(),
            details: 'Cache hit rate: 94%',
        },
    ])

    const runHealthCheck = async () => {
        setIsChecking(true)
        // Simulate health check
        await new Promise((resolve) => setTimeout(resolve, 2000))
        setLastRefresh(new Date())
        setIsChecking(false)
        toast({
            title: 'Health check concluído',
            description: 'Todos os serviços estão funcionando.',
        })
    }

    const getStatusIcon = (status: HealthCheck['status']) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />
            case 'degraded':
                return <AlertTriangle className="w-5 h-5 text-amber-500" />
            case 'down':
                return <XCircle className="w-5 h-5 text-red-500" />
        }
    }

    const getStatusBadge = (status: HealthCheck['status']) => {
        switch (status) {
            case 'healthy':
                return <Badge variant="success">Saudável</Badge>
            case 'degraded':
                return <Badge variant="warning">Degradado</Badge>
            case 'down':
                return <Badge variant="destructive">Offline</Badge>
        }
    }

    const getServiceIcon = (service: string) => {
        if (service.includes('Database')) return Database
        if (service.includes('Auth')) return Server
        if (service.includes('API')) return Globe
        if (service.includes('Email')) return Wifi
        if (service.includes('Redis')) return Zap
        return HardDrive
    }

    const healthyCount = healthChecks.filter((h) => h.status === 'healthy').length
    const degradedCount = healthChecks.filter((h) => h.status === 'degraded').length
    const downCount = healthChecks.filter((h) => h.status === 'down').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Activity className="w-7 h-7" />
                        Health Check
                    </h1>
                    <p className="text-muted-foreground">
                        Status dos serviços da plataforma
                    </p>
                </div>
                <Button onClick={runHealthCheck} disabled={isChecking}>
                    <RefreshCcw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                    {isChecking ? 'Verificando...' : 'Verificar Agora'}
                </Button>
            </div>

            {/* Overall Status */}
            <Card
                className={
                    downCount > 0
                        ? 'bg-red-50 border-red-200'
                        : degradedCount > 0
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-green-50 border-green-200'
                }
            >
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                className={`p-3 rounded-full ${downCount > 0
                                        ? 'bg-red-100'
                                        : degradedCount > 0
                                            ? 'bg-amber-100'
                                            : 'bg-green-100'
                                    }`}
                            >
                                {downCount > 0 ? (
                                    <XCircle className="w-8 h-8 text-red-600" />
                                ) : degradedCount > 0 ? (
                                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                                ) : (
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                )}
                            </div>
                            <div>
                                <h2
                                    className={`text-xl font-bold ${downCount > 0
                                            ? 'text-red-900'
                                            : degradedCount > 0
                                                ? 'text-amber-900'
                                                : 'text-green-900'
                                        }`}
                                >
                                    {downCount > 0
                                        ? 'Serviços Offline'
                                        : degradedCount > 0
                                            ? 'Performance Degradada'
                                            : 'Todos os Serviços Operacionais'}
                                </h2>
                                <p
                                    className={
                                        downCount > 0
                                            ? 'text-red-700'
                                            : degradedCount > 0
                                                ? 'text-amber-700'
                                                : 'text-green-700'
                                    }
                                >
                                    {healthyCount}/{healthChecks.length} serviços saudáveis
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Última verificação
                            </p>
                            <p className="font-medium">
                                {lastRefresh.toLocaleTimeString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
                                <p className="text-sm text-muted-foreground">Saudáveis</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-600">{degradedCount}</div>
                                <p className="text-sm text-muted-foreground">Degradados</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-600">{downCount}</div>
                                <p className="text-sm text-muted-foreground">Offline</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Services List */}
            <Card>
                <CardHeader>
                    <CardTitle>Serviços</CardTitle>
                    <CardDescription>Status detalhado de cada serviço</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {healthChecks.map((check, idx) => {
                            const ServiceIcon = getServiceIcon(check.service)
                            return (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        {getStatusIcon(check.status)}
                                        <div className="p-2 bg-muted rounded-lg">
                                            <ServiceIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium">{check.service}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {check.details}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {check.latency && (
                                            <div className="text-right">
                                                <p className="text-sm font-medium">{check.latency}ms</p>
                                                <p className="text-xs text-muted-foreground">Latência</p>
                                            </div>
                                        )}
                                        {getStatusBadge(check.status)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* System Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Informações do Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Versão</p>
                            <p className="font-medium">CliniGo v1.0.0</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Ambiente</p>
                            <p className="font-medium">Production</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Framework</p>
                            <p className="font-medium">Next.js 15.1.0</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Database</p>
                            <p className="font-medium">PostgreSQL 15</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
