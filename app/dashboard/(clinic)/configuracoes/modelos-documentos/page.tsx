'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    FileText,
    Plus,
    Edit3,
    Trash2,
    Copy,
    ArrowLeft,
    Shield,
    Check,
    HelpCircle,
    Eye,
} from 'lucide-react'
import { toast } from 'sonner'

interface DocumentTemplate {
    id: string
    title: string
    category: string
    description?: string
    content: string
    is_active: boolean
    created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
    normas_clinica: 'Normas da Clínica',
    contrato: 'Contrato Terapêutico',
    autorizacao_imagem: 'Uso de Imagem e Voz',
    lgpd: 'Termo LGPD',
    termo_aceite: 'Termo Geral de Aceite',
}

const SMART_TAGS = [
    { tag: '{{nome_paciente}}', label: 'Nome do Paciente' },
    { tag: '{{cpf_paciente}}', label: 'CPF do Paciente' },
    { tag: '{{data_nascimento}}', label: 'Data de Nascimento' },
    { tag: '{{nome_responsavel}}', label: 'Nome do Responsável' },
    { tag: '{{cpf_responsavel}}', label: 'CPF do Responsável' },
    { tag: '{{telefone_responsavel}}', label: 'Telefone/WhatsApp' },
    { tag: '{{nome_clinica}}', label: 'Nome da Clínica' },
    { tag: '{{data_atual}}', label: 'Data Atual Formatada' },
]

export default function DocumentTemplatesPage() {
    const queryClient = useQueryClient()

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null)
    const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null)

    // Form State
    const [formTitle, setFormTitle] = useState('')
    const [formCategory, setFormCategory] = useState('normas_clinica')
    const [formDescription, setFormDescription] = useState('')
    const [formContent, setFormContent] = useState('')

    // Fetch Templates
    const { data, isLoading } = useQuery<{ templates: DocumentTemplate[] }>({
        queryKey: ['clinic-document-templates'],
        queryFn: async () => {
            const res = await fetch('/api/document-templates')
            if (!res.ok) throw new Error('Falha ao carregar modelos')
            return res.json()
        },
    })

    const templates = data?.templates || []

    const openCreateModal = () => {
        setEditingTemplate(null)
        setFormTitle('')
        setFormCategory('normas_clinica')
        setFormDescription('')
        setFormContent('')
        setIsCreateModalOpen(true)
    }

    const openEditModal = (t: DocumentTemplate) => {
        setEditingTemplate(t)
        setFormTitle(t.title)
        setFormCategory(t.category)
        setFormDescription(t.description || '')
        setFormContent(t.content)
        setIsCreateModalOpen(true)
    }

    const handleInsertTag = (tag: string) => {
        setFormContent((prev) => prev + ` ${tag} `)
        toast.info(`Tag ${tag} inserida no texto`)
    }

    // Salvar ou Atualizar
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!formTitle.trim() || !formContent.trim()) {
                throw new Error('Título e conteúdo são obrigatórios')
            }

            const payload = {
                title: formTitle,
                category: formCategory,
                description: formDescription,
                content: formContent,
            }

            const url = editingTemplate
                ? `/api/document-templates/${editingTemplate.id}`
                : '/api/document-templates'
            const method = editingTemplate ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao salvar modelo')
            }

            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic-document-templates'] })
            toast.success(editingTemplate ? 'Modelo atualizado com sucesso!' : 'Novo modelo criado com sucesso!')
            setIsCreateModalOpen(false)
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao salvar modelo')
        },
    })

    // Excluir Modelo com Alerta de Confirmação
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/document-templates/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Erro ao excluir')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic-document-templates'] })
            toast.success('Modelo excluído com sucesso!')
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao excluir modelo')
        },
    })

    const handleDelete = (t: DocumentTemplate) => {
        if (window.confirm(`Tem certeza que deseja excluir o modelo "${t.title}"? Esta ação não pode ser desfeita.`)) {
            deleteMutation.mutate(t.id)
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-6 py-4">
            {/* Top Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                        <Link href="/dashboard">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            Modelos de Contratos & Termos
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Gerencie os termos e normas que são encaminhados para assinatura digital dos pais via link.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        onClick={openCreateModal}
                        className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Novo Modelo</span>
                    </Button>
                </div>
            </div>

            {/* Destaque Legal Informativo */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-emerald-950 dark:text-emerald-200">
                            Validade Jurídica Assegurada (MP 2.200-2/2001 e Lei 14.063/2020)
                        </p>
                        <p className="text-emerald-850 dark:text-emerald-400 mt-0.5 text-[11px] leading-relaxed">
                            Ao encaminhar qualquer um destes modelos aos pais via link seguro, o CliniGO colhe a assinatura touch com o dedo na tela, carimbo de data/hora, endereço IP e Hash SHA-256 criptográfico com força de título probatório.
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid de Modelos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="animate-pulse p-6 space-y-3">
                            <div className="h-4 bg-muted rounded w-2/3" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                            <div className="h-20 bg-muted rounded w-full" />
                        </Card>
                    ))
                ) : templates.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-card rounded-xl border border-dashed border-border/80 p-6 space-y-3">
                        <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" />
                        <h3 className="font-bold text-sm text-foreground">Nenhum modelo cadastrado ainda</h3>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Crie o primeiro modelo de normas, regimento interno ou contrato de prestação de serviços da sua clínica.
                        </p>
                        <Button onClick={openCreateModal} size="sm" className="text-xs mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Criar Primeiro Modelo
                        </Button>
                    </div>
                ) : (
                    templates.map((t) => (
                        <Card key={t.id} className="border border-border/80 bg-card shadow-xs hover:border-border transition-all flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <Badge variant="outline" className="text-[10px] font-semibold bg-muted/50 text-foreground">
                                        {CATEGORY_LABELS[t.category] || t.category}
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-foreground line-clamp-2 mt-2">
                                    {t.title}
                                </CardTitle>
                                {t.description && (
                                    <CardDescription className="text-xs line-clamp-2 mt-1">
                                        {t.description}
                                    </CardDescription>
                                )}
                            </CardHeader>

                            <CardContent className="pt-0 space-y-3">
                                <div className="p-2.5 bg-muted/30 rounded-md border border-border/60 text-[11px] text-muted-foreground line-clamp-4 font-mono leading-relaxed">
                                    {t.content}
                                </div>

                                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPreviewTemplate(t)}
                                        className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                        title="Pré-visualizar modelo"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Visualizar</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditModal(t)}
                                        className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                        title="Editar modelo"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Editar</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(t)}
                                        className="h-8 px-2 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                        title="Excluir modelo"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Excluir</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Box Informativo de Validade Jurídica Assegurada */}
            <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-teal-50/50 dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-teal-950/20 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            Validade Jurídica Assegurada (MP 2.200-2/2001 e Lei 14.063/2020)
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Ao encaminhar qualquer um destes modelos aos pais via link seguro, o CliniGO colhe a assinatura touch com o dedo na tela, carimbo de data/hora, endereço IP e Hash SHA-256 criptográfico com força de título probatório.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal de Criação / Edição de Modelo */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            {editingTemplate ? 'Editar Modelo de Documento' : 'Novo Modelo de Documento / Contrato'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Escreva ou cole o termo da clínica. Utilize as tags inteligentes para preencher os dados dos pacientes e responsáveis automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label htmlFor="title" className="text-xs font-semibold">Título do Documento *</Label>
                                <Input
                                    id="title"
                                    placeholder="Ex: Termo de Normas Internas e Regimento"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Categoria</Label>
                                <Select value={formCategory} onValueChange={setFormCategory}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normas_clinica">Normas da Clínica</SelectItem>
                                        <SelectItem value="contrato">Contrato Terapêutico</SelectItem>
                                        <SelectItem value="autorizacao_imagem">Uso de Imagem e Voz</SelectItem>
                                        <SelectItem value="lgpd">Termo LGPD</SelectItem>
                                        <SelectItem value="termo_aceite">Termo Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="desc" className="text-xs font-semibold">Descrição / Resumo Interno</Label>
                            <Input
                                id="desc"
                                placeholder="Ex: Regras de faltas, cancelamentos e convivência terapêutica"
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        {/* Barra de Tags Inteligentes */}
                        <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border/80">
                            <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                                <span>Tags Dinâmicas (Clique para inserir no texto):</span>
                            </Label>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {SMART_TAGS.map((st) => (
                                    <button
                                        key={st.tag}
                                        type="button"
                                        onClick={() => handleInsertTag(st.tag)}
                                        className="text-[10px] font-mono font-medium px-2 py-1 rounded bg-background hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-border hover:border-emerald-500/50 transition-colors"
                                        title={`Insere ${st.label}`}
                                    >
                                        {st.tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="content" className="text-xs font-semibold">Conteúdo Integral do Termo / Contrato *</Label>
                            <Textarea
                                id="content"
                                rows={14}
                                placeholder="Escreva ou cole aqui o texto do seu contrato ou termo..."
                                value={formContent}
                                onChange={(e) => setFormContent(e.target.value)}
                                className="text-xs leading-relaxed font-sans"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="h-9 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending || !formTitle.trim() || !formContent.trim()}
                            className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {saveMutation.isPending ? 'Salvando...' : 'Salvar Modelo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Pré-Visualização */}
            <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            {previewTemplate?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Pré-visualização do texto padrão do modelo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 rounded-xl border border-border bg-muted/10 font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text">
                        {previewTemplate?.content}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPreviewTemplate(null)}
                            className="h-9 text-xs"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
