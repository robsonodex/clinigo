'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, ArrowRight, BookOpen, TrendingUp, Shield, Users, Building2, Lock, ClipboardList, Smartphone, DollarSign, Target, Sparkles } from 'lucide-react'

const blogPosts = [
    {
        id: 1,
        title: 'Como a Telemedicina Está Transformando o Atendimento Médico no Brasil',
        excerpt: 'Descubra como a teleconsulta está revolucionando o acesso à saúde e o que sua clínica precisa saber para se adaptar.',
        category: 'Telemedicina',
        date: '15 Jan 2026',
        readTime: '5 min',
        icon: Building2
    },
    {
        id: 2,
        title: 'LGPD na Saúde: Guia Completo para Clínicas e Consultórios',
        excerpt: 'Tudo o que você precisa saber sobre proteção de dados de pacientes e como manter sua clínica em conformidade.',
        category: 'LGPD',
        date: '10 Jan 2026',
        readTime: '8 min',
        icon: Lock
    },
    {
        id: 3,
        title: 'Prontuário Eletrônico: Vantagens e Requisitos Legais',
        excerpt: 'Entenda as obrigações legais e os benefícios de digitalizar os prontuários da sua clínica.',
        category: 'Gestão',
        date: '05 Jan 2026',
        readTime: '6 min',
        icon: ClipboardList
    },
    {
        id: 4,
        title: 'Como Reduzir No-Shows com Lembretes Automatizados',
        excerpt: 'Estratégias comprovadas para diminuir faltas e aumentar a eficiência da sua agenda médica.',
        category: 'Produtividade',
        date: '28 Dez 2025',
        readTime: '4 min',
        icon: Smartphone
    },
    {
        id: 5,
        title: 'Faturamento TISS: Guia Prático para Convênios',
        excerpt: 'Aprenda a otimizar o faturamento de convênios e evitar glosas com o padrão TISS.',
        category: 'Financeiro',
        date: '20 Dez 2025',
        readTime: '7 min',
        icon: DollarSign
    },
    {
        id: 6,
        title: 'Marketing Digital para Clínicas: Atraindo Pacientes Online',
        excerpt: 'Dicas e estratégias para aumentar a presença digital da sua clínica e atrair mais pacientes.',
        category: 'Marketing',
        date: '15 Dez 2025',
        readTime: '6 min',
        icon: Target
    }
]

const categories = [
    { name: 'Telemedicina', icon: Users, count: 8 },
    { name: 'LGPD', icon: Shield, count: 5 },
    { name: 'Gestão', icon: BookOpen, count: 12 },
    { name: 'Financeiro', icon: TrendingUp, count: 7 },
]

export default function BlogPage() {
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

            <main className="max-w-6xl mx-auto px-4 py-12">
                {/* Hero */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                        <BookOpen className="w-4 h-4" />
                        Blog CliniGo
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Conteúdo para Profissionais de Saúde
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Dicas, tendências e melhores práticas para gestão de clínicas e consultórios médicos
                    </p>
                </div>

                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {/* Featured Post */}
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 mb-8 text-white">
                            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm mb-4">
                                Em Destaque
                            </span>
                            <h2 className="text-2xl font-bold mb-3">
                                {blogPosts[0].title}
                            </h2>
                            <p className="text-white/80 mb-4">
                                {blogPosts[0].excerpt}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-white/70">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {blogPosts[0].date}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {blogPosts[0].readTime}
                                </span>
                            </div>
                        </div>

                        {/* Posts Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {blogPosts.slice(1).map((post) => (
                                <article key={post.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow group">
                                    <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                        <post.icon className="w-12 h-12 text-emerald-600" />
                                    </div>
                                    <div className="p-6">
                                        <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium mb-3">
                                            {post.category}
                                        </span>
                                        <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                            {post.excerpt}
                                        </p>
                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {post.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {post.readTime}
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* Coming Soon Notice */}
                        <div className="mt-12 text-center p-8 bg-white rounded-xl border">
                            <Sparkles className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Mais conteúdo em breve!
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Estamos preparando artigos exclusivos sobre gestão de clínicas,
                                telemedicina e inovação na saúde.
                            </p>
                            <Link
                                href="/contato"
                                className="inline-flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700"
                            >
                                Sugira um tema
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Categories */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border">
                            <h3 className="font-semibold text-gray-900 mb-4">Categorias</h3>
                            <div className="space-y-3">
                                {categories.map((cat) => (
                                    <div key={cat.name} className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-600">
                                            <cat.icon className="w-4 h-4 text-emerald-600" />
                                            {cat.name}
                                        </span>
                                        <span className="text-gray-400">{cat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Newsletter */}
                        <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                            <h3 className="font-semibold text-gray-900 mb-2">Newsletter</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Receba nossos artigos por e-mail
                            </p>
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                className="w-full px-4 py-2 border rounded-lg mb-3 text-sm"
                            />
                            <button className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                                Inscrever-se
                            </button>
                        </div>

                        {/* CTA */}
                        <div className="bg-gray-900 rounded-xl p-6 text-white">
                            <h3 className="font-semibold mb-2">Teste o CliniGo</h3>
                            <p className="text-sm text-gray-300 mb-4">
                                7 dias grátis para transformar sua clínica
                            </p>
                            <Link
                                href="/cadastro"
                                className="block w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium text-center hover:bg-emerald-700 transition-colors"
                            >
                                Começar Agora
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-8 px-4 mt-12">
                <div className="max-w-6xl mx-auto text-center text-sm">
                    <p>© 2026 CliniGo. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
