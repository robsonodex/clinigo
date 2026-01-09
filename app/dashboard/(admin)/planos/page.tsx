'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PLANS, PlanType } from '@/lib/constants/plans'
import { Check, Edit2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function PlansPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Planos e Preços</h1>
                <p className="text-muted-foreground">
                    Visualize e gerencie os planos oferecidos na plataforma.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(Object.keys(PLANS) as PlanType[]).map((planKey) => {
                    const plan = PLANS[planKey]
                    return (
                        <Card key={plan.id} className="flex flex-col relative overflow-hidden">
                            {plan.id === 'PROFESSIONAL' && (
                                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-bold">
                                    Mais Popular
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    {plan.name}
                                </CardTitle>
                                <CardDescription>
                                    <span className="text-3xl font-bold text-foreground">
                                        {formatCurrency(plan.price)}
                                    </span>
                                    /mês
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Limites:</p>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            <li className="flex items-center">
                                                <Check className="h-3 w-3 mr-2 text-green-500" />
                                                {plan.id === 'ENTERPRISE' ? 'Médicos Ilimitados' : `${plan.limits.max_doctors} Médicos`}
                                            </li>
                                            <li className="flex items-center">
                                                <Check className="h-3 w-3 mr-2 text-green-500" />
                                                {plan.id === 'ENTERPRISE' ? 'Agendamentos Ilimitados' : `${plan.limits.max_appointments_month} Agendamentos/mês`}
                                            </li>
                                            <li className="flex items-center">
                                                <Check className="h-3 w-3 mr-2 text-green-500" />
                                                {plan.limits.max_storage_gb} GB Armazenamento
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Recursos:</p>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-center">
                                                    <Check className="h-3 w-3 mr-2 text-primary" />
                                                    {typeof feature === 'string' ? feature : feature.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" variant="outline" disabled>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Editar (Em breve)
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

