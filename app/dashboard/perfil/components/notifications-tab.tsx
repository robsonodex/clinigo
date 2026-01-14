'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function NotificationsTab() {
    const [loading, setLoading] = useState(false)
    const [preferences, setPreferences] = useState<any>(null)

    useEffect(() => {
        loadPreferences()
    }, [])

    async function loadPreferences() {
        try {
            const res = await fetch('/api/profile/notifications')
            if (res.ok) {
                const data = await res.json()
                setPreferences(data.preferences)
            }
        } catch (error) {
            toast.error('Erro ao carregar preferências')
        }
    }

    async function updatePreference(field: string, value: any) {
        const updated = { ...preferences, [field]: value }
        setPreferences(updated)

        try {
            const res = await fetch('/api/profile/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
            })

            if (!res.ok) {
                toast.error('Erro ao salvar')
                setPreferences(preferences) // Reverter
            }
        } catch (error) {
            toast.error('Erro ao salvar')
            setPreferences(preferences) // Reverter
        }
    }

    async function saveAll() {
        setLoading(true)
        try {
            const res = await fetch('/api/profile/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences),
            })

            if (res.ok) {
                toast.success('Preferências salvas!')
            } else {
                toast.error('Erro ao salvar')
            }
        } catch (error) {
            toast.error('Erro ao salvar')
        } finally {
            setLoading(false)
        }
    }

    if (!preferences) {
        return (
            <Card>
                <CardContent className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Canais de Notificação */}
            <Card>
                <CardHeader>
                    <CardTitle>Canais de Notificação</CardTitle>
                    <CardDescription>
                        Escolha como deseja receber notificações
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="email_enabled">Email</Label>
                            <p className="text-sm text-muted-foreground">
                                Receber notificações por email
                            </p>
                        </div>
                        <Switch
                            id="email_enabled"
                            checked={preferences.email_enabled}
                            onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="push_enabled">Push (Navegador)</Label>
                            <p className="text-sm text-muted-foreground">
                                Notificações no navegador
                            </p>
                        </div>
                        <Switch
                            id="push_enabled"
                            checked={preferences.push_enabled}
                            onCheckedChange={(checked) => updatePreference('push_enabled', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="sms_enabled">SMS</Label>
                            <p className="text-sm text-muted-foreground">
                                Receber SMS (planos PRO+)
                            </p>
                        </div>
                        <Switch
                            id="sms_enabled"
                            checked={preferences.sms_enabled}
                            onCheckedChange={(checked) => updatePreference('sms_enabled', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="whatsapp_enabled">WhatsApp</Label>
                            <p className="text-sm text-muted-foreground">
                                Receber por WhatsApp (planos PRO+)
                            </p>
                        </div>
                        <Switch
                            id="whatsapp_enabled"
                            checked={preferences.whatsapp_enabled}
                            onCheckedChange={(checked) => updatePreference('whatsapp_enabled', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Eventos - Agendamentos */}
            <Card>
                <CardHeader>
                    <CardTitle>Agendamentos</CardTitle>
                    <CardDescription>
                        Notificações sobre consultas e agendamentos
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="new_appointments">Novos agendamentos</Label>
                        <Switch
                            id="new_appointments"
                            checked={preferences.new_appointments}
                            onCheckedChange={(checked) => updatePreference('new_appointments', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="appointment_cancellations">Cancelamentos</Label>
                        <Switch
                            id="appointment_cancellations"
                            checked={preferences.appointment_cancellations}
                            onCheckedChange={(checked) => updatePreference('appointment_cancellations', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="appointment_reminder_24h">Lembrete 24h antes</Label>
                        <Switch
                            id="appointment_reminder_24h"
                            checked={preferences.appointment_reminder_24h}
                            onCheckedChange={(checked) => updatePreference('appointment_reminder_24h', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="appointment_reminder_2h">Lembrete 2h antes</Label>
                        <Switch
                            id="appointment_reminder_2h"
                            checked={preferences.appointment_reminder_2h}
                            onCheckedChange={(checked) => updatePreference('appointment_reminder_2h', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="appointment_reminder_30min">Lembrete 30min antes</Label>
                        <Switch
                            id="appointment_reminder_30min"
                            checked={preferences.appointment_reminder_30min}
                            onCheckedChange={(checked) => updatePreference('appointment_reminder_30min', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Eventos - Financeiro */}
            <Card>
                <CardHeader>
                    <CardTitle>Financeiro</CardTitle>
                    <CardDescription>
                        Notificações sobre pagamentos e faturas
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="payments_received">Pagamentos recebidos</Label>
                        <Switch
                            id="payments_received"
                            checked={preferences.payments_received}
                            onCheckedChange={(checked) => updatePreference('payments_received', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="payment_failures">Falhas de pagamento</Label>
                        <Switch
                            id="payment_failures"
                            checked={preferences.payment_failures}
                            onCheckedChange={(checked) => updatePreference('payment_failures', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="invoices">Faturas</Label>
                        <Switch
                            id="invoices"
                            checked={preferences.invoices}
                            onCheckedChange={(checked) => updatePreference('invoices', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Eventos - Comunicação */}
            <Card>
                <CardHeader>
                    <CardTitle>Comunicação</CardTitle>
                    <CardDescription>
                        Mensagens e interações
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="patient_messages">Mensagens de pacientes</Label>
                        <Switch
                            id="patient_messages"
                            checked={preferences.patient_messages}
                            onCheckedChange={(checked) => updatePreference('patient_messages', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="internal_messages">Mensagens internas</Label>
                        <Switch
                            id="internal_messages"
                            checked={preferences.internal_messages}
                            onCheckedChange={(checked) => updatePreference('internal_messages', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Eventos - Sistema */}
            <Card>
                <CardHeader>
                    <CardTitle>Sistema e Marketing</CardTitle>
                    <CardDescription>
                        Atualizações e novidades
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="system_updates">Atualizações do sistema</Label>
                        <Switch
                            id="system_updates"
                            checked={preferences.system_updates}
                            onCheckedChange={(checked) => updatePreference('system_updates', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="security_alerts">Alertas de segurança</Label>
                        <Switch
                            id="security_alerts"
                            checked={preferences.security_alerts}
                            onCheckedChange={(checked) => updatePreference('security_alerts', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="newsletter">Newsletter</Label>
                        <Switch
                            id="newsletter"
                            checked={preferences.newsletter}
                            onCheckedChange={(checked) => updatePreference('newsletter', checked)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="promotions">Ofertas e promoções</Label>
                        <Switch
                            id="promotions"
                            checked={preferences.promotions}
                            onCheckedChange={(checked) => updatePreference('promotions', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Configurações Avançadas */}
            <Card>
                <CardHeader>
                    <CardTitle>Configurações Avançadas</CardTitle>
                    <CardDescription>
                        Personalize o comportamento das notificações
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="summary_frequency">Frequência de resumo</Label>
                        <Select
                            value={preferences.summary_frequency}
                            onValueChange={(value) => updatePreference('summary_frequency', value)}
                        >
                            <SelectTrigger id="summary_frequency">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="immediate">Imediato</SelectItem>
                                <SelectItem value="daily">Diário</SelectItem>
                                <SelectItem value="weekly">Semanal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="sound_enabled">Som de notificação</Label>
                        <Switch
                            id="sound_enabled"
                            checked={preferences.sound_enabled}
                            onCheckedChange={(checked) => updatePreference('sound_enabled', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Botão Salvar Tudo */}
            <div className="flex justify-end">
                <Button onClick={saveAll} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Todas as Preferências
                </Button>
            </div>
        </div>
    )
}
