'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    MessageSquare,
    Settings,
    Headphones,
    ExternalLink,
    CheckCircle,
    Wrench,
    HelpCircle,
    Mail
} from 'lucide-react'

export default function WhatsAppIntegrationPage() {
    const handleContactSupport = () => {
        const email = 'suporte@clinigo.app'
        const subject = 'Solicitação de Configuração WhatsApp'
        const body = `Olá,\n\nGostaria de solicitar a configuração da integração WhatsApp para minha clínica.\n\nNome da Clínica: \nPlano Atual: \nTelefone para contato: \n\nAguardo retorno.`

        window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <MessageSquare className="h-8 w-8 text-green-500" />
                    Integração WhatsApp
                </h1>
                <p className="text-muted-foreground mt-2">
                    Conecte seu WhatsApp para enviar notificações automáticas aos pacientes
                </p>
            </div>

            {/* Main Info Card */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Como Funciona
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        A integração WhatsApp permite que o CliniGo envie automaticamente:
                    </p>
                    <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Confirmações de agendamento</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Lembretes de consulta (24h e 1h antes)</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>QR Code para check-in</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Notificações personalizadas</span>
                        </li>
                    </ul>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                        <p className="text-sm text-amber-800">
                            <strong>Importante:</strong> Para ativar a integração, é necessário configurar
                            uma conexão com um provedor de WhatsApp (como Z-API, Evolution API ou outro de sua preferência).
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Options */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Option 1: Self Configure */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Wrench className="h-5 w-5" />
                                Configurar Sozinho
                            </CardTitle>
                            <Badge variant="outline">Gratuito</Badge>
                        </div>
                        <CardDescription>
                            Para quem tem equipe técnica
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• Escolha seu provedor de WhatsApp</li>
                            <li>• Configure as credenciais da API</li>
                            <li>• Siga nossa documentação técnica</li>
                            <li>• Suporte via documentação</li>
                        </ul>

                        <div className="pt-4 border-t space-y-3">
                            <Button variant="outline" className="w-full gap-2" asChild>
                                <a href="https://docs.clinigo.app/integracao-whatsapp" target="_blank">
                                    <ExternalLink className="h-4 w-4" />
                                    Ver Documentação
                                </a>
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                                Requer conhecimento técnico
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Option 2: We Configure */}
                <Card className="border-2 border-primary bg-primary/5">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Headphones className="h-5 w-5" />
                                Nós Configuramos
                            </CardTitle>
                            <Badge className="bg-primary">Recomendado</Badge>
                        </div>
                        <CardDescription>
                            Deixe com nossa equipe
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Configuração completa feita pela equipe CliniGo
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Escolhemos o melhor provedor para você
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Testes e validação inclusos
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Suporte durante a implantação
                            </li>
                        </ul>

                        <div className="p-3 bg-white rounded-lg border">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Taxa de implantação:</span>
                                <span className="font-bold text-lg">R$ 150,00</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Pagamento único • Custos de API por conta do cliente
                            </p>
                        </div>

                        <div className="pt-2">
                            <Button className="w-full gap-2" onClick={handleContactSupport}>
                                <Mail className="h-4 w-4" />
                                Solicitar Configuração
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* FAQ */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5" />
                        Dúvidas Frequentes
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-medium">Qual provedor de WhatsApp é melhor?</h4>
                        <p className="text-sm text-muted-foreground">
                            Depende do volume de mensagens. Para clínicas pequenas e médias,
                            recomendamos Z-API por ter melhor custo-benefício. Para grandes
                            clínicas, a API Oficial do WhatsApp é mais estável.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium">Quanto custa enviar mensagens?</h4>
                        <p className="text-sm text-muted-foreground">
                            Os custos variam por provedor. Em média, cada mensagem custa entre
                            R$ 0,05 e R$ 0,15. Esse custo é cobrado diretamente pelo provedor,
                            não pelo CliniGo.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium">Posso usar meu número atual?</h4>
                        <p className="text-sm text-muted-foreground">
                            Sim! Você pode usar o número de WhatsApp da clínica. Recomendamos
                            um número dedicado para não misturar mensagens automáticas com
                            conversas manuais.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
