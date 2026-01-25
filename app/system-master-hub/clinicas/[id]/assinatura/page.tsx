/**
 * Page: Clinic Subscription Management (Super Admin)
 * /system-master-hub/clinicas/[id]/assinatura
 */
'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, History, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { ManualPlanChangeModal } from '@/components/system-master-hub/ManualPlanChangeModal'
import { PlanHistoryTimeline } from '@/components/system-master-hub/PlanHistoryTimeline'

export default function ClinicAssinaturaPage() {
    const params = useParams()
    const clinicId = params.id as string
    const [changeModalOpen, setChangeModalOpen] = useState(false)

    const { data: clinic, isLoading: clinicLoading } = useQuery({
        queryKey: ['clinic', clinicId],
        queryFn: async () => {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}`)
            return await res.json()
        },
    })

    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['plan-history', clinicId],
        queryFn: async () => {
            const res = await fetch(`/api/plans/history?clinic_id=${clinicId}`)
            return await res.json()
        },
    })

    if (clinicLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Assinatura da Clínica</h1>
                    <p className="text-muted-foreground mt-1">{clinic?.name}</p>
                </div>
                <Button onClick={() => setChangeModalOpen(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Alterar Plano
                </Button>
            </div>

            {/* Plano Atual */}
            <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Plano Atual</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Plano</div>
                        <Badge className="text-base px-3 py-1">{clinic?.plan_type || 'STARTER'}</Badge>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Status</div>
                        <Badge variant={clinic?.is_active ? 'default' : 'secondary'}>
                            {clinic?.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Data de Criação</div>
                        <div className="font-medium">
                            {clinic?.created_at ? new Date(clinic.created_at).toLocaleDateString('pt-BR') : '-'}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Última Atualização</div>
                        <div className="font-medium">
                            {clinic?.updated_at ? new Date(clinic.updated_at).toLocaleDateString('pt-BR') : '-'}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Histórico */}
            <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de Mudanças
                </h3>

                {historyLoading ? (
                    <Card className="p-6 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </Card>
                ) : (
                    <PlanHistoryTimeline history={historyData?.history || []} />
                )}
            </div>

            <ManualPlanChangeModal
                open={changeModalOpen}
                onClose={() => setChangeModalOpen(false)}
                clinicId={clinicId}
                currentPlan={clinic?.plan_type || 'STARTER'}
                clinicName={clinic?.name || ''}
            />
        </div>
    )
}
