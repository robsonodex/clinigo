'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Lock, ExternalLink } from 'lucide-react'

export default function SecuritySettingsPage() {
    const handlePasswordReset = () => {
        // Redirect to password recovery page
        window.location.href = '/recuperar-senha'
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Configurações de Segurança</h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gerencie a segurança da sua conta</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Password Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Alterar Senha
                        </CardTitle>
                        <CardDescription>
                            Atualize sua senha regularmente para manter sua conta segura
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handlePasswordReset} className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Redefinir Senha
                        </Button>
                        <p className="text-sm text-muted-foreground mt-3">
                            Você receberá um email com instruções para criar uma nova senha.
                        </p>
                    </CardContent>
                </Card>

                {/* Security Tips */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Dicas de Segurança
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• Use uma senha forte com pelo menos 8 caracteres</li>
                            <li>• Combine letras maiúsculas, minúsculas, números e símbolos</li>
                            <li>• Não compartilhe sua senha com outras pessoas</li>
                            <li>• Troque sua senha periodicamente</li>
                            <li>• Não use a mesma senha em outros sites</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
