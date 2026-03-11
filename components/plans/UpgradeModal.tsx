/**
 * Component: Upgrade Modal
 * Modal de confirmação de upgrade com cálculo proporcional
 * 
 * ATUALIZADO: 2026-02-09 - Apenas funcionalidades REAIS
 */
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface UpgradeModalProps {
    open: boolean
    onClose: () => void
    currentPlan: string | null
    newPlan: string | null
}

// Funcionalidades REAIS por plano
const PLAN_INFO: Record<string, { name: string; price: number; features: string[] }> = {
    BASICO: {
        name: 'Básico',
        price: 149,
        features: ['2 Médicos', 'Check-in QR', 'Teleconsulta', 'Prontuário', 'Financeiro'],
    },
    AVANCADO: {
        name: 'Avançado',
        price: 299,
        features: ['5 Médicos', 'Check-in Facial', 'WhatsApp', 'CRM', 'DRE', 'Importação'],
    },
    PROFESSIONAL: {
        name: 'Professional',
        price: 549,
        features: ['30 Médicos', 'TISS', 'Tudo do Avançado'],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        price: 799,
        features: ['Médicos Ilimitados', 'Suporte 24/7', 'Gerente de Conta'],
    },
}

export function UpgradeModal({ open, onClose, currentPlan, newPlan }: UpgradeModalProps) {
    const [validationErrors, setValidationErrors] = useState<string[]>([])
    const queryClient = useQueryClient()

    const validateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/plans/validate-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_plan: newPlan }),
            })
            return await res.json()
        },
        onSuccess: (data) => {
            if (!data.valid) {
                setValidationErrors(data.errors || [])
            } else {
                setValidationErrors([])
            }
        },
    })

    const upgradeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/plans/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_plan: newPlan }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Erro ao processar upgrade')
            }

            return await res.json()
        },
        onSuccess: () => {
            toast.success(`Upgrade realizado com sucesso para ${PLAN_INFO[newPlan!]?.name}!`)
            queryClient.invalidateQueries({ queryKey: ['clinic'] })
            queryClient.invalidateQueries({ queryKey: ['feature-gate'] })
            onClose()
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao processar upgrade')
        },
    })

    const handleConfirm = async () => {
        // Validar primeiro
        const validation = await validateMutation.mutateAsync()

        if (validation.valid) {
            // Se válido, prosseguir com upgrade
            upgradeMutation.mutate()
        }
    }

    if (!currentPlan || !newPlan) return null

    const current = PLAN_INFO[currentPlan] || PLAN_INFO.BASICO
    const next = PLAN_INFO[newPlan] || PLAN_INFO.BASICO

    const priceDifference = next.price - current.price
    const isUpgrade = priceDifference > 0

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isUpgrade ? 'Fazer Upgrade' : 'Fazer Downgrade'}
                    </DialogTitle>
                    <DialogDescription>
                        Confirme a mudança do seu plano
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Comparação de Planos */}
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <div className="text-center">
                            <div className="text-sm text-muted-foreground mb-1">Plano Atual</div>
                            <Badge variant="outline" className="text-base px-4 py-2">
                                {current.name}
                            </Badge>
                            <div className="text-xl font-bold mt-2">R$ {current.price}/mês</div>
                        </div>

                        <div className="flex justify-center">
                            <ArrowRight className="w-8 h-8 text-muted-foreground" />
                        </div>

                        <div className="text-center">
                            <div className="text-sm text-muted-foreground mb-1">Novo Plano</div>
                            <Badge className="text-base px-4 py-2">
                                {next.name}
                            </Badge>
                            <div className="text-xl font-bold mt-2">R$ {next.price}/mês</div>
                        </div>
                    </div>

                    {/* Recursos Incluídos */}
                    <div>
                        <h4 className="font-semibold mb-3">Recursos que você terá:</h4>
                        <ul className="space-y-2">
                            {next.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm">
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Erros de Validação */}
                    {validationErrors.length > 0 && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-destructive">Não é possível fazer downgrade</h4>
                                    <ul className="space-y-1 text-sm">
                                        {validationErrors.map((error, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                <span>{error}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Valor Proporcional */}
                    {isUpgrade && (
                        <div className="bg-muted rounded-lg p-4">
                            <div className="text-sm text-muted-foreground mb-1">
                                Valor proporcional a pagar hoje
                            </div>
                            <div className="text-2xl font-bold">
                                R$ {Math.abs(priceDifference).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Você será cobrado proporcionalmente pelos dias restantes no ciclo atual
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={upgradeMutation.isPending}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={
                            upgradeMutation.isPending ||
                            validateMutation.isPending ||
                            validationErrors.length > 0
                        }
                    >
                        {upgradeMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            `Confirmar ${isUpgrade ? 'Upgrade' : 'Downgrade'}`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
