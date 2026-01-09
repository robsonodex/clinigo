'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MFASetup } from '@/components/auth/mfa-setup'
import { Shield, Lock, MonitorSmartphone, Bell } from 'lucide-react'
import { SessionsManager } from '@/components/auth/sessions-manager'

export default function SecuritySettingsPage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Configurações de Segurança</h1>
                <p className="text-muted-foreground mt-2">
                    Gerencie as configurações de segurança da sua conta
                </p>
            </div>

            <Tabs defaultValue="mfa" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="mfa" className="gap-2">
                        <Shield className="h-4 w-4" />
                        <span className="hidden sm:inline">MFA</span>
                    </TabsTrigger>
                    <TabsTrigger value="sessions" className="gap-2">
                        <MonitorSmartphone className="h-4 w-4" />
                        <span className="hidden sm:inline">Sessões</span>
                    </TabsTrigger>
                    <TabsTrigger value="password" className="gap-2">
                        <Lock className="h-4 w-4" />
                        <span className="hidden sm:inline">Senha</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                        <Bell className="h-4 w-4" />
                        <span className="hidden sm:inline">Alertas</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="mfa">
                    <MFASetup />
                </TabsContent>

                <TabsContent value="sessions">
                    <SessionsManager />
                </TabsContent>

                <TabsContent value="password">
                    <Card>
                        <CardHeader>
                            <CardTitle>Alterar Senha</CardTitle>
                            <CardDescription>
                                Atualize sua senha regularmente para manter sua conta segura.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Use o link "Esqueci minha senha" na página de login para redefinir sua senha.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Alertas de Segurança</CardTitle>
                            <CardDescription>
                                Configure notificações para atividades suspeitas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Em breve: Receba alertas por email quando houver login de novos dispositivos.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

