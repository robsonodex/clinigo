import Link from 'next/link'
import { Check, ArrowRight, Sparkles, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlanCard } from '@/components/plans/plan-card'
import { PLANS, PLAN_ORDER } from '@/lib/constants/plans'
import { IntegracaoSitesSection } from '@/components/public/integracao-sites-section'

export default function PlanosPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
            {/* Header */}
            <header className="border-b bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/90">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xl font-bold text-primary"
                    >
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

            {/* Hero Section */}
            <section className="container mx-auto px-4 py-16 text-center">
                <Badge className="bg-emerald-100 text-emerald-800 mb-4">
                    Preços Transparentes
                </Badge>
                <h1 className="text-5xl font-bold mb-4">
                    Escolha o plano ideal para sua clínica
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Planos flexíveis para clínicas de todos os tamanhos. Sem surpresas, sem taxas ocultas.
                </p>
            </section>

            {/* Plans Grid */}
            <section className="container mx-auto px-4 pb-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {PLAN_ORDER.map((planKey) => {
                        const plan = PLANS[planKey]
                        return (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                showCTA={true}
                                ctaText="Começar Agora"
                                ctaLink={`/cadastro?plan=${plan.id}`}
                                disableUpgradeLinks={true}
                                className="h-full hover:scale-105 transition-transform"
                            />
                        )
                    })}
                </div>
            </section>

            {/* Comparison Table */}
            <section className="container mx-auto px-4 py-16 bg-white">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">Compare todos os recursos</h2>
                    <p className="text-muted-foreground">
                        Veja em detalhes o que cada plano oferece
                    </p>
                </div>

                <div className="max-w-6xl mx-auto overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2">
                                <th className="text-left p-4 font-semibold">Recurso</th>
                                {PLAN_ORDER.map((planKey) => (
                                    <th key={planKey} className="text-center p-4">
                                        <Badge className={PLANS[planKey].badgeColor}>
                                            {PLANS[planKey].name}
                                        </Badge>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Doctors Limit */}
                            <tr className="border-b hover:bg-muted/50">
                                <td className="p-4 font-medium">Médicos</td>
                                {PLAN_ORDER.map((planKey) => (
                                    <td key={planKey} className="p-4 text-center">
                                        {PLANS[planKey].limits.max_doctors === -1 ? 'Ilimitado' : PLANS[planKey].limits.max_doctors}
                                    </td>
                                ))}
                            </tr>

                            {/* Appointments Limit */}
                            <tr className="border-b hover:bg-muted/50">
                                <td className="p-4 font-medium">Consultas/mês</td>
                                {PLAN_ORDER.map((planKey) => (
                                    <td key={planKey} className="p-4 text-center">
                                        {PLANS[planKey].limits.max_appointments_month === -1 ? 'Ilimitado' : PLANS[planKey].limits.max_appointments_month}
                                    </td>
                                ))}
                            </tr>

                            {/* Storage */}
                            <tr className="border-b hover:bg-muted/50">
                                <td className="p-4 font-medium">Armazenamento</td>
                                {PLAN_ORDER.map((planKey) => (
                                    <td key={planKey} className="p-4 text-center">
                                        {PLANS[planKey].limits.max_storage_gb}GB
                                    </td>
                                ))}
                            </tr>

                            {/* Agendamento */}
                            <tr className="border-b hover:bg-muted/50">
                                <td className="p-4 font-medium">Agendamento Online</td>
                                {PLAN_ORDER.map((planKey) => (
                                    <td key={planKey} className="p-4 text-center">
                                        <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                                    </td>
                                ))}
                            </tr>

                            {/* IA */}
                            <tr className="border-b hover:bg-muted/50">
                                <td className="p-4 font-medium">IA com Reasoning</td>
                                {PLAN_ORDER.map((planKey, idx) => (
                                    <td key={planKey} className="p-4 text-center">
                                        {idx >= 2 ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <span className="text-muted-foreground">-</span>}
                                    </td>
                                ))}
                            </tr>

                            {/* WhatsApp */}
                            <tr className="border-b hover:bg-muted/50">
                                <td className="p-4 font-medium">WhatsApp Automação</td>
                                {PLAN_ORDER.map((planKey, idx) => (
                                    <td key={planKey} className="p-4 text-center">
                                        {idx >= 2 ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <span className="text-muted-foreground">-</span>}
                                    </td>
                                ))}
                            </tr>

                            {/* Multi-unit */}
                            <tr className="border-b hover:bg-muted/50">
                                <td className="p-4 font-medium">Multi-Unidade</td>
                                {PLAN_ORDER.map((planKey, idx) => (
                                    <td key={planKey} className="p-4 text-center">
                                        {idx >= 3 ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <span className="text-muted-foreground">-</span>}
                                    </td>
                                ))}
                            </tr>

                            {/* White-label */}
                            <tr className="border-b hover:bg-muted/50">
                                <td className="p-4 font-medium">White-label</td>
                                {PLAN_ORDER.map((planKey, idx) => (
                                    <td key={planKey} className="p-4 text-center">
                                        {idx >= 4 ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <span className="text-muted-foreground">-</span>}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">Perguntas Frequentes</h2>
                </div>

                <div className="max-w-3xl mx-auto space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Posso trocar de plano depois?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento.
                                As mudanças entram em vigor imediatamente.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Como funciona o pagamento?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Os planos são cobrados mensalmente via cartão de crédito ou PIX.
                                Você pode cancelar a qualquer momento sem multas.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Há taxa de setup?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Não cobramos nenhuma taxa de setup. Você paga apenas a mensalidade do plano escolhido.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Integração e Criação de Sites Section */}
            <IntegracaoSitesSection />

            {/* CTA Section */}
            <section className="bg-primary text-primary-foreground py-16">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl font-bold mb-4">
                        Pronto para revolucionar sua clínica?
                    </h2>
                    <p className="text-xl mb-8 opacity-90">
                        Escolha o plano ideal e comece agora mesmo.
                    </p>
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
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>© 2026 CliniGo. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}

