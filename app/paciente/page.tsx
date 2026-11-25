'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { User, Lock, Eye, EyeOff, Heart, Calendar, FileText, Clock, Smartphone, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PacienteLoginPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        cpf: '',
        password: '',
        rememberMe: false
    })

    useEffect(() => {
        try {
            const saved = localStorage.getItem('clinigo_remember_paciente')
            if (saved) {
                const parsed = JSON.parse(saved)
                setFormData(prev => ({
                    ...prev,
                    cpf: parsed.cpf || '',
                    rememberMe: true
                }))
            }
        } catch (e) {
            console.error('Failed to load remembered credentials', e)
        }
    }, [])

    const formatCPF = (value: string) => {
        const numbers = value.replace(/\D/g, '')
        if (numbers.length <= 11) {
            return numbers
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        }
        return value
    }

    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCPF(e.target.value)
        setFormData({ ...formData, cpf: formatted })
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()

        if (!formData.cpf || !formData.password) {
            toast.error('Preencha todos os campos')
            return
        }

        setIsLoading(true)

        try {
            const cpf = formData.cpf.replace(/\D/g, '')

            const response = await fetch('/api/patient/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpf,
                    password: formData.password,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                if (result?.code === 'CLINIC_INACTIVE') {
                    window.location.href = result?.redirect_url || '/conta-bloqueada'
                    return
                }
                throw new Error(result.error || 'CPF ou senha incorretos')
            }

            if (formData.rememberMe) {
                localStorage.setItem('clinigo_remember_paciente', JSON.stringify({
                    cpf: formData.cpf
                }))
            } else {
                localStorage.removeItem('clinigo_remember_paciente')
            }

            toast.success(`Bem-vindo(a), ${result.patient?.name || 'Paciente'}!`)
            router.push('/paciente/meu-painel')

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao fazer login')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-[#FAFAF8]">
            {/* Left side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link href="/" className="inline-flex items-center gap-3 mb-8 min-h-[44px]" aria-label="CliniGo — página inicial">
                        <Image
                            src="/logo_black.svg"
                            alt="CliniGo"
                            width={180}
                            height={48}
                            priority
                            unoptimized
                            className="h-12 w-auto object-contain"
                        />
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-9 h-9 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center">
                                <Heart className="h-5 w-5" strokeWidth={1.75} />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F1F1B] tracking-tight">Portal do Paciente</h1>
                        </div>
                        <p className="text-sm sm:text-base text-[#4B5B56]">
                            Acompanhe suas sessões, agendamentos e documentos clínicos
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* CPF */}
                        <div>
                            <label htmlFor="paciente-cpf" className="block text-sm font-medium text-[#0F1F1B] mb-2">
                                CPF
                            </label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4B5B56]" />
                                <input
                                    id="paciente-cpf"
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    value={formData.cpf}
                                    onChange={handleCPFChange}
                                    maxLength={14}
                                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-[#0F1F1B] focus:bg-white focus:ring-2 focus:ring-[#155E4B]/20 focus:border-[#155E4B] outline-none transition-all"
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-[#4B5B56]">
                                Use o CPF cadastrado na clínica
                            </p>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="paciente-password" className="block text-sm font-medium text-[#0F1F1B] mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4B5B56]" />
                                <input
                                    id="paciente-password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full min-h-[46px] pl-10 pr-12 py-2.5 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-[#0F1F1B] focus:bg-white focus:ring-2 focus:ring-[#155E4B]/20 focus:border-[#155E4B] outline-none transition-all"
                                    placeholder="Sua senha"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#4B5B56] hover:text-[#0F1F1B] cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="mt-1.5 text-xs text-[#4B5B56]">
                                Primeiro acesso? Use sua data de nascimento (DDMMAAAA)
                            </p>
                        </div>

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                                <input
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                                    className="w-4 h-4 accent-[#155E4B] border-[#E6E8E5] rounded"
                                />
                                <span className="text-sm text-[#4B5B56]">Lembrar de mim</span>
                            </label>
                            <Link href="/recuperar-senha?portal=paciente" className="text-sm text-[#155E4B] hover:text-[#0F493A] font-medium min-h-[44px] inline-flex items-center">
                                Esqueci minha senha
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full min-h-[48px] bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    Acessar Minha Área
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-7 flex items-center gap-4">
                        <div className="flex-1 border-t border-[#E6E8E5]" />
                        <span className="text-xs font-medium text-[#4B5B56]">Outros acessos</span>
                        <div className="flex-1 border-t border-[#E6E8E5]" />
                    </div>

                    {/* Other Portals */}
                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href="/clinica"
                            className="min-h-[46px] p-3 border border-[#E6E8E5] rounded-lg hover:border-[#155E4B] hover:bg-[#F2F5F3] transition-colors text-center flex items-center justify-center"
                        >
                            <span className="text-sm font-medium text-[#0F1F1B]">Portal da Clínica</span>
                        </Link>
                        <Link
                            href="/medico"
                            className="min-h-[46px] p-3 border border-[#E6E8E5] rounded-lg hover:border-[#155E4B] hover:bg-[#F2F5F3] transition-colors text-center flex items-center justify-center"
                        >
                            <span className="text-sm font-medium text-[#0F1F1B]">Portal do Profissional</span>
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="mt-7 text-center text-sm text-[#4B5B56]">
                        Ainda não tem cadastro?{' '}
                        <Link href="/paciente/registro" className="text-[#155E4B] hover:underline font-medium">
                            Cadastre-se aqui
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right side - Editorial Branding */}
            <div className="hidden lg:flex flex-1 bg-[#0D1F1B] p-12 items-center justify-center relative border-l border-[#1D3831]">
                <div className="max-w-md text-white">
                    <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#9ED3C2] mb-4">
                        PORTAL DO PACIENTE E RESPONSÁVEL
                    </p>
                    <h2 className="text-3xl font-semibold tracking-tight leading-tight mb-4">
                        Acompanhamento claro das sessões da sua família.
                    </h2>
                    <p className="text-base text-white/75 mb-8 leading-relaxed">
                        Consulte horários confirmados, histórico de atendimentos e links de teleatendimento com segurança LGPD.
                    </p>

                    <div className="space-y-4">
                        {[
                            { icon: Calendar, text: 'Agenda de sessões atualizada em tempo real' },
                            { icon: Clock, text: 'Confirmação e lembretes organizados' },
                            { icon: Smartphone, text: 'Acesso pelo celular ou computador' },
                            { icon: FileText, text: 'Documentos e histórico protegidos por senha' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-lg bg-[#155E4B]/30 border border-[#1D3831] flex items-center justify-center shrink-0">
                                    <item.icon className="h-5 w-5 text-[#9ED3C2]" strokeWidth={1.75} />
                                </div>
                                <span className="text-sm text-white/90">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 p-5 bg-white/5 rounded-xl border border-[#1D3831]">
                        <p className="text-xs font-mono uppercase tracking-[0.12em] text-[#9ED3C2] font-semibold mb-1.5">
                            Teleatendimento integrado
                        </p>
                        <p className="text-white/75 text-sm leading-relaxed">
                            Quando habilitado pela sua clínica, você pode acessar sessões por vídeo diretamente pela sua área do paciente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
