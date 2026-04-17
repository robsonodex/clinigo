'use client'

/**
 * VerifySignatureModal - Modal de verificação de autenticidade
 * Chama /api/pep/sign/verify e exibe resultado detalhado
 */

import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldCheck, ShieldAlert, Copy, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface VerifySignatureModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    recordId: string
}

interface VerificationResult {
    is_valid: boolean
    signer_name: string
    crm: string
    crm_state: string
    signed_at: string
    signing_method: string
    certificate_serial: string
    certificate_valid_until: string
    signature_hash: string
    document_type: string
    hash_verified: boolean
    error?: string
}

export function VerifySignatureModal({ open, onOpenChange, recordId }: VerifySignatureModalProps) {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<VerificationResult | null>(null)
    const [copied, setCopied] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        if (open && recordId) {
            verify()
        }
    }, [open, recordId])

    const verify = async () => {
        setLoading(true)
        setResult(null)
        try {
            const res = await fetch(`/api/pep/sign/verify?record_id=${recordId}`)
            const data = await res.json()
            setResult(data)
        } catch {
            toast({ title: 'Erro', description: 'Falha ao verificar assinatura', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const copyHash = () => {
        if (result?.signature_hash) {
            navigator.clipboard.writeText(result.signature_hash)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const methodLabel: Record<string, string> = {
        icp_brasil_a1: 'ICP-Brasil A1',
        icp_brasil_a3: 'ICP-Brasil A3',
        memed: 'Memed',
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {result?.is_valid ? (
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        ) : (
                            <ShieldAlert className="h-5 w-5 text-amber-500" />
                        )}
                        Verificação de Autenticidade
                    </DialogTitle>
                    <DialogDescription>
                        Resultado da verificação do documento assinado digitalmente.
                    </DialogDescription>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="ml-3 text-muted-foreground">Verificando assinatura...</span>
                    </div>
                )}

                {!loading && result && (
                    <div className="space-y-4 mt-2">
                        {/* Status */}
                        <div className={`p-4 rounded-lg border ${
                            result.is_valid 
                                ? 'bg-emerald-50 border-emerald-200' 
                                : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center gap-2">
                                {result.is_valid ? (
                                    <>
                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                        <span className="font-semibold text-emerald-800">Documento autêntico</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldAlert className="w-5 h-5 text-red-600" />
                                        <span className="font-semibold text-red-800">
                                            {result.error || 'Falha na verificação'}
                                        </span>
                                    </>
                                )}
                            </div>
                            {result.hash_verified !== undefined && (
                                <p className="text-xs mt-1 text-muted-foreground">
                                    Hash SHA-256: {result.hash_verified ? 'Verificado ✓' : 'Não corresponde ✗'}
                                </p>
                            )}
                        </div>

                        {/* Details */}
                        {result.signer_name && (
                            <div className="space-y-3 text-sm">
                                <DetailRow label="Assinado por" value={result.signer_name} />
                                <DetailRow 
                                    label="CRM" 
                                    value={`${result.crm}-${result.crm_state}`} 
                                />
                                <DetailRow 
                                    label="Data da assinatura" 
                                    value={new Date(result.signed_at).toLocaleString('pt-BR')} 
                                />
                                <DetailRow 
                                    label="Método" 
                                    value={
                                        <Badge variant="secondary" className="text-xs">
                                            {methodLabel[result.signing_method] || result.signing_method}
                                        </Badge>
                                    } 
                                />
                                <DetailRow label="Serial do certificado" value={result.certificate_serial} />
                                <DetailRow 
                                    label="Certificado válido até" 
                                    value={new Date(result.certificate_valid_until).toLocaleDateString('pt-BR')} 
                                />

                                {/* Hash */}
                                <div className="pt-2 border-t">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Hash SHA-256 do documento
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={copyHash}
                                        >
                                            {copied ? (
                                                <><CheckCircle className="w-3 h-3 mr-1" /> Copiado</>
                                            ) : (
                                                <><Copy className="w-3 h-3 mr-1" /> Copiar</>
                                            )}
                                        </Button>
                                    </div>
                                    <code className="block text-[10px] bg-muted p-2 rounded font-mono break-all">
                                        {result.signature_hash}
                                    </code>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value}</span>
        </div>
    )
}
