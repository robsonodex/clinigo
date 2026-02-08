import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, DollarSign, Users, TrendingUp, Calendar, Shield, Zap } from 'lucide-react'

export default function PartnersPage() {
    return (
        <div className="min-h-screen bg-navy-deep text-white">
            {/* Header */}
            <header className="border-b border-slate-800 sticky top-0 z-50 bg-navy-deep/90 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/">
                        <Image src="/logo-clinigo.png" alt="CliniGo" width={140} height={35} className="h-9 w-auto" />
                    </Link>
                    <Link
                        href="/partners/register"
                        className="px-6 py-2 bg-teal-vibrant text-navy-deep font-bold rounded-full hover:bg-teal-vibrant/90 transition-colors"
                    >
                        Quero ser Parceiro
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="py-20 md:py-32">
                <div className="container mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-vibrant/10 rounded-full text-teal-vibrant text-sm font-medium mb-6">
                        <DollarSign className="w-4 h-4" />
                        Programa de Parceiros
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                        Ganhe <span className="text-teal-vibrant">até 45% + 8% recorrente</span><br />
                        por cada venda fechada
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
                        Venda o CliniGo para clínicas e ganhe <strong className="text-teal-vibrant">35% base + até 10% de bônus</strong> quando a assinatura for paga + <strong className="text-teal-vibrant">8% recorrente mensal</strong> enquanto a clínica continuar cliente.
                    </p>
                    <Link
                        href="/partners/register"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-teal-vibrant text-navy-deep font-bold text-lg rounded-full hover:bg-teal-vibrant/90 transition-all shadow-[0_0_30px_rgba(20,184,166,0.3)]"
                    >
                        Começar Agora
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Como Funciona */}
            <section className="py-20 bg-slate-900/50">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
                        Como funciona?
                    </h2>
                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { step: '1', title: 'Cadastre-se', desc: 'Preencha seus dados e receba seu código exclusivo' },
                            { step: '2', title: 'Prospecte', desc: 'Apresente o CliniGo para clínicas e negocie' },
                            { step: '3', title: 'Feche a venda', desc: 'Quando a clínica assinar e PAGAR a primeira mensalidade' },
                            { step: '4', title: 'Receba!', desc: 'Sua comissão é liberada após o pagamento confirmado' },
                        ].map((item) => (
                            <div key={item.step} className="text-center">
                                <div className="w-16 h-16 bg-teal-vibrant/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-teal-vibrant">{item.step}</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                <p className="text-slate-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefícios */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
                        Por que ser um parceiro?
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="w-12 h-12 bg-teal-vibrant/20 rounded-lg flex items-center justify-center mb-4">
                                <TrendingUp className="w-6 h-6 text-teal-vibrant" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Comissão por Venda Fechada</h3>
                            <p className="text-slate-400">
                                Ganhe 35% base quando a clínica <strong>pagar</strong>. Venda 5+ no mês e ganhe 40%. Venda 10+ e ganhe 45%!
                            </p>
                        </div>
                        <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="w-12 h-12 bg-teal-vibrant/20 rounded-lg flex items-center justify-center mb-4">
                                <Calendar className="w-6 h-6 text-teal-vibrant" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Pagamento Pontual</h3>
                            <p className="text-slate-400">
                                Receba via Pix todo dia 5 do mês. Sem burocracia,
                                sem atrasos. Direto na sua conta.
                            </p>
                        </div>
                        <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="w-12 h-12 bg-teal-vibrant/20 rounded-lg flex items-center justify-center mb-4">
                                <Users className="w-6 h-6 text-teal-vibrant" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Venda Sem Limite</h3>
                            <p className="text-slate-400">
                                Venda quantas clínicas quiser. Quanto mais vendas fechadas,
                                mais você ganha. Sem teto de comissão.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Simulador de Ganhos */}
            <section className="py-20 bg-slate-900/50">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                        Quanto você pode ganhar por mês?
                    </h2>
                    <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
                        Comissão paga após a clínica pagar a assinatura + 8% recorrente todo mês!
                    </p>
                    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
                            <p className="text-slate-400 mb-2">3 vendas (Básico) = 35%</p>
                            <p className="text-3xl font-bold text-teal-vibrant mb-1">R$ 156</p>
                            <p className="text-sm text-slate-500">3 × R$149 × 35%</p>
                            <p className="text-xs text-teal-vibrant/70 mt-2">+ R$ 35/mês recorrente</p>
                        </div>
                        <div className="p-6 bg-teal-vibrant/10 rounded-xl border border-teal-vibrant/30 text-center">
                            <p className="text-slate-400 mb-2">7 vendas (Avançado) = 40%</p>
                            <p className="text-3xl font-bold text-teal-vibrant mb-1">R$ 837</p>
                            <p className="text-sm text-slate-500">7 × R$299 × 40%</p>
                            <p className="text-xs text-teal-vibrant/70 mt-2">+ R$ 167/mês recorrente</p>
                        </div>
                        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
                            <p className="text-slate-400 mb-2">10 vendas (Prof.) = 45%</p>
                            <p className="text-3xl font-bold text-teal-vibrant mb-1">R$ 2.470</p>
                            <p className="text-sm text-slate-500">10 × R$549 × 45%</p>
                            <p className="text-xs text-teal-vibrant/70 mt-2">+ R$ 439/mês recorrente</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Garantias */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
                        <div>
                            <h2 className="text-3xl font-bold mb-6">
                                Transparência total
                            </h2>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-teal-vibrant mt-1 flex-shrink-0" />
                                    <span className="text-slate-300">Dashboard completo para acompanhar suas indicações e comissões</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-teal-vibrant mt-1 flex-shrink-0" />
                                    <span className="text-slate-300">Relatórios mensais detalhados por email</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-teal-vibrant mt-1 flex-shrink-0" />
                                    <span className="text-slate-300">Histórico completo de pagamentos</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Zap className="w-5 h-5 text-teal-vibrant mt-1 flex-shrink-0" />
                                    <span className="text-slate-300">Código exclusivo personalizado com seu nome</span>
                                </li>
                            </ul>
                        </div>
                        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8">
                            <h3 className="text-xl font-bold mb-4">Exemplo de código:</h3>
                            <div className="bg-slate-800 rounded-lg p-4 font-mono text-center">
                                <span className="text-2xl text-teal-vibrant">JOAO-8472</span>
                            </div>
                            <p className="text-slate-400 text-sm mt-4 text-center">
                                Seu código é gerado automaticamente com seu nome
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-20 bg-gradient-to-b from-slate-900/50 to-navy-deep">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Pronto para começar a ganhar?
                    </h2>
                    <p className="text-xl text-slate-400 mb-10 max-w-xl mx-auto">
                        Cadastre-se agora e receba seu código exclusivo em segundos.
                    </p>
                    <Link
                        href="/partners/register"
                        className="inline-flex items-center gap-2 px-10 py-5 bg-teal-vibrant text-navy-deep font-bold text-xl rounded-full hover:bg-teal-vibrant/90 transition-all shadow-[0_0_40px_rgba(20,184,166,0.4)]"
                    >
                        Cadastrar como Parceiro
                        <ArrowRight className="w-6 h-6" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-slate-800">
                <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
                    <p>© 2026 CliniGo. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
