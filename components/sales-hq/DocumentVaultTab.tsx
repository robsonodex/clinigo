'use client'

import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
    Download,
    Edit3,
    Eye,
    FileText,
    FolderLock,
    Loader2,
    Search,
    Trash2,
    Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    VAULT_CATEGORIES,
    formatBytes,
    type SalesVaultDocument,
    type VaultCategory,
} from '@/lib/sales/prospect-types'

interface DocumentVaultTabProps {
    documents: SalesVaultDocument[]
    onRefresh: () => Promise<void>
}

export function DocumentVaultTab({ documents, onRefresh }: DocumentVaultTabProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

    // Upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadTitle, setUploadTitle] = useState('')
    const [uploadCategory, setUploadCategory] = useState<VaultCategory>('Apresentação')
    const [uploadDescription, setUploadDescription] = useState('')
    const [uploading, setUploading] = useState(false)

    // Edit metadata modal
    const [editTarget, setEditTarget] = useState<SalesVaultDocument | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editCategory, setEditCategory] = useState<VaultCategory>('Apresentação')
    const [editDescription, setEditDescription] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)

    // View / download / delete
    const [loadingDocId, setLoadingDocId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<SalesVaultDocument | null>(null)
    const [deleting, setDeleting] = useState(false)

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        return documents.filter((d) => {
            if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false
            if (!q) return true
            return (
                d.title.toLowerCase().includes(q) ||
                d.file_name.toLowerCase().includes(q) ||
                d.description.toLowerCase().includes(q) ||
                d.category.toLowerCase().includes(q)
            )
        })
    }, [documents, searchTerm, categoryFilter])

    const handleFilePick = (file: File | null) => {
        setSelectedFile(file)
        if (file && !uploadTitle.trim()) {
            setUploadTitle(file.name.replace(/\.[^.]+$/, ''))
        }
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedFile) {
            toast.error('Selecione um arquivo antes de enviar para o cofre.')
            return
        }
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', selectedFile)
            fd.append('title', uploadTitle.trim() || selectedFile.name)
            fd.append('category', uploadCategory)
            fd.append('description', uploadDescription.trim())

            const res = await fetch('/api/super-admin/prospeccao/vault', {
                method: 'POST',
                body: fd,
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao enviar arquivo')

            toast.success('Arquivo armazenado com segurança no Cofre Comercial.')
            setSelectedFile(null)
            setUploadTitle('')
            setUploadDescription('')
            if (fileInputRef.current) fileInputRef.current.value = ''
            await onRefresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Falha no upload')
        } finally {
            setUploading(false)
        }
    }

    const handleOpenSignedUrl = async (doc: SalesVaultDocument, download: boolean) => {
        setLoadingDocId(`${doc.id}-${download ? 'dl' : 'view'}`)
        try {
            const res = await fetch(
                `/api/super-admin/prospeccao/vault/${doc.id}${download ? '?download=1' : ''}`
            )
            const result = await res.json()
            if (!res.ok || !result.url) throw new Error(result.error || 'Falha ao gerar link seguro')

            if (download) {
                const a = document.createElement('a')
                a.href = result.url
                a.download = doc.file_name
                document.body.appendChild(a)
                a.click()
                a.remove()
            } else {
                window.open(result.url, '_blank', 'noopener,noreferrer')
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao acessar arquivo')
        } finally {
            setLoadingDocId(null)
        }
    }

    const openEditModal = (doc: SalesVaultDocument) => {
        setEditTarget(doc)
        setEditTitle(doc.title)
        setEditCategory(doc.category)
        setEditDescription(doc.description || '')
    }

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editTarget || editTitle.trim().length < 2) return
        setSavingEdit(true)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/vault/${editTarget.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editTitle.trim(),
                    category: editCategory,
                    description: editDescription.trim(),
                }),
            })
            if (!res.ok) throw new Error('Falha ao atualizar documento')
            toast.success('Metadados do arquivo atualizados.')
            setEditTarget(null)
            await onRefresh()
        } catch {
            toast.error('Erro ao salvar alterações.')
        } finally {
            setSavingEdit(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/vault/${deleteTarget.id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Falha ao excluir documento')
            toast.success(`"${deleteTarget.title}" removido do cofre.`)
            setDeleteTarget(null)
            await onRefresh()
        } catch {
            toast.error('Erro ao excluir arquivo do cofre.')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-5">
            {/* Formulário de Upload Seguro */}
            <form
                onSubmit={handleUpload}
                className="bg-white border border-[#E6E8E5] rounded-xl p-5 space-y-4"
            >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EEF1EF]">
                    <div>
                        <h2 className="text-base font-semibold text-[#0F1F1B] flex items-center gap-2">
                            <FolderLock className="w-4 h-4 text-[#155E4B]" />
                            Enviar Material para o Cofre Privado
                        </h2>
                        <p className="text-xs text-[#4B5B56] mt-0.5">
                            Armazenamento privado exclusivo Super Admin (bucket protegido por RLS, até 25 MB por arquivo: PDF, PPTX, DOCX, XLSX, PNG/JPG).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="space-y-1.5">
                        <Label htmlFor="vault-file">Arquivo *</Label>
                        <Input
                            ref={fileInputRef}
                            id="vault-file"
                            type="file"
                            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                            onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
                            className="min-h-[44px] cursor-pointer"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="vault-title">Título do Material</Label>
                        <Input
                            id="vault-title"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            placeholder="Ex.: Deck Comercial Terapias 2026"
                            className="min-h-[44px]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="vault-category">Categoria</Label>
                        <select
                            id="vault-category"
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value as VaultCategory)}
                            className="w-full min-h-[44px] rounded-md border border-input bg-white px-3 text-sm"
                        >
                            {VAULT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                    <div className="flex-1 space-y-1.5">
                        <Label htmlFor="vault-desc">Observação / Versão (opcional)</Label>
                        <Input
                            id="vault-desc"
                            value={uploadDescription}
                            onChange={(e) => setUploadDescription(e.target.value)}
                            placeholder="Ex.: Versão atualizada com planos vigentes e módulo TISS"
                            className="min-h-[44px]"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={uploading || !selectedFile}
                        className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold px-6"
                    >
                        {uploading ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 mr-1.5" />
                        )}
                        {uploading ? 'Enviando...' : 'Salvar no Cofre'}
                    </Button>
                </div>
            </form>

            {/* Lista de Arquivos */}
            <div className="bg-white border border-[#E6E8E5] rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-[#4B5B56] absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar no cofre por título, nome ou categoria..."
                            className="pl-9 min-h-[44px]"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setCategoryFilter('ALL')}
                            className={`min-h-[34px] px-3 rounded-lg text-xs font-medium cursor-pointer ${
                                categoryFilter === 'ALL'
                                    ? 'bg-[#0F1F1B] text-white'
                                    : 'bg-[#F2F5F3] text-[#4B5B56] hover:bg-[#E6ECE9]'
                            }`}
                        >
                            Todos ({documents.length})
                        </button>
                        {VAULT_CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategoryFilter(cat)}
                                className={`min-h-[34px] px-3 rounded-lg text-xs font-medium cursor-pointer ${
                                    categoryFilter === cat
                                        ? 'bg-[#155E4B] text-white'
                                        : 'bg-[#F2F5F3] text-[#4B5B56] hover:bg-[#E6ECE9]'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="border border-dashed border-[#D6DDD9] rounded-xl py-12 px-4 text-center space-y-1">
                        <FileText className="w-8 h-8 text-[#4B5B56]/60 mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#0F1F1B]">Nenhum arquivo no cofre ainda</p>
                        <p className="text-xs text-[#4B5B56]">
                            Envie apresentações, contratos, PDFs ou materiais comerciais acima para acessá-los de qualquer dispositivo.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {filtered.map((doc) => (
                            <div
                                key={doc.id}
                                className="border border-[#E6E8E5] rounded-xl p-4 bg-[#FAFBF9] flex flex-col justify-between space-y-3"
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] font-mono bg-[#E6F2EE] text-[#114D3E] border-[#CBE3DA]"
                                        >
                                            {doc.category}
                                        </Badge>
                                        <span className="text-[11px] font-mono text-[#4B5B56]">
                                            {formatBytes(doc.file_size_bytes)}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-[#0F1F1B] leading-snug">
                                        {doc.title}
                                    </h3>
                                    <p className="text-[11px] text-[#4B5B56] truncate" title={doc.file_name}>
                                        {doc.file_name}
                                    </p>
                                    {doc.description && (
                                        <p className="text-xs text-[#4B5B56] line-clamp-2">{doc.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 pt-2 border-t border-[#E6E8E5]">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={loadingDocId === `${doc.id}-view`}
                                        onClick={() => handleOpenSignedUrl(doc, false)}
                                        className="min-h-[36px] flex-1 text-xs border-[#D6DDD9]"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1" />
                                        Visualizar
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={loadingDocId === `${doc.id}-dl`}
                                        onClick={() => handleOpenSignedUrl(doc, true)}
                                        className="min-h-[36px] flex-1 text-xs bg-[#155E4B] hover:bg-[#0F493A] text-white"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1" />
                                        Baixar
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEditModal(doc)}
                                        className="min-h-[36px] px-2 border-[#D6DDD9]"
                                        title="Editar detalhes"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setDeleteTarget(doc)}
                                        className="min-h-[36px] px-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                                        title="Excluir arquivo"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Editar Metadados */}
            <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#0F1F1B]">Editar Metadados do Arquivo</DialogTitle>
                        <DialogDescription className="text-[#4B5B56]">
                            Atualize o título, categoria ou observação para facilitar a busca no cofre.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveEdit} className="space-y-3.5">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-vault-title">Título</Label>
                            <Input
                                id="edit-vault-title"
                                required
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="min-h-[44px]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-vault-cat">Categoria</Label>
                            <select
                                id="edit-vault-cat"
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value as VaultCategory)}
                                className="w-full min-h-[44px] rounded-md border border-input bg-white px-3 text-sm"
                            >
                                {VAULT_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-vault-desc">Observação</Label>
                            <Textarea
                                id="edit-vault-desc"
                                rows={3}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setEditTarget(null)} className="min-h-[44px]">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={savingEdit} className="min-h-[44px] bg-[#155E4B] text-white">
                                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog de Exclusão */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#0F1F1B]">Confirmar Exclusão</DialogTitle>
                        <DialogDescription className="text-[#4B5B56]">
                            Tem certeza que deseja excluir o arquivo <strong>{deleteTarget?.title}</strong> do cofre? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} className="min-h-[44px]">
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleting}
                            onClick={handleConfirmDelete}
                            className="min-h-[44px]"
                        >
                            {deleting ? 'Excluindo...' : 'Excluir Arquivo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

