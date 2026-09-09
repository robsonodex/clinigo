'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Tablet, Smartphone, UserCheck, ShieldCheck } from 'lucide-react'

export type CheckinSurfaceType = 'staff_webcam' | 'kiosk' | 'patient_mobile'

export interface CheckinSurfacePickerProps {
    enabledSurfaces?: string[]
    patientMobileEnabled?: boolean
    onSelectSurface: (surface: CheckinSurfaceType) => void
    onManualConfirm?: () => void
    disabled?: boolean
}

export function CheckinSurfacePicker({
    enabledSurfaces = ['staff_webcam', 'kiosk'],
    patientMobileEnabled = false,
    onSelectSurface,
    onManualConfirm,
    disabled = false,
}: CheckinSurfacePickerProps) {
    const isWebcamEnabled = enabledSurfaces.includes('staff_webcam')
    const isKioskEnabled = enabledSurfaces.includes('kiosk')
    const isMobileEnabled = patientMobileEnabled && enabledSurfaces.includes('patient_mobile')

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Selecione a Superfície de Captura
                </span>
                <p className="text-[11px] text-muted-foreground">
                    Escolha por onde deseja registrar a presença biométrica do paciente:
                </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {/* 1. Minha Câmera (Webcam da terapeuta - Principal) */}
                {isWebcamEnabled && (
                    <button
                        type="button"
                        onClick={() => onSelectSurface('staff_webcam')}
                        disabled={disabled}
                        className="group flex items-start gap-3 p-3 text-left rounded-xl border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-600 dark:hover:border-emerald-500 transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                    >
                        <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 group-hover:scale-105 transition-transform">
                            <Camera className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-foreground">
                                    Minha Câmera (Webcam Local)
                                </span>
                                <Badge className="text-[10px] bg-emerald-600 text-white hover:bg-emerald-700">
                                    Principal
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Valide o paciente diretamente no seu computador sem fila física.
                            </p>
                        </div>
                    </button>
                )}

                {/* 2. Dispositivo da Sala / Quiosque Compartilhado */}
                {isKioskEnabled && (
                    <button
                        type="button"
                        onClick={() => onSelectSurface('kiosk')}
                        disabled={disabled}
                        className="group flex items-start gap-3 p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all focus:outline-hidden focus:ring-2 focus:ring-slate-500 min-h-[44px]"
                    >
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 group-hover:scale-105 transition-transform">
                            <Tablet className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-foreground">
                                    Dispositivo da Sala / Recepção
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    Compartilhado
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Envia o comando remoto para o dispositivo da sala (sem deslogar).
                            </p>
                        </div>
                    </button>
                )}

                {/* 3. Celular do Paciente (Link efêmero de 3 min) */}
                {isMobileEnabled && (
                    <button
                        type="button"
                        onClick={() => onSelectSurface('patient_mobile')}
                        disabled={disabled}
                        className="group flex items-start gap-3 p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all focus:outline-hidden focus:ring-2 focus:ring-slate-500 min-h-[44px]"
                    >
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 group-hover:scale-105 transition-transform">
                            <Smartphone className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-foreground">
                                    Celular do Paciente (Link Rápido)
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                    3 Minutos
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Envia link por WhatsApp para o paciente capturar no próprio aparelho.
                            </p>
                        </div>
                    </button>
                )}
            </div>

            {/* Fallback Manual */}
            {onManualConfirm && (
                <div className="pt-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onManualConfirm}
                        disabled={disabled}
                        className="w-full min-h-[40px] text-xs text-muted-foreground hover:text-foreground font-medium gap-1.5"
                    >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Confirmar Presença Manual (Justificativa LGPD)</span>
                    </Button>
                </div>
            )}
        </div>
    )
}
