'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
    Bell,
    Mail,
    MessageCircle,
    Calendar,
    CheckCircle2,
    Clock,
    Settings,
    Send,
    AlertCircle,
    History,
    Zap,
} from 'lucide-react'

export default function NotificacoesPage() {
    const { toast } = useToast()
    const [settings, setSettings] = useState({
        emailConfirmation: true,
        emailReminder: true,
        emailCancellation: true,
        whatsappConfirmation: true,
        whatsappReminder: true,
        reminderHours: 24,
    })

    // Sample history data
    const notificationHistory = [
        {
            id: '1',
            type: 'email',
            to: 'paciente@email.com',
            subject: 'Confirmação de Consulta',
            status: 'sent',
            sentAt: '2024-01-03 14:30',
        },
        {
            id: '2',
            type: 'whatsapp',
            to: '11999999999',
            subject: 'Lembrete de Consulta',
            status: 'sent',
            sentAt: '2024-01-03 10:00',
        },
        {
            id: '3',
            type: 'email',
            to: 'outro@email.com',
            subject: 'Link da Consulta',
            status: 'failed',
            sentAt: '2024-01-02 16:45',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Send className="w-7 h-7" />
                    Notificações
                </h1>
                <p className="text-muted-foreground">
                    Configure os envios automáticos para seus pacientes
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Mail className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">156</div>
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
                                <div className="text-2xl font-bold">89</div>
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
                                <div className="text-2xl font-bold">98%</div>
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
                                <div className="text-2xl font-bold">5</div>
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
                    {/* Email Notifications */}
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

                    {/* WhatsApp Notifications */}
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

                            <div className="p-4 bg-green-50 rounded-lg flex items-start gap-3">
                                <Zap className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-green-900">WhatsApp Business API</p>
                                    <p className="text-sm text-green-700 mt-1">
                                        Disponível no plano Profissional. Envie mensagens automáticas
                                        sem precisar clicar no botão de compartilhar.
                                    </p>
                                    <Button variant="outline" size="sm" className="mt-2">
                                        Fazer Upgrade
                                    </Button>
                                </div>
                            </div>
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
                                        setSettings({ ...settings, reminderHours: parseInt(e.target.value) })
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

                {/* History Tab */}
                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Envios</CardTitle>
                            <CardDescription>Últimas notificações enviadas</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                                    {notification.to}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge
                                                variant={notification.status === 'sent' ? 'success' : 'destructive'}
                                            >
                                                {notification.status === 'sent' ? 'Enviado' : 'Falhou'}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {notification.sentAt}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
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

                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Dica:</strong> Os templates são integrados com React Email
                                    e podem ser personalizados no plano Profissional.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
