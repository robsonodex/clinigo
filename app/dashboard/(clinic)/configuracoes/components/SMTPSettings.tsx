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
    CheckCircle,
    Eye,
    EyeOff,
    AlertCircle,
    Settings2
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

export function SMTPSettings() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [testEmail, setTestEmail] = useState('')
    const [config, setConfig] = useState<SMTPConfig>({
        smtp_host: '',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: '',
        smtp_password: '',
        smtp_from_name: '',
        smtp_from_email: '',
        smtp_enabled: false
    })

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        try {
            const response = await fetch('/api/clinics/smtp')
            const data = await response.json()
            if (data.success && data.config) {
                setConfig({ ...config, ...data.config })
            }
        } catch (error) {
            console.error('Erro ao carregar configurações SMTP:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
            toast.error('Preencha todos os campos obrigatórios')
            return
        }

        setIsSaving(true)
        try {
            const response = await fetch('/api/clinics/smtp', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            const data = await response.json()
            if (data.success) {
                toast.success('Configurações SMTP salvas com sucesso!')
            } else {
                toast.error(data.error || 'Erro ao salvar configurações')
            }
        } catch (error) {
            toast.error('Erro ao salvar configurações')
        } finally {
            setIsSaving(false)
        }
    }

    const handleTest = async () => {
        if (!testEmail) {
            toast.error('Digite um e-mail para teste')
            return
        }

        setIsTesting(true)
        try {
            const response = await fetch('/api/clinics/smtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtp_host: config.smtp_host,
                    smtp_port: config.smtp_port,
                    smtp_user: config.smtp_user,
                    smtp_password: config.smtp_password,
                    test_email: testEmail
                })
            })
            const data = await response.json()
            if (data.success) {
                toast.success('E-mail de teste enviado com sucesso!')
            } else {
                toast.error(data.error || 'Erro ao enviar e-mail de teste')
            }
        } catch (error) {
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
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Configuração de E-mail (SMTP)
                            </CardTitle>
                            <CardDescription>
                                Configure seu servidor SMTP para envio de e-mails personalizados
                            </CardDescription>
                        </div>
                        <Badge variant={config.smtp_enabled ? 'default' : 'secondary'}>
                            {config.smtp_enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">E-mails personalizados com sua marca</p>
                            <p>Configure seu próprio servidor SMTP para que os e-mails aos pacientes sejam enviados com o nome e endereço da sua clínica.</p>
                        </div>
                    </div>

                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <p className="font-medium">Ativar SMTP Próprio</p>
                            <p className="text-sm text-muted-foreground">Use seu servidor de e-mail ao invés do padrão</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.smtp_enabled}
                                onChange={(e) => setConfig({ ...config, smtp_enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {/* Server Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            Servidor SMTP
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="smtp_host">Servidor SMTP *</Label>
                                <Input
                                    id="smtp_host"
                                    value={config.smtp_host}
                                    onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                                    placeholder="smtp.seuservidor.com"
                                />
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
                                checked={config.smtp_secure}
                                onChange={(e) => setConfig({ ...config, smtp_secure: e.target.checked })}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <span className="text-sm">Usar SSL/TLS (recomendado para porta 465)</span>
                        </label>
                    </div>

                    {/* Authentication */}
                    <div className="space-y-4 border-t pt-6">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            Autenticação
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="smtp_user">Usuário/E-mail *</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="smtp_user"
                                        value={config.smtp_user}
                                        onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                                        placeholder="seu-email@servidor.com"
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="smtp_password">Senha *</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="smtp_password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={config.smtp_password}
                                        onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                                        placeholder="••••••••"
                                        className="pl-10 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sender Settings */}
                    <div className="space-y-4 border-t pt-6">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <Send className="h-4 w-4 text-muted-foreground" />
                            Remetente
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="smtp_from_name">Nome do Remetente</Label>
                                <Input
                                    id="smtp_from_name"
                                    value={config.smtp_from_name}
                                    onChange={(e) => setConfig({ ...config, smtp_from_name: e.target.value })}
                                    placeholder="Nome da Clínica"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="smtp_from_email">E-mail do Remetente</Label>
                                <Input
                                    id="smtp_from_email"
                                    type="email"
                                    value={config.smtp_from_email}
                                    onChange={(e) => setConfig({ ...config, smtp_from_email: e.target.value })}
                                    placeholder="contato@suaclinica.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Test Section */}
                    <div className="space-y-4 border-t pt-6">
                        <h3 className="text-sm font-medium">Testar Configuração</h3>
                        <div className="flex gap-3">
                            <Input
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder="Digite um e-mail para receber o teste"
                                className="flex-1"
                            />
                            <Button
                                onClick={handleTest}
                                disabled={isTesting || !testEmail}
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

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
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
