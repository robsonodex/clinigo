/**
 * Document Upload Component
 * With Health vs Admin document group segregation
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from '@/components/ui/select'
import { Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DocumentUploadProps {
    patientId: string
    clinicId: string
    onUploadComplete?: () => void
    userRole?: string
}

// Mapeamento de tipo → grupo (health ou admin)
const DOC_TYPE_GROUP: Record<string, string> = {
    EXAM: 'health',
    exam: 'health',
    PRESCRIPTION: 'health',
    prescription: 'health',
    report: 'health',
    referral: 'health',
    certificate: 'health',
    CONVENIO_CARD: 'admin',
    CONSENT_TERM: 'admin',
    consent: 'admin',
    personal: 'admin',
    OTHER: 'admin',
    other: 'admin',
}

export function DocumentUpload({ patientId, clinicId, onUploadComplete, userRole }: DocumentUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [documentType, setDocumentType] = useState('OTHER')
    const supabase = createClient()

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files || files.length === 0) return

        setUploading(true)

        try {
            for (const file of Array.from(files)) {
                // 1. Upload to Supabase Storage
                const fileName = `${Date.now()}_${file.name}`
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('patient-documents')
                    .upload(`${clinicId}/${patientId}/${fileName}`, file)

                if (uploadError) {
                    toast.error(`Erro ao fazer upload de ${file.name}: ${uploadError.message}`)
                    continue
                }

                // 2. Get public URL
                const { data: urlData } = supabase.storage
                    .from('patient-documents')
                    .getPublicUrl(uploadData.path)

                // 3. Determinar grupo do documento
                const docGroup = DOC_TYPE_GROUP[documentType] || 'admin'

                // 4. Save to database
                const { error: dbError } = await supabase.from('patient_documents').insert({
                    patient_id: patientId,
                    clinic_id: clinicId,
                    file_name: file.name,
                    file_url: urlData.publicUrl,
                    file_type: file.type,
                    file_size_bytes: file.size,
                    document_type: documentType,
                    doc_group: docGroup,
                } as any)

                if (dbError) {
                    toast.error(`Erro ao salvar ${file.name} no banco: ${dbError.message}`)
                    continue
                }

                toast.success(`${file.name} enviado com sucesso!`)
            }

            onUploadComplete?.()
        } catch (error: any) {
            toast.error(`Erro inesperado: ${error.message}`)
        } finally {
            setUploading(false)
            // Reset input
            event.target.value = ''
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload de Documentos</CardTitle>
                <CardDescription>
                    Envie documentos de saúde ou administrativos do paciente
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Tipo de Documento</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
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
                                <SelectItem value="OTHER">Outro</SelectItem>
                                {(userRole === 'CLINIC_ADMIN' || userRole === 'SUPER_ADMIN') && (
                                    <SelectItem value="personal">Documento Pessoal (Apenas ADM)</SelectItem>
                                )}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Arquivos</Label>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                        {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                <p className="text-sm">Enviando documentos...</p>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="mb-4 text-sm">Arraste arquivos aqui ou clique para selecionar</p>
                                <Input
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf"
                                    onChange={handleFileUpload}
                                    className="max-w-xs mx-auto cursor-pointer"
                                    disabled={uploading}
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="text-sm text-muted-foreground">
                    <p>Formatos aceitos: PDF, imagens (JPG, PNG)</p>
                    <p>Tamanho máximo por arquivo: 10MB</p>
                </div>
            </CardContent>
        </Card>
    )
}
