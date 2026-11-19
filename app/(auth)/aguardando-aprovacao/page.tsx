'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, Mail, CheckCircle, Phone } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import { WHATSAPP_URL } from '@/components/preview-home/content'

export default function AguardandoAprovacaoPage() {
    return (
        <EditorialShell minimal backHref="/" backLabel="Voltar ao início" compactFooter>
            <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
                <div className="w-full max-w-lg text-center">
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

                    <div className="bg-white rounded-xl shadow-sm p-7 sm:p-8 border border-[#E6E8E5]">
                        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Clock className="h-8 w-8 text-amber-700" strokeWidth={1.75} />
                        </div>

                        <h1 className="text-2xl font-semibold text-[#0F1F1B] mb-2">
                            Cadastro em análise
                        </h1>

                        <p className="text-sm sm:text-base text-[#4B5B56] mb-6 max-w-md mx-auto leading-relaxed">
                            Recebemos os dados da sua clínica. Assim que a validação for concluída, enviaremos a confirmação por e-mail.
                        </p>

                        <div className="bg-[#FAFAF8] border border-[#E6E8E5] rounded-xl p-5 mb-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#E6F2EE] flex items-center justify-center shrink-0">
                                    <CheckCircle className="h-4 w-4 text-[#155E4B]" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-[#0F1F1B]">Cadastro recebido</p>
                                    <p className="text-xs text-[#4B5B56]">Dados enviados com sucesso</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                    <Clock className="h-4 w-4 text-amber-700" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-[#0F1F1B]">Em análise</p>
                                    <p className="text-xs text-[#4B5B56]">Prazo estimado: até 24 horas úteis</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 opacity-60">
                                <div className="w-8 h-8 rounded-full bg-[#F2F5F3] flex items-center justify-center shrink-0">
                                    <Mail className="h-4 w-4 text-[#4B5B56]" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-[#4B5B56]">Acesso liberado</p>
                                    <p className="text-xs text-[#4B5B56]">Envio de confirmação por e-mail</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center pt-4 border-t border-[#E6E8E5]">
                            <p className="text-xs text-[#4B5B56] mb-3">Precisa de ajuda?</p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <a
                                    href="mailto:suporte@clinigo.app"
                                    className="inline-flex items-center gap-1.5 text-[#155E4B] hover:underline text-sm font-medium min-h-[44px] px-2"
                                >
                                    <Mail className="h-4 w-4" />
                                    suporte@clinigo.app
                                </a>
                                <a
                                    href={WHATSAPP_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[#155E4B] hover:underline text-sm font-medium min-h-[44px] px-2"
                                >
                                    <Phone className="h-4 w-4" />
                                    WhatsApp (21) 97512-9005
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </EditorialShell>
    )
}
