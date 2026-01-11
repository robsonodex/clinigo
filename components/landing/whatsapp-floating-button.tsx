'use client'

import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsAppFloatingButtonProps {
    phoneNumber?: string
    message?: string
}

export function WhatsAppFloatingButton({
    phoneNumber = '5521965532247',
    message = 'Olá! Quero saber mais sobre o CliniGo'
}: WhatsAppFloatingButtonProps) {
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "fixed bottom-6 right-6 z-50",
                "flex items-center gap-3 px-4 py-3 rounded-full",
                "bg-green-500 text-white font-semibold shadow-lg",
                "transition-all duration-300 hover:scale-110 hover:shadow-xl",
                "group"
            )}
        >
            {/* Pulse animation ring */}
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />

            {/* Icon */}
            <MessageCircle className="h-6 w-6 relative z-10 fill-current" />

            {/* Text - hidden on mobile, visible on hover for desktop */}
            <span className="hidden md:inline-block relative z-10 whitespace-nowrap">
                Fale conosco
            </span>

            {/* Tooltip for mobile */}
            <span className={cn(
                "absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg",
                "bg-gray-900 text-white text-sm whitespace-nowrap",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "md:hidden"
            )}>
                Fale conosco
                <span className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
            </span>
        </a>
    )
}
