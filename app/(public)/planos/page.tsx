'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlanCard } from '@/components/plans/plan-card'
import { PlanConfig, DISPLAY_PLANS } from '@/lib/constants/plans'

export default function PlanosPage() {
    const [plans, setPlans] = useState<PlanConfig[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch('/api/plans')
                if (res.ok) {
                    const data = await res.json()
                    const filtered = data.filter((p: PlanConfig) =>
                        ['STARTER', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'].includes(p.id)
                    )
                    setPlans(filtered.length > 0 ? filtered : DISPLAY_PLANS)
                } else {
                    setPlans(DISPLAY_PLANS)
                }
            } catch (error) {
                console.error("Failed to load plans", error)
                setPlans(DISPLAY_PLANS)
            } finally {
                setLoading(false)
            }
        }
        fetchPlans()
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
            {/* Header */}
            <header className="border-b bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/90">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-primary">
                        CliniGo
                    </Link>
                    <div className="flex gap-4">
                        <Link href="/login">
                            <Button variant="ghost">Entrar</Button>
                        </Link>
                        <Link href="/cadastro">
                            <Button>Começar Agora</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="container mx-auto px-4 py-16 text-center">
                <Badge className="bg-emerald-100 text-emerald-800 mb-4">Preços Transparentes</Badge>
                <h1 className="text-5xl font-bold mb-4">Escolha o plano ideal para sua clínica</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Planos flexíveis para clínicas de todos os tamanhos. Sem surpresas, sem taxas ocultas.
                </p>
            </section>

            {/* Plans Grid */}
            <section className="container mx-auto px-4 pb-16">
                {loading ? (
                    <div className="flex justify-center h-64 items-center">
                        <Loader2 className="animate-spin h-12 w-12 text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                showCTA={true}
                                ctaText="Começar Agora"
                                ctaLink={`/cadastro?plan=${plan.id}`}
                                disableUpgradeLinks={true}
                                className="h-full hover:scale-105 transition-transform"
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Comparison Table */}
            {!loading && (
                <section className="container mx-auto px-4 py-16 bg-white">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Compare todos os recursos</h2>
                        <p className="text-muted-foreground">Veja em detalhes o que cada plano oferece</p>
                    </div>

                    <div className="max-w-6xl mx-auto overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b-2">
                                    <th className="text-left p-4 font-semibold">Recurso</th>
                                    {plans.map((plan) => (
                                        <th key={plan.id} className="text-center p-4">
                                            <Badge className={plan.badgeColor || 'bg-gray-100 text-gray-800'}>
                                                {plan.name}
                                            </Badge>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">Médicos</td>
                                    {plans.map((plan) => (
                                        <td key={plan.id} className="p-4 text-center">
                                            {plan.limits.max_doctors === -1 ? 'Sob contrato' : `Até ${plan.limits.max_doctors}`}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">Consultas/mês</td>
                                    {plans.map((plan) => (
                                        <td key={plan.id} className="p-4 text-center">
                                            {plan.limits.max_appointments_month === -1 ? 'Ilimitado' : plan.limits.max_appointments_month}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">SMTP Próprio</td>
                                    {plans.map((plan) => (
                                        <td key={plan.id} className="p-4 text-center">
                                            <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">Agenda Anti-Overbooking</td>
                                    {plans.map((plan) => (
                                        <td key={plan.id} className="p-4 text-center">
                                            <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">Prontuário Eletrônico</td>
                                    {plans.map((plan) => (
                                        <td key={plan.id} className="p-4 text-center">
                                            <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">Teleconsulta</td>
                                    {plans.map((plan) => (
                                        <td key={plan.id} className="p-4 text-center">
                                            <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">Financeiro</td>
                                    {plans.map((plan) => (
                                        <td key={plan.id} className="p-4 text-center">
                                            <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">Multi-Unidade</td>
                                    {plans.map((plan) => (
                                        <td key={plan.id} className="p-4 text-center">
                                            {plan.limits.max_units > 1 || plan.limits.max_units === -1
                                                ? <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                                                : <span className="text-muted-foreground">-</span>}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">Suporte</td>
                                    {plans.map((plan, i) => (
                                        <td key={plan.id} className="p-4 text-center text-sm">
                                            {i === 0 ? 'Padrão' : i === 1 ? 'Prioritário' : i === 2 ? '24/7' : 'Dedicado'}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* FAQ */}
            <section className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">Perguntas Frequentes</h2>
                </div>
                <div className="max-w-3xl mx-auto space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Posso trocar de plano depois?</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Sim! Você pode fazer upgrade ou downgrade a qualquer momento.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Como funciona o pagamento?</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Cobrado mensalmente via cartão ou PIX. Cancele a qualquer momento sem multas.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Há taxa de setup?</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Não cobramos taxa de setup. Você paga apenas a mensalidade.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-primary text-primary-foreground py-16">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl font-bold mb-4">Pronto para revolucionar sua clínica?</h2>
                    <p className="text-xl mb-8 opacity-90">Escolha o plano ideal e comece agora mesmo.</p>
                    <Link href="/cadastro">
                        <Button size="lg" variant="secondary" className="gap-2">
                            Começar Agora
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-white py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            © 2026 CliniGo. Todos os direitos reservados.
                        </p>
                        <a
                            href="https://www.nodexsolucoes.com.br"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                            Desenvolvido por Nodex Soluções
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
