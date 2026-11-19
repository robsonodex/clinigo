'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, ArrowRight, ShieldCheck, CheckCircle2, Shield } from 'lucide-react'
import Link from 'next/link'

const PLAN_FEATURES = {
    AVANCADO: {
        name: 'Avançado',
        price: 'R$ 249/mês',
        features: [
            'Até 5 licenças profissionais',
            'CRM FluxoMed completo',
            'WhatsApp integrado',
            'Repasse automático e DRE',
            'BI Clínico e Importação de Dados',
        ],
    },
    PROFESSIONAL: {
        name: 'Professional',
        price: 'R$ 449/mês',
        features: [
            'Tudo do Avançado +',
            'Até 30 licenças profissionais',
            'Faturamento TISS e Gestão de Glosas',
            'Biometria Facial, Totem e Painel de TV',
            'Suporte Prioritário',
        ],
    },
}

const DEFAULT_PLAN = PLAN_FEATURES.AVANCADO

export default function UpgradePage() {
    const searchParams = useSearchParams()
    const feature = searchParams.get('feature') || 'recurso'
    const planParam = searchParams.get('plan') || 'AVANCADO'

    const planKey =
        planParam === 'PROFESSIONAL' || planParam === 'ENTERPRISE'
            ? 'PROFESSIONAL'
            : 'AVANCADO'

    const planInfo = PLAN_FEATURES[planKey as keyof typeof PLAN_FEATURES] || DEFAULT_PLAN

    return (
        <div className="min-h-[75vh] flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-border bg-card shadow-sm">
                <CardHeader className="text-center pb-4">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
                        <Lock className="w-7 h-7" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Upgrade Necessário</CardTitle>
                    <CardDescription className="text-sm mt-1.5">
                        O recurso <strong className="text-foreground">{feature}</strong> requer o plano{' '}
                        <Badge variant="success" className="ml-1">
                            {planInfo.name}
                        </Badge>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                    <div className="rounded-xl border border-primary/30 bg-accent/40 p-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-semibold text-base flex items-center gap-2 text-foreground">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    Plano {planInfo.name}
                                </h3>
                                <p className="text-2xl font-bold font-mono tabular-nums text-primary mt-1">
                                    {planInfo.price}
                                </p>
                            </div>
                        </div>

                        <ul className="space-y-2">
                            {planInfo.features.map((feat, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                    {feat}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-2.5">
                        <Button asChild className="w-full">
                            <Link prefetch={false} href="/dashboard/configuracoes/assinatura">
                                <span className="flex items-center justify-center">
                                    Ver Planos e Fazer Upgrade
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </span>
                            </Link>
                        </Button>

                        <Button asChild variant="outline" className="w-full">
                            <Link prefetch={false} href="/dashboard">
                                Voltar ao Painel
                            </Link>
                        </Button>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        <span>Pagamento seguro · Sem fidelidade</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
