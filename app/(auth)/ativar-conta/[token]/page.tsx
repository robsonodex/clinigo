'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle, Building2, UserCheck, Heart } from 'lucide-react'
import { toast } from 'sonner'

export default function AtivarContaPage() {
    const router = useRouter()
    const params = useParams()
    const token = params.token as string

    const [isValidating, setIsValidating] = useState(true)
    const [isValid, setIsValid] = useState(false)
    const [tokenType, setTokenType] = useState<string>('')
    const [email, setEmail] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [redirectPath, setRedirectPath] = useState('/dashboard')
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    })

    useEffect(() => {
        validateToken()
    }, [token])

    const validateToken = async () => {
        try {
            const response = await fetch(`/api/auth/activate-account?token=${token}`)
            const data = await response.json()

            if (data.valid) {
                setIsValid(true)
                setTokenType(data.type || 'clinic_activation')
                setEmail(data.email || '')
            } else {
                setIsValid(false)
            }
        } catch (error) {
            setIsValid(false)
        } finally {
            setIsValidating(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.password.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('As senhas não coincidem')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/activate-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'Erro ao ativar conta')
            }

            setIsSuccess(true)
            setRedirectPath(data.redirectPath || '/dashboard')
            toast.success('Conta ativada com sucesso!')

            setTimeout(() => {
                router.push(data.redirectPath || '/dashboard')
            }, 3000)

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao ativar conta')
        } finally {
            setIsLoading(false)
        }
    }

    const getTypeInfo = () => {
        switch (tokenType) {
            case 'clinic_activation':
                return {
                    title: 'Ativar Clínica',
                    subtitle: 'Configure sua senha para acessar o painel administrativo',
                    icon: Building2,
                    color: 'emerald'
                }
            case 'doctor_invite':
                return {
                    title: 'Ativar Conta Médica',
                    subtitle: 'Crie sua senha para acessar a área do médico',
                    icon: UserCheck,
                    color: 'blue'
                }
            case 'patient_activation':
                return {
                    title: 'Ativar Conta de Paciente',
                    subtitle: 'Crie sua senha para acessar o portal do paciente',
                    icon: Heart,
                    color: 'purple'
                }
            default:
                return {
                    title: 'Ativar Conta',
                    subtitle: 'Configure sua senha de acesso',
                    icon: Stethoscope,
                    color: 'emerald'
                }
        }
    }

    const typeInfo = getTypeInfo()
    const Icon = typeInfo.icon
    const colorClass = `from-${typeInfo.color}-500 to-${typeInfo.color === 'emerald' ? 'teal' : typeInfo.color === 'blue' ? 'cyan' : 'pink'}-600`

    // Loading state
    if (isValidating) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Validando link de ativação...</p>
                </div>
            </div>
        )
    }

    // Invalid token
    if (!isValid) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    <Link href="/" className="inline-flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">CliniGo</span>
                    </Link>

                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-3">
                            Link Inválido ou Expirado
                        </h1>

                        <p className="text-gray-600 mb-6">
                            O link de ativação não é mais válido. Por favor, entre em contato com o suporte ou solicite um novo link.
                        </p>

                        <Link
                            href="/"
                            className="inline-flex items-center justify-center w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl transition-all"
                        >
                            Voltar ao início
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    <Link href="/" className="inline-flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">CliniGo</span>
                    </Link>

                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="h-8 w-8 text-emerald-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-3">
                            🎉 Conta Ativada!
                        </h1>

                        <p className="text-gray-600 mb-6">
                            Sua conta foi ativada com sucesso. Você será redirecionado...
                        </p>

                        <Loader2 className="h-6 w-6 text-emerald-600 animate-spin mx-auto" />
                    </div>
                </div>
            </div>
        )
    }

    // Activation form
    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeInfo.color === 'emerald' ? 'from-emerald-500 to-teal-600' : typeInfo.color === 'blue' ? 'from-blue-500 to-cyan-600' : 'from-purple-500 to-pink-600'} flex items-center justify-center shadow-lg`}>
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">CliniGo</span>
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${typeInfo.color === 'emerald' ? 'bg-emerald-100' : typeInfo.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                            <Icon className={`h-8 w-8 ${typeInfo.color === 'emerald' ? 'text-emerald-600' : typeInfo.color === 'blue' ? 'text-blue-600' : 'text-purple-600'}`} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {typeInfo.title}
                        </h1>
                        <p className="text-gray-600">
                            {typeInfo.subtitle}
                        </p>
                        {email && (
                            <p className="text-sm text-gray-500 mt-2">
                                E-mail: <strong>{email}</strong>
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Criar Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className={`w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-${typeInfo.color}-500 transition-all ${typeInfo.color === 'emerald' ? 'focus:ring-emerald-500' : typeInfo.color === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-purple-500'}`}
                                    placeholder="Mínimo 6 caracteres"
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

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirmar Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className={`w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 transition-all ${typeInfo.color === 'emerald' ? 'focus:ring-emerald-500 focus:border-emerald-500' : typeInfo.color === 'blue' ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-purple-500 focus:border-purple-500'}`}
                                    placeholder="Digite novamente"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full bg-gradient-to-r ${typeInfo.color === 'emerald' ? 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600' : typeInfo.color === 'blue' ? 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600' : 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'} text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Ativando...
                                </>
                            ) : (
                                'Ativar Minha Conta'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
