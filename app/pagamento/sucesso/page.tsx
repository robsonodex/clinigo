'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'

function SuccessContent() {
    const searchParams = useSearchParams()
    const clinicId = searchParams.get('clinic_id')

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50">
            <div className="max-w-md w-full text-center">
                {/* Success Icon */}
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-lg animate-pulse">
                    <CheckCircle className="h-12 w-12 text-white" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Pagamento Confirmado! 🎉
                </h1>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Seu pagamento foi processado com sucesso. Em alguns minutos você
                    receberá um e-mail com suas credenciais de acesso.
                </p>

                {/* Info Box */}
                <div className="bg-white rounded-xl border border-emerald-200 p-6 mb-6 shadow-sm">
                    <h3 className="font-semibold text-emerald-700 mb-3">📧 Próximos passos:</h3>
                    <ol className="text-left text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">1.</span>
                            <span>Verifique seu e-mail (inclusive a pasta de spam)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">2.</span>
                            <span>Você receberá 2 e-mails: confirmação e credenciais</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">3.</span>
                            <span>Use as credenciais para fazer login</span>
                        </li>
                    </ol>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Link
                        href="/clinica"
                        className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-4 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg"
                    >
                        Ir para o Login
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                    <Link
                        href="/"
                        className="inline-block text-gray-500 hover:text-gray-700 text-sm"
                    >
                        Voltar para o site
                    </Link>
                </div>

                {/* Support */}
                <p className="mt-8 text-xs text-gray-400">
                    Não recebeu o e-mail? Entre em contato: suporte@clinigo.app
                </p>
            </div>
        </div>
    )
}

export default function PagamentoSucessoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
