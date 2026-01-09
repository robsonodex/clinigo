'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react'
import Link from 'next/link'

const PLAN_FEATURES = {
    PRO: {
        name: 'PRO',
        price: 'R$ 299/mês',
        features: [
            'CRM Completo',
            'Gestão de Estoque',
            'Financeiro Avançado',
            'TISS - Convênios',
            'Marketplace',
            'WhatsApp Automatizado',
        ],
    },
    ENTERPRISE: {
        name: 'ENTERPRISE',
        price: 'R$ 599/mês',
        features: [
            'Tudo do PRO +',
            'Multi-Unidades',
            'IA Preditiva',
            'API Access',
            'Relatórios BI',
            'White Label',
        ],
    },
}

export default function UpgradePage() {
    const searchParams = useSearchParams()
    const feature = searchParams.get('feature') || 'recurso'
    const requiredPlan = searchParams.get('plan') as 'PRO' | 'ENTERPRISE' || 'PRO'

    const planInfo = PLAN_FEATURES[requiredPlan]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl border-0">
                <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    <CardTitle className="text-2xl">Upgrade Necessário</CardTitle>
                    <CardDescription className="text-base mt-2">
                        O recurso <strong className="text-gray-900">{feature}</strong> requer o plano{' '}
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            {requiredPlan}
                        </Badge>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Plan Card */}
                    <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-600" />
                                    Plano {planInfo.name}
                                </h3>
                                <p className="text-2xl font-bold text-emerald-700">{planInfo.price}</p>
                            </div>
                        </div>

                        <ul className="space-y-2">
                            {planInfo.features.map((feat, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                    <Zap className="w-4 h-4 text-emerald-500" />
                                    {feat}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                            <Link href="/dashboard/configuracoes/plano">
                                Fazer Upgrade Agora
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>

                        <Button asChild variant="outline" className="w-full">
                            <Link href="/dashboard">
                                Voltar ao Dashboard
                            </Link>
                        </Button>
                    </div>

                    {/* Trust Badge */}
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
                        <Shield className="w-4 h-4" />
                        <span>Pagamento seguro · Cancele quando quiser</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
