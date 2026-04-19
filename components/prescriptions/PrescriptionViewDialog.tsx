'use client'

/**
 * PrescriptionViewDialog — Visualização detalhada de prescrição
 * Com opções de PDF, assinatura e envio
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Download,
    ShieldCheck,
    Send,
    Pill,
    User,
    Calendar,
    Clock,
    FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PrescriptionData {
    id: string
    status: 'DRAFT' | 'SIGNED' | 'SENT'
    notes?: string
    created_at: string
    signed_at?: string
    sent_at?: string
    sent_via?: string
    patient?: {
        id: string
        full_name: string
        cpf?: string
        phone?: string
        email?: string
    }
    doctor?: {
        id: string
        full_name: string
    }
    signer?: {
        id: string
        full_name: string
    }
    items: {
        id: string
        medication_name: string
        dosage: string
        frequency: string
        duration?: string
        instructions?: string
    }[]
}

interface PrescriptionViewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    prescription: PrescriptionData | null
    onSign?: () => void
    onSend?: () => void
}

const STATUS_CONFIG = {
    DRAFT: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    SIGNED: { label: 'Assinada', color: 'bg-green-100 text-green-800 border-green-300' },
    SENT: { label: 'Enviada', color: 'bg-blue-100 text-blue-800 border-blue-300' },
}

export function PrescriptionViewDialog({
    open,
    onOpenChange,
    prescription,
    onSign,
    onSend,
}: PrescriptionViewDialogProps) {
    if (!prescription) return null

    const statusConfig = STATUS_CONFIG[prescription.status]
    const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')
    const formatDateTime = (d: string) => new Date(d).toLocaleString('pt-BR')

    const handleDownloadPdf = () => {
        window.open(`/api/prescriptions/${prescription.id}/pdf`, '_blank')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Prescrição Médica
                        </span>
                        <Badge className={cn('text-xs', statusConfig.color)}>
                            {statusConfig.label}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Patient & Doctor Info */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <User className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <div className="text-xs text-muted-foreground font-medium">Paciente</div>
                                <div className="font-semibold">{prescription.patient?.full_name}</div>
                                {prescription.patient?.cpf && (
                                    <div className="text-xs text-muted-foreground">CPF: {prescription.patient.cpf}</div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Calendar className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <div className="text-xs text-muted-foreground font-medium">Emissão</div>
                                <div className="font-semibold">{formatDate(prescription.created_at)}</div>
                                <div className="text-xs text-muted-foreground">
                                    Dr(a). {prescription.doctor?.full_name}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Medications */}
                    <div>
                        <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                            <Pill className="w-4 h-4 text-primary" />
                            Medicamentos ({prescription.items.length})
                        </h3>

                        <div className="space-y-2">
                            {prescription.items.map((item, idx) => (
                                <div key={item.id || idx} className="p-3 border rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <span className="font-semibold">{item.medication_name}</span>
                                    </div>
                                    <div className="ml-7 mt-1 text-sm text-muted-foreground">
                                        <span>{item.dosage}</span>
                                        <span className="mx-1">•</span>
                                        <span>{item.frequency}</span>
                                        {item.duration && (
                                            <>
                                                <span className="mx-1">•</span>
                                                <span>{item.duration}</span>
                                            </>
                                        )}
                                    </div>
                                    {item.instructions && (
                                        <div className="ml-7 mt-1 text-xs text-muted-foreground italic">
                                            {item.instructions}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    {prescription.notes && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-xs font-medium text-yellow-800 mb-1">Observações</div>
                            <div className="text-sm text-yellow-900">{prescription.notes}</div>
                        </div>
                    )}

                    {/* Signature Info */}
                    {prescription.signed_at && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-green-600" />
                            <div className="text-sm text-green-800">
                                Assinado digitalmente por{' '}
                                <strong>Dr(a). {prescription.signer?.full_name || prescription.doctor?.full_name}</strong>
                                {' '}em {formatDateTime(prescription.signed_at)}
                            </div>
                        </div>
                    )}

                    {/* Send Info */}
                    {prescription.sent_at && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Send className="w-4 h-4 text-blue-600" />
                            <div className="text-sm text-blue-800">
                                Enviado por{' '}
                                <strong>{prescription.sent_via === 'whatsapp' ? 'WhatsApp' : 'E-mail'}</strong>
                                {' '}em {formatDateTime(prescription.sent_at)}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                            <Download className="w-4 h-4 mr-2" />
                            Baixar PDF
                        </Button>

                        {prescription.status === 'DRAFT' && onSign && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onSign}>
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Assinar
                            </Button>
                        )}

                        {(prescription.status === 'SIGNED' || prescription.status === 'SENT') && onSend && (
                            <Button size="sm" onClick={onSend}>
                                <Send className="w-4 h-4 mr-2" />
                                {prescription.status === 'SENT' ? 'Reenviar' : 'Enviar'}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
