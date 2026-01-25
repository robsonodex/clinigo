/**
 * Component: Manual Plan Change Modal (Super Admin)
 */
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ManualPlanChangeModalProps {
    open: boolean
    onClose: () => void
    clinicId: string
    currentPlan: string
    clinicName: string
}

export function ManualPlanChangeModal({
    open,
    onClose,
    clinicId,
    currentPlan,
    clinicName,
}: ManualPlanChangeModalProps) {
    const [newPlan, setNewPlan] = useState(currentPlan)
    const [reason, setReason] = useState('')
    const [billingAction, setBillingAction] = useState<string>('CHARGE_DIFFERENCE')
    const queryClient = useQueryClient()

    const changeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}/change-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    new_plan: newPlan,
                    reason,
                    billing_action: billingAction,
                    effective_date: 'IMMEDIATE',
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Erro ao alterar plano')
            }

            return await res.json()
        },
        onSuccess: () => {
            toast.success(`Plano da clínica alterado com sucesso!`)
            queryClient.invalidateQueries({ queryKey: ['clinic', clinicId] })
            queryClient.invalidateQueries({ queryKey: ['plan-history', clinicId] })
            onClose()
            setReason('')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao alterar plano')
        },
    })

    const handleConfirm = () => {
        if (!reason || reason.length < 10) {
            toast.error('Por favor, forneça um motivo detalhado (mínimo 10 caracteres)')
            return
        }
        changeMutation.mutate()
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Alterar Plano Manualmente</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="bg-muted rounded-lg p-4 text-sm">
                        <div className="font-medium mb-1">Clínica:</div>
                        <div>{clinicName}</div>
                        <div className="font-medium mb-1 mt-2">Plano Atual:</div>
                        <div>{currentPlan}</div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPlan">Novo Plano</Label>
                        <Select value={newPlan} onValueChange={setNewPlan}>
                            <SelectTrigger id="newPlan">
                                <SelectValue placeholder="Selecione o plano" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="STARTER">Starter (R$ 149/mês)</SelectItem>
                                <SelectItem value="BASICO">Básico (R$ 299/mês)</SelectItem>
                                <SelectItem value="AVANCADO">Avançado (R$ 549/mês)</SelectItem>
                                <SelectItem value="ENTERPRISE">Enterprise (R$ 799/mês)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Motivo da Mudança *</Label>
                        <Textarea
                            id="reason"
                            placeholder="Descreva o motivo desta alteração (mínimo 10 caracteres)..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            {reason.length}/10 caracteres
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Label>Ação de Cobrança</Label>
                        <RadioGroup value={billingAction} onValueChange={setBillingAction}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="CHARGE_DIFFERENCE" id="charge" />
                                <Label htmlFor="charge" className="font-normal cursor-pointer">
                                    Cobrar diferença proporcional
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="COURTESY" id="courtesy" />
                                <Label htmlFor="courtesy" className="font-normal cursor-pointer">
                                    Cortesia (sem cobrar diferença)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="ADJUST_NEXT_BILLING" id="next" />
                                <Label htmlFor="next" className="font-normal cursor-pointer">
                                    Ajustar no próximo ciclo de cobrança
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <div className="font-semibold text-orange-900">Atenção</div>
                            <div className="text-orange-700 mt-1">
                                Esta mudança será imediata e afetará o acesso da clínica às funcionalidades.
                                A ação será registrada no log de auditoria.
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={changeMutation.isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={
                            changeMutation.isPending ||
                            newPlan === currentPlan ||
                            reason.length < 10
                        }
                    >
                        {changeMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            'Confirmar Alteração'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
