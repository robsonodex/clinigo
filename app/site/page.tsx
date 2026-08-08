'use client'

import Link from 'next/link'
import {
    ArrowLeft,
    Globe,
    Smartphone,
    Zap,
    Palette,
    Code,
    Headphones,
    Check,
    ArrowRight,
    Calendar,
    Users,
    Shield,
    MessageCircle
} from 'lucide-react'

const packages = [
    {
        name: 'Site Essencial',
        price: 'R$ 790',
        description: 'Para começar sem dor no bolso',
        features: [
            'Landing page moderna e responsiva',
            'Até 4 seções estratégicas',
            'Botão WhatsApp + Formulário',
            'SEO básico otimizado',
            'Certificado SSL incluso',
            'Entrega rápida em até 5 dias',
        ],
        highlight: false,
    },
    {
        name: 'Site Profissional',
        price: 'R$ 1.990',
        description: 'O que mais gera retorno financeiro',
        features: [
            'Tudo do Essencial +',
            'Até 8 páginas completas',
            'Integração total CliniGo',
            'Painel administrativo fácil',
            'Entrega em até 10 dias',
        ],
        highlight: true,
    },
    {
        name: 'Site Premium',
        price: 'R$ 3.900',
        description: 'Para clínicas consolidadas',
        features: [
            'Tudo do Profissional +',
            'Design 100% exclusivo',
            'Páginas ilimitadas',
            'Agendamento online avançado',
            'Área exclusiva do paciente',
            'Chat ao vivo',
            'Suporte prioritário 3 meses',
            'Entrega em até 21 dias',
        ],
        highlight: false,
    },
]

const benefits = [
    {
        icon: Globe,
        title: 'Domínio Próprio',
        description: 'Seu site no endereço da sua clínica (ex: clinicaexemplo.com.br)'
    },
    {
        icon: Smartphone,
        title: '100% Responsivo',
        description: 'Funciona perfeitamente em celulares, tablets e computadores'
    },
    {
        icon: Zap,
        title: 'Carregamento Rápido',
        description: 'Sites otimizados para velocidade máxima e boa experiência'
    },
    {
        icon: Palette,
        title: 'Design Personalizado',
        description: 'Visual alinhado com a identidade da sua clínica'
    },
    {
        icon: Code,
        title: 'Integração CliniGo',
        description: 'Botão de agendamento conectado diretamente ao seu sistema'
    },
    {
        icon: Headphones,
        title: 'Suporte Dedicado',
        description: 'Equipe especializada para tirar dúvidas e ajustes'
    },
]

export default function SitePage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo_black.svg" alt="CliniGo" className="h-10 w-auto" />
                    </Link>
                    <Link
                        href="/"
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao site
                    </Link>
                </div>
            </header>

            <main>
                {/* Hero */}
                <section className="bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 text-white py-20 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium mb-6">
                            <Globe className="w-4 h-4" />
                            Serviço Exclusivo CliniGo
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            Sua Clínica Ainda Não Tem Site?
                        </h1>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                            Desenvolvemos sites profissionais para clínicas e consultórios,
                            já integrados ao CliniGo. Apareça no Google e conquiste mais pacientes.
                        </p>
                        <a
                            href="https://wa.me/5521990400577?text=Olá!%20Tenho%20interesse%20em%20desenvolver%20um%20site%20para%20minha%20clínica"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Falar com a Equipe
                        </a>
                    </div>
                </section>

                {/* Benefits */}
                <section className="py-16 px-4 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
                            Por que ter um site profissional?
                        </h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            {benefits.map((benefit, i) => (
                                <div key={i} className="text-center p-6">
                                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <benefit.icon className="w-7 h-7 text-emerald-600" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                                    <p className="text-sm text-gray-600">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Packages */}
                <section className="py-16 px-4 bg-gray-50">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                Pacotes de Desenvolvimento
                            </h2>
                            <p className="text-gray-600">
                                Escolha o pacote ideal para sua clínica. Pagamento facilitado.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 mb-12">
                            {packages.map((pkg, i) => (
                                <div
                                    key={i}
                                    className={`relative bg-white rounded-2xl p-8 shadow-sm border-2 flex flex-col ${pkg.highlight
                                        ? 'border-emerald-500 shadow-xl scale-105 z-10'
                                        : 'border-gray-200 hover:border-emerald-200 transition-colors'
                                        }`}
                                >
                                    {pkg.highlight && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">
                                            Mais Popular
                                        </div>
                                    )}

                                    <div className="text-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                                            {pkg.name}
                                        </h3>
                                        <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500 mb-4">
                                            {pkg.description}
                                        </div>
                                        <div className="text-4xl font-bold text-gray-900">
                                            {pkg.price}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 font-medium uppercase tracking-wider">
                                            pagamento único
                                        </p>
                                    </div>

                                    <ul className="space-y-4 mb-8 flex-1">
                                        {pkg.features.map((feature, j) => (
                                            <li key={j} className="flex items-start gap-3 text-[15px] text-gray-600">
                                                <div className={`mt-1 p-0.5 rounded-full flex-shrink-0 ${pkg.highlight ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Check className="w-3 h-3" />
                                                </div>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <a
                                        href={`https://wa.me/5521990400577?text=Olá!%20Tenho%20interesse%20no%20pacote%20${encodeURIComponent(pkg.name)}%20para%20desenvolvimento%20de%20site`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`block w-full py-4 rounded-xl font-bold text-center transition-all transform hover:-translate-y-1 ${pkg.highlight
                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                                            : 'bg-gray-900 text-white hover:bg-gray-800'
                                            }`}
                                    >
                                        Quero este site
                                    </a>
                                </div>
                            ))}
                        </div>

                        {/* Bundle Section */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 relative overflow-hidden text-center md:text-left">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />

                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                                <div className="flex-1">
                                    <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-4 py-1.5 rounded-full text-sm font-bold mb-6 border border-emerald-500/30">
                                        <Zap className="w-4 h-4" />
                                        OPORTUNIDADE ÚNICA
                                    </div>
                                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                        Leve o <span className="text-emerald-400">Site Profissional</span> + Software CliniGo
                                    </h3>
                                    <p className="text-lg text-slate-300 mb-8 max-w-xl">
                                        A combinação perfeita: um site que atrai pacientes e um sistema que fideliza.
                                        Contratando o bundle, você ganha a <strong>implantação do sistema (R$ 497) GRÁTIS</strong>.
                                    </p>
                                    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                        <a
                                            href="https://wa.me/5521990400577?text=Olá!%20Quero%20aproveitar%20o%20Bundle%20Site%20Profissional%20+%20CliniGo"
                                            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
                                        >
                                            Quero o Bundle Promocional
                                        </a>
                                        <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm flex items-center gap-3">
                                            <Shield className="w-5 h-5 text-emerald-400" />
                                            Manutenção site a partir de R$ 149/mês
                                        </div>
                                    </div>
                                </div>

                                {/* Visual do Bundle */}
                                <div className="relative w-full max-w-sm">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl rotate-6 opacity-20 blur-sm transform scale-95" />
                                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 relative shadow-2xl">

                                        <ul className="space-y-4 pt-2">
                                            <li className="flex items-center gap-3 text-white">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</div>
                                                Site Profissional Completo
                                            </li>
                                            <li className="flex items-center gap-3 text-white">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</div>
                                                Licença CliniGo (mensal)
                                            </li>
                                            <li className="flex items-center gap-3 text-white font-medium">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900 text-xs">★</div>
                                                Implantação GRÁTIS
                                            </li>
                                            <li className="flex items-center gap-3 text-white font-medium">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900 text-xs">★</div>
                                                Treinamento da Equipe
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Process */}
                <section className="py-16 px-4 bg-white">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
                            Como Funciona
                        </h2>
                        <div className="grid md:grid-cols-4 gap-8">
                            {[
                                { step: 1, title: 'Contato', desc: 'Fale conosco pelo WhatsApp', icon: MessageCircle },
                                { step: 2, title: 'Briefing', desc: 'Entendemos suas necessidades', icon: Users },
                                { step: 3, title: 'Desenvolvimento', desc: 'Criamos seu site', icon: Code },
                                { step: 4, title: 'Entrega', desc: 'Site no ar e integrado', icon: Globe },
                            ].map((item, i) => (
                                <div key={i} className="text-center">
                                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                                        {item.step}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                                    <p className="text-sm text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">
                            Pronto para ter seu site profissional?
                        </h2>
                        <p className="text-lg text-white/80 mb-8">
                            Entre em contato agora e receba um orçamento personalizado em até 24 horas.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a
                                href="https://wa.me/5521990400577?text=Olá!%20Gostaria%20de%20um%20orçamento%20para%20desenvolvimento%20de%20site%20para%20minha%20clínica"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-white text-emerald-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                            >
                                <MessageCircle className="w-5 h-5" />
                                WhatsApp
                            </a>
                            <Link
                                href="/contato"
                                className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors"
                            >
                                Formulário de Contato
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="py-16 px-4 bg-gray-50">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
                            Perguntas Frequentes
                        </h2>
                        <div className="space-y-4">
                            {[
                                {
                                    q: 'Preciso ter o CliniGo para contratar o site?',
                                    a: 'Não é obrigatório, mas recomendamos. Clientes CliniGo têm desconto especial e integração nativa com agendamento online.'
                                },
                                {
                                    q: 'Quanto tempo leva para o site ficar pronto?',
                                    a: 'Depende do pacote escolhido. O Site Essencial fica pronto em até 7 dias, o Profissional em 14 dias e o Premium em 21 dias.'
                                },
                                {
                                    q: 'O site é meu ou fico preso ao serviço?',
                                    a: 'O site é 100% seu! Após a entrega, você recebe todos os arquivos e pode hospedar onde preferir.'
                                },
                                {
                                    q: 'Vocês fazem manutenção do site?',
                                    a: 'Sim! Oferecemos planos de manutenção mensal a partir de R$ 149/mês com atualizações, backup e suporte.'
                                },
                            ].map((faq, i) => (
                                <div key={i} className="bg-white rounded-xl p-6 border">
                                    <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                                    <p className="text-sm text-gray-600">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-8 px-4">
                <div className="max-w-6xl mx-auto text-center text-sm">
                    <p>© 2026 CliniGo. Todos os direitos reservados.</p>
                    <div className="mt-4 flex items-center justify-center gap-6">
                        <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
                        <Link href="/lgpd" className="hover:text-white transition-colors">LGPD</Link>
                        <Link href="/contato" className="hover:text-white transition-colors">Contato</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
