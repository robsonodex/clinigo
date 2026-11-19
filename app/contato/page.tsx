'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    ArrowLeft,
    Check,
    CheckCircle,
    Clock,
    Copy,
    ExternalLink,
    Headphones,
    Loader2,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    RotateCcw,
    Send,
    Shield,
} from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import { WHATSAPP_URL } from '@/components/preview-home/content'

function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const SUPPORT_WHATSAPP_URL =
    'https://wa.me/5521975129005?text=' +
    encodeURIComponent(
        'Olá! Preciso de suporte técnico no CliniGo.\n\n1. Meu nome e nome da clínica:\n2. Módulo relacionado:\n3. Descrição da solicitação:'
    )

const CONTACT_CHANNELS = [
    {
        id: 'comercial-email',
        icon: Mail,
        title: 'E-mail Comercial',
        value: 'contato@clinigo.app',
        href: 'mailto:contato@clinigo.app',
        description: 'Planos, propostas e implantação',
        external: false,
    },
    {
        id: 'suporte-whats',
        icon: Headphones,
        title: 'Suporte Técnico',
        value: '(21) 97512-9005',
        href: SUPPORT_WHATSAPP_URL,
        description: 'Atendimento a clínicas ativas',
        external: true,
    },
    {
        id: 'comercial-whats',
        icon: Phone,
        title: 'Comercial WhatsApp',
        value: '(21) 97512-9005',
        href: WHATSAPP_URL,
        description: 'Alinhamento rápido para sua clínica',
        external: true,
    },
    {
        id: 'dpo-lgpd',
        icon: Shield,
        title: 'Encarregado (DPO / LGPD)',
        value: 'dpo.lgpd@clinigo.app',
        href: 'mailto:dpo.lgpd@clinigo.app',
        description: 'Privacidade e proteção de dados',
        external: false,
    },
]

const ASSUNTOS = [
    'Informações sobre planos',
    'Demonstração do sistema',
    'Dúvida técnica',
    'Parceria comercial',
    'Outro assunto',
]

export default function ContatoPage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [confirmClear, setConfirmClear] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        assunto: 'Informações sobre planos',
        mensagem: '',
    })

    const hasContent = Boolean(
        formData.nome.trim() ||
            formData.email.trim() ||
            formData.telefone.trim() ||
            formData.mensagem.trim()
    )

    const handleCopy = (id: string, value: string, label: string) => {
        navigator.clipboard.writeText(value)
        setCopiedId(id)
        toast.success(`${label} copiado!`)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleClear = () => {
        if (!hasContent) return
        if (!confirmClear) {
            setConfirmClear(true)
            return
        }
        setFormData({
            nome: '',
            email: '',
            telefone: '',
            assunto: 'Informações sobre planos',
            mensagem: '',
        })
        setConfirmClear(false)
        toast.info('Formulário limpo.')
    }

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
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                throw new Error('Erro ao enviar mensagem')
            }

            setSubmitted(true)
            toast.success('Mensagem enviada com sucesso!')
        } catch {
            toast.error('Erro ao enviar mensagem. Tente novamente.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <EditorialShell>
            <main className="flex-1 py-12 sm:py-16 px-5 sm:px-8">
                <div className="max-w-6xl mx-auto">
                    {submitted ? (
                        <div className="max-w-lg mx-auto my-8 bg-white border border-[#E6E8E5] rounded-xl p-8 sm:p-10 text-center shadow-sm">
                            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#E6F2EE] flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-[#155E4B]" strokeWidth={1.75} />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] mb-3">
                                Mensagem enviada
                            </h1>
                            <p className="text-sm sm:text-base text-[#4B5B56] mb-8 leading-relaxed">
                                Recebemos sua solicitação e nossa equipe retornará em até 1 dia útil.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSubmitted(false)
                                        setFormData({
                                            nome: '',
                                            email: '',
                                            telefone: '',
                                            assunto: 'Informações sobre planos',
                                            mensagem: '',
                                        })
                                    }}
                                    className="min-h-[44px] px-5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    Enviar outra mensagem
                                </button>
                                <a
                                    href={WHATSAPP_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Falar no WhatsApp
                                </a>
                            </div>
                            <div className="mt-5">
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5B56] hover:text-[#0F1F1B] min-h-[40px]"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Voltar ao início
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Hero */}
                            <div className="max-w-3xl mb-12">
                                <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                                    ATENDIMENTO E SUPORTE
                                </p>
                                <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.1] mb-4">
                                    Fale diretamente com a{' '}
                                    <span className="font-serif-accent text-[#155E4B] font-normal">
                                        equipe CliniGo
                                    </span>
                                    .
                                </h1>
                                <p className="text-base sm:text-lg text-[#4B5B56] leading-relaxed">
                                    Tire dúvidas sobre planos, implantação da unidade, migração de cadastros ou suporte técnico para sua clínica de terapias.
                                </p>
                            </div>

                            {/* Canais diretos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
                                {CONTACT_CHANNELS.map((info) => (
                                    <div
                                        key={info.id}
                                        className="bg-white border border-[#E6E8E5] rounded-xl p-5 flex flex-col justify-between hover:border-[#155E4B] transition-colors"
                                    >
                                        <div>
                                            <div className="w-10 h-10 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center mb-4">
                                                <info.icon className="w-5 h-5" strokeWidth={1.75} />
                                            </div>
                                            <h2 className="text-base font-semibold text-[#0F1F1B] mb-1">
                                                {info.title}
                                            </h2>
                                            <p className="text-sm font-medium text-[#155E4B] break-all mb-1.5">
                                                {info.value}
                                            </p>
                                            <p className="text-xs text-[#4B5B56] mb-4">{info.description}</p>
                                        </div>

                                        <div className="flex items-center gap-2 pt-3 border-t border-[#E6E8E5]">
                                            <a
                                                href={info.href}
                                                target={info.external ? '_blank' : undefined}
                                                rel={info.external ? 'noopener noreferrer' : undefined}
                                                className="flex-1 min-h-[40px] px-3 rounded-md bg-[#F2F5F3] hover:bg-[#E6F2EE] text-[#0F1F1B] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                Abrir
                                                <ExternalLink className="w-3.5 h-3.5 text-[#155E4B]" />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(info.id, info.value, info.title)}
                                                aria-label={`Copiar ${info.title}`}
                                                className="min-w-[40px] min-h-[40px] px-2.5 rounded-md border border-[#E6E8E5] hover:bg-[#F2F5F3] text-[#4B5B56] hover:text-[#0F1F1B] inline-flex items-center justify-center cursor-pointer"
                                            >
                                                {copiedId === info.id ? (
                                                    <Check className="w-4 h-4 text-[#155E4B]" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Formulário + Lateral */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                <div className="lg:col-span-7 bg-white border border-[#E6E8E5] rounded-xl p-6 sm:p-8 shadow-sm">
                                    <h2 className="text-xl sm:text-2xl font-semibold text-[#0F1F1B] mb-1">
                                        Envie sua mensagem
                                    </h2>
                                    <p className="text-sm text-[#4B5B56] mb-6">
                                        Preencha os campos abaixo e retornaremos em até 1 dia útil.
                                    </p>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label htmlFor="contato-nome" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                                Nome completo *
                                            </label>
                                            <input
                                                id="contato-nome"
                                                type="text"
                                                required
                                                value={formData.nome}
                                                onChange={(e) => {
                                                    setConfirmClear(false)
                                                    setFormData({ ...formData, nome: e.target.value })
                                                }}
                                                className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-base sm:text-sm text-[#0F1F1B] focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none"
                                                placeholder="Seu nome"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="contato-email" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                                    E-mail *
                                                </label>
                                                <input
                                                    id="contato-email"
                                                    type="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={(e) => {
                                                        setConfirmClear(false)
                                                        setFormData({ ...formData, email: e.target.value })
                                                    }}
                                                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-base sm:text-sm text-[#0F1F1B] focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none"
                                                    placeholder="seu@email.com.br"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="contato-telefone" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                                    Telefone / WhatsApp
                                                </label>
                                                <input
                                                    id="contato-telefone"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    value={formData.telefone}
                                                    onChange={(e) => {
                                                        setConfirmClear(false)
                                                        setFormData({ ...formData, telefone: maskPhone(e.target.value) })
                                                    }}
                                                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-base sm:text-sm text-[#0F1F1B] focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none"
                                                    placeholder="(21) 99999-9999"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="contato-assunto" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                                Assunto
                                            </label>
                                            <select
                                                id="contato-assunto"
                                                value={formData.assunto}
                                                onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                                                className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-base sm:text-sm text-[#0F1F1B] focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none"
                                            >
                                                {ASSUNTOS.map((assunto) => (
                                                    <option key={assunto} value={assunto}>
                                                        {assunto}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="contato-mensagem" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                                Mensagem *
                                            </label>
                                            <textarea
                                                id="contato-mensagem"
                                                required
                                                rows={5}
                                                value={formData.mensagem}
                                                onChange={(e) => {
                                                    setConfirmClear(false)
                                                    setFormData({ ...formData, mensagem: e.target.value })
                                                }}
                                                className="w-full px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-base sm:text-sm text-[#0F1F1B] focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none resize-y"
                                                placeholder="Conte um pouco sobre a rotina da sua clínica ou sua dúvida técnica"
                                            />
                                        </div>

                                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="flex-1 min-h-[48px] px-5 bg-[#155E4B] hover:bg-[#0F493A] text-white rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Enviando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-4 h-4" />
                                                        Enviar mensagem
                                                    </>
                                                )}
                                            </button>

                                            {hasContent && (
                                                <button
                                                    type="button"
                                                    onClick={handleClear}
                                                    disabled={isSubmitting}
                                                    className="min-h-[48px] px-4 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#4B5B56] hover:text-[#0F1F1B] text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    {confirmClear ? 'Confirmar limpeza?' : 'Limpar'}
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                <div className="lg:col-span-5 space-y-5">
                                    <div className="p-6 bg-white border border-[#E6E8E5] rounded-xl">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Clock className="w-5 h-5 text-[#155E4B]" strokeWidth={1.75} />
                                            <h3 className="text-base font-semibold text-[#0F1F1B]">
                                                Horário de Atendimento
                                            </h3>
                                        </div>
                                        <div className="space-y-1.5 text-sm text-[#4B5B56]">
                                            <p>Segunda a Sexta: 08h às 18h</p>
                                            <p>Sábado: 09h às 12h</p>
                                            <p className="text-xs text-[#155E4B] font-medium pt-2">
                                                Atendimento prioritário para clínicas ativas com incidentes operacionais.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-white border border-[#E6E8E5] rounded-xl">
                                        <div className="flex items-center gap-3 mb-3">
                                            <MapPin className="w-5 h-5 text-[#155E4B]" strokeWidth={1.75} />
                                            <h3 className="text-base font-semibold text-[#0F1F1B]">
                                                Abrangência
                                            </h3>
                                        </div>
                                        <p className="text-sm text-[#4B5B56] leading-relaxed">
                                            Sede no Rio de Janeiro, RJ, atendendo clínicas de terapias multidisciplinares em todo o Brasil.
                                        </p>
                                    </div>

                                    <div className="p-6 bg-[#0D1F1B] text-white rounded-xl border border-[#1D3831]">
                                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ED3C2] mb-2">
                                            CANAL DIRETO
                                        </p>
                                        <h3 className="text-lg font-semibold mb-2">Prefere conversar pelo WhatsApp?</h3>
                                        <p className="text-sm text-white/75 mb-5 leading-relaxed">
                                            Fale com nossa equipe comercial ou técnica diretamente pelo WhatsApp oficial.
                                        </p>
                                        <a
                                            href={WHATSAPP_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-h-[46px] w-full px-4 rounded-md bg-[#155E4B] hover:bg-[#1B735C] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            Iniciar conversa no WhatsApp
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </EditorialShell>
    )
}
