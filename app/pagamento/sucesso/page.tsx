'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, ArrowRight, Loader2, Mail } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'

function SuccessContent() {
    return (
        <EditorialShell minimal backHref="/" backLabel="Voltar ao início" compactFooter>
            <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
                <div className="max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/logo_black.svg"
                                alt="CliniGo"
                                width={156}
                                height={48}
                                unoptimized
                                priority
                                className="h-[46px] w-auto object-contain"
                            />
                        </Link>
                    </div>

                    <div className="bg-white border border-[#E6E8E5] rounded-xl p-7 sm:p-8 shadow-sm">
                        <div className="mx-auto w-16 h-16 rounded-full bg-[#E6F2EE] flex items-center justify-center mb-5">
                            <CheckCircle className="h-8 w-8 text-[#155E4B]" strokeWidth={1.75} />
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] mb-2">
                            Pagamento confirmado
                        </h1>

                        <p className="text-sm sm:text-base text-[#4B5B56] mb-6 leading-relaxed">
                            Seu pagamento foi processado com sucesso. Em alguns minutos você receberá um e-mail com suas credenciais de acesso.
                        </p>

                        <div className="bg-[#FAFAF8] rounded-xl border border-[#E6E8E5] p-5 mb-6 text-left">
                            <h2 className="font-semibold text-[#0F1F1B] text-sm mb-3 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-[#155E4B]" />
                                Próximos passos
                            </h2>
                            <ol className="text-sm text-[#4B5B56] space-y-2 list-decimal list-inside">
                                <li>Verifique seu e-mail (incluindo a pasta de spam)</li>
                                <li>Confirme o recebimento das credenciais de acesso</li>
                                <li>Acesse o Portal da Clínica para configurar sua unidade</li>
                            </ol>
                        </div>

                        <div className="space-y-3">
                            <Link
                                href="/clinica"
                                className="inline-flex items-center justify-center gap-2 w-full min-h-[46px] bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold rounded-md transition-colors text-sm"
                            >
                                Ir para o Login
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/"
                                className="inline-flex items-center justify-center w-full min-h-[44px] text-[#4B5B56] hover:text-[#0F1F1B] text-xs font-medium"
                            >
                                Voltar para o site
                            </Link>
                        </div>

                        <p className="mt-6 text-xs text-[#4B5B56]">
                            Não recebeu o e-mail? Entre em contato: suporte@clinigo.app
                        </p>
                    </div>
                </div>
            </main>
        </EditorialShell>
    )
}

export default function PagamentoSucessoPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#155E4B]" />
                </div>
            }
        >
            <SuccessContent />
        </Suspense>
    )
}
