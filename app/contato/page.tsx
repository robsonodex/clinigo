'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Mail,
    Phone,
    MessageCircle,
    Send,
    MapPin,
    Clock,
    CheckCircle,
    Loader2,
    ArrowLeft,
    Building2,
    Headphones,
    Shield
} from 'lucide-react'
import { toast } from 'sonner'

export default function ContatoPage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        assunto: 'Informações sobre planos',
        mensagem: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.nome || !formData.email || !formData.mensagem) {
            toast.error('Preencha todos os campos obrigatórios')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                throw new Error('Erro ao enviar mensagem')
            }

            setSubmitted(true)
            toast.success('Mensagem enviada com sucesso!')
        } catch (error) {
            toast.error('Erro ao enviar mensagem. Tente novamente.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const contactInfo = [
        {
            icon: Mail,
            title: 'E-mail Comercial',
            value: 'contato@clinigo.app',
            href: 'mailto:contato@clinigo.app',
            description: 'Dúvidas sobre planos e vendas'
        },
        {
            icon: Headphones,
            title: 'Suporte Técnico',
            value: '(21) 99040-0577',
            href: 'https://wa.me/5521990400577?text=Olá!%20👋%20Bem-vindo%20ao%20suporte%20técnico%20do%20*CliniGo*.%0A%0ASou%20o%20assistente%20de%20atendimento%20e%20em%20breve%20um%20membro%20da%20nossa%20equipe%20entrará%20em%20contato%20para%20te%20ajudar.%0A%0APara%20agilizar%20o%20atendimento,%20nos%20informe:%0A%0A1️⃣%20Seu%20nome%20e%20nome%20da%20clínica%0A2️⃣%20Qual%20sistema%20ou%20módulo%20está%20com%20problema%0A3️⃣%20Uma%20breve%20descrição%20do%20que%20está%20acontecendo%0A%0A⏰%20Horário%20de%20atendimento:%20segunda%20a%20sexta,%20das%20*08h%20às%2018h*%0A%0AFicamos%20felizes%20em%20ajudar!%20😊',
            description: 'Ajuda técnica e problemas'
        },
        {
            icon: Phone,
            title: 'Comercial',
            value: '(21) 96553-2247',
            href: 'https://wa.me/5521965532247?text=Olá!%20Vim%20pelo%20site%20e%20gostaria%20de%20mais%20informações',
            description: 'Atendimento rápido'
        },
        {
            icon: Shield,
            title: 'DPO / LGPD',
            value: 'dpo.lgpd@clinigo.app',
            href: 'mailto:dpo.lgpd@clinigo.app',
            description: 'Proteção de dados pessoais'
        }
    ]

    const assuntos = [
        'Informações sobre planos',
        'Demonstração do sistema',
        'Dúvida técnica',
        'Parceria comercial',
        'Outro assunto'
    ]

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Mensagem Enviada!
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Recebemos sua mensagem e retornaremos em até 24 horas úteis.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar ao Início
                        </Link>
                        <a
                            href="https://wa.me/5521965532247"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-xl font-semibold hover:bg-[#20bd5a] transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Falar no WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-navy-deep">
            {/* Header */}
            <header className="py-6 px-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <img
                            src="/logo_white.svg"
                            alt="CliniGo"
                            className="h-10 w-auto"
                        />
                    </Link>
                    <Link
                        href="/"
                        className="text-white/70 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 pb-20">
                <div className="max-w-6xl mx-auto">
                    {/* Hero */}
                    <div className="text-center py-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Fale Conosco
                        </h1>
                        <p className="text-xl text-white/70 max-w-2xl mx-auto">
                            Estamos prontos para ajudar sua clínica a crescer.
                            Entre em contato e descubra como o CliniGo pode transformar sua gestão.
                        </p>
                    </div>

                    {/* Contact Cards */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        {contactInfo.map((info, i) => (
                            <a
                                key={i}
                                href={info.href}
                                target={info.href.startsWith('http') ? '_blank' : undefined}
                                rel={info.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                className="group p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:border-emerald-500/50 transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                                    <info.icon className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    {info.title}
                                </h3>
                                <p className="text-emerald-400 font-medium mb-2">
                                    {info.value}
                                </p>
                                <p className="text-sm text-white/50">
                                    {info.description}
                                </p>
                            </a>
                        ))}
                    </div>

                    {/* Form Section */}
                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                        {/* Form */}
                        <div className="bg-white rounded-3xl p-8 shadow-2xl">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Envie sua mensagem
                            </h2>
                            <p className="text-gray-600 mb-8">
                                Preencha o formulário abaixo e retornaremos em até 24 horas.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Nome */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nome completo *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nome}
                                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                        placeholder="Seu nome"
                                    />
                                </div>

                                {/* Email e Telefone */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            E-mail *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                            placeholder="seu@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Telefone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.telefone}
                                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                            placeholder="(21) 99999-9999"
                                        />
                                    </div>
                                </div>

                                {/* Assunto */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Assunto
                                    </label>
                                    <select
                                        value={formData.assunto}
                                        onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                                    >
                                        {assuntos.map((assunto) => (
                                            <option key={assunto} value={assunto}>
                                                {assunto}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Mensagem */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mensagem *
                                    </label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={formData.mensagem}
                                        onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                                        placeholder="Como podemos ajudar?"
                                    />
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Enviar Mensagem
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Info Side */}
                        <div className="space-y-8">
                            {/* Horário */}
                            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <Clock className="w-6 h-6 text-emerald-400" />
                                    <h3 className="text-lg font-semibold text-white">
                                        Horário de Atendimento
                                    </h3>
                                </div>
                                <div className="space-y-2 text-white/70">
                                    <p>Segunda a Sexta: 08:00 - 18:00</p>
                                    <p>Sábado: 09:00 - 12:00</p>
                                    <p className="text-emerald-400 text-sm mt-3">
                                        * Suporte técnico 24/7 para clientes ativos
                                    </p>
                                </div>
                            </div>

                            {/* Localização */}
                            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <MapPin className="w-6 h-6 text-emerald-400" />
                                    <h3 className="text-lg font-semibold text-white">
                                        Localização
                                    </h3>
                                </div>
                                <div className="text-white/70">
                                    <p>Rio de Janeiro, RJ</p>
                                    <p className="text-sm mt-2">
                                        Atendemos clínicas em todo o Brasil
                                    </p>
                                </div>
                            </div>

                            {/* CTA WhatsApp */}
                            <a
                                href="https://wa.me/5521965532247?text=Olá!%20Vim%20pelo%20site%20e%20gostaria%20de%20mais%20informações"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-6 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-2xl hover:scale-[1.02] transition-transform"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                                        <MessageCircle className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            Prefere WhatsApp?
                                        </h3>
                                        <p className="text-white/80">
                                            Clique aqui e fale conosco agora
                                        </p>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8 px-4">
                <div className="max-w-6xl mx-auto text-center text-white/50 text-sm">
                    © 2026 CliniGo. Todos os direitos reservados.
                </div>
            </footer>
        </div>
    )
}
