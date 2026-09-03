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
        id: 'google_calendar',
        name: 'Google Calendar',
        description: 'Sincronize agenda com Google Calendar',
        icon: Calendar,
        category: 'calendar',
        requiredPlan: 'AVANCADO',
        settingsKey: 'google_calendar_configured',
        fields: [
            { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'ID do cliente OAuth' },
            { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Secret do cliente OAuth' },
        ],
        docsUrl: 'https://developers.google.com/calendar',
    },
    {
        id: 'google_drive',
        name: 'Google Drive',
        description: 'Backup automático de documentos',
        icon: Globe,
        category: 'calendar',
        requiredPlan: 'AVANCADO',
        settingsKey: 'google_drive_configured',
        fields: [
            { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'ID do cliente OAuth' },
            { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Secret do cliente OAuth' },
        ],
        docsUrl: 'https://developers.google.com/drive',
    },
    {
        id: 'resend',
        name: 'Resend/SendGrid',
        description: 'Emails transacionais personalizados',
        icon: Mail,
        category: 'email',
        requiredPlan: 'AVANCADO',
        settingsKey: 'resend_configured',
        fields: [
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 're_...' },
        ],
        docsUrl: 'https://resend.com/docs',
    },

    {
        id: 'rdstation',
        name: 'RD Station',
        description: 'Marketing e CRM automatizado',
        icon: Zap,
        category: 'analytics',
        requiredPlan: 'PROFESSIONAL',
        settingsKey: 'rdstation_configured',
        fields: [
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Token de integração' },
        ],
        docsUrl: 'https://developers.rdstation.com',
    },
    {
        id: 'hubspot',
        name: 'HubSpot CRM',
        description: 'CRM e automação de marketing',
        icon: Zap,
        category: 'analytics',
        requiredPlan: 'PROFESSIONAL',
        settingsKey: 'hubspot_configured',
        fields: [
            { key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'pat-...' },
        ],
        docsUrl: 'https://developers.hubspot.com',
    },
    {
        id: 'zapier',
        name: 'Zapier',
        description: 'Conecte com 5000+ apps',
        icon: Zap,
        category: 'analytics',
        requiredPlan: 'ENTERPRISE',
        settingsKey: 'zapier_configured',
        fields: [
            { key: 'webhook_url', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.zapier.com/...' },
        ],
        docsUrl: 'https://zapier.com/developer',
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
        planType: ((clinic as any)?.plan_type as PlanType) || 'BASICO',
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
        if (!config || plan === 'BASICO') return null
        return (
            <Badge variant="secondary" className={config.badgeColor + ' text-xs'}>
                {config.name}
            </Badge>
        )
    }

    const categories = [
        { id: 'all', name: 'Todas' },
        { id: 'video', name: 'Videochamada' },
        { id: 'email', name: 'Email' },
        { id: 'analytics', name: 'Analytics' },
    ]

    const filteredIntegrations =
        activeTab === 'all'
            ? AVAILABLE_INTEGRATIONS
            : AVAILABLE_INTEGRATIONS.filter((i) => i.category === activeTab)

    const hasApiAccess = isPlanAtLeast(planType, 'ENTERPRISE') || isSuperAdmin

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <Globe className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Integrações</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Conecte serviços externos à sua clínica</p>
                    </div>
                </div>
                {PLANS[planType] && (
                    <Badge variant="secondary" className={`rounded-full px-3 py-1 text-xs font-semibold self-start sm:self-center ${PLANS[planType].badgeColor}`}>
                        Plano {PLANS[planType].name}
                    </Badge>
                )}
            </div>

            {/* Stats - Real data from database */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40 overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Ativas</p>
                            {isLoading ? (
                                <Skeleton className="h-7 w-12 rounded mt-1" />
                            ) : (
                                <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-450 mt-1">{integrationStats.connected}</h3>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40 overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Disponíveis</p>
                            {isLoading ? (
                                <Skeleton className="h-7 w-12 rounded mt-1" />
                            ) : (
                                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">{integrationStats.available}</h3>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Globe className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40 overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Configurar</p>
                            {isLoading ? (
                                <Skeleton className="h-7 w-12 rounded mt-1" />
                            ) : (
                                <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-450 mt-1">{integrationStats.toActivate}</h3>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 dark:text-amber-450">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40 overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Bloqueadas</p>
                            {isLoading ? (
                                <Skeleton className="h-7 w-12 rounded mt-1" />
                            ) : (
                                <h3 className="text-2xl font-extrabold text-slate-400 dark:text-slate-500 mt-1">{integrationStats.locked}</h3>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-450">
                            <Lock className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Tabs Premium */}
            <div className="overflow-x-auto pb-1">
                <div className="flex w-max bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                    {categories.map((cat) => (
                        <Button
                            key={cat.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab(cat.id)}
                            className={`rounded-lg text-xs font-semibold px-4 py-2 h-8 text-slate-650 dark:text-slate-450 transition-all ${
                                activeTab === cat.id
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                    : 'hover:text-slate-800 dark:hover:text-white'
                            }`}
                        >
                            {cat.name}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Integrations Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredIntegrations.map((integration) => {
                    const status = getIntegrationStatus(integration)
                    const isLocked = status === 'locked'
                    const config = PLANS[integration.requiredPlan]

                    // Dynamic colors based on integration type
                    const colors: Record<string, { bg: string; text: string; gradient: string }> = {
                        google_calendar: { bg: '#EBF5FF', text: '#2563EB', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
                        google_drive: { bg: '#ECFDF5', text: '#059669', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
                        resend: { bg: '#F1F5F9', text: '#475569', gradient: 'linear-gradient(135deg, #64748B, #334155)' },
                        rdstation: { bg: '#FEF3C7', text: '#D97706', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
                        hubspot: { bg: '#FFEDD5', text: '#EA580C', gradient: 'linear-gradient(135deg, #F97316, #C2410C)' },
                        zapier: { bg: '#FFF7ED', text: '#EA580C', gradient: 'linear-gradient(135deg, #FF6F00, #E65100)' },
                        posthog: { bg: '#F3E8FF', text: '#9333EA', gradient: 'linear-gradient(135deg, #A855F7, #7E22CE)' },
                    }

                    const theme = colors[integration.id] || { bg: '#F1F5F9', text: '#475569', gradient: 'linear-gradient(135deg, #64748B, #334155)' }

                    return (
                        <Card
                            key={integration.id}
                            className={`rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/40 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-750 transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                                isLocked ? 'opacity-70 dark:opacity-60 bg-slate-50/50 dark:bg-slate-950/10' : ''
                            }`}
                        >
                            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div
                                            style={{ background: isLocked ? '#E2E8F0' : theme.gradient }}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                                        >
                                            <integration.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {config && integration.requiredPlan !== 'BASICO' && (
                                                <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] font-bold border-none ${config.badgeColor}`}>
                                                    {config.name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-base">{integration.name}</h3>
                                        <p className="text-xs text-slate-450 dark:text-slate-500 font-medium leading-relaxed mt-1">
                                            {integration.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    {getStatusBadge(status)}
                                    {isLocked ? (
                                        <Link href="/dashboard/planos">
                                            <Button size="sm" className="rounded-xs h-8 px-3.5 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800">
                                                <ArrowRight className="w-3.5 h-3.5 mr-1" />
                                                Upgrade
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            variant={status === 'connected' ? 'outline' : 'default'}
                                            size="sm"
                                            onClick={() => handleConfigure(integration)}
                                            className={`rounded-xl h-8 px-3.5 text-xs font-semibold ${
                                                status === 'connected'
                                                    ? 'border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                                                    : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800'
                                            }`}
                                        >
                                            <Settings className="w-3.5 h-3.5 mr-1" />
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
                <DialogContent className="sm:max-w-md rounded-2xl border-slate-100 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-850 dark:text-white">
                            {selectedIntegration && (
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white">
                                    <selectedIntegration.icon className="w-4.5 h-4.5" />
                                </div>
                            )}
                            {selectedIntegration ? `Configurar ${selectedIntegration.name}` : 'Configurar'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400 dark:text-slate-500">
                            {selectedIntegration && isConfigured(selectedIntegration)
                                ? 'Atualize as credenciais ou desconecte a integração.'
                                : 'Configure as credenciais para ativar esta integração.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        {selectedIntegration?.fields.map((field) => (
                            <div key={field.key} className="space-y-2">
                                <Label htmlFor={field.key} className="text-xs font-semibold text-slate-500 dark:text-slate-450">{field.label}</Label>
                                <div className="relative">
                                    <Input
                                        id={field.key}
                                        type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                                        placeholder={field.placeholder}
                                        value={formData[field.key] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                        className="h-10 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-705 dark:text-slate-200 placeholder:text-slate-400/80 text-sm"
                                    />
                                    {field.type === 'password' && (
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
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
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-1"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ver documentação da integração
                            </a>
                        )}
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-2">
                        {selectedIntegration && isConfigured(selectedIntegration) && (
                            <Button
                                variant="destructive"
                                onClick={handleDisconnect}
                                disabled={saving}
                                className="rounded-xs h-10 px-4 text-sm font-semibold flex items-center justify-center gap-1.5"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Desconectar
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-xs h-10 px-5 text-sm font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 flex items-center justify-center gap-1.5"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {selectedIntegration && isConfigured(selectedIntegration) ? 'Atualizar' : 'Ativar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* API Section - Only for ENTERPRISE+ */}
            {hasApiAccess ? (
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40 overflow-hidden">
                    <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-800/50">
                        <CardTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Key className="w-5 h-5 text-slate-650" />
                            API REST
                            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-bold border-none bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                Ativo
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400 dark:text-slate-500">
                            Integre com seus sistemas existentes via API
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-800">
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-450">Sua API Key</Label>
                            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                <Input
                                    value={`sk_live_${(clinic as any)?.id ? (clinic as any).id.substring(0, 16) : '••••••••••••••••'}`}
                                    readOnly
                                    className="font-mono h-10 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-350 text-xs tracking-wider"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if ((clinic as any)?.id) {
                                            navigator.clipboard.writeText(`sk_live_${(clinic as any).id}`)
                                            toast({ title: 'Copiado!' })
                                        }
                                    }}
                                    className="rounded-xl h-10 text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850"
                                >
                                    Copiar Chave
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="rounded-md h-10 text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center gap-1.5">
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ver Documentação da API
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="rounded-md border border-border shadow-xs bg-card relative overflow-hidden min-h-[220px]">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-xs z-10 flex items-center justify-center">
                        <div className="text-center p-6 max-w-sm">
                            <div className="w-9 h-9 rounded-md bg-muted/60 border border-border flex items-center justify-center text-muted-foreground mx-auto mb-3 shadow-xs">
                                <Lock className="w-4 h-4" />
                            </div>
                            <h3 className="font-semibold text-foreground text-sm">API REST Dedicada</h3>
                            <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
                                Faça integrações customizadas com outros sistemas. Disponível exclusivamente no plano Enterprise.
                            </p>
                            <Link href="/dashboard/planos">
                                <Button size="sm" className="rounded-md h-8 px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5">
                                    Fazer Upgrade de Plano
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-slate-400" />
                            API REST
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-400 dark:text-slate-550">
                            Integre com seus sistemas via API dedicada.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Webhooks - Only for PROFESSIONAL+ */}
            {isPlanAtLeast(planType, 'PROFESSIONAL') || isSuperAdmin ? (
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40 overflow-hidden">
                    <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-800/50">
                        <CardTitle className="text-lg font-bold text-slate-805 dark:text-white flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-slate-650" />
                            Webhooks
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-450 dark:text-slate-500">
                            Receba notificações em tempo real sobre eventos ocorridos no sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-800">
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-450">URL de Destino do Webhook</Label>
                            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                <Input
                                    placeholder="https://seu-sistema.com/webhook"
                                    defaultValue={settings.webhook_url || ''}
                                    className="h-10 bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-350 text-sm font-medium"
                                />
                                <Button variant="outline" className="rounded-xs h-10 text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850">
                                    Testar Envio
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-450">Eventos para inscrição:</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {[
                                    { key: 'appointment.created', label: 'Agendamento Criado' },
                                    { key: 'appointment.confirmed', label: 'Agendamento Confirmado' },
                                    { key: 'appointment.cancelled', label: 'Agendamento Cancelado' },
                                    { key: 'payment.received', label: 'Pagamento Recebido' },
                                    { key: 'payment.refunded', label: 'Pagamento Reembolsado' },
                                    { key: 'patient.created', label: 'Paciente Cadastrado' },
                                ].map((event) => (
                                    <div
                                        key={event.key}
                                        className="flex items-center justify-between p-3 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100/60 dark:border-slate-850 rounded-xl"
                                    >
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{event.label}</p>
                                            <code className="text-[10px] text-slate-450 font-semibold">{event.key}</code>
                                        </div>
                                        <Switch defaultChecked={settings.webhook_events?.includes(event.key)} className="data-[state=checked]:bg-emerald-500" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button className="rounded-md h-10 px-5 text-sm font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-850 flex items-center justify-center gap-1.5 mt-2">
                            Salvar Configurações
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="rounded-md border border-slate-150 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/40 relative overflow-hidden min-h-[220px]">
                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/65 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="text-center p-6 max-w-sm">
                            <div className="w-9 h-9 rounded-md bg-muted/60 border border-border flex items-center justify-center text-muted-foreground mx-auto mb-3 shadow-xs">
                                <Lock className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-805 dark:text-white text-base">Webhooks ativos</h3>
                            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 mb-4 leading-relaxed">
                                Envie notificações em tempo real para seu sistema externo. Disponível a partir do plano Profissional.
                            </p>
                            <Link href="/dashboard/planos">
                                <Button size="sm" className="rounded-md h-9 px-4 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5">
                                    Fazer Upgrade de Plano
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-slate-400" />
                            Webhooks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-400 dark:text-slate-550">
                            Configure webhooks para integrar com sistemas externos.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
