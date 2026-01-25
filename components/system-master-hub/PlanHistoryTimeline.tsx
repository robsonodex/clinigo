/**
 * Component: Plan History Timeline
 */
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUp, ArrowDown, User, Shield } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PlanHistoryTimelineProps {
    history: Array<{
        id: string
        previous_plan: string
        new_plan: string
        change_type: 'UPGRADE' | 'DOWNGRADE' | 'RENEWAL'
        change_method: 'SELF_SERVICE' | 'MANUAL_ADMIN' | 'AUTOMATIC'
        reason?: string
        prorated_amount: number
        created_at: string
        changed_by_user?: { full_name: string; email: string }
    }>
}

export function PlanHistoryTimeline({ history }: PlanHistoryTimelineProps) {
    if (!history || history.length === 0) {
        return (
            <Card className="p-6">
                <p className="text-center text-muted-foreground">
                    Nenhuma mudança de plano registrada
                </p>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {history.map((item, index) => (
                <Card key={item.id} className="p-4">
                    <div className="flex items-start gap-4">
                        <div className={`mt-1 p-2 rounded-lg ${item.change_type === 'UPGRADE' ? 'bg-green-100' : 'bg-orange-100'
                            }`}>
                            {item.change_type === 'UPGRADE' ? (
                                <ArrowUp className="w-5 h-5 text-green-600" />
                            ) : (
                                <ArrowDown className="w-5 h-5 text-orange-600" />
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="font-semibold">
                                        {item.change_type === 'UPGRADE' ? 'Upgrade' : 'Downgrade'}:{' '}
                                        <span className="text-muted-foreground">{item.previous_plan}</span>
                                        {' → '}
                                        <span className="text-primary">{item.new_plan}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(item.created_at), {
                                            addSuffix: true,
                                            locale: ptBR,
                                        })}
                                    </div>
                                </div>

                                <Badge variant={item.change_method === 'MANUAL_ADMIN' ? 'secondary' : 'outline'}>
                                    {item.change_method === 'SELF_SERVICE' && (
                                        <>
                                            <User className="w-3 h-3 mr-1" />
                                            Self-Service
                                        </>
                                    )}
                                    {item.change_method === 'MANUAL_ADMIN' && (
                                        <>
                                            <Shield className="w-3 h-3 mr-1" />
                                            Admin
                                        </>
                                    )}
                                    {item.change_method === 'AUTOMATIC' && 'Automático'}
                                </Badge>
                            </div>

                            {item.reason && (
                                <div className="mt-2 text-sm bg-muted rounded-lg p-2">
                                    <span className="font-medium">Motivo:</span> {item.reason}
                                </div>
                            )}

                            {item.prorated_amount > 0 && (
                                <div className="mt-2 text-sm">
                                    Valor proporcional: <span className="font-semibold">R$ {item.prorated_amount.toFixed(2)}</span>
                                </div>
                            )}

                            {item.changed_by_user && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                    Por: {item.changed_by_user.full_name} ({item.changed_by_user.email})
                                </div>
                            )}
                        </div>
                    </div>

                    {index < history.length - 1 && (
                        <div className="ml-6 mt-4 border-l-2 border-muted h-4" />
                    )}
                </Card>
            ))}
        </div>
    )
}
