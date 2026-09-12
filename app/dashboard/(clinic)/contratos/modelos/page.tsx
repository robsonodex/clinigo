'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
    ArrowLeft,
    Plus,
    Edit3,
    Trash2,
    Copy,
    Check,
    Eye,
    BookOpen,
    FileText,
    HelpCircle,
    Search
} from 'lucide-react'
import { toast } from 'sonner'

interface ContractTemplate {
    id: string
    title: string
    category: string
    description?: string
    content: string
    required_variables: any[]
    is_active: boolean
    created_at: string
}

const CATEGORY_MAP: Record<string, string> = {
    prestacao_servicos_pj: 'Prestação de Serviços (PJ)',
    aditivo_contratual: 'Termo Aditivo',
    distrato_servicos: 'Distrato Contratual',
    nda_confidencialidade: 'Confidencialidade (NDA)',
    termo_imagem_profissional: 'Uso de Imagem (Profissional)',
    termo_imagem_menor: 'Uso de Imagem (Paciente Menor)',
    termo_geral: 'Termo Geral',
}

const AVAILABLE_MERGE_FIELDS = [
    { tag: '{{contratante_razao_social}}', label: 'Razão Social da Clínica', group: 'Clínica' },
    { tag: '{{contratante_cnpj}}', label: 'CNPJ da Clínica', group: 'Clínica' },
    { tag: '{{contratante_endereco}}', label: 'Endereço da Clínica', group: 'Clínica' },
    { tag: '{{contratante_cidade}}', label: 'Cidade da Clínica', group: 'Clínica' },
    { tag: '{{contratante_estado}}', label: 'UF da Clínica', group: 'Clínica' },
    { tag: '{{contratante_representante_nome}}', label: 'Representante da Clínica', group: 'Clínica' },
    { tag: '{{contratante_representante_cpf}}', label: 'CPF do Representante', group: 'Clínica' },
    { tag: '{{contratante_telefone}}', label: 'Telefone da Clínica', group: 'Clínica' },

    { tag: '{{prestador_razao_social}}', label: 'Razão Social do Prestador (PJ)', group: 'Prestador' },
    { tag: '{{prestador_cnpj}}', label: 'CNPJ do Prestador', group: 'Prestador' },
    { tag: '{{prestador_endereco}}', label: 'Endereço do Prestador', group: 'Prestador' },
    { tag: '{{prestador_cidade}}', label: 'Cidade do Prestador', group: 'Prestador' },
    { tag: '{{prestador_representante_nome}}', label: 'Representante do Prestador', group: 'Prestador' },
    { tag: '{{prestador_representante_cpf}}', label: 'CPF do Representante', group: 'Prestador' },
    { tag: '{{prestador_representante_email}}', label: 'E-mail do Prestador', group: 'Prestador' },
    { tag: '{{prestador_telefone}}', label: 'Telefone do Prestador', group: 'Prestador' },

    { tag: '{{nome_completo_responsavel}}', label: 'Nome do Responsável', group: 'Responsável' },
    { tag: '{{cpf_responsavel}}', label: 'CPF do Responsável', group: 'Responsável' },
    { tag: '{{rg_responsavel}}', label: 'RG do Responsável', group: 'Responsável' },
    { tag: '{{endereco_responsavel}}', label: 'Endereço do Responsável', group: 'Responsável' },

    { tag: '{{nome_completo_menor}}', label: 'Nome do Menor (Paciente)', group: 'Paciente' },
    { tag: '{{data_nascimento_menor}}', label: 'Data de Nasc. do Menor', group: 'Paciente' },

    { tag: '{{contrato_numero}}', label: 'Número do Contrato', group: 'Contrato' },
    { tag: '{{contrato_vigencia_inicial}}', label: 'Data Inicial da Vigência', group: 'Contrato' },
    { tag: '{{contrato_vigencia_final}}', label: 'Data Final da Vigência', group: 'Contrato' },
    { tag: '{{servicos_prestados}}', label: 'Serviços Prestados', group: 'Contrato' },
    { tag: '{{valor_sessao_em_reais}}', label: 'Valor por Sessão (R$)', group: 'Contrato' },
]

export default function ModelosContratosPage() {
    const [templates, setTemplates] = useState<ContractTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUnauthorized, setIsUnauthorized] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Modal de Visualização
    const [viewingTemplate, setViewingTemplate] = useState<ContractTemplate | null>(null)

    // Modal de Criação / Edição
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
    const [formTitle, setFormTitle] = useState('')
    const [formCategory, setFormCategory] = useState('prestacao_servicos_pj')
    const [formDescription, setFormDescription] = useState('')
    const [formContent, setFormContent] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Modal de Exclusão
    const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const [copiedTag, setCopiedTag] = useState<string | null>(null)

    const fetchTemplates = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/contracts/templates')
            if (res.status === 403) {
                setIsUnauthorized(true)
                return
            }
            if (!res.ok) throw new Error('Falha ao carregar modelos')
            const json = await res.json()
            const list = Array.isArray(json)
                ? json
                : Array.isArray(json?.templates)
                    ? json.templates
                    : Array.isArray(json?.data)
                        ? json.data
                        : []
            setTemplates(list)
        } catch (err: any) {
            toast.error('Erro ao carregar modelos de contratos.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchTemplates()
    }, [fetchTemplates])

    const handleOpenCreate = () => {
        setEditingTemplate(null)
        setFormTitle('')
        setFormCategory('prestacao_servicos_pj')
        setFormDescription('')
        setFormContent('')
        setIsEditModalOpen(true)
    }

    const handleOpenEdit = (tpl: ContractTemplate) => {
        setEditingTemplate(tpl)
        setFormTitle(tpl.title)
        setFormCategory(tpl.category)
        setFormDescription(tpl.description || '')
        setFormContent(tpl.content)
        setIsEditModalOpen(true)
    }

    const handleCopyTag = (tag: string) => {
        navigator.clipboard.writeText(tag)
        setCopiedTag(tag)
        toast.success(`Tag ${tag} copiada.`)
        setTimeout(() => setCopiedTag(null), 2500)
    }

    const handleSaveTemplate = async () => {
        if (!formTitle.trim() || !formContent.trim()) {
            toast.error('Informe o título e o conteúdo do modelo.')
            return
        }

        try {
            setIsSaving(true)
            const url = editingTemplate
                ? `/api/contracts/templates/${editingTemplate.id}`
                : '/api/contracts/templates'

            const method = editingTemplate ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formTitle.trim(),
                    category: formCategory,
                    description: formDescription.trim(),
                    content: formContent.trim(),
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Falha ao salvar modelo')
            }

            toast.success(editingTemplate ? 'Modelo atualizado com sucesso.' : 'Novo modelo cadastrado com sucesso.')
            setIsEditModalOpen(false)
            fetchTemplates()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar modelo.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!templateToDelete) return
        try {
            setIsDeleting(true)
            const res = await fetch(`/api/contracts/templates/${templateToDelete.id}`, {
                method: 'DELETE'
            })
            if (!res.ok) throw new Error('Falha ao desativar modelo')
            toast.success('Modelo desativado com sucesso.')
            setTemplateToDelete(null)
            fetchTemplates()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao desativar modelo.')
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredTemplates = (templates || []).filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isUnauthorized) {
        return (
            <div className="flex-1 p-6 md:p-12 max-w-xl mx-auto w-full text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-amber-50 text-amber-700">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h1 className="text-xl font-bold text-slate-800">Acesso Restrito</h1>
                <p className="text-sm text-slate-600">
                    O módulo de Contratos e Modelos está restrito à clínica autorizada (World Sensory).
                </p>
                <div className="pt-2">
                    <Link href="/dashboard">
                        <Button variant="outline" className="border-slate-300">
                            Voltar ao Painel
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/contratos">
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-300">
                            <ArrowLeft className="w-4 h-4 text-slate-700" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                            Biblioteca de Modelos Contratuais
                        </h1>
                        <p className="text-xs text-slate-600">
                            Modelos jurídicos mestres da clínica com suporte a tags variáveis dinâmicas.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={handleOpenCreate} className="h-9 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Criar Novo Modelo
                    </Button>
                </div>
            </div>

            {/* Busca */}
            <div className="flex items-center max-w-md relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Filtrar modelos por título ou categoria..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs border-slate-300"
                />
            </div>

            {/* Grid de Modelos */}
            {isLoading ? (
                <div className="p-12 text-center text-slate-500 bg-white border rounded-lg">
                    Carregando modelos jurídicos...
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white border border-dashed rounded-lg">
                    Nenhum modelo encontrado.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map(tpl => (
                        <Card key={tpl.id} className="border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 border-emerald-200">
                                        {CATEGORY_MAP[tpl.category] || tpl.category}
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                                    {tpl.title}
                                </CardTitle>
                                {tpl.description && (
                                    <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                                        {tpl.description}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardFooter className="border-t pt-3 flex items-center justify-between bg-slate-50/50">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setViewingTemplate(tpl)}
                                    className="h-8 text-xs text-slate-700 hover:bg-slate-200"
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    Visualizar
                                </Button>
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenEdit(tpl)}
                                        className="h-8 text-xs border-slate-300"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                                        Editar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setTemplateToDelete(tpl)}
                                        className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                                        title="Desativar modelo"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal de Leitura / Visualização do Modelo */}
            <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setViewingTemplate(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">{viewingTemplate?.title}</DialogTitle>
                        <DialogDescription>
                            Categoria: {CATEGORY_MAP[viewingTemplate?.category || ''] || viewingTemplate?.category}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 border rounded-md whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">
                        {viewingTemplate?.content}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewingTemplate(null)} className="h-9 text-xs">
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Criação / Edição */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">
                            {editingTemplate ? 'Editar Modelo Contratual' : 'Cadastrar Novo Modelo'}
                        </DialogTitle>
                        <DialogDescription>
                            Insira o texto base do documento utilizando as tags variáveis no formato <code className="text-emerald-700 font-mono">{'{{nome_da_variavel}}'}</code>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2 space-y-1">
                                <Label className="text-xs font-semibold text-slate-800">Título do Modelo *</Label>
                                <Input
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ex: Contrato de Prestação de Serviços (PJ)"
                                    className="h-9 text-xs border-slate-300"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-800">Categoria *</Label>
                                <Select value={formCategory} onValueChange={setFormCategory}>
                                    <SelectTrigger className="h-9 text-xs border-slate-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="prestacao_servicos_pj">Prestação de Serviços (PJ)</SelectItem>
                                        <SelectItem value="aditivo_contratual">Termo Aditivo</SelectItem>
                                        <SelectItem value="distrato_servicos">Distrato Contratual</SelectItem>
                                        <SelectItem value="nda_confidencialidade">Confidencialidade (NDA)</SelectItem>
                                        <SelectItem value="termo_imagem_profissional">Uso de Imagem (Profissional)</SelectItem>
                                        <SelectItem value="termo_imagem_menor">Uso de Imagem (Paciente Menor)</SelectItem>
                                        <SelectItem value="termo_geral">Termo Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-800">Descrição / Finalidade</Label>
                            <Input
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Breve resumo da finalidade deste modelo"
                                className="h-9 text-xs border-slate-300"
                            />
                        </div>

                        {/* Paleta de Tags Variáveis Disponíveis */}
                        <div className="p-3 bg-slate-50 border rounded-md border-slate-200">
                            <div className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                                Tags Variáveis Disponíveis (clique para copiar):
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                {AVAILABLE_MERGE_FIELDS.map(f => (
                                    <button
                                        key={f.tag}
                                        type="button"
                                        onClick={() => handleCopyTag(f.tag)}
                                        className="text-[10px] font-mono bg-white border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded transition-all flex items-center gap-1"
                                        title={f.label}
                                    >
                                        {copiedTag === f.tag ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                        {f.tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-800">Conteúdo do Contrato (com placeholders) *</Label>
                            <Textarea
                                value={formContent}
                                onChange={(e) => setFormContent(e.target.value)}
                                rows={14}
                                className="font-mono text-xs border-slate-300 leading-relaxed"
                                placeholder="Cole o texto integral do contrato aqui com os placeholders {{variavel}}..."
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-3">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSaving} className="h-9 text-xs">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveTemplate}
                            disabled={isSaving}
                            className="h-9 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Modelo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Desativação */}
            <Dialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">Desativar Modelo</DialogTitle>
                        <DialogDescription className="pt-2">
                            Tem certeza que deseja desativar o modelo <strong>{templateToDelete?.title}</strong>?
                            <br /><br />
                            Contratos já emitidos anteriormente a partir deste modelo não serão afetados.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTemplateToDelete(null)} disabled={isDeleting} className="h-9 text-xs">
                            Voltar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {isDeleting ? 'Desativando...' : 'Confirmar Desativação'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
