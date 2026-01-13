'use client'

import { useState, useEffect } from 'react'
import { Mail, Server, Lock, User, Send, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface SMTPConfig {
    host: string
    port: number
    secure: boolean
    user: string
    password: string
    from_name: string
    from_email: string
    admin_notification_email: string
}

export default function SMTPConfigPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [testEmail, setTestEmail] = useState('')
    const [config, setConfig] = useState<SMTPConfig>({
        host: '',
        port: 587,
        secure: false,
        user: '',
        password: '',
        from_name: 'CliniGo',
        from_email: '',
        admin_notification_email: ''
    })

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        try {
            const response = await fetch('/api/super-admin/smtp-config')
            const data = await response.json()

            if (data.success && data.config) {
                setConfig({
                    ...config,
                    ...data.config
                })
            }
        } catch (error) {
            console.error('Error fetching SMTP config:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        if (!config.host || !config.user || !config.password) {
            toast.error('Preencha todos os campos obrigatórios')
            return
        }

        setIsSaving(true)

        try {
            const response = await fetch('/api/super-admin/smtp-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })

            const data = await response.json()

            if (data.success) {
                toast.success(data.message)
            } else {
                toast.error(data.error?.message || 'Erro ao salvar configurações')
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
            const response = await fetch('/api/super-admin/smtp-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testEmail })
            })

            const data = await response.json()

            if (data.success) {
                toast.success(data.message)
            } else {
                toast.error(data.error?.message || 'Erro ao enviar e-mail de teste')
            }
        } catch (error) {
            toast.error('Erro ao enviar e-mail de teste')
        } finally {
            setIsTesting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Mail className="h-8 w-8 text-emerald-600" />
                    <h1 className="text-2xl font-bold text-gray-900">Configuração de E-mail (SMTP)</h1>
                </div>
                <p className="text-gray-600">
                    Configure o servidor SMTP para envio de e-mails transacionais
                </p>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Apenas Super Admin</p>
                    <p>Esta configuração é global e afeta todos os e-mails enviados pelo sistema.</p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-6 space-y-6">
                    {/* Server Settings */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <Server className="h-5 w-5 text-gray-500" />
                            Servidor SMTP
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Servidor SMTP *
                                </label>
                                <input
                                    type="text"
                                    value={config.host}
                                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="smtp.exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Porta *
                                </label>
                                <div className="flex gap-2">
                                    {[587, 465, 25].map((port) => (
                                        <button
                                            key={port}
                                            type="button"
                                            onClick={() => setConfig({ ...config, port, secure: port === 465 })}
                                            className={`px-4 py-2 rounded-lg border transition-colors ${config.port === port
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            {port}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.secure}
                                    onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-700">Usar SSL/TLS (recomendado para porta 465)</span>
                            </label>
                        </div>
                    </div>

                    {/* Authentication */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <Lock className="h-5 w-5 text-gray-500" />
                            Autenticação
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Usuário/E-mail *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={config.user}
                                        onChange={(e) => setConfig({ ...config, user: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="usuario@exemplo.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Senha *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={config.password}
                                        onChange={(e) => setConfig({ ...config, password: e.target.value })}
                                        className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sender Settings */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <Send className="h-5 w-5 text-gray-500" />
                            Remetente Padrão
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome do Remetente
                                </label>
                                <input
                                    type="text"
                                    value={config.from_name}
                                    onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="CliniGo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    E-mail do Remetente
                                </label>
                                <input
                                    type="email"
                                    value={config.from_email}
                                    onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="noreply@clinigo.app"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                E-mail para Notificações Admin
                            </label>
                            <input
                                type="email"
                                value={config.admin_notification_email}
                                onChange={(e) => setConfig({ ...config, admin_notification_email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="admin@clinigo.app"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Este e-mail receberá notificações de novas clínicas cadastradas
                            </p>
                        </div>
                    </div>

                    {/* Test Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Testar Configuração</h3>
                        <div className="flex gap-3">
                            <input
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Digite um e-mail para receber o teste"
                            />
                            <button
                                onClick={handleTest}
                                disabled={isTesting || !testEmail}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTesting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Enviar Teste
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                Salvar Configurações
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
