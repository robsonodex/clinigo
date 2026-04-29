/**
 * WhatsApp Business Service — Legacy Wrapper
 * 
 * @deprecated Use lib/whatsapp/service.ts diretamente.
 * Este arquivo é mantido apenas para retrocompatibilidade.
 */

export {
    sendWhatsAppMessage,
    checkInstanceStatus as getWhatsAppStatus,
    createInstanceAndGetQR as connectWhatsApp,
    disconnectInstance as disconnectWhatsApp,
} from '@/lib/whatsapp/service'
