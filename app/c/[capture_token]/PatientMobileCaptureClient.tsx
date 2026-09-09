'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { BiometricCaptureFrame } from '@/components/checkin/BiometricCaptureFrame'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ShieldCheck, Camera, Clock, AlertCircle } from 'lucide-react'

export interface PatientMobileCaptureClientProps {
    captureToken: string
    patientFirstName: string
    expiresAt: string
}

export function PatientMobileCaptureClient({
    captureToken,
    patientFirstName,
    expiresAt,
}: PatientMobileCaptureClientProps) {
    const [isCameraActive, setIsCameraActive] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [confirmedSuccess, setConfirmedSuccess] = useState(false)
    const [confirmedDetails, setConfirmedDetails] = useState<any | null>(null)

    const handlePatientCapture = async ({ descriptor }: { descriptor: number[] }) => {
        try {
            setIsSubmitting(true)
            setSubmitError(null)

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
                setSubmitError('Nenhum cadastro biométrico facial foi encontrado para o seu perfil. Dirija-se à recepção para atendimento.')
                return
            }

            if (json.match === false) {
                setSubmitError('Rosto posicionado não confere com o cadastro biométrico registrado. Centralize a câmera e tente novamente.')
                return
            }

            setConfirmedSuccess(true)
            setConfirmedDetails(json)
            setIsCameraActive(false)

        } catch (err: any) {
            console.error('[PatientMobile] Erro:', err)
            setSubmitError(err.message || 'Erro ao processar biometria')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 select-none font-sans text-slate-900 dark:text-slate-100">
            {/* Topo: Logo Sóbrio e Seguro */}
            <header className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                        C
                    </div>
                    <span className="font-bold text-base tracking-tight text-foreground">
                        CliniGo
                    </span>
                </div>

                <Badge variant="outline" className="text-[11px] gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Presença Segura
                </Badge>
            </header>

            {/* Conteúdo Central */}
            <main className="flex-1 flex flex-col items-center justify-center py-6 max-w-sm mx-auto w-full">
                {confirmedSuccess ? (
                    <Card className="w-full border-emerald-500/40 bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden text-center">
                        <CardContent className="pt-8 pb-8 px-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                                <CheckCircle2 className="w-9 h-9" />
                            </div>

                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-foreground">
                                    Presença Confirmada
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Olá, <strong>{patientFirstName}</strong>. Seu check-in foi registrado com sucesso no sistema da clínica.
                                </p>
                            </div>

                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                                Você já pode aguardar na sala de espera ou se dirigir à sala de atendimento. O profissional foi notificado da sua chegada.
                            </div>
                        </CardContent>
                    </Card>
                ) : isCameraActive ? (
                    <Card className="w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                            <BiometricCaptureFrame
                                subjectType="patient"
                                title={`Validação de ${patientFirstName}`}
                                description="Posicione seu rosto de frente para a câmera do celular."
                                onCapture={handlePatientCapture}
                                onCancel={() => setIsCameraActive(false)}
                                isProcessing={isSubmitting}
                                errorMessage={submitError}
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden text-center">
                        <CardContent className="pt-8 pb-8 px-6 space-y-5">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                                <Camera className="w-7 h-7" />
                            </div>

                            <div className="space-y-1.5">
                                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                                    Olá, {patientFirstName}
                                </h1>
                                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                    Toque abaixo para abrir a câmera e confirmar sua presença para a consulta médica.
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-800/60 py-2 px-3 rounded-xl">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span>Link de uso único válido por 3 minutos</span>
                            </div>

                            {submitError && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 text-left">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                                    <span>{submitError}</span>
                                </div>
                            )}

                            <Button
                                type="button"
                                onClick={() => setIsCameraActive(true)}
                                className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl gap-2 shadow-md"
                            >
                                <Camera className="w-4 h-4" />
                                <span>Abrir Câmera e Confirmar Presença</span>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </main>

            {/* Rodapé Informativo */}
            <footer className="py-3 text-center text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-800">
                Sistema CliniGo — Identificação Segura conforme LGPD
            </footer>
        </div>
    )
}
