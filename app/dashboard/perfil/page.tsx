'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Lock, Bell, CreditCard, Smartphone, Settings, Shield, Trash2 } from 'lucide-react'
import ProfileHeader from './components/profile-header'
import GeneralInfoTab from './components/general-info-tab'
import SecurityTab from './components/security-tab'
import NotificationsTab from './components/notifications-tab'
import BillingTab from './components/billing-tab'
import DevicesTab from './components/devices-tab'
import PreferencesTab from './components/preferences-tab'
import PrivacyTab from './components/privacy-tab'
import DangerZoneTab from './components/danger-zone-tab'

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState('general')

    return (
        <div className="container max-w-7xl mx-auto py-6 space-y-6">
            {/* Header com Avatar e Informações Básicas */}
            <ProfileHeader />

            {/* Sistema de Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                {/* Layout Desktop: Tabs Laterais | Mobile: Dropdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar com Tabs (Desktop) */}
                    <div className="lg:col-span-3">
                        <TabsList className="hidden lg:flex lg:flex-col h-full w-full space-y-1 bg-transparent p-0">
                            <TabsTrigger
                                value="general"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted"
                            >
                                <User className="h-4 w-4" />
                                <span>Informações Gerais</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="security"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted"
                            >
                                <Lock className="h-4 w-4" />
                                <span>Segurança e Senha</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="notifications"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted"
                            >
                                <Bell className="h-4 w-4" />
                                <span>Notificações</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="billing"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted"
                            >
                                <CreditCard className="h-4 w-4" />
                                <span>Pagamento</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="devices"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted"
                            >
                                <Smartphone className="h-4 w-4" />
                                <span>Dispositivos</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="preferences"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted"
                            >
                                <Settings className="h-4 w-4" />
                                <span>Preferências</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="privacy"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted"
                            >
                                <Shield className="h-4 w-4" />
                                <span>Privacidade</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="danger-zone"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Desativar Conta</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Mobile: Select dropdown */}
                        <div className="lg:hidden">
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value)}
                                className="w-full p-3 border rounded-md bg-background"
                            >
                                <option value="general">👤 Informações Gerais</option>
                                <option value="security">🔒 Segurança e Senha</option>
                                <option value="notifications">🔔 Notificações</option>
                                <option value="billing">💳 Pagamento</option>
                                <option value="devices">📱 Dispositivos</option>
                                <option value="preferences">⚙️ Preferências</option>
                                <option value="privacy">🛡️ Privacidade</option>
                                <option value="danger-zone">🗑️ Desativar Conta</option>
                            </select>
                        </div>
                    </div>

                    {/* Conteúdo das Tabs */}
                    <div className="lg:col-span-9">
                        <TabsContent value="general" className="mt-0">
                            <GeneralInfoTab />
                        </TabsContent>

                        <TabsContent value="security" className="mt-0">
                            <SecurityTab />
                        </TabsContent>

                        <TabsContent value="notifications" className="mt-0">
                            <NotificationsTab />
                        </TabsContent>

                        <TabsContent value="billing" className="mt-0">
                            <BillingTab />
                        </TabsContent>

                        <TabsContent value="devices" className="mt-0">
                            <DevicesTab />
                        </TabsContent>

                        <TabsContent value="preferences" className="mt-0">
                            <PreferencesTab />
                        </TabsContent>

                        <TabsContent value="privacy" className="mt-0">
                            <PrivacyTab />
                        </TabsContent>

                        <TabsContent value="danger-zone" className="mt-0">
                            <DangerZoneTab />
                        </TabsContent>
                    </div>
                </div>
            </Tabs>
        </div>
    )
}
