'use client'

import Link from 'next/link'
import { ArrowLeft, Target, Heart, Zap, Users, Shield, Award, MapPin, Mail, Phone, Linkedin } from 'lucide-react'

const values = [
    {
        icon: Heart,
        title: 'Cuidado com a Saúde',
        description: 'Acreditamos que a tecnologia deve servir para melhorar o acesso e a qualidade do atendimento médico.'
    },
    {
        icon: Shield,
        title: 'Segurança e Privacidade',
        description: 'Proteger os dados de pacientes é nossa prioridade máxima. Conformidade total com LGPD.'
    },
    {
        icon: Zap,
        title: 'Inovação Contínua',
        description: 'Desenvolvemos constantemente novas funcionalidades para atender às necessidades do setor de saúde.'
    },
    {
        icon: Users,
        title: 'Foco no Cliente',
        description: 'Ouvimos nossos clientes e construímos soluções que realmente resolvem seus problemas.'
    }
]

const stats = [
    { value: '500+', label: 'Clínicas Ativas' },
    { value: '2.000+', label: 'Profissionais' },
    { value: '1M+', label: 'Consultas Realizadas' },
    { value: '99.9%', label: 'Uptime' }
]

const team = [
    { name: 'Equipe de Desenvolvimento', role: 'Engenharia de Software', emoji: '👩‍💻' },
    { name: 'Equipe de Suporte', role: 'Atendimento ao Cliente', emoji: '🎧' },
    { name: 'Equipe de Produto', role: 'Design e UX', emoji: '🎨' },
    { name: 'Equipe Comercial', role: 'Vendas e Parcerias', emoji: '🤝' }
]

export default function SobrePage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo-clinigo.png" alt="CliniGo" className="h-10 w-auto" />
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
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            Transformando a Gestão de
                            <span className="text-emerald-400"> Clínicas no Brasil</span>
                        </h1>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                            O CliniGo nasceu da necessidade de modernizar a gestão de clínicas e consultórios,
                            oferecendo tecnologia de ponta com simplicidade e segurança.
                        </p>
                    </div>
                </section>

                {/* Stats */}
                <section className="py-12 px-4 bg-white border-b">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {stats.map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl font-bold text-emerald-600">{stat.value}</div>
                                    <div className="text-sm text-gray-600">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Mission */}
                <section className="py-16 px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                                    <Target className="w-4 h-4" />
                                    Nossa Missão
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                    Democratizar o acesso à tecnologia para clínicas de todos os tamanhos
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    Acreditamos que toda clínica, independente do porte, merece ter acesso a
                                    ferramentas de gestão modernas, seguras e acessíveis.
                                </p>
                                <p className="text-gray-600">
                                    Nosso objetivo é simplificar a rotina administrativa para que médicos e
                                    profissionais de saúde possam focar no que realmente importa: cuidar de pessoas.
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl p-8 flex items-center justify-center">
                                <div className="text-8xl">🏥</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Values */}
                <section className="py-16 px-4 bg-white">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossos Valores</h2>
                            <p className="text-gray-600">Os princípios que guiam tudo o que fazemos</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            {values.map((value, i) => (
                                <div key={i} className="p-6 bg-gray-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                                        <value.icon className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-2">{value.title}</h3>
                                    <p className="text-sm text-gray-600">{value.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Team */}
                <section className="py-16 px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossa Equipe</h2>
                            <p className="text-gray-600">Profissionais dedicados a entregar a melhor experiência</p>
                        </div>
                        <div className="grid md:grid-cols-4 gap-6">
                            {team.map((member, i) => (
                                <div key={i} className="text-center p-6 bg-white rounded-xl shadow-sm border">
                                    <div className="text-5xl mb-4">{member.emoji}</div>
                                    <h3 className="font-semibold text-gray-900 text-sm">{member.name}</h3>
                                    <p className="text-xs text-gray-500">{member.role}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Timeline */}
                <section className="py-16 px-4 bg-white">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossa História</h2>
                        </div>
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="w-24 text-right text-sm font-medium text-emerald-600">2024</div>
                                <div className="w-3 h-3 rounded-full bg-emerald-600 mt-1.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">Fundação</h3>
                                    <p className="text-sm text-gray-600">Início do desenvolvimento da plataforma CliniGo</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-24 text-right text-sm font-medium text-emerald-600">2025</div>
                                <div className="w-3 h-3 rounded-full bg-emerald-600 mt-1.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">Lançamento</h3>
                                    <p className="text-sm text-gray-600">Primeira versão pública com agendamento e prontuário eletrônico</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-24 text-right text-sm font-medium text-emerald-600">2026</div>
                                <div className="w-3 h-3 rounded-full bg-emerald-600 mt-1.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">Expansão</h3>
                                    <p className="text-sm text-gray-600">Teleconsulta HD, TISS nativo e 500+ clínicas ativas</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Location */}
                <section className="py-16 px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl p-8 text-white">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">Onde Estamos</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-5 h-5 text-emerald-400" />
                                            <span>Rio de Janeiro, RJ - Brasil</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-emerald-400" />
                                            <a href="mailto:contato@clinigo.app" className="hover:text-emerald-400">
                                                contato@clinigo.app
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-5 h-5 text-emerald-400" />
                                            <a href="tel:+5521965532247" className="hover:text-emerald-400">
                                                (21) 96553-2247
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center">
                                    <div className="text-center">
                                        <Award className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                                        <p className="text-lg font-medium">Atendemos clínicas em todo o Brasil</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-16 px-4 bg-white">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Pronto para transformar sua clínica?
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Junte-se a centenas de clínicas que já confiam no CliniGo
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                href="/cadastro"
                                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                            >
                                Começar Teste Grátis
                            </Link>
                            <Link
                                href="/contato"
                                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Fale Conosco
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-8 px-4">
                <div className="max-w-6xl mx-auto text-center text-sm">
                    <p>© 2026 CliniGo. Todos os direitos reservados.</p>
                    <div className="mt-4 flex items-center justify-center gap-6">
                        <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
                        <Link href="/lgpd" className="hover:text-white transition-colors">LGPD</Link>
                        <Link href="/contato" className="hover:text-white transition-colors">Contato</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
