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
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <Shield className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Configurações de Segurança</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Gerencie a segurança da sua conta</p>
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
