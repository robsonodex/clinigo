'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { api } from '@/lib/api-client'
import {
    MessageCircle,
    Send,
    Copy,
    ExternalLink,
    CheckCircle2,
    Clock,
    Settings,
    Smartphone,
    Bell,
    FileText,
    Calendar,
    User,
    RefreshCcw,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

// Appointment type for this component
interface AppointmentWithPatient {
    id: string
    appointment_date: string
    appointment_time: string
    status: string
    video_link?: string
    patient: {
        id: string
        full_name: string
        phone: string
        email: string
    }
    doctor: {
        id: string
        specialty: string
        user: {
            full_name: string
        }
    }
}

// Templates de mensagens
const messageTemplates = [
    {
        id: 'confirmation',
        name: 'Confirmação de Consulta',
        icon: CheckCircle2,
        template: `Olá {nome}! 👋

Sua consulta foi confirmada:
📅 Data: {data}
⏰ Horário: {hora}
👨‍⚕️ Dr(a): {medico}

Link da videochamada: {link}

Caso precise cancelar, avise com antecedência.`,
    },
    {
        id: 'reminder',
        name: 'Lembrete',
        icon: Bell,
        template: `Olá {nome}! 📢

Lembrete: sua consulta é amanhã!
📅 Data: {data}
⏰ Horário: {hora}
👨‍⚕️ Dr(a): {medico}

Link: {link}

Até lá! 🙂`,
    },
    {
        id: 'link',
        name: 'Apenas Link',
        icon: ExternalLink,
        template: `Olá {nome}!

Aqui está o link da sua consulta:
🔗 {link}

Clique para entrar na videochamada. Boa consulta!`,
    },
    {
        id: 'prescription',
        name: 'Receita/Documento',
        icon: FileText,
        template: `Olá {nome}!

Segue seu documento médico para download:
📄 {documento}

Dr(a) {medico}`,
    },
]

export default function WhatsAppPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null)
    const [selectedTemplate, setSelectedTemplate] = useState(messageTemplates[0])
    const [customMessage, setCustomMessage] = useState('')
    const [clinicWhatsApp, setClinicWhatsApp] = useState('')

    // Buscar próximas consultas confirmadas
    const { data: appointments, isLoading } = useQuery({
        queryKey: ['whatsapp-appointments'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0]
            return api.get<AppointmentWithPatient[]>('/appointments', {
                date_from: today,
                status: 'CONFIRMED',
                page_size: '20',
            })
        },
    })

    // Gerar mensagem personalizada
    const generateMessage = (appointment: AppointmentWithPatient, template: typeof messageTemplates[0]) => {
        return template.template
            .replace('{nome}', appointment.patient.full_name.split(' ')[0])
            .replace('{data}', formatDate(appointment.appointment_date))
            .replace('{hora}', appointment.appointment_time.substring(0, 5))
            .replace('{medico}', appointment.doctor.user.full_name)
            .replace('{link}', appointment.video_link || 'Link será disponibilizado em breve')
    }

    // Abrir WhatsApp Web com mensagem
    const openWhatsApp = (phone: string, message: string) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')

        toast({
            title: 'WhatsApp aberto',
            description: 'Uma nova aba foi aberta com a mensagem.',
        })
    }

    // Copiar mensagem
    const copyMessage = (message: string) => {
        navigator.clipboard.writeText(message)
        toast({
            title: 'Copiado!',
            description: 'Mensagem copiada para a área de transferência.',
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MessageCircle className="w-7 h-7 text-green-600" />
                        WhatsApp
                    </h1>
                    <p className="text-muted-foreground">
                        Envie mensagens para pacientes via WhatsApp Web
                    </p>
                </div>
            </div>

            <Tabs defaultValue="quick" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="quick">
                        <Send className="w-4 h-4 mr-2" />
                        Envio Rápido
                    </TabsTrigger>
                    <TabsTrigger value="templates">
                        <FileText className="w-4 h-4 mr-2" />
                        Templates
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                    </TabsTrigger>
                </TabsList>

                {/* Envio Rápido */}
                <TabsContent value="quick" className="space-y-4">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Lista de Consultas */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Consultas Confirmadas
                                </CardTitle>
                                <CardDescription>
                                    Selecione uma consulta para enviar mensagem
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Carregando...
                                    </div>
                                ) : appointments && appointments.length > 0 ? (
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                        {appointments.map((apt) => (
                                            <div
                                                key={apt.id}
                                                onClick={() => setSelectedAppointment(apt)}
                                                className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedAppointment?.id === apt.id
                                                        ? 'border-green-500 bg-green-50'
                                                        : 'hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{apt.patient.full_name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {apt.patient.phone}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium">
                                                            {formatDate(apt.appointment_date)}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {apt.appointment_time.substring(0, 5)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="success">Confirmada</Badge>
                                                    {apt.video_link && (
                                                        <Badge variant="secondary">Link gerado</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Nenhuma consulta confirmada</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Painel de Mensagem */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-green-600" />
                                    Mensagem
                                </CardTitle>
                                <CardDescription>
                                    {selectedAppointment
                                        ? `Para: ${selectedAppointment.patient.full_name}`
                                        : 'Selecione uma consulta'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedAppointment ? (
                                    <>
                                        {/* Template selector */}
                                        <div className="space-y-2">
                                            <Label>Tipo de mensagem</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {messageTemplates.map((template) => (
                                                    <Button
                                                        key={template.id}
                                                        variant={selectedTemplate.id === template.id ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="justify-start"
                                                        onClick={() => setSelectedTemplate(template)}
                                                    >
                                                        <template.icon className="w-4 h-4 mr-2" />
                                                        {template.name}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        <div className="space-y-2">
                                            <Label>Prévia da mensagem</Label>
                                            <div className="bg-gray-100 rounded-lg p-4 whitespace-pre-wrap text-sm">
                                                {generateMessage(selectedAppointment, selectedTemplate)}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                onClick={() =>
                                                    openWhatsApp(
                                                        selectedAppointment.patient.phone,
                                                        generateMessage(selectedAppointment, selectedTemplate)
                                                    )
                                                }
                                            >
                                                <MessageCircle className="w-4 h-4 mr-2" />
                                                Abrir WhatsApp
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    copyMessage(
                                                        generateMessage(selectedAppointment, selectedTemplate)
                                                    )
                                                }
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Selecione uma consulta ao lado</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Envio Manual */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Envio Manual</CardTitle>
                            <CardDescription>
                                Envie uma mensagem personalizada para qualquer número
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Telefone (com DDD)</Label>
                                    <Input
                                        placeholder="11999999999"
                                        value={clinicWhatsApp}
                                        onChange={(e) => setClinicWhatsApp(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Mensagem</Label>
                                <Textarea
                                    placeholder="Digite sua mensagem..."
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    rows={4}
                                />
                            </div>
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                disabled={!clinicWhatsApp || !customMessage}
                                onClick={() => openWhatsApp(clinicWhatsApp, customMessage)}
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Enviar via WhatsApp
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Templates */}
                <TabsContent value="templates" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Templates de Mensagem</CardTitle>
                            <CardDescription>
                                Templates disponíveis para envio rápido
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {messageTemplates.map((template) => (
                                    <Card key={template.id}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <template.icon className="w-5 h-5 text-green-600" />
                                                {template.name}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <pre className="text-sm whitespace-pre-wrap text-muted-foreground bg-gray-50 p-3 rounded-lg">
                                                {template.template}
                                            </pre>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">Variáveis disponíveis:</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <code className="bg-white px-2 py-1 rounded">{'{nome}'}</code>
                                    <code className="bg-white px-2 py-1 rounded">{'{data}'}</code>
                                    <code className="bg-white px-2 py-1 rounded">{'{hora}'}</code>
                                    <code className="bg-white px-2 py-1 rounded">{'{medico}'}</code>
                                    <code className="bg-white px-2 py-1 rounded">{'{link}'}</code>
                                    <code className="bg-white px-2 py-1 rounded">{'{documento}'}</code>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Configurações */}
                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações de WhatsApp</CardTitle>
                            <CardDescription>
                                Configure as notificações automáticas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>Mostrar botão de WhatsApp na confirmação</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Exibe botão para compartilhar no WhatsApp após pagamento
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>Incluir link de vídeo na mensagem</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Adiciona automaticamente o link do Google Meet
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-4">WhatsApp da Clínica</h4>
                                <div className="space-y-2">
                                    <Label>Número para suporte</Label>
                                    <Input placeholder="11999999999" />
                                    <p className="text-sm text-muted-foreground">
                                        Pacientes poderão entrar em contato por este número
                                    </p>
                                </div>
                            </div>

                            <Button>Salvar Configurações</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge variant="secondary">PRO</Badge>
                                WhatsApp Business API
                            </CardTitle>
                            <CardDescription>
                                Integração oficial para envio automático em massa
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Com o plano Profissional, você pode integrar a API oficial do WhatsApp Business
                                    para enviar mensagens automáticas de confirmação, lembretes e muito mais.
                                </p>
                                <Button variant="outline">
                                    Ver Planos
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
