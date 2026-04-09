'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
    FileText, Upload, Search, Filter, Loader2, Eye, Download,
    Trash2, FileImage, FileScan, Calendar, User, Tag
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Document {
    id: string
    name: string
    original_name: string
    file_type: string
    file_size: number
    storage_path: string
    document_type: string
    category: string | null
    tags: string[]
    ocr_status: string
    ocr_text: string | null
    icd_codes: string[]
    notes: string | null
    created_at: string
    patients: { full_name: string; cpf: string }
    users: { full_name: string } | null
}

interface Patient {
    id: string
    full_name: string
    cpf: string
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<string>('all')
    const [showUploadDialog, setShowUploadDialog] = useState(false)
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [editDocType, setEditDocType] = useState('')
    const [editNotes, setEditNotes] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    // Upload form state
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploadPatientId, setUploadPatientId] = useState('')
    const [uploadDocType, setUploadDocType] = useState('')
    const [uploadNotes, setUploadNotes] = useState('')
    const [runOcr, setRunOcr] = useState(true)

    const fetchDocuments = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)
            if (filterType !== 'all') params.set('type', filterType)

            const res = await fetch(`/api/documents?${params}`)
            if (res.ok) {
                const data = await res.json()
                setDocuments(data.documents || [])
            }
        } catch (error) {
            console.error('Error fetching documents:', error)
        } finally {
            setLoading(false)
        }
    }, [searchQuery, filterType])

    const fetchPatients = async () => {
        try {
            const res = await fetch('/api/patients?limit=100')
            if (res.ok) {
                const data = await res.json()
                setPatients(data.patients || [])
            }
        } catch (error) {
            console.error('Error fetching patients:', error)
        }
    }

    useEffect(() => {
        fetchDocuments()
        fetchPatients()
    }, [fetchDocuments])

    const handleUpload = async () => {
        if (!uploadFile || !uploadPatientId) {
            toast.error('Selecione um arquivo e um paciente')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', uploadFile)
            formData.append('patient_id', uploadPatientId)
            formData.append('document_type', uploadDocType)
            formData.append('notes', uploadNotes)
            formData.append('run_ocr', runOcr.toString())

            const res = await fetch('/api/documents', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Erro ao fazer upload')
                return
            }

            toast.success('Documento enviado com sucesso!')

            if (data.ocr?.success) {
                toast.info('OCR processado com sucesso')
            }

            setShowUploadDialog(false)
            resetUploadForm()
            fetchDocuments()
        } catch (error) {
            toast.error('Erro ao fazer upload')
            console.error(error)
        } finally {
            setUploading(false)
        }
    }

    const resetUploadForm = () => {
        setUploadFile(null)
        setUploadPatientId('')
        setUploadDocType('')
        setUploadNotes('')
        setRunOcr(true)
    }

    const handleOpenDocument = (doc: Document) => {
        setSelectedDocument(doc)
        setEditName(doc.name || '')
        setEditDocType(doc.document_type || '')
        setEditNotes(doc.notes || '')
        setIsEditing(false)
    }

    const handleSaveEdit = async () => {
        if (!selectedDocument) return
        try {
            const res = await fetch(`/api/documents/${selectedDocument.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    document_type: editDocType,
                    notes: editNotes
                })
            })
            if (!res.ok) throw new Error('Falha ao salvar')
            toast.success('Documento atualizado com sucesso')
            fetchDocuments()
            setIsEditing(false)
            setSelectedDocument({ ...selectedDocument, name: editName, document_type: editDocType, notes: editNotes })
        } catch (error) {
            toast.error('Erro ao editar documento')
        }
    }

    const handleDelete = async (docId: string) => {
        if (!confirm('Tem certeza que deseja excluir este documento permanentemente?')) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Falha ao excluir')
            }
            toast.success('Documento excluído com sucesso')
            if (selectedDocument?.id === docId) setSelectedDocument(null)
            fetchDocuments()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir documento')
        } finally {
            setIsDeleting(false)
        }
    }

    const getDocTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            exam: 'Exame',
            prescription: 'Receita',
            certificate: 'Atestado',
            report: 'Laudo',
            referral: 'Encaminhamento',
            consent: 'Termo de Consentimento',
            other: 'Outro'
        }
        return labels[type] || type
    }

    const getOcrStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="bg-green-500">OCR Concluído</Badge>
            case 'processing':
                return <Badge variant="secondary">Processando...</Badge>
            case 'failed':
                return <Badge variant="destructive">OCR Falhou</Badge>
            default:
                return <Badge variant="outline">Pendente</Badge>
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) return <FileImage className="h-8 w-8 text-blue-500" />
        if (fileType === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />
        return <FileScan className="h-8 w-8 text-gray-500" />
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Gestão de Documentos</h1>
                    <p className="text-muted-foreground">
                        Upload e gestão de exames, laudos e documentos médicos
                    </p>
                </div>

                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Upload className="h-4 w-4 mr-2" />
                            Novo Upload
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Upload de Documento</DialogTitle>
                            <DialogDescription>
                                Envie um documento para o prontuário do paciente
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* File Input */}
                            <div className="space-y-2">
                                <Label>Arquivo</Label>
                                <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                />
                                {uploadFile && (
                                    <p className="text-sm text-muted-foreground">
                                        {uploadFile.name} ({formatFileSize(uploadFile.size)})
                                    </p>
                                )}
                            </div>

                            {/* Patient Select */}
                            <div className="space-y-2">
                                <Label>Paciente *</Label>
                                <Select value={uploadPatientId} onValueChange={setUploadPatientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o paciente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients.map((patient) => (
                                            <SelectItem key={patient.id} value={patient.id}>
                                                {patient.full_name} - CPF: {patient.cpf}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Document Type */}
                            <div className="space-y-2">
                                <Label>Tipo de Documento</Label>
                                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="exam">Exame</SelectItem>
                                        <SelectItem value="prescription">Receita</SelectItem>
                                        <SelectItem value="certificate">Atestado</SelectItem>
                                        <SelectItem value="report">Laudo</SelectItem>
                                        <SelectItem value="referral">Encaminhamento</SelectItem>
                                        <SelectItem value="consent">Termo de Consentimento</SelectItem>
                                        <SelectItem value="other">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label>Observações</Label>
                                <Textarea
                                    value={uploadNotes}
                                    onChange={(e) => setUploadNotes(e.target.value)}
                                    placeholder="Observações sobre o documento..."
                                    rows={3}
                                />
                            </div>

                            {/* Campo de OCR Ocultado. Funcionalidade futura. */}

                            <Button onClick={handleUpload} disabled={uploading} className="w-full">
                                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Enviar Documento
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar documentos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-48">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os tipos</SelectItem>
                                <SelectItem value="exam">Exames</SelectItem>
                                <SelectItem value="prescription">Receitas</SelectItem>
                                <SelectItem value="certificate">Atestados</SelectItem>
                                <SelectItem value="report">Laudos</SelectItem>
                                <SelectItem value="other">Outros</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Documents List */}
            <div className="grid gap-4">
                {loading ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </CardContent>
                    </Card>
                ) : documents.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="font-medium text-lg">Nenhum documento encontrado</h3>
                            <p className="text-muted-foreground">
                                Faça o upload do primeiro documento
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    documents.map((doc) => (
                        <Card key={doc.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="py-4">
                                <div className="flex items-start gap-4">
                                    {getFileIcon(doc.file_type)}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-medium truncate">{doc.name}</h3>
                                            <Badge variant="outline">{getDocTypeLabel(doc.document_type)}</Badge>
                                        </div>

                                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {doc.patients?.full_name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(doc.created_at), {
                                                    addSuffix: true,
                                                    locale: ptBR
                                                })}
                                            </span>
                                            <span>{formatFileSize(doc.file_size)}</span>
                                        </div>

                                        {doc.icd_codes && doc.icd_codes.length > 0 && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <Tag className="h-3 w-3" />
                                                {doc.icd_codes.map((code) => (
                                                    <Badge key={code} variant="secondary" className="text-xs">
                                                        {code}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDocument(doc)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" asChild>
                                            <a href={doc.storage_path || '#'} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Document Preview Dialog */}
            <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex justify-between items-start pr-6">
                            <div>
                                {isEditing ? (
                                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="mb-2 w-full max-w-sm" />
                                ) : (
                                    <DialogTitle>{selectedDocument?.name}</DialogTitle>
                                )}
                                <DialogDescription className="mt-2">
                                    {isEditing ? (
                                        <Select value={editDocType} onValueChange={setEditDocType}>
                                            <SelectTrigger className="w-48 h-8 text-xs">
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="exam">Exame</SelectItem>
                                                <SelectItem value="prescription">Receita</SelectItem>
                                                <SelectItem value="certificate">Atestado</SelectItem>
                                                <SelectItem value="report">Laudo</SelectItem>
                                                <SelectItem value="referral">Encaminhamento</SelectItem>
                                                <SelectItem value="consent">Termo de Consentimento</SelectItem>
                                                <SelectItem value="other">Outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <>{getDocTypeLabel(selectedDocument?.document_type || '')} • {selectedDocument?.patients?.full_name}</>
                                    )}
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <Button size="sm" onClick={handleSaveEdit}>Salvar</Button>
                                ) : (
                                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>Editar</Button>
                                )}
                                <Button size="sm" variant="destructive" onClick={() => selectedDocument?.id && handleDelete(selectedDocument.id)} disabled={isDeleting}>
                                    Excluir
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedDocument?.ocr_text && (
                        <Tabs defaultValue="metadata">
                            <TabsList>
                                <TabsTrigger value="metadata">Informações</TabsTrigger>
                                <TabsTrigger value="ocr">Texto Extraído</TabsTrigger>
                            </TabsList>

                            <TabsContent value="ocr" className="mt-4">
                                <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap text-sm">
                                        {selectedDocument.ocr_text}
                                    </pre>
                                </div>
                            </TabsContent>

                            <TabsContent value="metadata" className="mt-4">
                                <div className="space-y-4 text-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><strong>Arquivo:</strong> {selectedDocument.original_name}</div>
                                        <div><strong>Tipo Original:</strong> {selectedDocument.file_type}</div>
                                        <div><strong>Tamanho:</strong> {formatFileSize(selectedDocument.file_size)}</div>
                                        <div><strong>Upload por:</strong> {selectedDocument.users?.full_name || 'N/A'}</div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                        <strong>Observações:</strong>
                                        {isEditing ? (
                                            <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} />
                                        ) : (
                                            <div className="bg-muted p-3 rounded-md min-h-[60px]">{selectedDocument.notes || 'Nenhuma observação.'}</div>
                                        )}
                                    </div>
                                    
                                    {selectedDocument.file_type.startsWith('image/') || selectedDocument.file_type === 'application/pdf' ? (
                                        <div className="mt-4 flex justify-center p-4 bg-muted/50 rounded-lg">
                                            <Button asChild variant="outline">
                                                <a href={selectedDocument.storage_path || '#'} target="_blank" rel="noopener noreferrer">
                                                    Abrir Documento Original
                                                </a>
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                    
                    {!selectedDocument?.ocr_text && (
                        <div className="space-y-4 text-sm mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><strong>Arquivo:</strong> {selectedDocument?.original_name}</div>
                                <div><strong>Tamanho:</strong> {formatFileSize(selectedDocument?.file_size || 0)}</div>
                                <div><strong>Upload por:</strong> {selectedDocument?.users?.full_name || 'N/A'}</div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <strong>Observações:</strong>
                                {isEditing ? (
                                    <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} />
                                ) : (
                                    <div className="bg-muted p-3 rounded-md min-h-[60px]">{selectedDocument?.notes || 'Nenhuma observação.'}</div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-center">
                                <Button asChild variant="outline">
                                    <a href={selectedDocument?.storage_path || '#'} target="_blank" rel="noopener noreferrer">
                                        Abrir / Visualizar Original Externo
                                    </a>
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

