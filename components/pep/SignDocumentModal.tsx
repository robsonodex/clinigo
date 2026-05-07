'use client'

/**
 * SignDocumentModal - Modal de assinatura digital do prontuário
 * Verifica certificado e inicia o processo de assinatura ICP-Brasil
 */

import { useEffect, useState, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
    PenLine,
    Loader2,
    CheckCircle,
    AlertCircle,
    Shield,
    FileKey2,
    Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CertificateUploadModal } from './CertificateUploadModal'

interface SignDocumentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    recordId: string
    documentType?: string
    apiEndpoint?: string
    payloadKey?: string
    onSuccess?: (signatureData: any) => void
}

type ModalState = 'loading' | 'no-certificate' | 'ready' | 'signing' | 'success' | 'error'

interface CertificateInfo {
    certificate_serial: string
    valid_until: string
    crm: string
    crm_state: string
    owner_name: string
    is_expired: boolean
    days_until_expiry: number
}

export function SignDocumentModal({
    open,
    onOpenChange,
    recordId,
    documentType = 'prontuario',
    apiEndpoint = '/api/pep/sign',
    payloadKey = 'record_id',
    onSuccess,
}: SignDocumentModalProps) {
    const [state, setState] = useState<ModalState>('loading')
    const [certificate, setCertificate] = useState<CertificateInfo | null>(null)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { toast } = useToast()

    const checkCertificate = useCallback(async () => {
        setState('loading')
        try {
            const res = await fetch('/api/pep/sign/certificate')
            const data = await res.json()

            if (data.has_certificate && data.certificate) {
                setCertificate(data.certificate)

                if (data.certificate.is_expired) {
                    setState('no-certificate')
                    setErrorMessage('Seu certificado expirou. Faça upload de um novo certificado.')
                } else {
                    setState('ready')
                }
            } else {
                setState('no-certificate')
                setErrorMessage('')
            }
        } catch {
            setState('error')
            setErrorMessage('Erro ao verificar certificado')
        }
    }, [])

    useEffect(() => {
        if (open) {
            checkCertificate()
        }
    }, [open, checkCertificate])

    const handleSign = async () => {
        setState('signing')
        setErrorMessage('')

        try {
            const res = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [payloadKey]: recordId,
                    document_type: documentType,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setState('error')
                setErrorMessage(data.error || 'Erro ao assinar documento')
                return
            }

            setState('success')
            toast({
                title: '✅ Documento assinado digitalmente',
                description: `Hash: ${data.signature_hash.substring(0, 16)}...`,
            })

            onSuccess?.(data)

            // Close after brief delay
            setTimeout(() => {
                onOpenChange(false)
            }, 2000)

        } catch {
            setState('error')
            setErrorMessage('Erro de conexão ao assinar documento')
        }
    }

    const handleUploadSuccess = () => {
        setShowUploadModal(false)
        checkCertificate()
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PenLine className="h-5 w-5 text-primary" />
                            Assinar Digitalmente
                        </DialogTitle>
                        <DialogDescription>
                            Assinar este documento com seu certificado digital ICP-Brasil.
                            Após a assinatura, o documento não poderá mais ser editado.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        {/* Loading */}
                        {state === 'loading' && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <span className="ml-2 text-muted-foreground">Verificando certificado...</span>
                            </div>
                        )}

                        {/* No certificate */}
                        {state === 'no-certificate' && (
                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-amber-800">
                                            {errorMessage || 'Nenhum certificado digital cadastrado'}
                                        </p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Para assinar documentos digitalmente, cadastre seu certificado ICP-Brasil (arquivo .pfx).
                                        </p>
                                    </div>
                                </div>
                                <Button className="w-full" onClick={() => setShowUploadModal(true)}>
                                    <FileKey2 className="w-4 h-4 mr-2" />
                                    Cadastrar Certificado Digital
                                </Button>
                            </div>
                        )}

                        {/* Ready to sign */}
                        {state === 'ready' && certificate && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 border rounded-lg p-4 space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm font-semibold text-emerald-800">Certificado válido</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span className="text-muted-foreground">Titular:</span>
                                        <span className="font-medium">{certificate.owner_name}</span>

                                        <span className="text-muted-foreground">CRM:</span>
                                        <span className="font-medium">{certificate.crm}-{certificate.crm_state}</span>

                                        <span className="text-muted-foreground">Válido até:</span>
                                        <span className="font-medium flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(certificate.valid_until).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>

                                    {certificate.days_until_expiry <= 30 && (
                                        <div className="mt-2">
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                                                ⚠️ Expira em {certificate.days_until_expiry} dias
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-700">
                                        <strong>⚠️ Atenção:</strong> Após assinar, este prontuário será bloqueado
                                        para edição permanentemente. Certifique-se de que todas as informações estão corretas.
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                                        Cancelar
                                    </Button>
                                    <Button className="flex-1" onClick={handleSign}>
                                        <PenLine className="w-4 h-4 mr-2" />
                                        Confirmar Assinatura
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Signing */}
                        {state === 'signing' && (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-muted-foreground font-medium">Assinando documento...</p>
                                <p className="text-xs text-muted-foreground">
                                    Gerando PDF, aplicando assinatura digital e calculando hash SHA-256
                                </p>
                            </div>
                        )}

                        {/* Success */}
                        {state === 'success' && (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                                </div>
                                <p className="font-semibold text-emerald-800">Documento assinado com sucesso!</p>
                                <p className="text-xs text-muted-foreground">
                                    O prontuário foi bloqueado para edição.
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {state === 'error' && (
                            <div className="space-y-4">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-red-800">Erro na assinatura</p>
                                        <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                                        Fechar
                                    </Button>
                                    <Button className="flex-1" onClick={checkCertificate}>
                                        Tentar novamente
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Upload modal (nested) */}
            <CertificateUploadModal
                open={showUploadModal}
                onOpenChange={setShowUploadModal}
                onSuccess={handleUploadSuccess}
            />
        </>
    )
}
