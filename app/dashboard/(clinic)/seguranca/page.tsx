'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Lock, Eye, EyeOff, Loader2, Mail, CheckCircle2, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SecuritySettingsPage() {
    const [userEmail, setUserEmail] = useState<string>('')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
    const [isSendingResetEmail, setIsSendingResetEmail] = useState(false)

    useEffect(() => {
        async function loadUser() {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.email) {
                    setUserEmail(user.email)
                }
            } catch (err) {
                console.error('Erro ao obter usuário:', err)
            }
        }
        loadUser()
    }, [])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!currentPassword) {
            toast.error('Informe sua senha atual.')
            return
        }

        if (!newPassword) {
            toast.error('Informe a nova senha.')
            return
        }

        if (newPassword.length < 8) {
            toast.error('A nova senha deve ter no mínimo 8 caracteres.')
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error('A nova senha e a confirmação não coincidem.')
            return
        }

        setIsUpdatingPassword(true)
        try {
            const res = await fetch('/api/profile/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            })

            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                throw new Error(data.error || 'Falha ao atualizar senha')
            }

            toast.success('Senha atualizada com sucesso.')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            toast.error(error.message || 'Erro ao alterar senha. Verifique sua senha atual.')
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    const handleSendResetEmail = async () => {
        if (!userEmail) {
            toast.error('E-mail do usuário não identificado.')
            return
        }

        setIsSendingResetEmail(true)
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail }),
            })

            const data = await res.json().catch(() => ({}))

            if (!res.ok || data?.success === false) {
                const errMsg = data?.error?.message || data?.error || 'Erro ao enviar e-mail de redefinição.'
                throw new Error(errMsg)
            }

            toast.success(`Link de redefinição enviado para ${userEmail}. Verifique sua caixa de entrada e spam.`)
        } catch (error: any) {
            toast.error(error.message || 'Erro ao enviar e-mail de redefinição.')
        } finally {
            setIsSendingResetEmail(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto px-4 py-6 sm:py-8">
            {/* Cabeçalho editorial padrão CliniGo */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Configurações de Segurança</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Gerencie a senha e a proteção de acesso da sua conta administrativa
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Alteração Direta de Senha */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
                            <Lock className="h-5 w-5 text-primary" />
                            Alterar Senha
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            Atualize sua senha de acesso diretamente ou solicite um link oficial de redefinição por e-mail.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                            <div className="space-y-1.5">
                                <Label htmlFor="current-password" className="text-xs font-semibold text-foreground">
                                    Senha Atual *
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="current-password"
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Digite sua senha atual"
                                        className="min-h-[44px] text-sm pr-11"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        aria-label="Alternar exibição da senha atual"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="new-password" className="text-xs font-semibold text-foreground">
                                    Nova Senha (mínimo 8 caracteres) *
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Crie uma nova senha segura"
                                        className="min-h-[44px] text-sm pr-11"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        aria-label="Alternar exibição da nova senha"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="confirm-password" className="text-xs font-semibold text-foreground">
                                    Confirmar Nova Senha *
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repita a nova senha"
                                        className="min-h-[44px] text-sm pr-11"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label="Alternar exibição da confirmação de senha"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <Button
                                    type="submit"
                                    disabled={isUpdatingPassword}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] px-5 font-medium"
                                >
                                    {isUpdatingPassword ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Atualizando...
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound className="w-4 h-4 mr-2" />
                                            Salvar Nova Senha
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSendResetEmail}
                                    disabled={isSendingResetEmail || !userEmail}
                                    className="border-border text-foreground hover:bg-muted min-h-[44px] px-4 font-medium"
                                >
                                    {isSendingResetEmail ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enviando link...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                                            Redefinir por E-mail
                                        </>
                                    )}
                                </Button>
                            </div>

                            {userEmail && (
                                <p className="text-xs text-muted-foreground pt-1">
                                    O link oficial de redefinição (válido por 1 hora) será enviado para: <strong className="text-foreground">{userEmail}</strong>
                                </p>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {/* Diretrizes de Segurança Corporativa */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Shield className="h-4 w-4 text-primary" />
                            Diretrizes de Segurança e LGPD
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span>Utilize ao menos 8 caracteres com combinação de letras maiúsculas, minúsculas e números.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span>Evite a reutilização de credenciais adotadas em sistemas externos não protegidos.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span>Credenciais são pessoais e intransferíveis, em conformidade com as normas do CRP, CRFa, CREFITO, CFM e LGPD.</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
