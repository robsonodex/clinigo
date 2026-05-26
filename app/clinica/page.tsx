'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, Building2, Shield, CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ClinicaLoginPage() {
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
            const saved = localStorage.getItem('clinigo_remember_clinica')
            if (saved) {
                const parsed = JSON.parse(saved)
                setFormData({
                    email: parsed.email || '',
                    password: parsed.password || '',
                    rememberMe: true
                })
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
            // Add timeout to prevent infinite loading in production
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                }),
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            const data = await response.json()

            if (!response.ok) {
                // Log debug info if available
                if (data.error?.debug) {
                    console.error('[LOGIN] Supabase error:', data.error.debug.supabaseError)
                    console.error('[LOGIN] Supabase code:', data.error.debug.supabaseCode)
                }
                throw new Error(data.error?.message || 'Email ou senha incorretos')
            }

            if (formData.rememberMe) {
                localStorage.setItem('clinigo_remember_clinica', JSON.stringify({
                    email: formData.email,
                    password: formData.password
                }))
            } else {
                localStorage.removeItem('clinigo_remember_clinica')
            }

            toast.success('Login realizado com sucesso!')

            // Force redirection and DO NOT stop loading state
            // This prevents react re-renders from cancelling the navigation
            console.log('[LOGIN] Redirecting to dashboard...')
            window.location.replace('/dashboard')

            // Return early to ensure verify finally block logic
            return

        } catch (error) {
            // Only stop loading if there was an error
            setIsLoading(false)

            if (error instanceof Error && error.name === 'AbortError') {
                toast.error('Tempo limite excedido. Verifique sua conexão e tente novamente.')
            } else {
                const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login'
                toast.error(errorMessage)
                console.error('[LOGIN FRONTEND] Error details:', error)
            }
        }
    }

    return (
        <div className="min-h-screen flex">
            <Suspense fallback={null}>
                <TrialSuccessToast />
            </Suspense>
            {/* Left side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 mb-8 group">
                        <Image
                            src="/logo_black.svg"
                            alt="CliniGo"
                            width={200}
                            height={52}
                            className="h-14 w-auto group-hover:scale-105 transition-transform"
                        />
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 className="h-6 w-6 text-emerald-600" />
                            <h1 className="text-3xl font-bold text-gray-900">Portal da Clínica</h1>
                        </div>
                        <p className="text-gray-600">
                            Acesso administrativo para gestores e proprietários
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                E-mail Administrativo
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="admin@clinica.com"
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
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-600">Lembrar de mim</span>
                            </label>
                            <Link href="/recuperar-senha?portal=clinica" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                                Esqueci minha senha
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-premium py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    Entrar no Sistema
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-8 flex items-center gap-4">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="text-sm text-gray-500">Outros acessos</span>
                        <div className="flex-1 border-t border-gray-200" />
                    </div>

                    {/* Other Portals */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            href="/medico"
                            className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-center"
                        >
                            <div className="text-sm font-medium text-gray-700">Portal do Médico</div>
                        </Link>
                        <Link
                            href="/paciente"
                            className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-center"
                        >
                            <div className="text-sm font-medium text-gray-700">Portal do Paciente</div>
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        Não tem uma conta?{' '}
                        <Link href="/cadastro" className="text-emerald-600 hover:text-emerald-700 font-medium">
                            Cadastre sua clínica
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right side - Branding */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 p-12 items-center justify-center relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 -left-4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 -right-4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <div className="relative z-10 max-w-md text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <Shield className="h-12 w-12 text-emerald-400" />
                        <h2 className="text-3xl font-bold">Gestão Completa</h2>
                    </div>

                    <p className="text-xl text-gray-300 mb-8">
                        Controle total da sua clínica em um só lugar
                    </p>

                    <div className="space-y-4">
                        {[
                            'Dashboard Financeiro',
                            'Gestão de Estoque',
                            'Relatórios de Faturamento',
                            'Cadastro de Profissionais',
                            'Emissão de Guias TISS'
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                                <span className="text-gray-200">{feature}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                        <p className="text-sm text-emerald-300 font-medium mb-2">Sistema Seguro</p>
                        <p className="text-gray-300 text-sm">
                            Seus dados protegidos com criptografia de ponta a ponta e conformidade total com a LGPD
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Separate component for useSearchParams to satisfy Suspense requirement
function TrialSuccessToast() {
    const searchParams = useSearchParams()
    useEffect(() => {
        if (searchParams.get('trial') === 'success') {
            toast.success('Conta criada! Seu teste grátis de 7 dias começou. Faça login para acessar.', { duration: 8000 })
        }
    }, [searchParams])
    return null
}
