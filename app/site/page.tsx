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
        price: 'R$ 1.500',
        description: 'Perfeito para começar sua presença online',
        features: [
            'Landing page moderna e responsiva',
            'Até 5 seções personalizadas',
            'Integração com WhatsApp',
            'Formulário de contato',
            'SEO básico otimizado',
            'Certificado SSL incluso',
            'Entrega em até 7 dias',
        ],
        highlight: false,
    },
    {
        name: 'Site Profissional',
        price: 'R$ 3.500',
        description: 'O mais escolhido por clínicas em crescimento',
        features: [
            'Tudo do Essencial +',
            'Até 10 páginas',
            'Blog integrado',
            'Galeria de fotos e equipe',
            'Mapa de localização',
            'Integração com CliniGo',
            'Painel admin simples',
            'Entrega em até 14 dias',
        ],
        highlight: true,
    },
    {
        name: 'Site Premium',
        price: 'R$ 6.500',
        description: 'Para clínicas que querem se destacar',
        features: [
            'Tudo do Profissional +',
            'Design 100% exclusivo',
            'Páginas ilimitadas',
            'Agendamento online integrado',
            'Área do paciente',
            'Chat ao vivo',
            'SEO avançado',
            'Suporte prioritário 6 meses',
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
                            href="https://wa.me/5521965532247?text=Olá!%20Tenho%20interesse%20em%20desenvolver%20um%20site%20para%20minha%20clínica"
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

                        <div className="grid md:grid-cols-3 gap-8">
                            {packages.map((pkg, i) => (
                                <div
                                    key={i}
                                    className={`relative bg-white rounded-2xl p-8 shadow-sm border-2 ${pkg.highlight
                                        ? 'border-emerald-500 shadow-lg'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    {pkg.highlight && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                                            Mais Popular
                                        </div>
                                    )}

                                    <div className="text-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                                            {pkg.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {pkg.description}
                                        </p>
                                        <div className="text-3xl font-bold text-emerald-600">
                                            {pkg.price}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            pagamento único
                                        </p>
                                    </div>

                                    <ul className="space-y-3 mb-8">
                                        {pkg.features.map((feature, j) => (
                                            <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                                                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <a
                                        href={`https://wa.me/5521965532247?text=Olá!%20Tenho%20interesse%20no%20pacote%20${encodeURIComponent(pkg.name)}%20para%20desenvolvimento%20de%20site`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-3 rounded-xl font-semibold text-center transition-colors bg-gray-100 text-gray-900 hover:bg-emerald-600 hover:text-white"
                                    >
                                        Solicitar Orçamento
                                    </a>
                                </div>
                            ))}
                        </div>

                        <p className="text-center text-sm text-gray-500 mt-8">
                            * A aquisição do domínio e a mensalidade de hospedagem são de responsabilidade do contratante.<br />
                            Consulte condições de parcelamento.
                        </p>
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
                                href="https://wa.me/5521965532247?text=Olá!%20Gostaria%20de%20um%20orçamento%20para%20desenvolvimento%20de%20site%20para%20minha%20clínica"
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
                                    a: 'Sim! Oferecemos planos de manutenção mensal a partir de R$ 150/mês com atualizações, backup e suporte.'
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
