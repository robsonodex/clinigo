'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, User, Lock, Eye, EyeOff, Heart, Calendar, FileText, Clock, Smartphone, ArrowRight, Loader2 } from 'lucide-react'
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
                throw new Error(result.error || 'CPF ou senha incorretos')
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
        <div className="min-h-screen flex">
            {/* Left side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 mb-8 group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">CliniGo</span>
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <Heart className="h-6 w-6 text-purple-600" />
                            <h1 className="text-3xl font-bold text-gray-900">Portal do Paciente</h1>
                        </div>
                        <p className="text-gray-600">
                            Agende consultas e acesse seu histórico médico
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* CPF */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                CPF
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.cpf}
                                    onChange={handleCPFChange}
                                    maxLength={14}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Use o CPF que você cadastrou na clínica
                            </p>
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
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
                            <p className="mt-1.5 text-xs text-gray-500">
                                Primeiro acesso? Use sua data de nascimento (DDMMAAAA)
                            </p>
                        </div>

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-600">Lembrar de mim</span>
                            </label>
                            <Link href="/recuperar-senha" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                                Esqueci minha senha
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    Acessar Minha Área
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick Actions */}
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="p-4 bg-purple-50 rounded-xl text-center cursor-pointer hover:bg-purple-100 transition-colors">
                            <Calendar className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                            <p className="text-xs font-medium text-purple-900">Agendar Consulta</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-xl text-center cursor-pointer hover:bg-purple-100 transition-colors">
                            <FileText className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                            <p className="text-xs font-medium text-purple-900">Ver Histórico</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="my-8 flex items-center gap-4">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="text-sm text-gray-500">Acesso profissional</span>
                        <div className="flex-1 border-t border-gray-200" />
                    </div>

                    {/* Other Portals */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            href="/clinica"
                            className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all text-center"
                        >
                            <div className="text-sm font-medium text-gray-700">Portal da Clínica</div>
                        </Link>
                        <Link
                            href="/medico"
                            className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all text-center"
                        >
                            <div className="text-sm font-medium text-gray-700">Portal do Médico</div>
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        Ainda não tem cadastro?{' '}
                        <Link href="/paciente/registro" className="text-purple-600 hover:text-purple-700 font-medium">
                            Cadastre-se aqui
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right side - Branding */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-12 items-center justify-center relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 -right-4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <div className="relative z-10 max-w-md text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <Heart className="h-12 w-12 text-purple-400" />
                        <h2 className="text-3xl font-bold">Sua Saúde, Seu Controle</h2>
                    </div>

                    <p className="text-xl text-gray-300 mb-8">
                        Agende consultas 24/7 e tenha todo seu histórico médico na palma da mão
                    </p>

                    <div className="space-y-4">
                        {[
                            { icon: Calendar, text: 'Agende sem telefonema' },
                            { icon: Clock, text: 'Horários em tempo real' },
                            { icon: Smartphone, text: 'Lembretes automáticos' },
                            { icon: FileText, text: 'Histórico completo' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                    <item.icon className="h-5 w-5 text-purple-400" />
                                </div>
                                <span className="text-gray-200">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                        <p className="text-sm text-purple-300 font-medium mb-2">✨ Novo</p>
                        <p className="text-gray-300 text-sm">
                            Agora você pode agendar consultas por vídeo direto pelo app. Sem precisar sair de casa!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
