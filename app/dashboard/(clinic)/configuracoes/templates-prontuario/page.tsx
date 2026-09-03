'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText, Plus, Pencil, Trash2, Loader2, Eye, GripVertical } from 'lucide-react'
import { useTherapyTypes } from '@/lib/hooks/use-therapy-types'
import { toast } from 'sonner'

interface TemplateField {
    key: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checklist'
    required: boolean
    options?: string[]
    placeholder?: string
}

interface Template {
    id: string
    name: string
    specialty: string | null
    fields: TemplateField[]
    is_default: boolean
    is_active: boolean
    created_at: string
}

const FIELD_TYPES = [
    { value: 'text', label: 'Texto Curto' },
    { value: 'textarea', label: 'Texto Longo' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Data' },
    { value: 'select', label: 'Seleção' },
    { value: 'checklist', label: 'Checklist' },
]

// SPECIALTIES agora vem do hook useTherapyTypes()

export default function TemplatesProntuarioPage() {
    const { therapyTypes: SPECIALTIES } = useTherapyTypes()
    const [templates, setTemplates] = useState<Template[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const [form, setForm] = useState({
        name: '',
        specialty: '',
        is_default: false,
        fields: [] as TemplateField[],
    })

    const [newField, setNewField] = useState<Partial<TemplateField>>({
        key: '',
        label: '',
        type: 'textarea',
        required: false,
        options: [],
    })
    const [optionsText, setOptionsText] = useState('')

    const fetchTemplates = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/medical-record-templates')
            if (res.ok) {
                const data = await res.json()
                setTemplates(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching templates:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    const handleOpenNew = () => {
        setEditingId(null)
        setForm({ name: '', specialty: '', is_default: false, fields: [] })
        setShowModal(true)
    }

    const handleEdit = (template: Template) => {
        setEditingId(template.id)
        setForm({
            name: template.name,
            specialty: template.specialty || '',
            is_default: template.is_default,
            fields: template.fields,
        })
        setShowModal(true)
    }

    const handlePreview = (template: Template) => {
        setPreviewTemplate(template)
        setShowPreview(true)
    }

    const handleAddField = () => {
        if (!newField.label) {
            toast.error('O campo precisa de um nome')
            return
        }

        const key = newField.label
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')

        const field: TemplateField = {
            key,
            label: newField.label!,
            type: (newField.type as any) || 'textarea',
            required: newField.required || false,
            ...((['select', 'checklist'].includes(newField.type || '')) && optionsText
                ? { options: optionsText.split('\n').filter(Boolean).map(s => s.trim()) }
                : {}),
        }

        setForm(f => ({ ...f, fields: [...f.fields, field] }))
        setNewField({ key: '', label: '', type: 'textarea', required: false, options: [] })
        setOptionsText('')
    }

    const handleRemoveField = (index: number) => {
        setForm(f => ({ ...f, fields: f.fields.filter((_, i) => i !== index) }))
    }

    const handleSave = async () => {
        if (!form.name || form.fields.length === 0) {
            toast.error('Nome e pelo menos 1 campo são obrigatórios')
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                ...(editingId ? { id: editingId } : {}),
                name: form.name,
                specialty: form.specialty || null,
                is_default: form.is_default,
                fields: form.fields,
            }

            const res = await fetch('/api/medical-record-templates', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                toast.success(editingId ? 'Template atualizado' : 'Template criado')
                setShowModal(false)
                fetchTemplates()
            } else {
                const err = await res.json()
                toast.error(err.error || 'Erro ao salvar')
            }
        } catch (error) {
            toast.error('Erro ao salvar template')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja desativar este template?')) return
        try {
            const res = await fetch(`/api/medical-record-templates?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Template desativado')
                fetchTemplates()
            }
        } catch (error) {
            toast.error('Erro ao desativar')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        Templates de Prontuário
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Crie modelos de prontuário padronizados por especialidade
                    </p>
                </div>
                <Button
                    onClick={handleOpenNew}
                    className="flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xs px-5 font-semibold transition-all duration-200 border-0"
                >
                    <Plus className="w-4 h-4" />
                    <span>Novo Template</span>
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Templates Ativos</CardTitle>
                    <CardDescription>
                        Modelos de formulário usados no preenchimento de prontuários
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Nenhum template de prontuário criado.</p>
                            <p className="text-sm mt-1">Clique em "Novo Template" para começar.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {templates.map((template) => (
                                <Card key={template.id} className="border hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-base">{template.name}</CardTitle>
                                                {template.specialty && (
                                                    <Badge variant="secondary" className="mt-1 text-xs">
                                                        {template.specialty}
                                                    </Badge>
                                                )}
                                            </div>
                                            {template.is_default && (
                                                <Badge className="bg-primary/10 text-primary text-xs">Padrão</Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {template.fields.length} campo{template.fields.length !== 1 ? 's' : ''}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {template.fields.slice(0, 4).map((field) => (
                                                <Badge key={field.key} variant="outline" className="text-xs">
                                                    {field.label}
                                                </Badge>
                                            ))}
                                            {template.fields.length > 4 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{template.fields.length - 4}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handlePreview(template)}>
                                                <Eye className="h-4 w-4 mr-1" />
                                                Preview
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                                                <Pencil className="h-4 w-4 mr-1" />
                                                Editar
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Editar Template' : 'Novo Template de Prontuário'}
                        </DialogTitle>
                        <DialogDescription>
                            Defina os campos do formulário de prontuário para esta especialidade
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nome do Template *</Label>
                                <Input
                                    placeholder="Ex: Avaliação Fonoaudiológica"
                                    value={form.name}
                                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Especialidade</Label>
                                <Select value={form.specialty} onValueChange={(v) => setForm(f => ({ ...f, specialty: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {SPECIALTIES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="is_default"
                                checked={form.is_default}
                                onCheckedChange={(c) => setForm(f => ({ ...f, is_default: c as boolean }))}
                            />
                            <Label htmlFor="is_default" className="text-sm cursor-pointer">
                                Template padrão para esta especialidade
                            </Label>
                        </div>

                        {/* Fields List */}
                        <div>
                            <Label className="text-base font-semibold">Campos do Formulário</Label>
                            {form.fields.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {form.fields.map((field, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex-1">
                                                <span className="font-medium text-sm">{field.label}</span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({FIELD_TYPES.find(f => f.value === field.type)?.label})
                                                </span>
                                                {field.required && (
                                                    <Badge variant="destructive" className="text-xs ml-2">Obrigatório</Badge>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveField(index)}>
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Field */}
                        <Card className="border-dashed">
                            <CardContent className="pt-4">
                                <Label className="text-sm font-medium">Adicionar Campo</Label>
                                <div className="grid grid-cols-3 gap-3 mt-2">
                                    <div>
                                        <Input
                                            placeholder="Nome do campo"
                                            value={newField.label || ''}
                                            onChange={(e) => setNewField(f => ({ ...f, label: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Select
                                            value={newField.type || 'textarea'}
                                            onValueChange={(v) => setNewField(f => ({ ...f, type: v as any }))}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {FIELD_TYPES.map(t => (
                                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="field_required"
                                            checked={newField.required || false}
                                            onCheckedChange={(c) => setNewField(f => ({ ...f, required: c as boolean }))}
                                        />
                                        <Label htmlFor="field_required" className="text-xs">Obrigatório</Label>
                                        <Button size="sm" onClick={handleAddField} className="ml-auto">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                {['select', 'checklist'].includes(newField.type || '') && (
                                    <div className="mt-2">
                                        <Label className="text-xs">Opções (uma por linha)</Label>
                                        <textarea
                                            className="w-full border rounded-md p-2 text-sm mt-1"
                                            rows={3}
                                            placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                                            value={optionsText}
                                            onChange={(e) => setOptionsText(e.target.value)}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowModal(false)}
                            className="rounded-xl h-10 px-5 text-sm font-semibold border-slate-200 dark:border-slate-800 transition-all duration-200"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xs px-5 font-semibold transition-all duration-200 border-0 justify-center items-center"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <span>{editingId ? 'Salvar' : 'Criar Template'}</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Modal */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
                        <DialogDescription>
                            Visualize como o formulário aparecerá para o profissional
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {previewTemplate?.fields.map((field) => (
                            <div key={field.key}>
                                <Label>
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                </Label>
                                {field.type === 'textarea' && (
                                    <textarea className="w-full border rounded-md p-2 text-sm mt-1" rows={3} disabled placeholder={field.placeholder || `Preencha ${field.label.toLowerCase()}...`} />
                                )}
                                {field.type === 'text' && (
                                    <Input disabled placeholder={field.placeholder || field.label} className="mt-1" />
                                )}
                                {field.type === 'number' && (
                                    <Input type="number" disabled placeholder="0" className="mt-1" />
                                )}
                                {field.type === 'date' && (
                                    <Input type="date" disabled className="mt-1" />
                                )}
                                {field.type === 'select' && (
                                    <Select disabled>
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {field.options?.map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                {field.type === 'checklist' && (
                                    <div className="space-y-1 mt-1">
                                        {field.options?.map(opt => (
                                            <div key={opt} className="flex items-center gap-2">
                                                <Checkbox disabled />
                                                <span className="text-sm">{opt}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
