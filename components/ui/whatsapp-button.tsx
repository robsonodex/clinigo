/**
 * WhatsApp Share Button Component
 * Dual mode: sends automatically if Baileys session connected,
 * falls back to WhatsApp Web link if not
 */
'use client'

import { useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendWhatsappMessage } from '@/lib/whatsapp-sender'
import { toast } from 'sonner'

interface WhatsAppButtonProps {
    clinicPhone: string
    message: string
    pdfUrl?: string
    variant?: 'default' | 'outline' | 'ghost'
    size?: 'default' | 'sm' | 'lg'
    className?: string
    children?: React.ReactNode
}

/**
 * Format phone number for WhatsApp API
 * Removes all non-digits and ensures Brazil country code
 */
function formatPhoneForWhatsApp(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    // Add Brazil country code if not present
    if (cleaned.length === 11) {
        return `55${cleaned}`
    }
    if (cleaned.length === 10) {
        return `55${cleaned}`
    }
    return cleaned
}

export function WhatsAppButton({
    clinicPhone,
    message,
    pdfUrl,
    variant = 'default',
    size = 'default',
    className = '',
    children,
}: WhatsAppButtonProps) {
    const [sending, setSending] = useState(false)

    const openWhatsApp = async () => {
        setSending(true)

        try {
            const result = await sendWhatsappMessage({
                to: clinicPhone,
                message,
                pdfUrl,
                triggerContext: 'whatsapp_button',
            })

            if (result.success) {
                toast.success('✅ Mensagem enviada via WhatsApp da clínica!')
            } else {
                toast.error(result.error || 'WhatsApp não conectado. Conecte na aba WhatsApp.')
            }
        } catch {
            toast.error('Erro ao enviar WhatsApp. Verifique se a sessão está conectada.')
        } finally {
            setSending(false)
        }
    }

    return (
        <Button
            onClick={openWhatsApp}
            variant={variant}
            size={size}
            disabled={sending}
            className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
        >
            {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <MessageCircle className="w-4 h-4 mr-2" />
            )}
            {children || (sending ? 'Enviando...' : 'Falar no WhatsApp')}
        </Button>
    )
}

/**
 * WhatsApp Share Link - for use in custom components
 */
export function getWhatsAppLink(phone: string, message: string): string {
    const formattedPhone = formatPhoneForWhatsApp(phone)
    const encodedMessage = encodeURIComponent(message)
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}

/**
 * Pre-built message templates for common scenarios
 */
export const whatsappTemplates = {
    appointmentConfirmation: (data: {
        patientName: string
        doctorName: string
        date: string
        time: string
    }) =>
        `Olá! Sou ${data.patientName} e acabei de agendar uma consulta com ${data.doctorName} para ${data.date} às ${data.time}. Poderia me confirmar o agendamento?`,

    appointmentReminder: (data: {
        patientName: string
        doctorName: string
        date: string
        time: string
        videoLink?: string
    }) =>
        `Olá ${data.patientName}! Este é um lembrete da sua consulta com ${data.doctorName} amanhã (${data.date}) às ${data.time}.${data.videoLink ? ` Link da teleconsulta: ${data.videoLink}` : ''}`,

    generalInquiry: (clinicName: string) =>
        `Olá! Gostaria de mais informações sobre os serviços da ${clinicName}.`,

    reschedule: (data: { patientName: string; originalDate: string }) =>
        `Olá! Sou ${data.patientName} e preciso remarcar minha consulta que estava agendada para ${data.originalDate}. Quais horários estão disponíveis?`,
}

