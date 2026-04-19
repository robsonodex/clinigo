'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import { generateWhatsAppShareUrl, formatPhoneForWhatsApp } from '@/lib/utils/whatsapp-share';
import { sendWhatsappMessage } from '@/lib/whatsapp-sender';
import { toast } from 'sonner';

interface WhatsAppShareButtonProps {
    message: string;
    phone?: string;
    pdfUrl?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
    size?: 'sm' | 'default' | 'lg' | 'icon';
    label?: string;
    className?: string;
}

export function WhatsAppShareButton({
    message,
    phone,
    pdfUrl,
    variant = 'outline',
    size = 'default',
    label = 'Compartilhar no WhatsApp',
    className = '',
}: WhatsAppShareButtonProps) {
    const [sending, setSending] = useState(false);

    const handleShare = async () => {
        if (!phone) {
            toast.error('Telefone não informado. Não é possível enviar WhatsApp.');
            return;
        }

        setSending(true);

        try {
            const result = await sendWhatsappMessage({
                to: phone,
                message,
                pdfUrl,
                triggerContext: 'share_button',
            });

            if (result.success) {
                toast.success('✅ Mensagem enviada via WhatsApp da clínica!');
            } else {
                toast.error(result.error || 'Falha ao enviar mensagem. WhatsApp não conectado.');
            }
        } catch {
            toast.error('Erro ao enviar WhatsApp. Verifique se a sessão está conectada.');
        } finally {
            setSending(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleShare}
            disabled={sending}
            className={`gap-2 ${className}`}
            type="button"
        >
            {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <MessageCircle className="h-4 w-4" />
            )}
            {size !== 'icon' && (sending ? 'Enviando...' : label)}
        </Button>
    );
}

