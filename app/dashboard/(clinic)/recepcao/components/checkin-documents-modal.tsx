'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, FileText, Image as ImageIcon, Download, ExternalLink, User, Stethoscope, Pill, AlertTriangle } from 'lucide-react'

interface CheckinDocumentsModalProps {
    isOpen: boolean
    onClose: () => void
    appointmentId: string
    patientName?: string
}

interface PreCheckinData {
    id: string
    checked_in_at: string
    status: string
    data: {
        phone?: string
        address?: string
        health_data?: {
            main_complaint?: string
            medications?: string
            medications_list?: string
            allergies?: string
            allergies_list?: string
        }
    }
    document_url?: string
    document_type?: string
}

interface CheckinDocument {
    type: string
    name: string
    url: string
    size: number
}

export function CheckinDocumentsModal({
    isOpen,
    onClose,
    appointmentId,
    patientName
}: CheckinDocumentsModalProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [preCheckinData, setPreCheckinData] = useState<PreCheckinData | null>(null)
    const [documents, setDocuments] = useState<CheckinDocument[]>([])

    useEffect(() => {
        if (isOpen && appointmentId) {
            loadData()
        }
    }, [isOpen, appointmentId])

    const loadData = async () => {
        setIsLoading(true)
        try {
            // Use API route to bypass RLS issues
            const response = await fetch(`/api/dashboard/recepcao/checkin-documents?appointmentId=${appointmentId}`)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const result = await response.json()

            if (result.preCheckin) {
                setPreCheckinData(result.preCheckin as PreCheckinData)
            }

            if (result.documents && Array.isArray(result.documents)) {
                setDocuments(result.documents)
            }
        } catch (error) {
            console.error('Error loading checkin data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getDocTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            rg: 'RG / CNH',
            cpf: 'CPF',
            carteirinha: 'Carteirinha do Convênio',
            exame: 'Exame Anterior',
            outro: 'Outro Documento'
        }
        return labels[type] || type
    }

    const isImageUrl = (url: string) => {
        return /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Dados do Pré-Check-in
                    </DialogTitle>
                    <DialogDescription>
                        {patientName && <span className="font-medium">{patientName}</span>}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : !preCheckinData ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum pré-check-in realizado</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                            <Badge variant={preCheckinData.status === 'completed' ? 'default' : 'secondary'}>
                                {preCheckinData.status === 'completed' ? 'Pré-check-in Completo' : preCheckinData.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                {formatDate(preCheckinData.checked_in_at)}
                            </span>
                        </div>

                        {/* Contact Info */}
                        <Card>
                            <CardContent className="pt-4 space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    <User className="w-4 h-4" /> Contato
                                </h4>
                                {preCheckinData.data?.phone && (
                                    <p className="text-sm">📞 {preCheckinData.data.phone}</p>
                                )}
                                {preCheckinData.data?.address && (
                                    <p className="text-sm">📍 {preCheckinData.data.address}</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Health Info */}
                        {preCheckinData.data?.health_data && (
                            <Card>
                                <CardContent className="pt-4 space-y-3">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4" /> Informações de Saúde
                                    </h4>

                                    {preCheckinData.data.health_data.main_complaint && (
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Queixa Principal:</p>
                                            <p className="text-sm">{preCheckinData.data.health_data.main_complaint}</p>
                                        </div>
                                    )}

                                    {(preCheckinData.data.health_data.medications === 'yes' || preCheckinData.data.health_data.medications_list) && (
                                        <div className="flex items-start gap-2">
                                            <Pill className="w-4 h-4 text-blue-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium">Medicamentos em uso:</p>
                                                <p className="text-sm">{preCheckinData.data.health_data.medications_list || 'Sim'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {(preCheckinData.data.health_data.allergies === 'yes' || preCheckinData.data.health_data.allergies_list) && (
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium">Alergias:</p>
                                                <p className="text-sm text-red-600">{preCheckinData.data.health_data.allergies_list || 'Sim'}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Documents */}
                        {documents.length > 0 && (
                            <Card>
                                <CardContent className="pt-4 space-y-3">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" /> Documentos Enviados
                                    </h4>
                                    <div className="grid gap-3">
                                        {documents.map((doc, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    {isImageUrl(doc.url) ? (
                                                        <img
                                                            src={doc.url}
                                                            alt={doc.name}
                                                            className="w-12 h-12 object-cover rounded"
                                                        />
                                                    ) : (
                                                        <FileText className="w-12 h-12 text-muted-foreground" />
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium">{getDocTypeLabel(doc.type)}</p>
                                                        <p className="text-xs text-muted-foreground">{doc.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(doc.url, '_blank')}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a href={doc.url} download>
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Single Document URL (fallback) */}
                        {preCheckinData.document_url && documents.length === 0 && (
                            <Card>
                                <CardContent className="pt-4">
                                    <h4 className="font-medium flex items-center gap-2 mb-3">
                                        <ImageIcon className="w-4 h-4" /> Documento
                                    </h4>
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <span className="text-sm">{getDocTypeLabel(preCheckinData.document_type || 'outro')}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(preCheckinData.document_url, '_blank')}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Visualizar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
