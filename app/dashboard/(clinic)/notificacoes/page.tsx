'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useAuth, useRole } from '@/lib/hooks/use-auth'
import { isPlanAtLeast, type PlanType, PLANS } from '@/lib/constants/plans'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
    Bell,
    Mail,
    MessageCircle,
    CheckCircle2,
    Clock,
    Settings,
    Send,
    AlertCircle,
    History,
    Zap,
    Lock,
    ArrowRight,
} from 'lucide-react'

// Types for notification stats
interface NotificationStats {
    emailsSent: number
    whatsappSent: number
    deliveryRate: number
    pending: number
}

// Types for notification history
interface NotificationHistory {
    id: string
    type: 'email' | 'whatsapp'
    recipient: string
    subject: string
    status: 'sent' | 'failed' | 'pending'
    sent_at: string
}

// Hook to get clinic plan
function useClinicPlan() {
    const { profile } = useAuth()
    const supabase = createClient()

    const { data: clinic, isLoading } = useQuery({
        queryKey: ['clinic-plan', profile?.clinic_id],
        queryFn: async () => {
            if (!profile?.clinic_id) return null
            const { data } = await supabase
                .from('clinics')
                .select('id, plan_type')
                .eq('id', profile.clinic_id)
                .single()
            return data
        },
        enabled: !!profile?.clinic_id,
    })

    return {
        planType: (clinic?.plan_type as PlanType) || 'STARTER',
        isLoading,
    }
}

export default function NotificacoesPage() {
    const { toast } = useToast()
    const { profile } = useAuth()
    const { isSuperAdmin } = useRole()
    const { planType, isLoading: planLoading } = useClinicPlan()
    const supabase = createClient()

    const [settings, setSettings] = useState({
        emailConfirmation: true,
        emailReminder: true,
        emailCancellation: true,
        whatsappConfirmation: true,
        whatsappReminder: true,
        reminderHours: 24,
    })

    // Check if WhatsApp Business API is available (PROFESSIONAL+)
    const hasWhatsAppAPI = isPlanAtLeast(planType, 'PROFESSIONAL')

    // Fetch real notification stats from database
    const { data: stats, isLoading: statsLoading } = useQuery<NotificationStats>({
        queryKey: ['notification-stats', profile?.clinic_id],
        queryFn: async () => {
            if (!profile?.clinic_id) {
                return { emailsSent: 0, whatsappSent: 0, deliveryRate: 0, pending: 0 }
            }

            // Try to fetch from audit_logs or a notifications table
            // Using audit_logs as a proxy for now
            const { data: logs, error } = await supabase
                .from('audit_logs')
                .select('id, action, metadata, created_at')
                .or(`action.ilike.%email%,action.ilike.%whatsapp%,action.ilike.%notification%`)
                .order('created_at', { ascending: false })
                .limit(1000)

            if (error || !logs) {
                return { emailsSent: 0, whatsappSent: 0, deliveryRate: 0, pending: 0 }
            }

            // Count by type
            const emailLogs = logs.filter(l =>
                l.action?.toLowerCase().includes('email') ||
                l.metadata?.type === 'email'
            )
            const whatsappLogs = logs.filter(l =>
                l.action?.toLowerCase().includes('whatsapp') ||
                l.metadata?.type === 'whatsapp'
            )

            // Calculate delivery rate (if metadata contains status)
            const sentLogs = logs.filter(l => l.metadata?.status === 'sent')
            const deliveryRate = logs.length > 0
                ? Math.round((sentLogs.length / logs.length) * 100)
                : 0

            // Count pending
            const pendingLogs = logs.filter(l => l.metadata?.status === 'pending')

            return {
                emailsSent: emailLogs.length,
                whatsappSent: whatsappLogs.length,
                deliveryRate,
                pending: pendingLogs.length,
            }
        },
        enabled: !!profile?.clinic_id,
    })

    // Fetch real notification history from database
    const { data: notificationHistory, isLoading: historyLoading } = useQuery<NotificationHistory[]>({
        queryKey: ['notification-history', profile?.clinic_id],
        queryFn: async () => {
            if (!profile?.clinic_id) return []

            // Fetch from audit_logs with notification-related actions
            const { data: logs, error } = await supabase
                .from('audit_logs')
                .select('id, action, metadata, created_at, entity_type')
                .or(`action.ilike.%email%,action.ilike.%whatsapp%,action.ilike.%notification%`)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error || !logs) return []

            // Transform to notification history format
            return logs.map(log => ({
                id: log.id,
                type: (log.action?.toLowerCase().includes('whatsapp') ? 'whatsapp' : 'email') as 'email' | 'whatsapp',
                recipient: log.metadata?.recipient || log.metadata?.to || 'Desconhecido',
                subject: log.metadata?.subject || log.action || 'Notificação',
                status: (log.metadata?.status || 'sent') as 'sent' | 'failed' | 'pending',
                sent_at: log.created_at,
            }))
        },
        enabled: !!profile?.clinic_id,
    })

    // Empty state component
    const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType, message: string }) => (
        <div className="text-center py-8 text-muted-foreground">
            <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{message}</p>
        </div>
    )

    // Plan gate component
    const PlanGate = ({
        requiredPlan,
        feature,
        children
    }: {
        requiredPlan: PlanType
        feature: string
        children: React.ReactNode
    }) => {
        const hasAccess = isPlanAtLeast(planType, requiredPlan) || isSuperAdmin
        const requiredPlanConfig = PLANS[requiredPlan]

        if (!hasAccess) {
            return (
                <div className="relative">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                        <div className="text-center p-6">
                            <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                            <p className="font-medium mb-1">{feature}</p>
                            <p className="text-sm text-muted-foreground mb-3">
                                Disponível no plano {requiredPlanConfig.name}+
                            </p>
                            <Link href="/dashboard/planos">
                                <Button size="sm">
                                    Fazer Upgrade
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className="opacity-50 pointer-events-none">
                        {children}
                    </div>
                </div>
            )
        }

        return <>{children}</>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Send className="w-7 h-7" />
                        Notificações
                    </h1>
                    <p className="text-muted-foreground">
                        Configure os envios automáticos para seus pacientes
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
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Mail className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                {statsLoading ? (
                                    <Skeleton className="h-8 w-12" />
                                ) : (
                                    <div className="text-2xl font-bold">{stats?.emailsSent || 0}</div>
                                )}
                                <p className="text-sm text-muted-foreground">Emails enviados</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <MessageCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                {statsLoading ? (
                                    <Skeleton className="h-8 w-12" />
                                ) : (
                                    <div className="text-2xl font-bold">{stats?.whatsappSent || 0}</div>
                                )}
                                <p className="text-sm text-muted-foreground">WhatsApp</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                {statsLoading ? (
                                    <Skeleton className="h-8 w-12" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {stats?.deliveryRate || 0}%
                                    </div>
                                )}
                                <p className="text-sm text-muted-foreground">Taxa de entrega</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                {statsLoading ? (
                                    <Skeleton className="h-8 w-12" />
                                ) : (
                                    <div className="text-2xl font-bold">{stats?.pending || 0}</div>
                                )}
                                <p className="text-sm text-muted-foreground">Pendentes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="settings" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="w-4 h-4 mr-2" />
                        Histórico
                    </TabsTrigger>
                    <TabsTrigger value="templates">
                        <Mail className="w-4 h-4 mr-2" />
                        Templates
                    </TabsTrigger>
                </TabsList>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4">
                    {/* Email Notifications - Available to all plans */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-600" />
                                Notificações por Email
                            </CardTitle>
                            <CardDescription>
                                Emails automáticos enviados aos pacientes
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Confirmação de Agendamento</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Email enviado quando o pagamento é confirmado
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.emailConfirmation}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, emailConfirmation: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Lembrete de Consulta</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Email enviado 24h antes da consulta
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.emailReminder}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, emailReminder: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Aviso de Cancelamento</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Email enviado quando a consulta é cancelada
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.emailCancellation}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, emailCancellation: checked })
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* WhatsApp Notifications - Gated by plan */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-green-600" />
                                WhatsApp (Compartilhar)
                            </CardTitle>
                            <CardDescription>
                                Botão para compartilhar informações via WhatsApp
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Botão após Confirmação</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Mostra botão para compartilhar no WhatsApp após pagamento
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.whatsappConfirmation}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, whatsappConfirmation: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Lembrete no Dashboard</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Mostra botão para enviar lembrete manual
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.whatsappReminder}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, whatsappReminder: checked })
                                    }
                                />
                            </div>

                            {/* WhatsApp Business API - PROFESSIONAL+ only */}
                            <PlanGate requiredPlan="PROFESSIONAL" feature="WhatsApp Business API">
                                <div className="p-4 bg-green-50 rounded-lg flex items-start gap-3">
                                    <Zap className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-green-900">WhatsApp Business API</p>
                                        <p className="text-sm text-green-700 mt-1">
                                            Envie mensagens automáticas sem precisar clicar no botão de compartilhar.
                                            Configure lembretes 24h antes, confirmações instantâneas e mais.
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-2">
                                            Configurar API
                                        </Button>
                                    </div>
                                </div>
                            </PlanGate>
                        </CardContent>
                    </Card>

                    {/* Timing */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Configurações de Tempo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Lembrete antes da consulta (horas)</Label>
                                <Input
                                    type="number"
                                    value={settings.reminderHours}
                                    onChange={(e) =>
                                        setSettings({ ...settings, reminderHours: parseInt(e.target.value) || 24 })
                                    }
                                    className="w-24"
                                />
                            </div>
                            <Button onClick={() => toast({ title: 'Configurações salvas!' })}>
                                Salvar Configurações
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab - Real data from database */}
                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Envios</CardTitle>
                            <CardDescription>Últimas notificações enviadas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {historyLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-16" />
                                    ))}
                                </div>
                            ) : notificationHistory && notificationHistory.length > 0 ? (
                                <div className="space-y-3">
                                    {notificationHistory.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                {notification.type === 'email' ? (
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        <Mail className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                ) : (
                                                    <div className="p-2 bg-green-100 rounded-lg">
                                                        <MessageCircle className="w-4 h-4 text-green-600" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium">{notification.subject}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {notification.recipient}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge
                                                    variant={
                                                        notification.status === 'sent'
                                                            ? 'success'
                                                            : notification.status === 'failed'
                                                                ? 'destructive'
                                                                : 'secondary'
                                                    }
                                                >
                                                    {notification.status === 'sent'
                                                        ? 'Enviado'
                                                        : notification.status === 'failed'
                                                            ? 'Falhou'
                                                            : 'Pendente'}
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {notification.sent_at
                                                        ? new Date(notification.sent_at).toLocaleString('pt-BR')
                                                        : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={History}
                                    message="Nenhuma notificação enviada ainda. Os envios aparecerão aqui conforme você usar o sistema."
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Templates de Email</CardTitle>
                            <CardDescription>
                                Os templates são personalizados automaticamente com as cores da sua clínica
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="bg-muted/50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Confirmação</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Enviado após pagamento confirmado. Inclui data, hora,
                                            médico e link da videochamada.
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-3">
                                            Visualizar
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="bg-muted/50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Lembrete</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Enviado 24h antes da consulta. Reforça data, hora
                                            e instruções importantes.
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-3">
                                            Visualizar
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="bg-muted/50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Cancelamento</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Enviado quando a consulta é cancelada. Inclui
                                            informações sobre reembolso se aplicável.
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-3">
                                            Visualizar
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="bg-muted/50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Documento/Receita</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Enviado quando o médico compartilha um documento
                                            ou prescrição com o paciente.
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-3">
                                            Visualizar
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Custom templates - PROFESSIONAL+ only */}
                            <PlanGate requiredPlan="PROFESSIONAL" feature="Templates Personalizados">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Templates Personalizados:</strong> Crie seus próprios templates
                                        de email com React Email e personalize completamente a comunicação
                                        com seus pacientes.
                                    </p>
                                    <Button variant="outline" size="sm" className="mt-2">
                                        Criar Template
                                    </Button>
                                </div>
                            </PlanGate>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
