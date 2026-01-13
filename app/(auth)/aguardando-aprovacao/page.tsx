'use client'

import Link from 'next/link'
import { Stethoscope, Clock, Mail, CheckCircle, Phone } from 'lucide-react'

export default function AguardandoAprovacaoPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center">
                {/* Logo */}
                <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Stethoscope className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">CliniGo</span>
                </Link>

                {/* Status Card */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="h-10 w-10 text-amber-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        Cadastro em Análise
                    </h1>

                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Seu cadastro foi recebido e está sendo analisado pela nossa equipe.
                        Você receberá um e-mail assim que for aprovado.
                    </p>

                    {/* Status Steps */}
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-900">Cadastro recebido</p>
                                    <p className="text-xs text-gray-500">Seus dados foram enviados</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 animate-pulse">
                                    <Clock className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-900">Em análise</p>
                                    <p className="text-xs text-gray-500">Estamos verificando suas informações</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 opacity-50">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-600">Aprovado</p>
                                    <p className="text-xs text-gray-400">Você receberá um e-mail de confirmação</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-left">
                                <p className="text-sm font-medium text-blue-900 mb-1">Prazo de análise</p>
                                <p className="text-xs text-blue-700">
                                    O processo de aprovação leva até <strong>24 horas úteis</strong>.
                                    Fique atento ao seu e-mail.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-3">Precisa de ajuda?</p>
                        <div className="flex justify-center gap-4">
                            <a
                                href="mailto:suporte@clinigo.app"
                                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                            >
                                <Mail className="h-4 w-4" />
                                suporte@clinigo.app
                            </a>
                            <a
                                href="https://wa.me/5521999999999"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                            >
                                <Phone className="h-4 w-4" />
                                WhatsApp
                            </a>
                        </div>
                    </div>
                </div>

                {/* Back to Home */}
                <div className="mt-6">
                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        ← Voltar ao início
                    </Link>
                </div>
            </div>
        </div>
    )
}
