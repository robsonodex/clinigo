'use client'

/**
 * PrescriptionSendDialog — Modal de envio por WhatsApp ou E-mail
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { MessageCircle, Mail, Loader2, Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface PrescriptionSendDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    prescriptionId: string
    patientName: string
    patientPhone?: string | null
    patientEmail?: string | null
    onSuccess?: () => void
}

export function PrescriptionSendDialog({
    open,
    onOpenChange,
    prescriptionId,
    patientName,
    patientPhone,
    patientEmail,
    onSuccess,
}: PrescriptionSendDialogProps) {
    const { toast } = useToast()
    const [method, setMethod] = useState<'whatsapp' | 'email' | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSend = async () => {
        if (!method) return

        setLoading(true)
        setError('')

        try {
            const res = await fetch(`/api/prescriptions/${prescriptionId}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Erro ao enviar prescrição')
                return
            }

            toast({
                title: '✅ Prescrição enviada!',
                description: data.warning || data.message,
            })

            setMethod(null)
            onOpenChange(false)
            onSuccess?.()
        } catch (err: any) {
            setError(err.message || 'Erro inesperado')
        } finally {
            setLoading(false)
        }
    }

    const hasPhone = !!patientPhone
    const hasEmail = !!patientEmail

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-primary" />
                        Enviar Prescrição
                    </DialogTitle>
                    <DialogDescription>
                        Envie a prescrição assinada para <strong>{patientName}</strong>.
                        Escolha o método de envio:
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {/* WhatsApp Option */}
                    <button
                        onClick={() => hasPhone && setMethod('whatsapp')}
                        disabled={!hasPhone}
                        className={cn(
                            'w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                            method === 'whatsapp'
                                ? 'border-green-500 bg-green-50'
                                : hasPhone
                                    ? 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                                    : 'border-gray-100 opacity-50 cursor-not-allowed'
                        )}
                    >
                        <div className={cn(
                            'p-2 rounded-full',
                            method === 'whatsapp' ? 'bg-green-100' : 'bg-gray-100'
                        )}>
                            <MessageCircle className={cn(
                                'w-5 h-5',
                                method === 'whatsapp' ? 'text-green-600' : 'text-gray-500'
                            )} />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium">WhatsApp</div>
                            <div className="text-sm text-muted-foreground">
                                {hasPhone
                                    ? `Enviar para ${patientPhone}`
                                    : 'Paciente sem telefone cadastrado'}
                            </div>
                        </div>
                        {method === 'whatsapp' && (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                    </button>

                    {/* Email Option */}
                    <button
                        onClick={() => hasEmail && setMethod('email')}
                        disabled={!hasEmail}
                        className={cn(
                            'w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                            method === 'email'
                                ? 'border-blue-500 bg-blue-50'
                                : hasEmail
                                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                    : 'border-gray-100 opacity-50 cursor-not-allowed'
                        )}
                    >
                        <div className={cn(
                            'p-2 rounded-full',
                            method === 'email' ? 'bg-blue-100' : 'bg-gray-100'
                        )}>
                            <Mail className={cn(
                                'w-5 h-5',
                                method === 'email' ? 'text-blue-600' : 'text-gray-500'
                            )} />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium">E-mail</div>
                            <div className="text-sm text-muted-foreground">
                                {hasEmail
                                    ? `Enviar para ${patientEmail}`
                                    : 'Paciente sem e-mail cadastrado'}
                            </div>
                        </div>
                        {method === 'email' && (
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}
                    </button>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setMethod(null)
                            setError('')
                            onOpenChange(false)
                        }}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={loading || !method}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Enviar Prescrição
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
