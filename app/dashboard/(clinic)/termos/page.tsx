'use client'

import { useState, useEffect } from 'react'
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


interface LegalTerm {
    id: string
    title: string
    type: string
    description: string
    content: string
    status: 'published' | 'draft'
    lastUpdated?: string // UI helper
    created_at: string
    updated_at: string
    is_required: boolean
}

import { EditTermDialog } from './edit-term-dialog'

export default function TermosPage() {
    const { toast } = useToast()
    const [terms, setTerms] = useState<LegalTerm[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editTerm, setEditTerm] = useState<LegalTerm | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const fetchTerms = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/legal/documents')
            if (res.ok) {
                const data = await res.json()
                setTerms(data.documents || [])
            }
        } catch (error) {
            console.error(error)
            // toast({ variant: 'destructive', title: 'Erro ao carregar termos' })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTerms()
    }, [])

    const handleEdit = (term: LegalTerm) => {
        setEditTerm(term)
        setIsDialogOpen(true)
    }

    const handleNew = () => {
        setEditTerm(null)
        setIsDialogOpen(true)
    }

    // Default static terms if DB is empty to prevent empty state shock?
    // No, better to show empty state or default initial data from migration.
    // For now, let's just use the state.

    // Calculate stats
    const totalDocs = terms.length
    const publishedDocs = terms.filter(t => t.status === 'published').length
    const draftDocs = terms.filter(t => t.status === 'draft').length


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
                <Button onClick={handleNew}>
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
                        <div className="text-2xl font-bold">{totalDocs}</div>
                        <p className="text-sm text-muted-foreground">Total de documentos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{publishedDocs}</div>
                        <p className="text-sm text-muted-foreground">Publicados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">{draftDocs}</div>
                        <p className="text-sm text-muted-foreground">Rascunhos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold"> - </div>
                        <p className="text-sm text-muted-foreground">Aceites este mês</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="documents" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="documents">Documentos</TabsTrigger>
                    <TabsTrigger value="settings">Configurações</TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="space-y-4">
                    {isLoading ? (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <Clock className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="mt-2 text-muted-foreground">Carregando documentos...</p>
                            </CardContent>
                        </Card>
                    ) : terms.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-2">Nenhum documento cadastrado</h3>
                                <p className="text-muted-foreground mb-4">
                                    Crie termos de uso, políticas de privacidade e outros documentos legais para sua clínica.
                                </p>
                                <Button onClick={handleNew}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar Primeiro Documento
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {terms.map((term) => (
                                <Card key={term.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-gray-100 rounded-lg">
                                                    <FileText className="w-5 h-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium">{term.title}</h4>
                                                        <Badge variant={term.status === 'published' ? 'success' : 'secondary'}>
                                                            {term.status === 'published' ? 'Publicado' : 'Rascunho'}
                                                        </Badge>
                                                        {term.is_required && (
                                                            <Badge variant="outline">Obrigatório</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {term.description}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Tipo: {term.type} • Atualizado em: {new Date(term.updated_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(term)}>
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Visualizar
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(term)}>
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    Editar
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações de Consentimento</CardTitle>
                            <CardDescription>
                                Configure como os pacientes devem aceitar os termos
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b">
                                <div>
                                    <p className="font-medium">Exigir aceite no cadastro</p>
                                    <p className="text-sm text-muted-foreground">
                                        Pacientes devem aceitar os termos ao se cadastrar
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between py-3 border-b">
                                <div>
                                    <p className="font-medium">Exigir re-aceite em atualizações</p>
                                    <p className="text-sm text-muted-foreground">
                                        Solicitar novo aceite quando os termos forem atualizados
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="font-medium">Registrar IP e data do aceite</p>
                                    <p className="text-sm text-muted-foreground">
                                        Guardar informações de auditoria do consentimento
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <EditTermDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                initialData={editTerm}
                onSuccess={fetchTerms}
            />
        </div>
    )
}




