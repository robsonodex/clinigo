'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    MessageSquare,
    Settings,
    Headphones,
    CheckCircle,
    Wrench,
    HelpCircle,
    Mail,
    Save,
    Loader2,
    ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'

type ProviderType = '' | 'Z_API' | 'EVOLUTION' | 'OFFICIAL'

interface ProviderConfig {
    name: string
    description: string
    fields: { key: string; label: string; placeholder: string; type?: string }[]
}

const PROVIDERS: Record<string, ProviderConfig> = {
    Z_API: {
        name: 'Z-API',
        description: 'API não-oficial, boa para clínicas pequenas e médias',
        fields: [
            { key: 'instance_id', label: 'Instance ID', placeholder: 'Ex: 3C2A5F8E...' },
            { key: 'token', label: 'Token', placeholder: 'Seu token de acesso', type: 'password' },
            { key: 'client_token', label: 'Client Token', placeholder: 'Token do cliente (opcional)' },
        ]
    },
    EVOLUTION: {
        name: 'Evolution API',
        description: 'API open-source, sem custo por mensagem (requer servidor)',
        fields: [
            { key: 'api_url', label: 'URL da API', placeholder: 'https://sua-api.com' },
            { key: 'api_key', label: 'API Key', placeholder: 'Sua chave de API', type: 'password' },
            { key: 'instance_name', label: 'Nome da Instância', placeholder: 'clinica-nome' },
        ]
    },
    OFFICIAL: {
        name: 'WhatsApp Business API (Oficial)',
        description: 'API oficial da Meta, mais estável, para grandes volumes',
        fields: [
            { key: 'phone_number_id', label: 'Phone Number ID', placeholder: 'ID do número no Meta' },
            { key: 'access_token', label: 'Access Token', placeholder: 'Token permanente', type: 'password' },
            { key: 'business_id', label: 'Business Account ID', placeholder: 'ID da conta business' },
        ]
    }
}

export default function WhatsAppIntegrationPage() {
    const [showConfig, setShowConfig] = useState(false)
    const [selectedProvider, setSelectedProvider] = useState<ProviderType>('')
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    const handleContactSupport = () => {
        const email = 'suporte@clinigo.app'
        const subject = 'Solicitação de Configuração WhatsApp'
        const body = `Olá,\n\nGostaria de solicitar a configuração da integração WhatsApp para minha clínica.\n\nNome da Clínica: \nPlano Atual: \nTelefone para contato: \n\nAguardo retorno.`

        window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    }

    const handleSaveConfig = async () => {
        if (!selectedProvider) {
            toast.error('Selecione um provedor')
            return
        }

        const provider = PROVIDERS[selectedProvider]
        const missingFields = provider.fields.filter(f => !formData[f.key])

        if (missingFields.length > 0) {
            toast.error(`Preencha todos os campos obrigatórios`)
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/integrations/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: selectedProvider,
                    config: formData
                })
            })

            if (res.ok) {
                toast.success('Configuração salva com sucesso!')
                setShowConfig(false)
            } else {
                const data = await res.json()
                toast.error(data.error || 'Erro ao salvar configuração')
            }
        } catch (error) {
            toast.error('Erro ao salvar configuração')
        } finally {
            setSaving(false)
        }
    }

    const handleFieldChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    // Form de configuração
    if (showConfig) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-2xl">
                <Button
                    variant="ghost"
                    className="mb-4 gap-2"
                    onClick={() => setShowConfig(false)}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Configurar Integração WhatsApp
                        </CardTitle>
                        <CardDescription>
                            Configure as credenciais do seu provedor de WhatsApp
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Provider Selection */}
                        <div className="space-y-2">
                            <Label>Provedor de WhatsApp</Label>
                            <Select
                                value={selectedProvider}
                                onValueChange={(v) => {
                                    setSelectedProvider(v as ProviderType)
                                    setFormData({})
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o provedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Z_API">
                                        <div className="flex flex-col">
                                            <span className="font-medium">Z-API</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="EVOLUTION">
                                        <div className="flex flex-col">
                                            <span className="font-medium">Evolution API</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="OFFICIAL">
                                        <div className="flex flex-col">
                                            <span className="font-medium">WhatsApp Business API (Oficial)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {selectedProvider && PROVIDERS[selectedProvider] && (
                                <p className="text-xs text-muted-foreground">
                                    {PROVIDERS[selectedProvider].description}
                                </p>
                            )}
                        </div>

                        {/* Provider Specific Fields */}
                        {selectedProvider && PROVIDERS[selectedProvider] && (
                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-medium">Credenciais do {PROVIDERS[selectedProvider].name}</h4>

                                {PROVIDERS[selectedProvider].fields.map(field => (
                                    <div key={field.key} className="space-y-2">
                                        <Label htmlFor={field.key}>{field.label}</Label>
                                        <Input
                                            id={field.key}
                                            type={field.type || 'text'}
                                            placeholder={field.placeholder}
                                            value={formData[field.key] || ''}
                                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Save Button */}
                        {selectedProvider && (
                            <div className="pt-4">
                                <Button
                                    className="w-full gap-2"
                                    onClick={handleSaveConfig}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Salvar Configuração
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Página principal
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
                        A integração WhatsApp permite enviar automaticamente:
                    </p>
                    <div className="grid md:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Confirmações de agendamento</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Lembretes de consulta</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">QR Code para check-in</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Notificações personalizadas</span>
                        </div>
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
                            Para quem já tem um provedor contratado
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• Escolha entre Z-API, Evolution ou API Oficial</li>
                            <li>• Insira as credenciais do seu provedor</li>
                            <li>• Teste a conexão e pronto!</li>
                        </ul>

                        <div className="pt-4 border-t">
                            <Button
                                className="w-full gap-2"
                                variant="outline"
                                onClick={() => setShowConfig(true)}
                            >
                                <Settings className="h-4 w-4" />
                                Abrir Configuração
                            </Button>
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
                                Configuração completa
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Escolhemos o melhor provedor
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Testes e validação inclusos
                            </li>
                        </ul>

                        <div className="p-3 bg-white rounded-lg border">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Taxa única:</span>
                                <span className="font-bold text-lg">R$ 150,00</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Custos de API por conta do cliente
                            </p>
                        </div>

                        <Button className="w-full gap-2" onClick={handleContactSupport}>
                            <Mail className="h-4 w-4" />
                            Solicitar Configuração
                        </Button>
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
                        <h4 className="font-medium">Qual provedor escolher?</h4>
                        <p className="text-sm text-muted-foreground">
                            <strong>Z-API:</strong> Bom custo-benefício para clínicas pequenas e médias.
                            <strong> Evolution:</strong> Gratuito, mas requer servidor próprio.
                            <strong> API Oficial:</strong> Mais estável, para grandes volumes.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium">Quanto custa enviar mensagens?</h4>
                        <p className="text-sm text-muted-foreground">
                            Entre R$ 0,05 e R$ 0,15 por mensagem. Cobrado pelo provedor, não pelo CliniGo.
                        </p>
                    </div>

                    <div className="pt-4 border-t text-center">
                        <p className="text-xs text-muted-foreground">
                            Precisa de ajuda? Entre em contato: {' '}
                            <a href="mailto:suporte@clinigo.app" className="text-primary hover:underline">
                                suporte@clinigo.app
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
