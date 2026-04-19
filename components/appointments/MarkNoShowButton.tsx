'use client'

import { useState } from 'react'
import { UserX, Loader2, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface MarkNoShowButtonProps {
    appointmentId: string
    patientName: string
    onSuccess?: () => void
}

export function MarkNoShowButton({
    appointmentId,
    patientName,
    onSuccess
}: MarkNoShowButtonProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [reason, setReason] = useState('')

    const handleMarkNoShow = async () => {
        setLoading(true)

        try {
            const response = await fetch(`/api/appointments/${appointmentId}/mark-no-show`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: reason.trim() || undefined,
                })
            })

            // ✅ Check if response is JSON before parsing
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Server returned non-JSON response:', {
                    status: response.status,
                    statusText: response.statusText,
                    contentType,
                })
                throw new Error(`Erro no servidor (${response.status}). Verifique os logs.`)
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao marcar falta')
            }

            // Notify about WhatsApp status
            const wppInfo = data.whatsapp_sent
                ? ' WhatsApp de reagendamento enviado.'
                : ''

            toast.success('Falta registrada com sucesso', {
                description: data.email_sent
                    ? `Email de reagendamento enviado para ${patientName}.${wppInfo}`
                    : `Agendamento marcado como "Não Compareceu".${wppInfo}`,
            })

            setOpen(false)
            setReason('')
            onSuccess?.()

        } catch (error) {
            console.error('Error:', error)
            toast.error('Erro ao registrar falta', {
                description: error instanceof Error ? error.message : 'Tente novamente'
            })
        } finally {
            setLoading(false)
        }
    }

    const copyRescheduleLink = async () => {
        try {
            const response = await fetch(`/api/appointments/${appointmentId}/mark-no-show`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason.trim() || undefined })
            })
            const data = await response.json()

            if (data.reschedule_link) {
                await navigator.clipboard.writeText(data.reschedule_link)
                toast.success('Link copiado!', {
                    description: 'Link de reagendamento copiado para área de transferência'
                })
            }
        } catch (error) {
            toast.error('Erro ao copiar link')
        }
    }

    return (
        <>
            <Button
                variant="destructive"
                size="sm"
                onClick={() => setOpen(true)}
                className="gap-2"
            >
                <UserX className="w-4 h-4" />
                Não Compareceu
            </Button>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Marcar como "Não Compareceu"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a marcar o agendamento de <strong>{patientName}</strong> como falta.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Motivo do não comparecimento <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="reason"
                                placeholder="Ex: Não atendeu telefone, paciente informou imprevisto..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                            <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">
                                ✉️ Email de reagendamento
                            </p>
                            <p className="text-blue-700 dark:text-blue-300">
                                Um email com link para reagendamento será enviado automaticamente ao paciente.
                            </p>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleMarkNoShow}
                            disabled={loading || !reason.trim()}
                            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Confirmar Falta
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
