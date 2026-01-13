'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, Mail, Lock, Eye, EyeOff, UserCheck, Calendar, FileText, Video, Activity, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function MedicoLoginPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        crm: '',
        password: '',
        rememberMe: false
    })

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()

        if (!formData.crm || !formData.password) {
            toast.error('Preencha todos os campos')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.crm, // Can be CRM or email
                    password: formData.password
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'CRM/Email ou senha incorretos')
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
                    <Link href="/" className="flex items-center gap-3 mb-8 group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">CliniGo</span>
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <UserCheck className="h-6 w-6 text-blue-600" />
                            <h1 className="text-3xl font-bold text-gray-900">Portal do Médico</h1>
                        </div>
                        <p className="text-gray-600">
                            Acesso profissional para atendimento e prontuários
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* CRM */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                CRM ou E-mail
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.crm}
                                    onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="CRM 12345-RJ ou email@exemplo.com"
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
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600">Lembrar de mim</span>
                            </label>
                            <Link href="/recuperar-senha" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                Esqueci minha senha
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    Acessar Área Médica
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
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-12 items-center justify-center relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 -right-4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <div className="relative z-10 max-w-md text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <UserCheck className="h-12 w-12 text-blue-400" />
                        <h2 className="text-3xl font-bold">Tudo para o Atendimento</h2>
                    </div>

                    <p className="text-xl text-gray-300 mb-8">
                        Ferramentas inteligentes para você focar no que importa: cuidar dos seus pacientes
                    </p>

                    <div className="space-y-4">
                        {[
                            { icon: Calendar, text: 'Agenda Inteligente' },
                            { icon: FileText, text: 'Prontuário Eletrônico' },
                            { icon: Activity, text: 'Prescrição Digital' },
                            { icon: Video, text: 'Telemedicina Integrada' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                    <item.icon className="h-5 w-5 text-blue-400" />
                                </div>
                                <span className="text-gray-200">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                        <p className="text-sm text-blue-300 font-medium mb-2">💡 Dica</p>
                        <p className="text-gray-300 text-sm">
                            Use o atalho <kbd className="px-2 py-1 bg-white/20 rounded text-xs">Ctrl+P</kbd> para acessar rapidamente o prontuário do próximo paciente
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
