'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DocumentUpload } from '@/components/documents/DocumentUpload'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface PatientDocumentsProps {
    patientId: string
    clinicId: string
}

export function PatientDocuments({ patientId, clinicId }: PatientDocumentsProps) {
    const [documents, setDocuments] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    const loadDocuments = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('patient_documents')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            
        if (!error && data) {
            setDocuments(data)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        if (patientId) loadDocuments()
    }, [patientId])

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir este documento?')) return
        const { error } = await supabase.from('patient_documents').delete().eq('id', id)
        if (error) {
            toast.error('Erro ao excluir documento')
        } else {
            toast.success('Documento excluído')
            loadDocuments()
        }
    }

    return (
        <div className="space-y-6">
            <DocumentUpload patientId={patientId} clinicId={clinicId} onUploadComplete={loadDocuments} />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Documentos do Paciente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : documents.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground">Nenhum documento encontrado.</div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded">
                                            <FileText className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{doc.file_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')} • {doc.document_type || doc.category}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" asChild>
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
