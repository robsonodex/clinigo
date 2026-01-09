'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Save, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const smtpSchema = z.object({
    host: z.string().min(1, 'Host é obrigatório'),
    port: z.string().regex(/^\d+$/, 'Porta deve ser um número'),
    user: z.string().min(1, 'Usuário é obrigatório'),
    password: z.string().min(1, 'Senha é obrigatória'),
    secure: z.boolean().default(false),
    from_email: z.string().email('Email inválido'),
    from_name: z.string().min(1, 'Nome do remetente é obrigatório'),
})

type SmtpData = z.infer<typeof smtpSchema>

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(false)
    const [testing, setTesting] = useState(false)
    const [activeTab, setActiveTab] = useState('smtp')

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isDirty },
    } = useForm<SmtpData>({
        resolver: zodResolver(smtpSchema),
        defaultValues: {
            host: '',
            port: '587',
            user: '',
            password: '',
            secure: false,
            from_email: '',
            from_name: 'CliniGo',
        },
    })

    const isSecure = watch('secure')

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/admin/settings')
                if (res.ok) {
                    const data = await res.json()
                    if (data.data?.smtp_settings) {
                        const smtp = data.data.smtp_settings
                        setValue('host', smtp.host || '')
                        setValue('port', smtp.port ? String(smtp.port) : '587')
                        setValue('user', smtp.user || '')
                        setValue('password', smtp.password || '')
                        setValue('secure', !!smtp.secure)
                        setValue('from_email', smtp.from_email || '')
                        setValue('from_name', smtp.from_name || 'CliniGo')
                    }
                }
            } catch (err) {
                console.error('Failed to fetch settings:', err)
            }
        }
        fetchSettings()
    }, [setValue])

    const onSubmit = async (data: SmtpData) => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'smtp_settings',
                    value: {
                        ...data,
                        port: parseInt(data.port)
                    }
                })
            })

            if (res.ok) {
                toast.success('Configurações de SMTP salvas!')
            } else {
                toast.error('Erro ao salvar configurações')
            }
        } catch (err) {
            toast.error('Erro de rede ao salvar')
        } finally {
            setLoading(false)
        }
    }

    const testConnection = async () => {
        const data = watch()
        setTesting(true)
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'smtp_settings',
                    value: {
                        ...data,
                        port: parseInt(data.port)
                    },
                    testConnection: true
                })
            })

            const result = await res.json()
            if (result.success) {
                toast.success('Conexão SMTP bem-sucedida!', {
                    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
                })
            } else {
                toast.error('Falha no teste: ' + result.message, {
                    icon: <AlertCircle className="w-4 h-4 text-red-500" />
                })
            }
        } catch (err) {
            toast.error('Erro de rede ao testar')
        } finally {
            setTesting(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
                <p className="text-muted-foreground">
                    Gerencie parâmetros globais da plataforma
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="smtp">Email (SMTP)</TabsTrigger>
                    <TabsTrigger value="general">Geral</TabsTrigger>
                </TabsList>

                <TabsContent value="smtp" className="mt-6">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Servidor SMTP</CardTitle>
                                        <CardDescription>
                                            Configure as credenciais para envio de e-mails automáticos.
                                        </CardDescription>
                                    </div>
                                    <Mail className="w-8 h-8 text-primary/50" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="host">Host SMTP</Label>
                                        <Input id="host" placeholder="smtp.exemplo.com" {...register('host')} />
                                        {errors.host && <p className="text-xs text-destructive">{errors.host.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="port">Porta</Label>
                                        <Input id="port" placeholder="587" {...register('port')} />
                                        {errors.port && <p className="text-xs text-destructive">{errors.port.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="user">Usuário / Email</Label>
                                        <Input id="user" placeholder="usuario@exemplo.com" {...register('user')} />
                                        {errors.user && <p className="text-xs text-destructive">{errors.user.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Senha</Label>
                                        <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
                                        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 py-2">
                                    <Switch
                                        id="secure"
                                        checked={isSecure}
                                        onCheckedChange={(checked) => setValue('secure', checked)}
                                    />
                                    <Label htmlFor="secure">Usar Conexão Segura (SSL/TLS)</Label>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="space-y-2">
                                        <Label htmlFor="from_email">Email do Remetente</Label>
                                        <Input id="from_email" placeholder="nao-responda@clinigo.com.br" {...register('from_email')} />
                                        {errors.from_email && <p className="text-xs text-destructive">{errors.from_email.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="from_name">Nome do Remetente</Label>
                                        <Input id="from_name" placeholder="CliniGo Notificações" {...register('from_name')} />
                                        {errors.from_name && <p className="text-xs text-destructive">{errors.from_name.message}</p>}
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-between items-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={testConnection}
                                        disabled={testing}
                                    >
                                        {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                                        Testar Conexão
                                    </Button>

                                    <Button type="submit" disabled={loading || !isDirty}>
                                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </TabsContent>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações Gerais</CardTitle>
                            <CardDescription>Parâmetros globais do sistema (em breve).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground italic">
                                Outras configurações serão adicionadas aqui.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

