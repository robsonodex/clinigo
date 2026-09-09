'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { BiometricCaptureFrame } from './BiometricCaptureFrame'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react'

export interface StaffWebcamCheckinModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    appointmentId: string
    patientName?: string
    onSuccess?: (data: any) => void
    onConfirmManual?: () => void
}

export function StaffWebcamCheckinModal({
    open,
    onOpenChange,
    appointmentId,
    patientName = 'Paciente',
    onSuccess,
    onConfirmManual,
}: StaffWebcamCheckinModalProps) {
    const [captureToken, setCaptureToken] = useState<string | null>(null)
    const [patientFirstName, setPatientFirstName] = useState<string>(patientName)
    const [isInitializing, setIsInitializing] = useState(false)
    const [initError, setInitError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submissionError, setSubmissionError] = useState<string | null>(null)
    const [confirmedData, setConfirmedData] = useState<any | null>(null)

    // Inicializar token de captura para a webcam da terapeuta
    const initCheckinSession = useCallback(async () => {
        if (!appointmentId) return

        try {
            setIsInitializing(true)
            setInitError(null)
            setConfirmedData(null)
            setSubmissionError(null)

            const res = await fetch('/api/checkin/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointment_id: appointmentId,
                    surface: 'staff_webcam',
                }),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao inicializar sessão de check-in na webcam')
            }

            setCaptureToken(json.capture_token)
            if (json.patient_first_name) {
                setPatientFirstName(json.patient_first_name)
            }
        } catch (err: any) {
            console.error('[StaffWebcamCheckinModal] Erro de inicialização:', err)
            setInitError(err.message || 'Falha ao conectar com o servidor')
        } finally {
            setIsInitializing(false)
        }
    }, [appointmentId])

    useEffect(() => {
        if (open) {
            initCheckinSession()
        } else {
            setCaptureToken(null)
            setConfirmedData(null)
            setSubmissionError(null)
            setInitError(null)
        }
    }, [open, initCheckinSession])

    // Enviar vetor biométrico para confirmação
    const handleFaceCaptured = async ({ descriptor }: { descriptor: number[] }) => {
        if (!captureToken) {
            toast.error('Sessão de captura não inicializada.')
            return
        }

        try {
            setIsSubmitting(true)
            setSubmissionError(null)

            const res = await fetch(`/api/checkin/${captureToken}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    face_descriptor: descriptor,
                }),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Falha na validação biométrica')
            }

            if (json.hasBiometrics === false) {
                setSubmissionError('O paciente não possui biometria facial cadastrada no sistema.')
                return
            }

            if (json.match === false) {
                setSubmissionError('Rosto posicionado não confere com o cadastro do paciente ou responsáveis.')
                return
            }

            setConfirmedData(json)
            toast.success('Presença biométrica confirmada com sucesso!')

            setTimeout(() => {
                onSuccess?.(json)
                onOpenChange(false)
            }, 1200)

        } catch (err: any) {
            console.error('[StaffWebcamCheckinModal] Erro ao validar:', err)
            setSubmissionError(err.message || 'Erro ao processar validação biométrica')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                            Check-in Biométrico (Minha Câmera)
                        </DialogTitle>
                        <Badge variant="outline" className="text-xs">
                            Estação da Terapeuta
                        </Badge>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Paciente: <strong className="text-foreground">{patientName}</strong>. A validação ocorre em sua webcam local sem derrubar a sessão do sistema.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {isInitializing ? (
                        <div className="p-8 text-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                            <p className="text-xs text-muted-foreground">
                                Inicializando captura de alta precisão...
                            </p>
                        </div>
                    ) : initError ? (
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-3">
                            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                            <p className="text-xs text-rose-800 dark:text-rose-200">{initError}</p>
                            <div className="flex gap-2 justify-center pt-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="min-h-[40px] text-xs"
                                >
                                    Fechar
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={initCheckinSession}
                                    className="min-h-[40px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                    Tentar Novamente
                                </Button>
                            </div>
                        </div>
                    ) : confirmedData ? (
                        <div className="p-6 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                Identificação Facial Confirmada
                            </h4>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                {confirmedData.person_name || patientFirstName} validado com {confirmedData.confidence || 98}% de confiança biométrica.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <BiometricCaptureFrame
                                subjectType="patient"
                                title={`Captura de ${patientFirstName}`}
                                description="Posicione o paciente em frente à webcam do seu computador."
                                onCapture={handleFaceCaptured}
                                onCancel={() => onOpenChange(false)}
                                isProcessing={isSubmitting}
                                errorMessage={submissionError}
                            />

                            {submissionError && onConfirmManual && (
                                <div className="pt-2 text-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            onOpenChange(false)
                                            onConfirmManual()
                                        }}
                                        className="text-xs min-h-[40px] border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                    >
                                        Prosseguir com Confirmação Manual (Justificativa)
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
