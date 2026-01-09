'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
    MessageCircle,
    Settings,
    CheckCircle2,
    XCircle,
    Loader2,
    Lock,
    Zap,
    Server,
    Shield,
    ExternalLink,
} from 'lucide-react'

interface ClinicWhatsAppConfig {
    whatsapp_provider: string
    whatsapp_api_key: string
    whatsapp_instance_id: string
    whatsapp_business_id: string
    whatsapp_enabled: boolean
    plan_type: string
}

const PROVIDERS = [
    { value: 'NONE', label: 'Desativado', icon: XCircle, color: 'text-gray-500' },
    { value: 'ZAPI', label: 'Z-API', icon: Zap, color: 'text-green-600', recommended: true },
    { value: 'EVOLUTION', label: 'Evolution API', icon: Server, color: 'text-blue-600' },
    { value: 'OFFICIAL', label: 'WhatsApp Oficial (Meta)', icon: Shield, color: 'text-emerald-600' },
]

export default function WhatsAppConfigPage() {
    const { user, isLoading: userLoading } = useUser()
    const [config, setConfig] = useState<ClinicWhatsAppConfig | null>(null)
    const [provider, setProvider] = useState('NONE')
    const [apiKey, setApiKey] = useState('')
    const [instanceId, setInstanceId] = useState('')
    const [businessId, setBusinessId] = useState('')
    const [enabled, setEnabled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle')

    const supabase = createClient()

    // Carregar configuração atual - SEMPRE DO BANCO, SEM CACHE
    useEffect(() => {
        if (!user?.clinic_id) return

        const loadConfig = async () => {
            console.log('🔍 Carregando config para clinic_id:', user.clinic_id)

            // Query direto do banco, sem cache
            const { data, error } = await supabase
                .from('clinics')
                .select('whatsapp_provider, whatsapp_api_key, whatsapp_instance_id, whatsapp_business_id, whatsapp_enabled, plan_type')
                .eq('id', user.clinic_id)
                .single()

            console.log('📊 Dados recebidos do Supabase:', data)
            console.log('❌ Erro (se houver):', error)

            if (data) {
                console.log('✅ Plan Type detectado:', data.plan_type)
                setConfig(data as ClinicWhatsAppConfig)
                setProvider(data.whatsapp_provider || 'NONE')
                setApiKey(data.whatsapp_api_key || '')
                setInstanceId(data.whatsapp_instance_id || '')
                setBusinessId(data.whatsapp_business_id || '')
                setEnabled(data.whatsapp_enabled || false)
            }
            setLoading(false)
        }

        loadConfig()
    }, [user?.clinic_id])

    // Salvar configurações
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.clinic_id) return

        setSaving(true)
        try {
            const { error } = await supabase
                .from('clinics')
                .update({
                    whatsapp_provider: provider,
                    whatsapp_api_key: apiKey,
                    whatsapp_instance_id: instanceId,
                    whatsapp_business_id: businessId,
                    whatsapp_enabled: enabled && provider !== 'NONE',
                })
                .eq('id', user.clinic_id)

            if (error) throw error

            toast.success('Configurações salvas com sucesso!')
        } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    // Testar conexão
    const testConnection = async () => {
        if (provider === 'NONE' || !apiKey || !instanceId) {
            toast.error('Preencha as credenciais primeiro')
            return
        }

        setTesting(true)
        setConnectionStatus('idle')

        try {
            const res = await fetch('/api/whatsapp/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    api_key: apiKey,
                    instance_id: instanceId,
                }),
            })

            const data = await res.json()

            if (data.connected) {
                setConnectionStatus('connected')
                toast.success('Conexão estabelecida com sucesso!')
            } else {
                setConnectionStatus('error')
                toast.error(data.error || 'Falha na conexão. Verifique as credenciais.')
            }
        } catch (err) {
            setConnectionStatus('error')
            toast.error('Erro técnico ao testar conexão.')
        } finally {
            setTesting(false)
        }
    }

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    // Bloqueio para plano não suportado (exceto SUPER_ADMIN que tem acesso total)
    const isSuperAdmin = user?.role === 'SUPER_ADMIN'
    const hasWhatsAppAccess = isSuperAdmin || (config && ['PRO', 'ENTERPRISE'].includes(config.plan_type?.toUpperCase() || ''))

    if (!hasWhatsAppAccess) {
        return (
            <div className="p-6">
                <Card className="max-w-2xl mx-auto">
                    <CardContent className="pt-6 text-center space-y-4">
                        <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
                        <h2 className="text-xl font-semibold">Recurso Exclusivo</h2>
                        <p className="text-muted-foreground">
                            A integração com WhatsApp próprio está disponível apenas para os planos <strong>PRO</strong> e <strong>ENTERPRISE</strong>.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Plano atual: <strong>{config?.plan_type || 'Não identificado'}</strong>
                        </p>
                        <Button onClick={() => window.location.href = '/dashboard/planos'}>
                            Ver Planos
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-green-600" />
                    Configuração de WhatsApp
                </h1>
                <p className="text-muted-foreground">
                    Configure seu próprio provedor de WhatsApp para enviar mensagens diretamente.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Configurações do Provedor
                    </CardTitle>
                    <CardDescription>
                        Escolha seu provedor e configure as credenciais para remover a dependência da plataforma.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Provider Selection */}
                        <div className="space-y-2">
                            <Label>Provedor de WhatsApp</Label>
                            <Select value={provider} onValueChange={setProvider}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o provedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROVIDERS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label} {p.recommended ? '⭐ (Recomendado)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {provider !== 'NONE' && (
                            <>
                                {/* API Key */}
                                <div className="space-y-2">
                                    <Label htmlFor="api_key">
                                        {provider === 'OFFICIAL' ? 'Access Token' : 'API Key / Token'}
                                    </Label>
                                    <Input
                                        id="api_key"
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="Sua chave de API"
                                    />
                                </div>

                                {/* Instance ID */}
                                <div className="space-y-2">
                                    <Label htmlFor="instance_id">
                                        {provider === 'OFFICIAL' ? 'Phone Number ID' : 'Instance ID'}
                                    </Label>
                                    <Input
                                        id="instance_id"
                                        value={instanceId}
                                        onChange={(e) => setInstanceId(e.target.value)}
                                        placeholder={provider === 'OFFICIAL' ? 'Ex: 123456789012345' : 'Ex: instance-abc123'}
                                    />
                                </div>

                                {/* Business ID (only for Official) */}
                                {provider === 'OFFICIAL' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="business_id">WhatsApp Business Account ID</Label>
                                        <Input
                                            id="business_id"
                                            value={businessId}
                                            onChange={(e) => setBusinessId(e.target.value)}
                                            placeholder="Ex: 123456789012345"
                                        />
                                    </div>
                                )}

                                {/* Enable Toggle */}
                                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                    <div>
                                        <p className="font-medium">Ativar Integração</p>
                                        <p className="text-sm text-muted-foreground">
                                            Habilitar envio de mensagens por este provedor
                                        </p>
                                    </div>
                                    <Switch
                                        checked={enabled}
                                        onCheckedChange={setEnabled}
                                    />
                                </div>

                                {/* Connection Status */}
                                {connectionStatus !== 'idle' && (
                                    <div
                                        className={`flex items-center gap-2 p-3 rounded-lg ${connectionStatus === 'connected'
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-red-50 text-red-700'
                                            }`}
                                    >
                                        {connectionStatus === 'connected' ? (
                                            <>
                                                <CheckCircle2 className="w-5 h-5" />
                                                Conexão estabelecida com sucesso
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-5 h-5" />
                                                Falha na conexão - verifique as credenciais
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={testConnection}
                                        disabled={testing || !apiKey || !instanceId}
                                    >
                                        {testing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Testando...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4 mr-2" />
                                                Testar Conexão
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            'Salvar Configurações'
                                        )}
                                    </Button>
                                </div>
                            </>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Provider Comparison */}
            <div className="grid gap-4 md:grid-cols-3">
                <ProviderInfoCard
                    title="Z-API"
                    icon={Zap}
                    color="text-green-600"
                    profile="Clínicas Médias"
                    benefit="Facilidade de configuração e estabilidade"
                    link="https://z-api.io"
                />
                <ProviderInfoCard
                    title="Evolution API"
                    icon={Server}
                    color="text-blue-600"
                    profile="Tech / Enterprise"
                    benefit="Sem custo por mensagem (Docker)"
                    link="https://github.com/EvolutionAPI/evolution-api"
                />
                <ProviderInfoCard
                    title="WhatsApp Oficial"
                    icon={Shield}
                    color="text-emerald-600"
                    profile="Grandes Clínicas"
                    benefit="Estabilidade total, sem risco de banimento"
                    link="https://developers.facebook.com/docs/whatsapp"
                />
            </div>
        </div>
    )
}

function ProviderInfoCard({
    title,
    icon: Icon,
    color,
    profile,
    benefit,
    link,
}: {
    title: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    profile: string
    benefit: string
    link: string
}) {
    return (
        <Card className="bg-slate-50">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${color}`} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <p>
                    <strong>Perfil:</strong> {profile}
                </p>
                <p>
                    <strong>Vantagem:</strong> {benefit}
                </p>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-blue-900 font-semibold mb-1">💰 Taxas e Custos</p>
                    <p className="text-xs text-blue-800">
                        • Taxa de implantação: <strong>R$ 150,00</strong><br />
                        • Custos da API: <strong>Pagos pelo contratante</strong>
                    </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <p className="text-amber-900 font-semibold mb-1">📞 Suporte para Configuração</p>
                    <p className="text-xs text-amber-800">
                        Entre em contato para configuração e instalação.
                    </p>
                </div>

                <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                    Documentação <ExternalLink className="w-3 h-3" />
                </a>
            </CardContent>
        </Card>
    )
}

