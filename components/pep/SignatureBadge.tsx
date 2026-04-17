'use client'

/**
 * SignatureBadge - Badge imutável de assinatura digital
 * Exibido no header do prontuário após assinatura ICP-Brasil
 */

import { Shield, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { VerifySignatureModal } from './VerifySignatureModal'

interface SignatureBadgeProps {
    signerName: string
    crm: string
    crmState: string
    signedAt: string
    recordId: string
    signedPdfUrl?: string
}

export function SignatureBadge({
    signerName,
    crm,
    crmState,
    signedAt,
    recordId,
    signedPdfUrl,
}: SignatureBadgeProps) {
    const [showVerify, setShowVerify] = useState(false)

    const formattedDate = new Date(signedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })

    return (
        <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs font-semibold">
                                ✅ Assinado Digitalmente
                            </Badge>
                        </div>
                        <p className="text-sm text-emerald-800 mt-1 font-medium">
                            {signerName} | CRM-{crmState} {crm} | {formattedDate}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {signedPdfUrl && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            onClick={() => window.open(signedPdfUrl, '_blank')}
                        >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Ver PDF
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => setShowVerify(true)}
                    >
                        <Shield className="w-3.5 h-3.5 mr-1.5" />
                        Verificar autenticidade
                    </Button>
                </div>
            </div>

            <VerifySignatureModal
                open={showVerify}
                onOpenChange={setShowVerify}
                recordId={recordId}
            />
        </>
    )
}
