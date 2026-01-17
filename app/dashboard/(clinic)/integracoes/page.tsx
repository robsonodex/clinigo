'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useAuth, useRole } from '@/lib/hooks/use-auth'
import { isPlanAtLeast, type PlanType, PLANS } from '@/lib/constants/plans'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import Link from 'next/link'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
    Lock,
    ArrowRight,
    Loader2,
    XCircle,
    Eye,
    EyeOff,
} from 'lucide-react'

// Integration definition with required plan
interface IntegrationConfig {
    id: string
    name: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    category: 'payment' | 'video' | 'calendar' | 'email' | 'messaging' | 'analytics'
    requiredPlan: PlanType
    settingsKey: string
    fields: { key: string; label: string; type: 'text' | 'password'; placeholder: string }[]
    docsUrl?: string
}

// Available integrations in the platform
const AVAILABLE_INTEGRATIONS: IntegrationConfig[] = [
    {
        id: 'mercadopago',
        name: 'Mercado Pago',
        description: 'Pagamentos via PIX e cartão de crédito',
        icon: CreditCard,
        category: 'payment',
        requiredPlan: 'STARTER',
        settingsKey: 'mercadopago_configured',
        fields: [
            { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'APP_USR-...' },
            { key: 'webhook_secret', label: 'Webhook Secret (opcional)', type: 'password', placeholder: 'Secret para validar webhooks' },
        ],
        docsUrl: 'https://www.mercadopago.com.br/developers/pt/docs',
    },
    {
        id: 'resend',
        name: 'Resend/SendGrid',
        description: 'Emails transacionais personalizados',
        icon: Mail,
        category: 'email',
        requiredPlan: 'BASIC',
        settingsKey: 'resend_configured',
        fields: [
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 're_...' },
        ],
        docsUrl: 'https://resend.com/docs',
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp Business API',
        description: 'Notificações automáticas via WhatsApp',
        icon: MessageCircle,
        category: 'messaging',
        requiredPlan: 'PROFESSIONAL',
        settingsKey: 'whatsapp_configured',
        fields: [
            { key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'Token do WhatsApp Business' },
            { key: 'phone_id', label: 'Phone Number ID', type: 'text', placeholder: 'ID do número' },
            { key: 'business_id', label: 'Business Account ID', type: 'text', placeholder: 'ID da conta business' },
        ],
        docsUrl: 'https://developers.facebook.com/docs/whatsapp',
    },
    {
        id: 'posthog',
        name: 'PostHog Analytics',
        description: 'Analytics e métricas de uso',
        icon: Zap,
        category: 'analytics',
        requiredPlan: 'ENTERPRISE',
        settingsKey: 'posthog_configured',
        fields: [
            { key: 'api_key', label: 'Project API Key', type: 'password', placeholder: 'phc_...' },
        ],
        docsUrl: 'https://posthog.com/docs',
    },
]

// Types
interface IntegrationSettings {
    mercadopago_configured?: boolean
    google_calendar_configured?: boolean
    smtp_configured?: boolean
    resend_configured?: boolean
    whatsapp_configured?: boolean
    posthog_configured?: boolean
    webhook_url?: string | null
    webhook_events?: string[]
}

// Hook to get clinic plan
function useClinicData() {
    const { profile } = useAuth()
    const supabase = createClient()

    const { data: clinic, isLoading } = useQuery({
        queryKey: ['clinic-integrations', profile?.clinic_id],
        queryFn: async () => {
            if (!profile?.clinic_id) return null
            const { data } = await supabase
                .from('clinics')
                .select('id, name, plan_type')
                .eq('id', profile.clinic_id)
                .single()
            return data
        },
        enabled: !!profile?.clinic_id,
    })

    return {
        clinic,
        planType: ((clinic as any)?.plan_type as PlanType) || 'STARTER',
        isLoading,
    }
}

// Hook to get integration settings
function useIntegrationSettings() {
    const { data, isLoading, refetch } = useQuery<{ settings: IntegrationSettings }>({
        queryKey: ['integration-settings'],
        queryFn: async () => {
            try {
                const response = await fetch('/api/integrations/settings')
                if (!response.ok) throw new Error('Failed to fetch')
                return response.json()
            } catch {
                return { settings: {} }
            }
        },
    })

    return { settings: data?.settings || {}, isLoading, refetch }
}

export default function IntegracoesPage() {
    const { toast } = useToast()
    const { profile } = useAuth()
    const { isSuperAdmin } = useRole()
    const { clinic, planType, isLoading: clinicLoading } = useClinicData()
    const { settings, isLoading: settingsLoading, refetch } = useIntegrationSettings()
    const queryClient = useQueryClient()

    const [activeTab, setActiveTab] = useState('all')
    const [configModalOpen, setConfigModalOpen] = useState(false)
    const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null)
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
    const [saving, setSaving] = useState(false)

    const isLoading = clinicLoading || settingsLoading

    // Check if integration is configured
    const isConfigured = (integration: IntegrationConfig): boolean => {
        return !!settings[integration.settingsKey as keyof IntegrationSettings]
    }

    // Get status for integration
    const getIntegrationStatus = (integration: IntegrationConfig): 'connected' | 'disconnected' | 'locked' => {
        const hasAccess = isPlanAtLeast(planType, integration.requiredPlan) || isSuperAdmin
        if (!hasAccess) return 'locked'
        return isConfigured(integration) ? 'connected' : 'disconnected'
    }

    // Calculate real stats from actual settings
    const integrationStats = {
        connected: AVAILABLE_INTEGRATIONS.filter(i => getIntegrationStatus(i) === 'connected').length,
        available: AVAILABLE_INTEGRATIONS.filter(i => {
            const hasAccess = isPlanAtLeast(planType, i.requiredPlan) || isSuperAdmin
            return hasAccess
        }).length,
        toActivate: AVAILABLE_INTEGRATIONS.filter(i => getIntegrationStatus(i) === 'disconnected').length,
        locked: AVAILABLE_INTEGRATIONS.filter(i => getIntegrationStatus(i) === 'locked').length,
    }

    // Handle configure button click
    const handleConfigure = (integration: IntegrationConfig) => {
        setSelectedIntegration(integration)
        setFormData({})
        setShowPasswords({})
        setConfigModalOpen(true)
    }

    // Save integration credentials
    const handleSave = async () => {
        if (!selectedIntegration) return

        setSaving(true)
        try {
            const response = await fetch('/api/integrations/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    integration_id: selectedIntegration.id,
                    credentials: formData,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao salvar')
            }

            toast({
                title: 'Integração configurada!',
                description: `${selectedIntegration.name} foi configurado com sucesso.`,
            })

            setConfigModalOpen(false)
            refetch()
            queryClient.invalidateQueries({ queryKey: ['integration-settings'] })

        } catch (error) {
            toast({
                title: 'Erro ao salvar',
                description: error instanceof Error ? error.message : 'Tente novamente',
                variant: 'destructive',
            })
        } finally {
            setSaving(false)
        }
    }

    // Disconnect integration
    const handleDisconnect = async () => {
        if (!selectedIntegration) return

        setSaving(true)
        try {
            const response = await fetch(`/api/integrations/settings?integration_id=${selectedIntegration.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error || 'Erro ao desconectar')
            }

            toast({
                title: 'Integração desconectada',
                description: `${selectedIntegration.name} foi desconectado.`,
            })

            setConfigModalOpen(false)
            refetch()

        } catch (error) {
            toast({
                title: 'Erro ao desconectar',
                description: error instanceof Error ? error.message : 'Tente novamente',
                variant: 'destructive',
            })
        } finally {
            setSaving(false)
        }
    }

    const getStatusBadge = (status: 'connected' | 'disconnected' | 'locked') => {
        switch (status) {
            case 'connected':
                return (
                    <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Ativo
                    </Badge>
                )
            case 'disconnected':
                return (
                    <Badge variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pendente
                    </Badge>
                )
            case 'locked':
                return (
                    <Badge variant="outline" className="text-muted-foreground">
                        <Lock className="w-3 h-3 mr-1" />
                        Bloqueado
                    </Badge>
                )
        }
    }

    const getPlanBadge = (plan: PlanType) => {
        const config = PLANS[plan]
        if (!config || plan === 'STARTER') return null
        return (
            <Badge variant="secondary" className={config.badgeColor + ' text-xs'}>
                {config.name}
            </Badge>
        )
    }

    const categories = [
        { id: 'all', name: 'Todas' },
        { id: 'payment', name: 'Pagamentos' },
        { id: 'video', name: 'Videochamada' },
        { id: 'email', name: 'Email' },
        { id: 'messaging', name: 'Mensagens' },
        { id: 'analytics', name: 'Analytics' },
    ]

    const filteredIntegrations =
        activeTab === 'all'
            ? AVAILABLE_INTEGRATIONS
            : AVAILABLE_INTEGRATIONS.filter((i) => i.category === activeTab)

    const hasApiAccess = isPlanAtLeast(planType, 'ENTERPRISE') || isSuperAdmin

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Globe className="w-7 h-7" />
                        Integrações
                    </h1>
                    <p className="text-muted-foreground">
                        Conecte serviços externos à sua clínica
                    </p>
                </div>
                <Badge variant="secondary" className={PLANS[planType]?.badgeColor}>
                    {PLANS[planType]?.name || 'Starter'}
                </Badge>
            </div>

            {/* Stats - Real data from database */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <Skeleton className="h-8 w-12" />
                        ) : (
                            <div className="text-2xl font-bold text-green-600">
                                {integrationStats.connected}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">Ativas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <Skeleton className="h-8 w-12" />
                        ) : (
                            <div className="text-2xl font-bold">{integrationStats.available}</div>
                        )}
                        <p className="text-sm text-muted-foreground">Disponíveis</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <Skeleton className="h-8 w-12" />
                        ) : (
                            <div className="text-2xl font-bold text-amber-600">
                                {integrationStats.toActivate}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">Para configurar</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <Skeleton className="h-8 w-12" />
                        ) : (
                            <div className="text-2xl font-bold text-muted-foreground">
                                {integrationStats.locked}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">Requerem upgrade</p>
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
                {filteredIntegrations.map((integration) => {
                    const status = getIntegrationStatus(integration)
                    const isLocked = status === 'locked'

                    return (
                        <Card
                            key={integration.id}
                            className={`transition-shadow ${isLocked ? 'opacity-60' : 'hover:shadow-md'}`}
                        >
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${isLocked ? 'bg-muted' : status === 'connected' ? 'bg-green-100' : 'bg-primary/10'}`}>
                                            <integration.icon className={`w-6 h-6 ${isLocked ? 'text-muted-foreground' : status === 'connected' ? 'text-green-600' : 'text-primary'}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold">{integration.name}</h3>
                                                {getPlanBadge(integration.requiredPlan)}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {integration.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    {getStatusBadge(status)}
                                    {isLocked ? (
                                        <Link href="/dashboard/planos">
                                            <Button variant="outline" size="sm">
                                                <ArrowRight className="w-4 h-4 mr-1" />
                                                Upgrade
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            variant={status === 'connected' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handleConfigure(integration)}
                                        >
                                            <Settings className="w-4 h-4 mr-1" />
                                            {status === 'connected' ? 'Gerenciar' : 'Configurar'}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Configuration Modal */}
            <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedIntegration && (
                                <selectedIntegration.icon className="w-5 h-5" />
                            )}
                            {selectedIntegration ? `Configurar ${selectedIntegration.name}` : 'Configurar'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedIntegration && isConfigured(selectedIntegration)
                                ? 'Atualize as credenciais ou desconecte a integração.'
                                : 'Configure as credenciais para ativar esta integração.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {selectedIntegration?.fields.map((field) => (
                            <div key={field.key} className="space-y-2">
                                <Label htmlFor={field.key}>{field.label}</Label>
                                <div className="relative">
                                    <Input
                                        id={field.key}
                                        type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                                        placeholder={field.placeholder}
                                        value={formData[field.key] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                    />
                                    {field.type === 'password' && (
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowPasswords({ ...showPasswords, [field.key]: !showPasswords[field.key] })}
                                        >
                                            {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {selectedIntegration?.docsUrl && (
                            <a
                                href={selectedIntegration.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Ver documentação
                            </a>
                        )}
                    </div>

                    <DialogFooter className="flex gap-2">
                        {selectedIntegration && isConfigured(selectedIntegration) && (
                            <Button
                                variant="destructive"
                                onClick={handleDisconnect}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                                Desconectar
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                            {selectedIntegration && isConfigured(selectedIntegration) ? 'Atualizar' : 'Ativar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* API Section - Only for ENTERPRISE+ */}
            {hasApiAccess ? (
                <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            API REST
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Ativo
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            Integre com seus sistemas existentes via API
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 bg-white/50 rounded-lg">
                                <Label className="text-sm font-medium">Sua API Key</Label>
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        value={`sk_live_${(clinic as any)?.id ? (clinic as any).id.substring(0, 16) : '••••••••••••••••'}`}
                                        readOnly
                                        className="font-mono"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if ((clinic as any)?.id) {
                                                navigator.clipboard.writeText(`sk_live_${(clinic as any).id}`)
                                                toast({ title: 'Copiado!' })
                                            }
                                        }}
                                    >
                                        Copiar
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Ver Documentação
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="text-center p-6">
                            <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                            <p className="font-medium mb-1">API REST Dedicada</p>
                            <p className="text-sm text-muted-foreground mb-3">
                                Disponível no plano Enterprise+
                            </p>
                            <Link href="/dashboard/planos">
                                <Button size="sm">
                                    Fazer Upgrade
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            API REST
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Integre com seus sistemas via API dedicada.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Webhooks - Only for PROFESSIONAL+ */}
            {isPlanAtLeast(planType, 'PROFESSIONAL') || isSuperAdmin ? (
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
                                <Input
                                    placeholder="https://seu-sistema.com/webhook"
                                    defaultValue={settings.webhook_url || ''}
                                />
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
                                        <Switch defaultChecked={settings.webhook_events?.includes(event)} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button>Salvar Configurações</Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="text-center p-6">
                            <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                            <p className="font-medium mb-1">Webhooks</p>
                            <p className="text-sm text-muted-foreground mb-3">
                                Disponível no plano Profissional+
                            </p>
                            <Link href="/dashboard/planos">
                                <Button size="sm">
                                    Fazer Upgrade
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="w-5 h-5" />
                            Webhooks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Configure webhooks para integrar com sistemas externos.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
