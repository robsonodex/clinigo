'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function RedefinirSenhaPage() {
    const router = useRouter()
    const params = useParams()
    const token = params.token as string

    const [isValidating, setIsValidating] = useState(true)
    const [isValid, setIsValid] = useState(false)
    const [userName, setUserName] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    })

    useEffect(() => {
        validateToken()
    }, [token])

    const validateToken = async () => {
        try {
            const response = await fetch(`/api/auth/reset-password?token=${token}`)
            const data = await response.json()

            if (data.valid) {
                setIsValid(true)
                setUserName(data.userName || '')
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
            const response = await fetch('/api/auth/reset-password', {
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
                throw new Error(data.error?.message || 'Erro ao redefinir senha')
            }

            setIsSuccess(true)
            toast.success('Senha alterada com sucesso!')

            setTimeout(() => {
                router.push('/login')
            }, 3000)

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao redefinir senha')
        } finally {
            setIsLoading(false)
        }
    }

    // Loading state
    if (isValidating) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Validando link...</p>
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
                            O link de recuperação não é mais válido. Isso pode acontecer se o link já foi usado ou expirou.
                        </p>

                        <Link
                            href="/recuperar-senha"
                            className="inline-flex items-center justify-center w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl transition-all"
                        >
                            Solicitar novo link
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
                            Senha Alterada!
                        </h1>

                        <p className="text-gray-600 mb-6">
                            Sua senha foi alterada com sucesso. Você será redirecionado para o login...
                        </p>

                        <Loader2 className="h-6 w-6 text-emerald-600 animate-spin mx-auto" />
                    </div>
                </div>
            </div>
        )
    }

    // Reset form
    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">CliniGo</span>
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Criar Nova Senha
                        </h1>
                        {userName && (
                            <p className="text-gray-600">
                                Olá, <strong>{userName}</strong>. Escolha sua nova senha.
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nova Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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
                                Confirmar Nova Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Alterando...
                                </>
                            ) : (
                                'Alterar Senha'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
