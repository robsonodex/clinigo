'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    Mail,
    Server,
    Lock,
    User,
    Send,
    Loader2,
    CheckCircle2,
    Eye,
    EyeOff,
    AlertCircle,
} from 'lucide-react'

interface SMTPConfig {
    smtp_host: string
    smtp_port: number
    smtp_secure: boolean
    smtp_user: string
    smtp_password: string
    smtp_from_name: string
    smtp_from_email: string
    smtp_enabled: boolean
}

const DEFAULT_SMTP_CONFIG: SMTPConfig = {
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_password: '',
    smtp_from_name: '',
    smtp_from_email: '',
    smtp_enabled: false,
}

function normalizeSmtpConfig(raw: Record<string, unknown> | null | undefined): SMTPConfig {
    if (!raw || typeof raw !== 'object') return DEFAULT_SMTP_CONFIG
    const port = typeof raw.smtp_port === 'number' && raw.smtp_port > 0 ? raw.smtp_port : 587
    return {
        smtp_host: typeof raw.smtp_host === 'string' ? raw.smtp_host : '',
        smtp_port: port,
        smtp_secure: typeof raw.smtp_secure === 'boolean' ? raw.smtp_secure : port === 465,
        smtp_user: typeof raw.smtp_user === 'string' ? raw.smtp_user : '',
        smtp_password: typeof raw.smtp_password === 'string' ? raw.smtp_password : '',
        smtp_from_name: typeof raw.smtp_from_name === 'string' ? raw.smtp_from_name : '',
        smtp_from_email: typeof raw.smtp_from_email === 'string' ? raw.smtp_from_email : '',
        smtp_enabled: Boolean(raw.smtp_enabled),
    }
}

export function SMTPSettings() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [testEmail, setTestEmail] = useState('')
    const [isSaved, setIsSaved] = useState(false)
    const [hasStoredPassword, setHasStoredPassword] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [config, setConfig] = useState<SMTPConfig>(DEFAULT_SMTP_CONFIG)

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        try {
            const response = await fetch('/api/clinics/smtp')
            const data = await response.json()
            if (data.success && data.data?.config) {
                const fetchedRaw = data.data.config
                const normalized = normalizeSmtpConfig(fetchedRaw)
                setConfig(normalized)
                setHasStoredPassword(Boolean(fetchedRaw.smtp_password_set))
                if (normalized.smtp_host && normalized.smtp_enabled) {
                    setIsSaved(true)
                }
            }
        } catch (error) {
            console.error('Erro ao carregar configurações SMTP:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const smtpHost = config.smtp_host || ''
    const hostContainsAt = smtpHost.includes('@')

    const handleSave = async () => {
        const trimmedHost = smtpHost.trim()
        const trimmedUser = (config.smtp_user || '').trim()
        const passwordToSend = config.smtp_password || ''

        if (!trimmedHost || !trimmedUser || (!passwordToSend && !hasStoredPassword)) {
            toast.error('Preencha todos os campos obrigatórios (Servidor SMTP, Usuário e Senha).')
            return
        }

        if (trimmedHost.includes('@')) {
            toast.error('O campo Servidor SMTP aceita apenas o endereço do servidor de e-mail (ex: smtp.gmail.com). Endereços de e-mail devem ser informados no campo Usuário/E-mail.')
            return
        }

        setIsSaving(true)
        setIsSaved(false)
        try {
            const payload: Record<string, unknown> = {
                smtp_enabled: Boolean(config.smtp_enabled),
                smtp_host: trimmedHost,
                smtp_port: config.smtp_port || 587,
                smtp_secure: Boolean(config.smtp_secure),
                smtp_user: trimmedUser,
                smtp_from_name: (config.smtp_from_name || '').trim(),
                smtp_from_email: (config.smtp_from_email || '').trim(),
            }
            if (passwordToSend) {
                payload.smtp_password = passwordToSend
            }

            const response = await fetch('/api/clinics/smtp', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await response.json()
            if (data.success) {
                toast.success('Configurações SMTP salvas com sucesso!')
                setIsSaved(true)
                setLastSavedAt(new Date())
                await fetchConfig()
            } else {
                const errorMessage = typeof data.error === 'object' ? data.error?.message : data.error
                toast.error(errorMessage || 'Erro ao salvar configurações')
                setIsSaved(false)
            }
        } catch {
            toast.error('Erro ao salvar configurações')
            setIsSaved(false)
        } finally {
            setIsSaving(false)
        }
    }

    const handleTest = async () => {
        if (!testEmail.trim()) {
            toast.error('Digite um e-mail para teste')
            return
        }

        if (!smtpHost.trim() || !(config.smtp_user || '').trim()) {
            toast.error('Preencha Servidor SMTP e Usuário antes de enviar o teste.')
            return
        }

        setIsTesting(true)
        try {
            const response = await fetch('/api/clinics/smtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtp_host: smtpHost.trim(),
                    smtp_port: config.smtp_port || 587,
                    smtp_user: (config.smtp_user || '').trim(),
                    smtp_password: config.smtp_password || '',
                    test_email: testEmail.trim(),
                }),
            })
            const data = await response.json()
            if (data.success) {
                toast.success('E-mail de teste enviado com sucesso!')
            } else {
                const errorMessage = typeof data.error === 'object' ? data.error?.message : data.error
                toast.error(errorMessage || 'Erro ao enviar e-mail de teste')
            }
        } catch {
            toast.error('Erro ao enviar e-mail de teste')
        } finally {
            setIsTesting(false)
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-primary" />
                                Configuração de E-mail (SMTP)
                            </CardTitle>
                            <CardDescription>
                                Configure seu servidor SMTP para envio de e-mails personalizados com o domínio da clínica.
                            </CardDescription>
                        </div>
                        <Badge variant={config.smtp_enabled ? 'success' : 'secondary'}>
                            {config.smtp_enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Indicador de sucesso quando configurado */}
                    {isSaved && smtpHost && (
                        <div className="bg-accent/50 border border-primary/25 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div className="text-sm text-foreground">
                                <p className="font-semibold mb-1">SMTP configurado com sucesso</p>
                                <p className="text-muted-foreground">
                                    Suas configurações estão salvas. Os e-mails serão enviados utilizando seu servidor SMTP próprio.
                                </p>
                                {lastSavedAt && (
                                    <p className="text-xs text-primary mt-1 tabular-nums">
                                        Último salvamento: {lastSavedAt.toLocaleTimeString('pt-BR')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Orientação inicial quando ainda não configurado */}
                    {!isSaved && (
                        <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div className="text-sm text-foreground">
                                <p className="font-semibold mb-1">E-mails personalizados com sua marca</p>
                                <p className="text-muted-foreground">
                                    Configure seu próprio servidor SMTP para que as notificações aos pacientes sejam enviadas com o nome e endereço da sua clínica.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Ativar / Desativar SMTP */}
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
                        <div>
                            <p className="font-medium text-foreground">Ativar SMTP Próprio</p>
                            <p className="text-sm text-muted-foreground">
                                Use seu servidor de e-mail em vez do servidor padrão do sistema
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean(config.smtp_enabled)}
                                onChange={(e) => setConfig({ ...config, smtp_enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                        </label>
                    </div>

                    {/* Servidor SMTP */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <Server className="h-4 w-4 text-primary" />
                            Servidor SMTP
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="smtp_host">Servidor SMTP *</Label>
                                <Input
                                    id="smtp_host"
                                    value={smtpHost}
                                    onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                                    placeholder="smtp.seuservidor.com"
                                    className={hostContainsAt ? 'border-destructive focus-visible:ring-destructive' : ''}
                                />
                                {hostContainsAt ? (
                                    <p className="text-xs text-destructive mt-1">
                                        Informe o endereço do servidor, não o e-mail. Exemplo: smtp.gmail.com
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Endereço do servidor de e-mail. Exemplos: smtp.gmail.com, smtp.office365.com, email-ssl.com.br
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Porta *</Label>
                                <div className="flex gap-2">
                                    {[587, 465, 25].map((port) => (
                                        <Button
                                            key={port}
                                            type="button"
                                            variant={config.smtp_port === port ? 'default' : 'outline'}
                                            onClick={() => setConfig({ ...config, smtp_port: port, smtp_secure: port === 465 })}
                                        >
                                            {port}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean(config.smtp_secure)}
                                onChange={(e) => setConfig({ ...config, smtp_secure: e.target.checked })}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <span className="text-sm text-foreground">Usar SSL/TLS (recomendado para porta 465)</span>
                        </label>
                    </div>

                    {/* Autenticação */}
                    <div className="space-y-4 border-t border-border pt-6">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <Lock className="h-4 w-4 text-primary" />
                            Autenticação
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="smtp_user">Usuário / E-mail *</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="smtp_user"
                                        value={config.smtp_user || ''}
                                        onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                                        placeholder="seu-email@servidor.com"
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="smtp_password">
                                    Senha {hasStoredPassword ? '(salva — preencha apenas para alterar)' : '*'}
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="smtp_password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={config.smtp_password || ''}
                                        onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                                        placeholder={hasStoredPassword ? 'Senha já configurada' : '••••••••'}
                                        className="pl-10 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Remetente */}
                    <div className="space-y-4 border-t border-border pt-6">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <Send className="h-4 w-4 text-primary" />
                            Remetente
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="smtp_from_name">Nome do Remetente</Label>
                                <Input
                                    id="smtp_from_name"
                                    value={config.smtp_from_name || ''}
                                    onChange={(e) => setConfig({ ...config, smtp_from_name: e.target.value })}
                                    placeholder="Nome da Clínica"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="smtp_from_email">E-mail do Remetente</Label>
                                <Input
                                    id="smtp_from_email"
                                    type="email"
                                    value={config.smtp_from_email || ''}
                                    onChange={(e) => setConfig({ ...config, smtp_from_email: e.target.value })}
                                    placeholder="contato@suaclinica.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Testar Configuração */}
                    <div className="space-y-4 border-t border-border pt-6">
                        <h3 className="text-sm font-semibold text-foreground">Testar Configuração</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder="Digite um e-mail para receber o teste"
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                onClick={handleTest}
                                disabled={isTesting || !testEmail.trim()}
                                variant="outline"
                            >
                                {isTesting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                Enviar Teste
                            </Button>
                        </div>
                    </div>

                    {/* Salvar */}
                    <div className="flex justify-end pt-4 border-t border-border">
                        <Button type="button" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Salvar Configurações
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
