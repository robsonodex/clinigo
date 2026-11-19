'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, UserCheck, Calendar, FileText, Video, Activity, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function MedicoLoginPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    })

    useEffect(() => {
        try {
            const saved = localStorage.getItem('clinigo_remember_profissional') || localStorage.getItem('clinigo_remember_medico')
            if (saved) {
                const parsed = JSON.parse(saved)
                setFormData(prev => ({
                    ...prev,
                    email: parsed.email || parsed.crm || '',
                    rememberMe: true
                }))
            }
        } catch (e) {
            console.error('Failed to load remembered credentials', e)
        }
    }, [])

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()

        if (!formData.email || !formData.password) {
            toast.error('Preencha todos os campos')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            })

            let data: any = null
            try {
                data = await response.json()
            } catch {
                throw new Error('Falha de resposta do servidor de autenticação. Verifique sua conexão e tente novamente.')
            }

            if (!response.ok) {
                if (data?.error?.code === 'CLINIC_INACTIVE') {
                    window.location.href = '/conta-bloqueada'
                    return
                }
                throw new Error(data?.error?.message || 'E-mail ou senha incorretos')
            }

            if (formData.rememberMe) {
                localStorage.setItem('clinigo_remember_profissional', JSON.stringify({
                    email: formData.email
                }))
            } else {
                localStorage.removeItem('clinigo_remember_profissional')
                localStorage.removeItem('clinigo_remember_medico')
            }

            toast.success('Login realizado com sucesso!')

            router.push('/dashboard')

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao fazer login')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
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
                        <div className="flex items-center gap-2 mb-3">
                            <UserCheck className="h-6 w-6 text-emerald-700" />
                            <h1 className="text-3xl font-bold text-gray-900">Portal do Profissional</h1>
                        </div>
                        <p className="text-gray-600">
                            Acesso profissional para terapeutas, psicólogos, médicos e especialistas
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* E-mail */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                E-mail
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 transition-all"
                                    placeholder="seu-email@exemplo.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                                    className="w-4 h-4 text-emerald-700 border-gray-300 rounded focus:ring-emerald-700"
                                />
                                <span className="text-sm text-gray-600">Lembrar de mim</span>
                            </label>
                            <Link href="/recuperar-senha?portal=medico" className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">
                                Esqueci minha senha
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-md transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    Acessar Área Profissional
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick Access Badge */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <div className="flex items-start gap-3">
                            <Activity className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-900 mb-1">Acesso Rápido</p>
                                <p className="text-xs text-blue-700">
                                    Suas consultas de hoje e prontuários pendentes estarão disponíveis logo após o login
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="my-8 flex items-center gap-4">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="text-sm text-gray-500">Outros acessos</span>
                        <div className="flex-1 border-t border-gray-200" />
                    </div>

                    {/* Other Portals */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            href="/clinica"
                            className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-center"
                        >
                            <div className="text-sm font-medium text-gray-700">Portal da Clínica</div>
                        </Link>
                        <Link
                            href="/paciente"
                            className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-center"
                        >
                            <div className="text-sm font-medium text-gray-700">Portal do Paciente</div>
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        Primeiro acesso?{' '}
                        <span className="text-blue-600 font-medium">
                            Contate sua clínica para cadastro
                        </span>
                    </div>
                </div>
            </div>

            {/* Right side - Branding */}
            <div className="hidden lg:flex flex-1 bg-[#0D1F1B] p-12 items-center justify-center relative border-l border-[#1D3831]">
                <div className="max-w-md text-white">
                    <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#9ED3C2] mb-4">
                        AMBIENTE CLÍNICO INDIVIDUAL
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                        <UserCheck className="h-9 w-9 text-[#9ED3C2] shrink-0" strokeWidth={1.75} />
                        <h2 className="text-3xl font-semibold tracking-tight">Foco na Evolução Clínica</h2>
                    </div>

                    <p className="text-base text-white/75 mb-8 leading-relaxed">
                        Acesse sua agenda do dia, planos terapêuticos por especialidade e prontuários com sigilo garantido por perfil.
                    </p>

                    <div className="space-y-4">
                        {[
                            { icon: Calendar, text: 'Agenda recorrente e visualização por sala' },
                            { icon: FileText, text: 'Prontuário estruturado e planos ABA' },
                            { icon: Activity, text: 'Comparação evolutiva entre sessões' },
                            { icon: Video, text: 'Teleconsulta WebRTC integrada ao atendimento' }
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
                            Sigilo Profissional (RBAC)
                        </p>
                        <p className="text-white/75 text-sm leading-relaxed">
                            Você visualiza estritamente os pacientes sob sua responsabilidade clínica e seu próprio extrato de produção.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
