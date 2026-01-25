/**
 * Page: Plan Changes Audit Dashboard (Super Admin)
 * /system-master-hub/plan-changes
 */
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

export default function PlanChangesPage() {
    const { data: metrics } = useQuery({
        queryKey: ['plan-changes-metrics'],
        queryFn: async () => {
            const res = await fetch('/api/super-admin/plan-changes/metrics')
            return await res.json()
        },
    })

    const { data: recentChanges } = useQuery({
        queryKey: ['plan-changes-recent'],
        queryFn: async () => {
            const res = await fetch('/api/super-admin/plan-changes/recent')
            return await res.json()
        },
    })

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Mudanças de Plano</h1>
                <p className="text-muted-foreground mt-1">
                    Dashboard de auditoria e métricas
                </p>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total de Upgrades</p>
                            <p className="text-2xl font-bold mt-1">{metrics?.total_upgrades || 0}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total de Downgrades</p>
                            <p className="text-2xl font-bold mt-1">{metrics?.total_downgrades || 0}</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <TrendingDown className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Mudanças (30 dias)</p>
                            <p className="text-2xl font-bold mt-1">{metrics?.last_30_days || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Activity className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">MRR Adicional</p>
                            <p className="text-2xl font-bold mt-1">
                                R$ {(metrics?.mrr_increase || 0).toLocaleString('pt-BR')}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Mudanças Recentes */}
            <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Mudanças Recentes</h3>
                <div className="space-y-4">
                    {recentChanges?.changes?.map((change: any) => (
                        <div
                            key={change.id}
                            className="flex items-center justify-between p-4 bg-muted rounded-lg"
                        >
                            <div className="flex-1">
                                <div className="font-medium">{change.clinic_name}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {change.previous_plan} → {change.new_plan}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Badge variant={change.change_type === 'UPGRADE' ? 'default' : 'secondary'}>
                                    {change.change_type}
                                </Badge>

                                <Badge variant="outline">
                                    {change.change_method === 'SELF_SERVICE' ? 'Self-Service' : 'Manual'}
                                </Badge>

                                <div className="text-sm text-muted-foreground">
                                    {new Date(change.created_at).toLocaleDateString('pt-BR')}
                                </div>
                            </div>
                        </div>
                    ))}

                    {(!recentChanges?.changes || recentChanges.changes.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                            Nenhuma mudança de plano registrada
                        </p>
                    )}
                </div>
            </Card>
        </div>
    )
}
