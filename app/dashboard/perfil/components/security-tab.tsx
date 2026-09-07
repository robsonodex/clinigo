'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Check, X, Lock, ShieldCheck, Mail } from 'lucide-react'
import { passwordSchema, emailChangeSchema, type PasswordFormData, type EmailChangeFormData } from '@/lib/validations/profile-schema'

export default function SecurityTab() {
    const [loading, setLoading] = useState(false)
    const [emailLoading, setEmailLoading] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [showEmailChange, setShowEmailChange] = useState(false)

    const form = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    })

    const emailForm = useForm<EmailChangeFormData>({
        resolver: zodResolver(emailChangeSchema),
        defaultValues: {
            newEmail: '',
        },
    })

    const newPassword = form.watch('newPassword')

    const getPasswordStrength = (password: string) => {
        if (!password) return { score: 0, label: 'Não informada', color: 'bg-muted' }

        let score = 0
        if (password.length >= 8) score += 25
        if (password.length >= 12) score += 25
        if (/[A-Z]/.test(password)) score += 15
        if (/[a-z]/.test(password)) score += 10
        if (/[0-9]/.test(password)) score += 15
        if (/[^A-Za-z0-9]/.test(password)) score += 10

        if (score < 40) return { score, label: 'Fraca', color: 'bg-red-500' }
        if (score < 60) return { score, label: 'Média', color: 'bg-amber-500' }
        if (score < 80) return { score, label: 'Boa', color: 'bg-blue-500' }
        return { score, label: 'Excelente', color: 'bg-emerald-600' }
    }

    const passwordStrength = getPasswordStrength(newPassword)

    const passwordRequirements = [
        { met: newPassword.length >= 8, label: 'Mínimo 8 caracteres' },
        { met: /[A-Z]/.test(newPassword), label: 'Ao menos uma letra maiúscula' },
        { met: /[0-9]/.test(newPassword), label: 'Ao menos um número' },
        { met: /[^A-Za-z0-9]/.test(newPassword), label: 'Ao menos um caractere especial (!@#$)' },
    ]

    async function onSubmitPassword(data: PasswordFormData) {
        setLoading(true)
        try {
            const res = await fetch('/api/profile/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                toast.success('Senha atualizada com sucesso!')
                form.reset()
            } else {
                const error = await res.json()
                toast.error(error.error || 'Erro ao alterar senha. Verifique sua senha atual.')
            }
        } catch (error) {
            toast.error('Erro de conexão ao alterar senha')
        } finally {
            setLoading(false)
        }
    }

    async function onSubmitEmail(data: EmailChangeFormData) {
        setEmailLoading(true)
        try {
            const res = await fetch('/api/profile/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                toast.success('E-mail de confirmação enviado para o novo endereço!')
                emailForm.reset()
                setShowEmailChange(false)
            } else {
                const error = await res.json()
                toast.error(error.error || 'Erro ao solicitar alteração de e-mail')
            }
        } catch (error) {
            toast.error('Erro de conexão ao alterar e-mail')
        } finally {
            setEmailLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Card Principal: Alterar Senha */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4 border-b">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-foreground">Alterar Senha de Acesso</CardTitle>
                            <CardDescription>Para sua segurança, informe sua senha atual antes de cadastrar a nova</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitPassword)} className="space-y-5">
                            {/* Senha Atual */}
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-sm font-medium text-foreground">Senha Atual *</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    {...field}
                                                    type={showCurrentPassword ? 'text' : 'password'}
                                                    placeholder="Digite sua senha atual"
                                                    className="h-10 pr-10"
                                                    autoComplete="current-password"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    tabIndex={-1}
                                                >
                                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Nova Senha */}
                                <FormField
                                    control={form.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-sm font-medium text-foreground">Nova Senha *</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        {...field}
                                                        type={showNewPassword ? 'text' : 'password'}
                                                        placeholder="Crie sua nova senha"
                                                        className="h-10 pr-10"
                                                        autoComplete="new-password"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        tabIndex={-1}
                                                    >
                                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Confirmar Nova Senha */}
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-sm font-medium text-foreground">Confirmar Nova Senha *</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        {...field}
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        placeholder="Repita a nova senha"
                                                        className="h-10 pr-10"
                                                        autoComplete="new-password"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        tabIndex={-1}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Indicador de Força e Requisitos */}
                            {newPassword && (
                                <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-3">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Segurança da Senha:</span>
                                            <span className="font-semibold text-foreground">{passwordStrength.label}</span>
                                        </div>
                                        <Progress value={passwordStrength.score} className="h-1.5" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                                        {passwordRequirements.map((req, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5">
                                                {req.met ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                ) : (
                                                    <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                )}
                                                <span className={req.met ? 'text-emerald-700 font-medium' : 'text-muted-foreground'}>
                                                    {req.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => form.reset()}
                                    disabled={loading}
                                    className="min-h-[44px]"
                                >
                                    Limpar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="min-h-[44px] px-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Atualizando senha...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                            Atualizar Senha
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Card Secundario: Alterar E-mail de Login */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-foreground">Alteração de E-mail de Login</CardTitle>
                                <CardDescription className="text-xs">
                                    Caso precise transferir sua conta para outro endereço de e-mail corporativo
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowEmailChange(!showEmailChange)}
                            className="text-xs"
                        >
                            {showEmailChange ? 'Ocultar' : 'Alterar E-mail'}
                        </Button>
                    </div>
                </CardHeader>

                {showEmailChange && (
                    <CardContent className="pt-2 border-t">
                        <Form {...emailForm}>
                            <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4 pt-3">
                                <FormField
                                    control={emailForm.control}
                                    name="newEmail"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-sm font-medium text-foreground">Novo Endereço de E-mail *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="email"
                                                    placeholder="novo-email@clinigo.app"
                                                    className="h-10"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Um link de confirmação será encaminhado para a nova caixa postal.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowEmailChange(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={emailLoading}
                                    >
                                        {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Enviar Confirmação
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
