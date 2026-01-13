'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Clock, RefreshCw, Loader2 } from 'lucide-react'

function PendingContent() {
    const searchParams = useSearchParams()
    const clinicId = searchParams.get('clinic_id')

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50">
            <div className="max-w-md w-full text-center">
                {/* Pending Icon */}
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center mb-6 shadow-lg">
                    <Clock className="h-12 w-12 text-white animate-pulse" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Pagamento Pendente
                </h1>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Seu pagamento está sendo processado. Isso geralmente acontece com
                    pagamentos via PIX ou Boleto.
                </p>

                {/* Info Box */}
                <div className="bg-white rounded-xl border border-amber-200 p-6 mb-6 shadow-sm">
                    <h3 className="font-semibold text-amber-700 mb-3">⏳ O que fazer agora:</h3>
                    <ul className="text-left text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">PIX:</span>
                            <span>Aguarde a confirmação (geralmente instantânea)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">Boleto:</span>
                            <span>Aguarde 1-2 dias úteis após o pagamento</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">Cartão:</span>
                            <span>Verifique com seu banco se há pendência</span>
                        </li>
                    </ul>
                </div>

                {/* Status */}
                <div className="bg-amber-100 rounded-lg p-4 mb-6">
                    <p className="text-amber-800 text-sm">
                        Assim que o pagamento for confirmado, você receberá um e-mail
                        com suas credenciais de acesso.
                    </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold py-4 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg"
                    >
                        <RefreshCw className="h-5 w-5" />
                        Verificar Status
                    </button>
                    <Link
                        href="/"
                        className="inline-block text-gray-500 hover:text-gray-700 text-sm"
                    >
                        Voltar para o site
                    </Link>
                </div>

                {/* Support */}
                <p className="mt-8 text-xs text-gray-400">
                    Pagou há mais de 24h e não recebeu? suporte@clinigo.app
                </p>
            </div>
        </div>
    )
}

export default function PagamentoPendentePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        }>
            <PendingContent />
        </Suspense>
    )
}
