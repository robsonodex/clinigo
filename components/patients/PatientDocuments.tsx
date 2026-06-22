'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DocumentUpload } from '@/components/documents/DocumentUpload'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download, Trash2, Loader2, Edit2, Stethoscope, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface PatientDocumentsProps {
    patientId: string
    clinicId: string
    userRole?: string
}

// Mapeamento tipo → grupo
const DOC_TYPE_GROUP: Record<string, string> = {
    EXAM: 'health', exam: 'health', PRESCRIPTION: 'health', prescription: 'health',
    report: 'health', referral: 'health', certificate: 'health',
    CONVENIO_CARD: 'admin', CONSENT_TERM: 'admin', consent: 'admin',
    personal: 'admin', OTHER: 'admin', other: 'admin',
}

export function PatientDocuments({ patientId, clinicId, userRole }: PatientDocumentsProps) {
    const [documents, setDocuments] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editingDoc, setEditingDoc] = useState<any>(null)
    const [editName, setEditName] = useState('')
    const [editType, setEditType] = useState('')
    const [editNotes, setEditNotes] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const supabase = createClient()

    const loadDocuments = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/documents?patient_id=${patientId}`)
            if (res.ok) {
                const data = await res.json()
                setDocuments(data.documents || [])
            } else {
                toast.error('Erro ao carregar documentos')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (patientId) loadDocuments()
    }, [patientId])

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.')) return
        try {
            const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Erro ao excluir')
            toast.success('Documento excluído')
            loadDocuments()
        } catch (error) {
            toast.error('Erro ao excluir documento')
        }
    }

    const handleEditClick = (doc: any) => {
        setEditingDoc(doc)
        setEditName(doc.name || doc.file_name || '')
        setEditType(doc.document_type || doc.category || '')
        setEditNotes(doc.notes || doc.description || '')
    }

    const handleSaveEdit = async () => {
        if (!editingDoc) return
        setIsSaving(true)
        try {
            const docGroup = DOC_TYPE_GROUP[editType] || 'admin'
            const res = await fetch(`/api/documents/${editingDoc.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    document_type: editType,
                    notes: editNotes,
                    doc_group: docGroup
                })
            })
            if (!res.ok) throw new Error('Falha ao salvar')
            toast.success('Documento atualizado com sucesso')
            setEditingDoc(null)
            loadDocuments()
        } catch (error) {
            toast.error('Erro ao editar documento')
        } finally {
            setIsSaving(false)
        }
    }

    const getDocTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            exam: 'Exame', prescription: 'Receita', certificate: 'Atestado',
            report: 'Laudo', referral: 'Encaminhamento', consent: 'Termo de Consentimento',
            other: 'Outro', personal: 'Documento Pessoal (Apenas ADM)',
            CONVENIO_CARD: 'Carteirinha de Convênio', EXAM: 'Exame',
            CONSENT_TERM: 'Termo de Consentimento', PRESCRIPTION: 'Receita', OTHER: 'Outro'
        }
        return labels[type] || type
    }

    const getDocGroup = (doc: any): string => {
        if (doc.doc_group) return doc.doc_group
        const type = doc.document_type || doc.category || ''
        return DOC_TYPE_GROUP[type] || 'admin'
    }

    const healthDocs = documents.filter(d => getDocGroup(d) === 'health')
    const adminDocs = documents.filter(d => getDocGroup(d) === 'admin')

    const renderDocList = (docs: any[]) => (
        <div className="space-y-2">
            {docs.length === 0 && (
                <div className="text-center p-3 text-muted-foreground text-sm">Nenhum documento nesta categoria.</div>
            )}
            {docs.map(doc => {
                const isPersonal = (doc.document_type || doc.category) === 'personal'
                return (
                    <div key={doc.id} className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-all ${isPersonal ? 'bg-amber-50/50 border-amber-200 shadow-sm' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded shrink-0 ${isPersonal ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-sm truncate">{doc.name || doc.file_name}</p>
                                    {isPersonal && (
                                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-amber-300 shrink-0">
                                            🔒 Apenas ADM
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')} • {getDocTypeLabel(doc.document_type || doc.category)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                            <Button variant="ghost" size="sm" className="h-9 w-9 min-w-[44px] min-h-[44px]" onClick={() => handleEditClick(doc)}>
                                <Edit2 className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9 w-9 min-w-[44px] min-h-[44px]" asChild>
                                <a href={doc.storage_path || doc.file_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                </a>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9 w-9 min-w-[44px] min-h-[44px]" onClick={() => handleDelete(doc.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                )
            })}
        </div>
    )

    return (
        <div className="space-y-6">
            <DocumentUpload patientId={patientId} clinicId={clinicId} onUploadComplete={loadDocuments} userRole={userRole} />

            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
                <>
                    {/* Documentos de Saúde */}
                    <Card className="border-emerald-100 dark:border-emerald-900/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Stethoscope className="w-5 h-5 text-emerald-600" />
                                Documentos de Saúde
                                <span className="text-xs font-normal text-muted-foreground ml-1">({healthDocs.length})</span>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">Exames, receitas, laudos, encaminhamentos e atestados — visíveis para terapeutas da agenda</p>
                        </CardHeader>
                        <CardContent>{renderDocList(healthDocs)}</CardContent>
                    </Card>

                    {/* Documentos Administrativos */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FolderOpen className="w-5 h-5 text-blue-600" />
                                Documentos Administrativos
                                <span className="text-xs font-normal text-muted-foreground ml-1">({adminDocs.length})</span>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">Convênios, termos, documentos pessoais — visíveis apenas para recepção e administração</p>
                        </CardHeader>
                        <CardContent>{renderDocList(adminDocs)}</CardContent>
                    </Card>
                </>
            )}

            {/* Modal de Edição */}
            <Dialog open={!!editingDoc} onOpenChange={(open) => !open && setEditingDoc(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Documento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome do Documento</Label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome do arquivo..." style={{ fontSize: '16px' }} />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Documento</Label>
                            <Select value={editType} onValueChange={setEditType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel className="text-emerald-600 font-bold text-xs">🏥 Saúde</SelectLabel>
                                        <SelectItem value="EXAM">Exame</SelectItem>
                                        <SelectItem value="PRESCRIPTION">Receita</SelectItem>
                                        <SelectItem value="report">Laudo</SelectItem>
                                        <SelectItem value="referral">Encaminhamento</SelectItem>
                                        <SelectItem value="certificate">Atestado</SelectItem>
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel className="text-blue-600 font-bold text-xs">📋 Administrativo</SelectLabel>
                                        <SelectItem value="CONVENIO_CARD">Carteirinha de Convênio</SelectItem>
                                        <SelectItem value="CONSENT_TERM">Termo de Consentimento</SelectItem>
                                        <SelectItem value="other">Outro</SelectItem>
                                        {(userRole === 'CLINIC_ADMIN' || userRole === 'SUPER_ADMIN') && (
                                            <SelectItem value="personal">Documento Pessoal (Apenas ADM)</SelectItem>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Adicione notas sobre o documento..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingDoc(null)} className="min-h-[44px]">Cancelar</Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving} className="min-h-[44px]">
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
