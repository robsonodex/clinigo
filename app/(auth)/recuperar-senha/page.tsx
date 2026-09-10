'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Mail, ArrowLeft, Loader2, CheckCircle, Clock, Stethoscope, Building2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

const portalMap: Record<string, string> = {
    clinica: '/clinica',
    medico: '/medico',
    paciente: '/paciente',
    login: '/login',
    m: '/m/login',
    pwa: '/m/login',
}

function getLoginUrl(portal: string | null): string {
    return (portal && portalMap[portal]) || '/clinica'
}

function RecuperarSenhaContent() {
    const searchParams = useSearchParams()
    const portal = searchParams.get('portal')
    const loginUrl = getLoginUrl(portal)

    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email) {
            toast.error('Digite seu e-mail')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            const data = await response.json()

            if (!response.ok) {
                const errorMsg = data.error?.message || (typeof data.error === 'string' ? data.error : null) || data.message || 'Erro ao processar solicitação'
                throw new Error(errorMsg)
            }

            setIsSuccess(true)

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao enviar email')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    {/* Logo Oficial CliniGo */}
                    <div className="flex justify-center mb-8">
                        <Link href="/" className="inline-flex items-center">
                            <Image
                                src="/logo_black.svg"
                                alt="CliniGo"
                                width={180}
                                height={46}
                                priority
                                className="h-11 w-auto"
                            />
                        </Link>
                    </div>

                    {/* Success Card */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200">
                            <CheckCircle className="h-8 w-8 text-emerald-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 mb-3">
                            Verifique seu e-mail
                        </h1>

                        <p className="text-slate-600 mb-6">
                            Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá o link para redefinir sua senha.
                        </p>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-left">
                            <Clock className="w-5 h-5 text-amber-700 flex-shrink-0" />
                            <p className="text-sm text-amber-800">
                                O link expira em <strong>1 hora</strong>. Verifique também sua caixa de entrada e spam.
                            </p>
                        </div>

                        <Link
                            href={loginUrl}
                            className="inline-flex items-center justify-center gap-2 w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-3 rounded-xl transition-all"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            Voltar ao login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo Oficial CliniGo */}
                <div className="text-center mb-8 flex justify-center">
                    <Link href="/" className="inline-flex items-center">
                        <Image
                            src="/logo_black.svg"
                            alt="CliniGo"
                            width={180}
                            height={46}
                            priority
                            className="h-11 w-auto"
                        />
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Recuperar Senha
                        </h1>
                        <p className="text-slate-600 text-sm">
                            Digite seu e-mail cadastrado para receber as instruções de recuperação.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                E-mail cadastrado
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all text-base"
                                    placeholder="seu@email.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Enviando instruções...
                                </>
                            ) : (
                                'Enviar link de recuperação'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2 text-center text-sm">
                        <Link
                            href={loginUrl}
                            className="text-slate-600 hover:text-emerald-700 inline-flex items-center justify-center gap-1 font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar ao login ({portal === 'medico' ? 'Portal do Médico' : portal === 'm' || portal === 'pwa' ? 'Acesso Mobile' : 'Portal da Clínica'})
                        </Link>
                        
                        <div className="flex justify-center gap-4 text-xs text-slate-400 mt-2">
                            <Link href="/medico" className="hover:text-slate-600 flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5" /> Portal Médico
                            </Link>
                            <span>•</span>
                            <Link href="/m/login" className="hover:text-slate-600 flex items-center gap-1">
                                <Smartphone className="w-3.5 h-3.5" /> App Mobile
                            </Link>
                            <span>•</span>
                            <Link href="/clinica" className="hover:text-slate-600 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" /> Clínica
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function RecuperarSenhaPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
        }>
            <RecuperarSenhaContent />
        </Suspense>
    )
}

