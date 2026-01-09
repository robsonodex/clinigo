'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
    Scale,
    FileText,
    CheckCircle2,
    AlertCircle,
    Clock,
    Download,
    Upload,
    Eye,
    Edit,
    Shield,
    Plus,
} from 'lucide-react'

export default function TermosPage() {
    const { toast } = useToast()

    const legalTerms = [
        {
            id: 'privacy',
            title: 'Política de Privacidade',
            description: 'Termos de uso de dados pessoais conforme LGPD',
            status: 'published',
            lastUpdated: '2024-01-01',
            required: true,
        },
        {
            id: 'consent',
            title: 'Termo de Consentimento',
            description: 'Consentimento informado para teleconsulta',
            status: 'published',
            lastUpdated: '2024-01-01',
            required: true,
        },
        {
            id: 'terms',
            title: 'Termos de Uso',
            description: 'Condições gerais de uso da plataforma',
            status: 'published',
            lastUpdated: '2024-01-01',
            required: true,
        },
        {
            id: 'cancellation',
            title: 'Política de Cancelamento',
            description: 'Regras para cancelamento e reembolso',
            status: 'draft',
            lastUpdated: '2024-01-01',
            required: false,
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Scale className="w-7 h-7" />
                        Termos Legais
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie os termos e políticas da sua clínica
                    </p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Termo
                </Button>
            </div>

            {/* LGPD Status */}
            <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full">
                            <Shield className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-green-900">Conformidade LGPD</h3>
                            <p className="text-sm text-green-700">
                                Sua clínica está em conformidade com os requisitos básicos da LGPD.
                            </p>
                        </div>
                        <Badge variant="success" className="text-sm">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Ativo
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">4</div>
                        <p className="text-sm text-muted-foreground">Total de documentos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">3</div>
                        <p className="text-sm text-muted-foreground">Publicados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">1</div>
                        <p className="text-sm text-muted-foreground">Rascunhos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">245</div>
                        <p className="text-sm text-muted-foreground">Aceites este mês</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="documents" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="documents">
                        <FileText className="w-4 h-4 mr-2" />
                        Documentos
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <Scale className="w-4 h-4 mr-2" />
                        Configurações LGPD
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="space-y-4">
                    {legalTerms.map((term) => (
                        <Card key={term.id}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <FileText className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{term.title}</h3>
                                                {term.required && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Obrigatório
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {term.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                <Clock className="w-3 h-3 inline mr-1" />
                                                Atualizado em {term.lastUpdated}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={term.status === 'published' ? 'success' : 'warning'}
                                        >
                                            {term.status === 'published' ? 'Publicado' : 'Rascunho'}
                                        </Badge>
                                        <Button variant="outline" size="sm">
                                            <Eye className="w-4 h-4 mr-1" />
                                            Ver
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <Edit className="w-4 h-4 mr-1" />
                                            Editar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Coleta de Consentimento</CardTitle>
                            <CardDescription>
                                Configure como os termos são apresentados aos pacientes
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="font-medium">Exigir aceite na página de agendamento</p>
                                    <p className="text-sm text-muted-foreground">
                                        Paciente deve aceitar os termos antes de agendar
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="font-medium">Registrar consentimento com timestamp</p>
                                    <p className="text-sm text-muted-foreground">
                                        Armazena IP, data/hora e versão do termo aceito
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="font-medium">Enviar cópia por email</p>
                                    <p className="text-sm text-muted-foreground">
                                        Envia os termos aceitos para o email do paciente
                                    </p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Direitos do Titular (LGPD)</CardTitle>
                            <CardDescription>
                                Funcionalidades para atender solicitações de pacientes
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="bg-muted/50">
                                    <CardContent className="pt-4">
                                        <h4 className="font-medium">Portabilidade de Dados</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Permite ao paciente solicitar seus dados em formato legível
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-3">
                                            <Download className="w-4 h-4 mr-1" />
                                            Exportar Modelo
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="bg-muted/50">
                                    <CardContent className="pt-4">
                                        <h4 className="font-medium">Direito ao Esquecimento</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Permite anonimizar dados do paciente sob solicitação
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-3">
                                            Ver Solicitações
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

