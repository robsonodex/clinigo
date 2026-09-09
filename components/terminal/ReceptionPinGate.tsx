'use client'

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { KeyRound, Delete, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export interface ReceptionPinGateProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    deviceToken?: string | null
    onUnlocked: (sessionInfo: { label: string; expires_in_seconds: number }) => void
}

export function ReceptionPinGate({
    open,
    onOpenChange,
    deviceToken,
    onUnlocked,
}: ReceptionPinGateProps) {
    const [pin, setPin] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const handleDigitClick = (digit: string) => {
        if (pin.length < 8) {
            setPin((prev) => prev + digit)
            setErrorMsg(null)
        }
    }

    const handleDelete = () => {
        setPin((prev) => prev.slice(0, -1))
        setErrorMsg(null)
    }

    const handleClear = () => {
        setPin('')
        setErrorMsg(null)
    }

    const handleSubmitPin = async (pinToSubmit = pin) => {
        if (!pinToSubmit || pinToSubmit.length < 4) {
            setErrorMsg('Digite um PIN de ao menos 4 dígitos.')
            return
        }

        try {
            setIsLoading(true)
            setErrorMsg(null)

            const res = await fetch('/api/reception/pin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin: pinToSubmit,
                    device_token: deviceToken || undefined,
                }),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'PIN de recepção incorreto')
            }

            toast.success(`Modo Recepção ativado (${json.label || 'Sessão iniciada'})`)
            setPin('')
            onUnlocked({
                label: json.label || 'Recepção',
                expires_in_seconds: json.expires_in_seconds || 900,
            })
            onOpenChange(false)

        } catch (err: any) {
            console.error('[ReceptionPinGate] Erro:', err)
            setErrorMsg(err.message || 'Falha ao validar PIN')
            setPin('')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xs sm:max-w-sm p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">
                <DialogHeader className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center mb-1">
                        <KeyRound className="w-5 h-5" />
                    </div>
                    <DialogTitle className="text-base font-bold text-foreground">
                        Acesso Modo Recepção
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Digite o PIN de atendimento da clínica para desbloqueio temporário (15 min).
                    </DialogDescription>
                </DialogHeader>

                {/* Display de PIN mascarado */}
                <div className="py-2 text-center space-y-2">
                    <div className="flex justify-center items-center gap-2 h-10">
                        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-3.5 h-3.5 rounded-full transition-all ${
                                    i < pin.length
                                        ? 'bg-emerald-600 scale-110'
                                        : 'bg-slate-200 dark:bg-slate-800'
                                }`}
                            />
                        ))}
                    </div>

                    {errorMsg && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                </div>

                {/* Teclado Numérico Touch Grande (≥ 44x44px) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <Button
                            key={digit}
                            type="button"
                            variant="outline"
                            onClick={() => handleDigitClick(digit)}
                            disabled={isLoading}
                            className="h-12 text-lg font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl"
                        >
                            {digit}
                        </Button>
                    ))}

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClear}
                        disabled={isLoading || pin.length === 0}
                        className="h-12 text-xs font-medium rounded-xl text-muted-foreground hover:text-foreground"
                    >
                        Limpar
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDigitClick('0')}
                        disabled={isLoading}
                        className="h-12 text-lg font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl"
                    >
                        0
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleDelete}
                        disabled={isLoading || pin.length === 0}
                        className="h-12 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl"
                    >
                        <Delete className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </Button>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="flex-1 min-h-[44px] text-xs font-medium border-slate-200 dark:border-slate-800"
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="button"
                        onClick={() => handleSubmitPin()}
                        disabled={isLoading || pin.length < 4}
                        className="flex-1 min-h-[44px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>Confirmar</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
