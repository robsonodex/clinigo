'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Lock } from 'lucide-react'
import ProfileHeader from './components/profile-header'
import GeneralInfoTab from './components/general-info-tab'
import SecurityTab from './components/security-tab'

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState('general')

    return (
        <div className="container max-w-5xl mx-auto py-4 sm:py-6 px-4 space-y-6">
            {/* Header com Avatar, Identificacao e Informacoes Basicas */}
            <ProfileHeader />

            {/* Sistema de Abas Simplificado e Objetivo */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex justify-start border-b pb-2">
                    <TabsList className="bg-muted/70 p-1 rounded-xl h-11 border border-border/50">
                        <TabsTrigger
                            value="general"
                            className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all min-h-[38px]"
                        >
                            <User className="h-4 w-4 text-primary" />
                            <span>Dados Pessoais</span>
                        </TabsTrigger>

                        <TabsTrigger
                            value="security"
                            className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all min-h-[38px]"
                        >
                            <Lock className="h-4 w-4 text-primary" />
                            <span>Segurança e Senha</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Conteudo das Abas */}
                <TabsContent value="general" className="mt-0 focus-visible:outline-none">
                    <GeneralInfoTab />
                </TabsContent>

                <TabsContent value="security" className="mt-0 focus-visible:outline-none">
                    <SecurityTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
