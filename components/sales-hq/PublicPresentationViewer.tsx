'use client'

import { Download, ExternalLink, MessageCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PublicPresentationViewerProps {
    token: string
    documentTitle: string
    fileName: string
    clinicName: string
    senderName: string
    senderRole: string
    senderPhone: string
    whatsappHref: string
    trialHref: string
}

export function PublicPresentationViewer({
    token,
    documentTitle,
    fileName,
    clinicName,
    senderName,
    senderRole,
    senderPhone,
    whatsappHref,
    trialHref,
}: PublicPresentationViewerProps) {
    const trackClick = () => {
        try {
            fetch(`/api/public/outreach/track/${token}`, {
                method: 'POST',
                keepalive: true,
            }).catch(() => {})
        } catch {
            // Silencioso para não atrasar navegação
        }
    }

    const pdfInlineUrl = `/api/public/outreach/pdf/${token}?silent=1`
    const pdfDownloadUrl = `/api/public/outreach/pdf/${token}?silent=1&download=1`

    return (
        <div className="min-h-screen bg-[#F6F8F7] text-[#0F1F1B] flex flex-col">
            <header className="bg-white border-b border-[#E6E8E5] sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo-clinigo-round.jpg"
                            alt="CliniGO"
                            className="w-10 h-10 rounded-full object-cover border border-[#D6DDD9] shrink-0"
                        />
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#155E4B]">
                                Apresentação Executiva CliniGO
                                {clinicName ? ` · Preparada para ${clinicName}` : ''}
                            </p>
                            <h1 className="text-sm sm:text-base font-semibold text-[#0F1F1B] truncate">
                                {documentTitle}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="min-h-[42px] text-xs border-[#D6DDD9] text-[#0F1F1B]"
                        >
                            <a href={pdfDownloadUrl} download={fileName}>
                                <Download className="w-4 h-4 mr-1.5" />
                                Baixar PDF
                            </a>
                        </Button>
                        <Button
                            type="button"
                            asChild
                            onClick={trackClick}
                            className="min-h-[42px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                        >
                            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-4 h-4 mr-1.5" />
                                Falar com {senderName.split(' ')[0]} no WhatsApp
                            </a>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
                <div className="bg-white border border-[#E6E8E5] rounded-xl overflow-hidden shadow-sm">
                    <iframe
                        src={pdfInlineUrl}
                        title={documentTitle}
                        className="w-full h-[72vh] min-h-[520px] bg-[#EEF2F0]"
                    />
                    <div className="p-3 bg-[#F6F8F7] border-t border-[#E6E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#4B5B56]">
                        <span>
                            No celular, caso o PDF não apareça incorporado acima, toque em Baixar PDF para abrir em tela cheia.
                        </span>
                        <a
                            href={pdfDownloadUrl}
                            download={fileName}
                            className="font-semibold text-[#155E4B] hover:underline shrink-0"
                        >
                            Abrir ou salvar {fileName}
                        </a>
                    </div>
                </div>

                <section className="bg-white border border-[#E6E8E5] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#155E4B]">
                            <ShieldCheck className="w-4 h-4" />
                            Teste completo sem compromisso por 7 dias
                        </div>
                        <h2 className="text-base font-semibold text-[#0F1F1B]">
                            Quer avaliar o CliniGO na rotina real da sua clínica?
                        </h2>
                        <p className="text-xs text-[#4B5B56]">
                            Atendimento direto com {senderName} ({senderRole} · CliniGO) pelo WhatsApp {senderPhone} ou ativação imediata do ambiente de avaliação.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            onClick={trackClick}
                            className="min-h-[44px] text-xs border-[#155E4B] text-[#155E4B] hover:bg-[#E6F2EE]"
                        >
                            <a href={trialHref} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1.5" />
                                Ativar 7 Dias Grátis
                            </a>
                        </Button>
                        <Button
                            type="button"
                            asChild
                            onClick={trackClick}
                            className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                        >
                            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-4 h-4 mr-1.5" />
                                Conversar no WhatsApp
                            </a>
                        </Button>
                    </div>
                </section>
            </main>
        </div>
    )
}

