'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react'
import { passwordSchema, type PasswordFormData } from '@/lib/validations/profile-schema'

export default function SecurityTab() {
    const [loading, setLoading] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const form = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    })

    const newPassword = form.watch('newPassword')

    // Calculadora de força de senha
    const getPasswordStrength = (password: string) => {
        if (!password) return { score: 0, label: 'Muito fraca', color: 'bg-destructive' }

        let score = 0
        if (password.length >= 8) score += 25
        if (password.length >= 12) score += 25
        if (/[A-Z]/.test(password)) score += 15
        if (/[a-z]/.test(password)) score += 10
        if (/[0-9]/.test(password)) score += 15
        if (/[^A-Za-z0-9]/.test(password)) score += 10

        if (score < 40) return { score, label: 'Fraca', color: 'bg-red-500' }
        if (score < 60) return { score, label: 'Média', color: 'bg-yellow-500' }
        if (score < 80) return { score, label: 'Boa', color: 'bg-blue-500' }
        return { score, label: 'Excelente', color: 'bg-green-500' }
    }

    const passwordStrength = getPasswordStrength(newPassword)

    const passwordRequirements = [
        { met: newPassword.length >= 8, label: 'Mínimo 8 caracteres' },
        { met: /[A-Z]/.test(newPassword), label: 'Uma letra maiúscula' },
        { met: /[0-9]/.test(newPassword), label: 'Um número' },
        { met: /[^A-Za-z0-9]/.test(newPassword), label: 'Um caractere especial' },
    ]

    async function onSubmit(data: PasswordFormData) {
        setLoading(true)
        try {
            const res = await fetch('/api/profile/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                toast.success('Senha alterada com sucesso!')
                form.reset()
            } else {
                const error = await res.json()
                toast.error(error.error || 'Erro ao alterar senha')
            }
        } catch (error) {
            toast.error('Erro ao alterar senha')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Alterar Senha */}
            <Card>
                <CardHeader>
                    <CardTitle>Alterar Senha</CardTitle>
                    <CardDescription>
                        Mantenha sua conta segura com uma senha forte
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha Atual *</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    {...field}
                                                    type={showCurrentPassword ? 'text' : 'password'}
                                                    placeholder="Digite sua senha atual"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                >
                                                    {showCurrentPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nova Senha *</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    {...field}
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    placeholder="Digite sua nova senha"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                >
                                                    {showNewPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Indicador de força */}
                            {newPassword && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Força da senha:</span>
                                        <span className="font-medium">{passwordStrength.label}</span>
                                    </div>
                                    <Progress value={passwordStrength.score} className="h-2" />
                                </div>
                            )}

                            {/* Requisitos */}
                            {newPassword && (
                                <div className="p-4 rounded-lg bg-muted space-y-2">
                                    <p className="text-sm font-medium">Requisitos:</p>
                                    {passwordRequirements.map((req, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            {req.met ? (
                                                <Check className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <X className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                                                {req.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmar Nova Senha *</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    {...field}
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    placeholder="Digite novamente a nova senha"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => form.reset()}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Atualizar Senha
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* MFA - Placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Autenticação de Dois Fatores (2FA)</CardTitle>
                    <CardDescription>
                        Adicione uma camada extra de segurança
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Em breve: Configure autenticação de dois fatores com aplicativo autenticador
                    </p>
                </CardContent>
            </Card>

            {/* Activity Log - Placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Atividades</CardTitle>
                    <CardDescription>
                        Últimos acessos e ações na sua conta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Em breve: Visualização de histórico de logins e atividades
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
