'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import {
    ArrowRight, Loader2, Shield, Check, Clock, Zap,
    Calendar, FileText, Users, Video, QrCode, Smartphone,
    Building2, Eye, EyeOff, Lock, Mail, User, Phone
} from 'lucide-react'

const FEATURES_QUICK = [
    { icon: Calendar, text: 'Agenda anti-overbooking' },
    { icon: FileText, text: 'Prontuário eletrônico completo' },
    { icon: QrCode, text: 'Check-in QR Code e Facial' },
    { icon: Video, text: 'Teleconsulta WebRTC integrada' },
    { icon: Smartphone, text: 'WhatsApp nativo' },
    { icon: Users, text: 'CRM de Pacientes' },
]

const TRUST_ITEMS = [
    { icon: Shield, text: 'Dados protegidos (LGPD)' },
    { icon: Clock, text: 'Sem cartão de crédito' },
    { icon: Zap, text: 'Ativação instantânea' },
]

export default function TrialPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        clinic_name: '',
        password: '',
    })

    const updateField = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!form.full_name || !form.email || !form.clinic_name || !form.password) {
            toast.error('Preencha todos os campos obrigatórios')
            return
        }

        if (form.password.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    full_name: form.full_name,
                    clinic_name: form.clinic_name,
                    phone: form.phone.replace(/\D/g, '') || undefined,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'Erro ao criar conta')
            }

            toast.success('Conta criada com sucesso! Redirecionando...')
            setTimeout(() => {
                window.location.href = '/clinica?trial=success'
            }, 1500)
        } catch (error) {
            setIsLoading(false)
            toast.error(error instanceof Error ? error.message : 'Erro ao processar cadastro')
        }
    }

    return (
        <div className="min-h-screen bg-navy-deep font-sans text-slate-300 selection:bg-teal-vibrant selection:text-white overflow-x-hidden">
            {/* Navbar Minimal */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-navy-deep/80 backdrop-blur-xl">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <Image src="/logo-clinigo.png" alt="CliniGo" width={140} height={36} className="h-9 w-auto" />
                    </Link>
                    <Link
                        href="/clinica"
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Já tem conta? <span className="text-teal-vibrant font-semibold">Entrar</span>
                    </Link>
                </div>
            </nav>

            {/* Hero + Form */}
            <main className="pt-24 pb-16 relative">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-teal-vibrant/5 rounded-full blur-[120px] -z-10" />
                <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] -z-10" />

                <div className="container mx-auto px-4">
                    <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16 max-w-6xl mx-auto">

                        {/* LEFT — Copy de Vendas */}
                        <div className="flex-1 lg:pt-8">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 py-1 px-4 rounded-full bg-teal-vibrant/10 border border-teal-vibrant/20 text-teal-vibrant text-xs font-bold tracking-wider uppercase mb-6">
                                <Zap className="w-3 h-3" />
                                7 Dias Grátis • Sem Cartão
                            </div>

                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 tracking-tight leading-[1.15]">
                                Teste o{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-vibrant via-teal-200 to-white">
                                    CliniGo
                                </span>{' '}
                                grátis por 7 dias
                            </h1>

                            <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-lg">
                                A plataforma All-in-One para gestão de clínicas e consultórios.
                                Comece agora e veja o resultado em minutos.
                            </p>

                            {/* Quick Features */}
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                {FEATURES_QUICK.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2.5 text-sm text-slate-300">
                                        <div className="w-7 h-7 rounded-lg bg-teal-vibrant/10 flex items-center justify-center flex-shrink-0">
                                            <f.icon className="w-3.5 h-3.5 text-teal-vibrant" />
                                        </div>
                                        {f.text}
                                    </div>
                                ))}
                            </div>

                            {/* Trust Signals */}
                            <div className="flex flex-wrap gap-4">
                                {TRUST_ITEMS.map((t, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                                        <t.icon className="w-3.5 h-3.5 text-teal-vibrant/60" />
                                        {t.text}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT — Formulário */}
                        <div className="w-full lg:w-[440px] flex-shrink-0">
                            <div className="bg-navy-deep-light border border-slate-800 rounded-2xl p-7 relative overflow-hidden">
                                {/* Glow sutil atrás */}
                                <div className="absolute -top-20 -right-20 w-48 h-48 bg-teal-vibrant/10 rounded-full blur-[60px] -z-0" />

                                <div className="relative z-10">
                                    <div className="text-center mb-6">
                                        <h2 className="text-xl font-bold text-white mb-1">
                                            Comece seu teste grátis
                                        </h2>
                                        <p className="text-sm text-slate-400">
                                            Preencha os dados e acesse em segundos
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Nome */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                                Seu nome completo *
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={form.full_name}
                                                    onChange={e => updateField('full_name', e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-navy-deep border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-600 focus:border-teal-vibrant/50 focus:ring-1 focus:ring-teal-vibrant/30 outline-none transition-all"
                                                    placeholder="Dr. João Silva"
                                                />
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                                E-mail *
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <input
                                                    type="email"
                                                    required
                                                    value={form.email}
                                                    onChange={e => updateField('email', e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-navy-deep border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-600 focus:border-teal-vibrant/50 focus:ring-1 focus:ring-teal-vibrant/30 outline-none transition-all"
                                                    placeholder="seu@email.com"
                                                />
                                            </div>
                                        </div>

                                        {/* Telefone */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                                WhatsApp / Telefone
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <input
                                                    type="tel"
                                                    value={form.phone}
                                                    onChange={e => updateField('phone', e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-navy-deep border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-600 focus:border-teal-vibrant/50 focus:ring-1 focus:ring-teal-vibrant/30 outline-none transition-all"
                                                    placeholder="(11) 99999-9999"
                                                />
                                            </div>
                                        </div>

                                        {/* Nome da Clínica */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                                Nome da Clínica *
                                            </label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={form.clinic_name}
                                                    onChange={e => updateField('clinic_name', e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-navy-deep border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-600 focus:border-teal-vibrant/50 focus:ring-1 focus:ring-teal-vibrant/30 outline-none transition-all"
                                                    placeholder="Clínica Exemplo"
                                                />
                                            </div>
                                        </div>

                                        {/* Senha */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                                Crie uma senha *
                                            </label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    minLength={6}
                                                    value={form.password}
                                                    onChange={e => updateField('password', e.target.value)}
                                                    className="w-full pl-10 pr-10 py-2.5 bg-navy-deep border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-600 focus:border-teal-vibrant/50 focus:ring-1 focus:ring-teal-vibrant/30 outline-none transition-all"
                                                    placeholder="Mínimo 6 caracteres"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full h-12 rounded-xl bg-teal-vibrant text-navy-deep font-bold text-sm hover:bg-teal-vibrant-light transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Criando sua conta...
                                                </>
                                            ) : (
                                                <>
                                                    Começar Teste Grátis
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>

                                        {/* Terms */}
                                        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                                            Ao criar sua conta, você concorda com os{' '}
                                            <Link href="/termos" className="text-teal-vibrant/70 hover:text-teal-vibrant">
                                                Termos de Uso
                                            </Link>{' '}
                                            e{' '}
                                            <Link href="/privacidade" className="text-teal-vibrant/70 hover:text-teal-vibrant">
                                                Política de Privacidade
                                            </Link>
                                        </p>
                                    </form>
                                </div>
                            </div>

                            {/* Social Proof Mini */}
                            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-500">
                                <div className="flex -space-x-2">
                                    {['HB', 'CM', 'RD', 'PN'].map((initials, i) => (
                                        <div
                                            key={i}
                                            className="w-6 h-6 rounded-full bg-teal-vibrant/20 border-2 border-navy-deep flex items-center justify-center text-teal-vibrant text-[8px] font-bold"
                                        >
                                            {initials}
                                        </div>
                                    ))}
                                </div>
                                <span>Mais de 50 clínicas já usam o CliniGo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer Minimal */}
            <footer className="border-t border-white/5 py-6">
                <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <span>© {new Date().getFullYear()} CliniGo. Todos os direitos reservados.</span>
                    <div className="flex items-center gap-4">
                        <Link href="/termos" className="hover:text-slate-300 transition-colors">Termos</Link>
                        <Link href="/privacidade" className="hover:text-slate-300 transition-colors">Privacidade</Link>
                        <Link href="/contato" className="hover:text-slate-300 transition-colors">Contato</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
