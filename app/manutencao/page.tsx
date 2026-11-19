import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Wrench } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import { WHATSAPP_URL } from '@/components/preview-home/content'

export default function ManutencaoPage() {
    return (
        <EditorialShell minimal backHref="/" backLabel="Tentar novamente" compactFooter>
            <main className="flex-1 flex items-center justify-center px-5 py-16">
                <div className="max-w-lg w-full bg-white border border-[#E6E8E5] rounded-xl p-8 sm:p-10 text-center shadow-sm">
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/logo_black.svg"
                            alt="CliniGo"
                            width={156}
                            height={48}
                            unoptimized
                            priority
                            className="h-[46px] w-auto object-contain"
                        />
                    </div>

                    <div className="w-14 h-14 rounded-xl bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center mx-auto mb-5">
                        <Wrench className="w-7 h-7" strokeWidth={1.75} />
                    </div>

                    <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                        MANUTENÇÃO PROGRAMADA
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-3">
                        Sistema em atualização
                    </h1>
                    <p className="text-sm sm:text-base text-[#4B5B56] leading-relaxed mb-6">
                        O CliniGo está passando por uma manutenção técnica programada para preservar a estabilidade e a segurança da operação. Voltaremos em instantes.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/"
                            className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium inline-flex items-center justify-center transition-colors"
                        >
                            Recarregar página inicial
                        </Link>
                        <a
                            href={WHATSAPP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] px-5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            <MessageCircle className="w-4 h-4 text-[#155E4B]" />
                            Falar com suporte
                        </a>
                    </div>
                </div>
            </main>
        </EditorialShell>
    )
}
