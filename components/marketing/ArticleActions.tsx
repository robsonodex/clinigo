'use client'

import { useState } from 'react'
import { Check, Copy, Printer } from 'lucide-react'
import { toast } from 'sonner'

interface ArticleActionsProps {
    canonicalUrl: string
}

export function ArticleActions({ canonicalUrl }: ArticleActionsProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(canonicalUrl)
            setCopied(true)
            toast.success('Link do artigo copiado!')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print()
        }
    }

    return (
        <div className="flex items-center gap-2 shrink-0">
            <button
                type="button"
                onClick={handleCopy}
                aria-label="Copiar link do artigo"
                className="min-h-[44px] px-3.5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
                {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#155E4B]" />
                ) : (
                    <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copiado' : 'Copiar link'}</span>
            </button>
            <button
                type="button"
                onClick={handlePrint}
                aria-label="Imprimir artigo"
                className="min-h-[44px] px-3.5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
            </button>
        </div>
    )
}

