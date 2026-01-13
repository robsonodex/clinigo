'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { XCircle, RefreshCw, Loader2 } from 'lucide-react'

function ErrorContent() {
    const searchParams = useSearchParams()
    const clinicId = searchParams.get('clinic_id')

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
            <div className="max-w-md w-full text-center">
                {/* Error Icon */}
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg">
                    <XCircle className="h-12 w-12 text-white" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Pagamento não Realizado
                </h1>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Não foi possível processar seu pagamento. Isso pode acontecer por diversos motivos,
                    como cartão recusado, saldo insuficiente ou dados incorretos.
                </p>

                {/* Info Box */}
                <div className="bg-white rounded-xl border border-red-200 p-6 mb-6 shadow-sm">
                    <h3 className="font-semibold text-red-700 mb-3">Possíveis soluções:</h3>
                    <ul className="text-left text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-red-500">•</span>
                            <span>Verifique os dados do cartão e tente novamente</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500">•</span>
                            <span>Tente outro método de pagamento (PIX, outro cartão)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500">•</span>
                            <span>Entre em contato com seu banco para liberar a transação</span>
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Link
                        href="/cadastro"
                        className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold py-4 rounded-xl hover:from-red-600 hover:to-orange-600 transition-all shadow-lg"
                    >
                        <RefreshCw className="h-5 w-5" />
                        Tentar Novamente
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
                    Precisa de ajuda? WhatsApp: (21) 96553-2247 | suporte@clinigo.app
                </p>
            </div>
        </div>
    )
}

export default function PagamentoErroPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            </div>
        }>
            <ErrorContent />
        </Suspense>
    )
}
