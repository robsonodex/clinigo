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
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Configurações de Segurança</h1>
                <p className="text-muted-foreground mt-2">
                    Gerencie a segurança da sua conta
                </p>
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
