'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { generateWhatsAppShareUrl, formatPhoneForWhatsApp } from '@/lib/utils/whatsapp-share';
import { toast } from 'sonner';

interface WhatsAppShareButtonProps {
    message: string;
    phone?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
    size?: 'sm' | 'default' | 'lg' | 'icon';
    label?: string;
    className?: string;
}

export function WhatsAppShareButton({
    message,
    phone,
    variant = 'outline',
    size = 'default',
    label = 'Compartilhar no WhatsApp',
    className = '',
}: WhatsAppShareButtonProps) {
    const handleShare = () => {
        const formattedPhone = phone ? formatPhoneForWhatsApp(phone) : undefined;
        const url = generateWhatsAppShareUrl(message, formattedPhone);

        // Abrir em nova aba
        window.open(url, '_blank', 'noopener,noreferrer');

        toast.success('WhatsApp aberto! Envie a mensagem manualmente.');
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleShare}
            className={`gap-2 ${className}`}
            type="button"
        >
            <MessageCircle className="h-4 w-4" />
            {size !== 'icon' && label}
        </Button>
    );
}
