'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    AlertTriangle,
    ArrowRight,
    Building2,
    Calendar,
    Check,
    Clock,
    Copy,
    Eye,
    EyeOff,
    FileText,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    Phone,
    QrCode,
    RotateCcw,
    Shield,
    Smartphone,
    User,
    Users,
    Video,
} from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import {
    evaluatePasswordStrength,
    generateFriendlyStrongPassword,
} from '@/lib/auth/password-policy'

const FEATURES_QUICK = [
    { icon: Calendar, text: 'Agenda recorrente e co-terapia' },
    { icon: FileText, text: 'Prontuário por especialidade e ABA' },
    { icon: QrCode, text: 'Check-in QR Code e biometria facial' },
    { icon: Video, text: 'Teleconsulta WebRTC integrada' },
    { icon: Smartphone, text: 'WhatsApp automático por setores' },
    { icon: Users, text: 'Repasse individual com sigilo RBAC' },
]

const TRUST_ITEMS = [
    { icon: Shield, text: 'Conformidade LGPD no servidor' },
    { icon: Clock, text: '7 dias sem cartão de crédito' },
    { icon: Check, text: 'Ativação imediata' },
]

const SPECIALTIES = [
    'Psicologia',
    'ABA e Neurodesenvolvimento',
    'Fonoaudiologia',
    'Terapia Ocupacional',
    'Psicomotricidade',
    'Fisioterapia',
]

function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function maskCpfCnpj(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    if (digits.length <= 11) {
        return digits
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export default function TrialPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [confirmClear, setConfirmClear] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [passwordErrorHighlight, setPasswordErrorHighlight] = useState(false)
    const [copiedPassword, setCopiedPassword] = useState(false)
    const passwordInputRef = useRef<HTMLInputElement | null>(null)
    const errorAlertRef = useRef<HTMLDivElement | null>(null)
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        cnpj: '',
        clinic_name: '',
        password: '',
    })

    const hasAnyValue = Object.values(form).some((v) => v.trim().length > 0)
    const passwordStrength = useMemo(
        () => evaluatePasswordStrength(form.password),
        [form.password]
    )

    const updateField = (field: keyof typeof form, value: string) => {
        setConfirmClear(false)
        setFormError(null)
        if (field === 'password') {
            setPasswordErrorHighlight(false)
            setCopiedPassword(false)
        }
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSuggestStrongPassword = () => {
        const strongPassword = generateFriendlyStrongPassword()
        setForm((prev) => ({ ...prev, password: strongPassword }))
        setShowPassword(true)
        setPasswordErrorHighlight(false)
        setFormError(null)
        setCopiedPassword(false)
        toast.success('Senha forte preenchida! Anote ou copie antes de continuar.')
        passwordInputRef.current?.focus()
    }

    const handleCopyPassword = async () => {
        if (!form.password) return
        try {
            await navigator.clipboard.writeText(form.password)
            setCopiedPassword(true)
            toast.success('Senha copiada para a área de transferência.')
            setTimeout(() => setCopiedPassword(false), 2500)
        } catch {
            toast.error('Não foi possível copiar automaticamente. Selecione e copie manualmente.')
        }
    }

    const handleClear = () => {
        if (!hasAnyValue) return
        if (!confirmClear) {
            setConfirmClear(true)
            return
        }
        setForm({
            full_name: '',
            email: '',
            phone: '',
            cnpj: '',
            clinic_name: '',
            password: '',
        })
        setConfirmClear(false)
        setFormError(null)
        setPasswordErrorHighlight(false)
        setCopiedPassword(false)
        toast.info('Campos limpos.')
    }

    const focusPasswordWithError = (message: string) => {
        setFormError(message)
        setPasswordErrorHighlight(true)
        toast.error(message, { duration: 8000 })
        setTimeout(() => {
            passwordInputRef.current?.focus()
            passwordInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 60)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)
        setPasswordErrorHighlight(false)

        if (!form.full_name || !form.email || !form.phone || !form.cnpj || !form.password) {
            const msg = 'Preencha todos os campos obrigatórios destacados com asterisco (*).'
            setFormError(msg)
            toast.error(msg)
            return
        }

        if (form.password.length < 8) {
            focusPasswordWithError(
                'A senha precisa ter no mínimo 8 caracteres, misturando letras maiúsculas, minúsculas, números e um símbolo (como @ ou #).'
            )
            return
        }

        if (passwordStrength.isCommonWeak || !passwordStrength.isAcceptable) {
            focusPasswordWithError(
                passwordStrength.weakReason ||
                'Esta senha é muito fraca e será recusada por segurança. Misture letras, números e um símbolo ou clique em "Sugerir senha forte".'
            )
            return
        }

        setIsLoading(true)

        const firstName = form.full_name.trim().split(' ')[0] || 'Profissional'
        const finalClinicName = form.clinic_name.trim() || `Clínica de ${firstName}`

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    full_name: form.full_name,
                    clinic_name: finalClinicName,
                    phone: form.phone.replace(/\D/g, '') || undefined,
                    cnpj: form.cnpj.replace(/\D/g, '') || undefined,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                const serverMessage =
                    data.error?.message ||
                    'Não foi possível concluir seu cadastro agora. Revise os campos abaixo e tente novamente.'
                const errorCode = data.error?.code
                setIsLoading(false)

                if (errorCode === 'WEAK_PASSWORD' || response.status === 422) {
                    focusPasswordWithError(serverMessage)
                    return
                }

                setFormError(serverMessage)
                toast.error(serverMessage, { duration: 8000 })
                setTimeout(() => {
                    errorAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 60)
                return
            }

            toast.success('Conta criada com sucesso! Redirecionando...')

            // Google Ads — evento de conversão
            if (typeof window !== 'undefined' && (window as any).gtag) {
                ; (window as any).gtag('event', 'ads_conversion_Solicitar_cota_o_1', {})
            }

            setTimeout(() => {
                window.location.href = '/clinica?trial=success'
            }, 1500)
        } catch (error) {
            setIsLoading(false)
            const fallbackMsg =
                error instanceof Error
                    ? error.message
                    : 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'
            setFormError(fallbackMsg)
            toast.error(fallbackMsg, { duration: 8000 })
        }
    }

    return (
        <EditorialShell
            minimal
            backHref="/"
            backLabel="Voltar ao início"
            rightAction={{ label: 'Já tenho conta', href: '/login' }}
            compactFooter
        >
            <main className="flex-1 py-10 sm:py-14 px-5 sm:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
                        {/* Coluna Esquerda — Posicionamento Editorial */}
                        <div className="lg:col-span-7 lg:pt-4 space-y-8">
                            <div>
                                <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                                    AVALIAÇÃO PRÁTICA · 7 DIAS GRÁTIS
                                </p>
                                <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#0F1F1B] tracking-tight leading-[1.12] mb-5">
                                    Teste o CliniGo com os{' '}
                                    <span className="font-serif-accent text-[#155E4B] font-normal">
                                        fluxos reais
                                    </span>{' '}
                                    da sua clínica de terapias.
                                </h1>
                                <p className="text-base sm:text-lg text-[#4B5B56] leading-relaxed max-w-xl">
                                    Crie seu ambiente em segundos, sem cartão de crédito e sem fidelidade. Valide a agenda recorrente, evoluções por especialidade e o controle de repasses na prática.
                                </p>
                            </div>

                            {/* Especialidades suportadas */}
                            <div className="flex flex-wrap gap-2">
                                {SPECIALTIES.map((spec) => (
                                    <span
                                        key={spec}
                                        className="ec-pill px-3 py-1.5 text-xs font-medium bg-[#F2F5F3] text-[#0F1F1B] border border-[#E6E8E5]"
                                    >
                                        {spec}
                                    </span>
                                ))}
                            </div>

                            {/* Recursos incluídos na avaliação */}
                            <div className="bg-white border border-[#E6E8E5] rounded-xl p-6">
                                <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4B5B56] mb-4">
                                    LIBERADO NO PERÍODO DE TESTE
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {FEATURES_QUICK.map((f) => (
                                        <div key={f.text} className="flex items-center gap-3 text-sm text-[#0F1F1B]">
                                            <div className="w-8 h-8 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center shrink-0">
                                                <f.icon className="w-4 h-4" strokeWidth={1.75} />
                                            </div>
                                            <span>{f.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sinais de confiança e transparência comercial */}
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-x-6 gap-y-2">
                                    {TRUST_ITEMS.map((t) => (
                                        <div key={t.text} className="flex items-center gap-2 text-xs font-medium text-[#4B5B56]">
                                            <t.icon className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                                            <span>{t.text}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-[#4B5B56] leading-relaxed">
                                    Na contratação definitiva: planos a partir de R$ 149/mês para 1 unidade operacional, com taxa única de implantação e treinamento autônomo pelo Guia de Uso integrado.{' '}
                                    <Link href="/planos" className="text-[#155E4B] font-medium hover:underline">
                                        Consultar planos
                                    </Link>
                                </p>
                            </div>
                        </div>

                        {/* Coluna Direita — Formulário de Cadastro */}
                        <div className="lg:col-span-5">
                            <div className="bg-white border border-[#E6E8E5] rounded-xl p-6 sm:p-8 shadow-sm">
                                <div className="mb-6 pb-5 border-b border-[#E6E8E5]">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E6F2EE] text-[#114D3E] font-tech-mono text-[11px] font-semibold uppercase tracking-[0.1em] mb-3">
                                        7 dias completos · Sem cartão
                                    </span>
                                    <h2 className="text-xl font-semibold text-[#0F1F1B] tracking-tight">
                                        Criar conta de avaliação
                                    </h2>
                                    <p className="text-sm text-[#4B5B56] mt-1">
                                        Preencha os dados da clínica para liberar o acesso imediato.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="trial-full-name" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                            Nome completo *
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5B56]" />
                                            <input
                                                id="trial-full-name"
                                                type="text"
                                                required
                                                autoComplete="name"
                                                value={form.full_name}
                                                onChange={(e) => updateField('full_name', e.target.value)}
                                                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-[#0F1F1B] text-base sm:text-sm placeholder:text-[#4B5B56]/60 focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none transition-all"
                                                placeholder="Mariana Alves"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="trial-email" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                            E-mail profissional *
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5B56]" />
                                            <input
                                                id="trial-email"
                                                type="email"
                                                required
                                                autoComplete="email"
                                                value={form.email}
                                                onChange={(e) => updateField('email', e.target.value)}
                                                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-[#0F1F1B] text-base sm:text-sm placeholder:text-[#4B5B56]/60 focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none transition-all"
                                                placeholder="contato@suaclinica.com.br"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="trial-phone" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                                WhatsApp / Telefone *
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5B56]" />
                                                <input
                                                    id="trial-phone"
                                                    type="tel"
                                                    required
                                                    autoComplete="tel"
                                                    inputMode="numeric"
                                                    value={form.phone}
                                                    onChange={(e) => updateField('phone', maskPhone(e.target.value))}
                                                    className="w-full min-h-[44px] pl-10 pr-3 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-[#0F1F1B] text-base sm:text-sm placeholder:text-[#4B5B56]/60 focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none transition-all"
                                                    placeholder="(11) 99999-9999"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="trial-cnpj" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                                CPF ou CNPJ *
                                            </label>
                                            <div className="relative">
                                                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5B56]" />
                                                <input
                                                    id="trial-cnpj"
                                                    type="text"
                                                    required
                                                    inputMode="numeric"
                                                    value={form.cnpj}
                                                    onChange={(e) => updateField('cnpj', maskCpfCnpj(e.target.value))}
                                                    className="w-full min-h-[44px] pl-10 pr-3 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-[#0F1F1B] text-base sm:text-sm placeholder:text-[#4B5B56]/60 focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none transition-all"
                                                    placeholder="000.000.000-00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="trial-clinic" className="block text-xs font-semibold text-[#0F1F1B] mb-1.5">
                                            Nome da clínica ou consultório
                                        </label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5B56]" />
                                            <input
                                                id="trial-clinic"
                                                type="text"
                                                autoComplete="organization"
                                                value={form.clinic_name}
                                                onChange={(e) => updateField('clinic_name', e.target.value)}
                                                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-[#0F1F1B] text-base sm:text-sm placeholder:text-[#4B5B56]/60 focus:bg-white focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none transition-all"
                                                placeholder="Ex: Espaço Terapêutico Integrado"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                            <label htmlFor="trial-password" className="block text-xs font-semibold text-[#0F1F1B]">
                                                Crie uma senha segura *
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {form.password.length > 0 && showPassword && (
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyPassword}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[#4B5B56] hover:text-[#0F1F1B] hover:bg-[#F2F5F3] transition-colors cursor-pointer"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                        {copiedPassword ? 'Copiada' : 'Copiar'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleSuggestStrongPassword}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-[#155E4B] hover:bg-[#E6F2EE] transition-colors cursor-pointer"
                                                >
                                                    <KeyRound className="w-3 h-3" />
                                                    Sugerir senha forte
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5B56]" />
                                            <input
                                                ref={passwordInputRef}
                                                id="trial-password"
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                minLength={8}
                                                autoComplete="new-password"
                                                aria-invalid={passwordErrorHighlight}
                                                value={form.password}
                                                onChange={(e) => updateField('password', e.target.value)}
                                                className={`w-full min-h-[44px] pl-10 pr-12 py-2.5 bg-[#FAFAF8] border rounded-lg text-[#0F1F1B] text-base sm:text-sm placeholder:text-[#4B5B56]/60 focus:bg-white outline-none transition-all ${passwordErrorHighlight
                                                    ? 'border-[#B91C1C] ring-2 ring-[#B91C1C]/15 focus:border-[#B91C1C]'
                                                    : 'border-[#E6E8E5] focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15'
                                                    }`}
                                                placeholder="Mínimo 8 caracteres (letras, números e @)"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#4B5B56] hover:text-[#0F1F1B] transition-colors cursor-pointer"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {/* Guia claro de segurança da senha em tempo real */}
                                        <div className="mt-2.5 rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] p-3 space-y-2">
                                            {form.password.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="text-[#4B5B56] font-medium">
                                                            Força da senha
                                                        </span>
                                                        <span
                                                            className={`font-semibold ${passwordStrength.score >= 3 && !passwordStrength.isCommonWeak
                                                                ? 'text-[#155E4B]'
                                                                : passwordStrength.score === 2 && !passwordStrength.isCommonWeak
                                                                    ? 'text-[#B45309]'
                                                                    : 'text-[#B91C1C]'
                                                                }`}
                                                        >
                                                            {passwordStrength.label}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-1">
                                                        {[1, 2, 3, 4].map((level) => {
                                                            const active = passwordStrength.score >= level
                                                            const barColor = !active
                                                                ? 'bg-[#E6E8E5]'
                                                                : passwordStrength.isCommonWeak || passwordStrength.score <= 1
                                                                    ? 'bg-[#B91C1C]'
                                                                    : passwordStrength.score === 2
                                                                        ? 'bg-[#D97706]'
                                                                        : 'bg-[#155E4B]'
                                                            return (
                                                                <div
                                                                    key={level}
                                                                    className={`h-1.5 rounded-full transition-colors ${barColor}`}
                                                                />
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                                                <div className={`flex items-center gap-1.5 ${passwordStrength.hasMinLength ? 'text-[#155E4B] font-medium' : 'text-[#4B5B56]'}`}>
                                                    <Check className={`w-3.5 h-3.5 shrink-0 ${passwordStrength.hasMinLength ? 'text-[#155E4B]' : 'text-[#9CA3AF]'}`} />
                                                    <span>8 ou mais caracteres</span>
                                                </div>
                                                <div className={`flex items-center gap-1.5 ${passwordStrength.hasUppercase ? 'text-[#155E4B] font-medium' : 'text-[#4B5B56]'}`}>
                                                    <Check className={`w-3.5 h-3.5 shrink-0 ${passwordStrength.hasUppercase ? 'text-[#155E4B]' : 'text-[#9CA3AF]'}`} />
                                                    <span>Letra maiúscula</span>
                                                </div>
                                                <div className={`flex items-center gap-1.5 ${passwordStrength.hasNumber ? 'text-[#155E4B] font-medium' : 'text-[#4B5B56]'}`}>
                                                    <Check className={`w-3.5 h-3.5 shrink-0 ${passwordStrength.hasNumber ? 'text-[#155E4B]' : 'text-[#9CA3AF]'}`} />
                                                    <span>Pelo menos 1 número</span>
                                                </div>
                                                <div className={`flex items-center gap-1.5 ${passwordStrength.hasSymbol ? 'text-[#155E4B] font-medium' : 'text-[#4B5B56]'}`}>
                                                    <Check className={`w-3.5 h-3.5 shrink-0 ${passwordStrength.hasSymbol ? 'text-[#155E4B]' : 'text-[#9CA3AF]'}`} />
                                                    <span>Símbolo (@ # ! $)</span>
                                                </div>
                                            </div>

                                            {passwordStrength.isCommonWeak && (
                                                <p className="text-[11px] font-medium text-[#B91C1C] leading-relaxed pt-1 border-t border-[#E6E8E5]">
                                                    Evite sequências comuns (como 12345678 ou senha123) — elas são bloqueadas por segurança. Misture letras, números e um símbolo ou use &ldquo;Sugerir senha forte&rdquo;.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {formError && (
                                        <div
                                            ref={errorAlertRef}
                                            role="alert"
                                            aria-live="assertive"
                                            className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-left"
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
                                                <div className="space-y-2 flex-1">
                                                    <p className="text-xs font-semibold text-[#991B1B]">
                                                        Atenção antes de continuar
                                                    </p>
                                                    <p className="text-xs text-[#991B1B] leading-relaxed">
                                                        {formError}
                                                    </p>
                                                    {passwordErrorHighlight && (
                                                        <button
                                                            type="button"
                                                            onClick={handleSuggestStrongPassword}
                                                            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-md bg-white border border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEE2E2] text-xs font-semibold transition-colors cursor-pointer"
                                                        >
                                                            <KeyRound className="w-3.5 h-3.5" />
                                                            Criar senha forte automaticamente
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-2 space-y-2.5">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full min-h-[48px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Criando sua conta...
                                                </>
                                            ) : (
                                                <>
                                                    Começar teste de 7 dias
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>

                                        {hasAnyValue && (
                                            <button
                                                type="button"
                                                onClick={handleClear}
                                                disabled={isLoading}
                                                className="w-full min-h-[44px] px-4 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#4B5B56] hover:text-[#0F1F1B] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                {confirmClear
                                                    ? 'Confirmar: deseja limpar todos os campos?'
                                                    : 'Limpar campos'}
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-[11px] text-[#4B5B56] text-center leading-relaxed pt-1">
                                        Ao criar sua conta, você concorda com os{' '}
                                        <Link href="/termos" className="text-[#155E4B] font-medium hover:underline">
                                            Termos de Uso
                                        </Link>{' '}
                                        da plataforma CliniGo.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </EditorialShell>
    )
}
