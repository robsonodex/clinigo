'use client'

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { BiometricCaptureFrame } from '@/components/checkin/BiometricCaptureFrame'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ShieldCheck, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

export interface TherapistStartBiometricModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    appointmentId: string
    therapistName?: string
    onSuccess?: (data: any) => void
}

export function TherapistStartBiometricModal({
    open,
    onOpenChange,
    appointmentId,
    therapistName = 'Terapeuta',
    onSuccess,
}: TherapistStartBiometricModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [verifiedSuccess, setVerifiedSuccess] = useState(false)

    const handleTherapistFaceCaptured = async ({ descriptor }: { descriptor: number[] }) => {
        try {
            setIsSubmitting(true)
            setErrorMsg(null)

            const res = await fetch(`/api/appointments/${appointmentId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    face_descriptor: descriptor,
                }),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Falha na verificação da terapeuta')
            }

            setVerifiedSuccess(true)
            toast.success('Identidade da terapeuta verificada com sucesso!')

            setTimeout(() => {
                onSuccess?.(json)
                onOpenChange(false)
            }, 1200)

        } catch (err: any) {
            console.error('[TherapistStartBiometricModal] Erro:', err)
            setErrorMsg(err.message || 'Erro ao validar identidade biométrica')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            Autenticação da Terapeuta
                        </DialogTitle>
                        <Badge variant="outline" className="text-xs">
                            Antifraude
                        </Badge>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Profissional: <strong className="text-foreground">{therapistName}</strong>. Validação obrigatória da terapeuta responsável antes de iniciar o atendimento clínico.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {verifiedSuccess ? (
                        <div className="p-6 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                Terapeuta Verificada
                            </h4>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                Atendimento iniciado e registrado com carimbo biométrico imutável.
                            </p>
                        </div>
                    ) : (
                        <BiometricCaptureFrame
                            subjectType="therapist"
                            title="Posicione seu rosto na câmera"
                            description="Olhe diretamente para a lente para comprovar sua presença como responsável."
                            onCapture={handleTherapistFaceCaptured}
                            onCancel={() => onOpenChange(false)}
                            isProcessing={isSubmitting}
                            errorMessage={errorMsg}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
