'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Share2, Printer, Copy, Download, Check } from 'lucide-react'
import { AppointmentVoucher } from '@/components/shared/appointment-voucher'
import { generateVoucherImage, downloadVoucherImage } from '@/lib/utils/voucher-image-generator'

interface QRCodeData {
    id: string
    token: string
    image: string // base64 data URL
    url: string
    expires_at: string
}

interface AppointmentData {
    id: string
    patient: { full_name: string }
    scheduled_at?: string
    appointment_date?: string
    appointment_time?: string
    doctor: { full_name?: string; user?: { full_name: string } }
    qr_code: QRCodeData | null
    appointment_type?: string // 'online' | 'telemedicina' | 'presencial'
    type?: string // fallback field
}

interface AppointmentSuccessModalProps {
    isOpen: boolean
    onClose: () => void
    appointment: AppointmentData | null
}

export function AppointmentSuccessModal({ isOpen, onClose, appointment }: AppointmentSuccessModalProps) {
    const [copied, setCopied] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const voucherRef = useRef<HTMLDivElement>(null)

    if (!appointment) return null

    // Handle different date formats
    const scheduledDate = appointment.scheduled_at ||
        `${appointment.appointment_date}T${appointment.appointment_time}`
    const formattedDate = format(new Date(scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

    // Handle different doctor name formats
    const doctorName = appointment.doctor.full_name ||
        appointment.doctor.user?.full_name ||
        'Médico'

    // 1. Share via WhatsApp (with PNG image)
    async function handleShareWhatsApp() {
        if (!appointment.qr_code || !voucherRef.current) {
            toast.error('QR Code não disponível')
            return
        }

        setIsGenerating(true)

        try {
            const imageDataUrl = await generateVoucherImage(voucherRef.current)

            // Convert to blob for sharing
            const blob = await fetch(imageDataUrl).then(r => r.blob())
            const file = new File([blob], `comprovante-${appointment.patient.full_name.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' })

            const message =
                `✅ *Consulta Agendada!*\n\n` +
                `👤 Paciente: ${appointment.patient.full_name}\n` +
                `📅 Data: ${formattedDate}\n` +
                `👨‍⚕️ Médico: Dr(a). ${doctorName}\n\n` +
                `📲 *Link de check-in:*\n${appointment.qr_code.url}\n\n` +
                `Apresente o comprovante anexado na recepção.`

            // Try native share API
            if (navigator.share && navigator.canShare?.({ files: [file], text: message })) {
                await navigator.share({ files: [file], text: message })
                toast.success('Compartilhado com sucesso!')
            } else {
                // Fallback to WhatsApp Web
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                window.open(whatsappUrl, '_blank')
                toast.info('Envie o comprovante manualmente via WhatsApp')
            }
        } catch (error) {
            console.error('Share error:', error)
            toast.error('Erro ao compartilhar')
        } finally {
            setIsGenerating(false)
        }
    }

    // 2. Print Voucher (PNG)
    async function handlePrint() {
        if (!appointment.qr_code || !voucherRef.current) {
            toast.error('QR Code não disponível')
            return
        }

        setIsGenerating(true)

        try {
            const imageDataUrl = await generateVoucherImage(voucherRef.current)

            const printWindow = window.open('', '', 'width=450,height=700')
            if (!printWindow) {
                toast.error('Não foi possível abrir janela de impressão')
                return
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>Comprovante de Agendamento</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body {
                                font-family: system-ui, -apple-system, sans-serif;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                min-height: 100vh;
                                background: white;
                            }
                            img {
                                max-width: 100%;
                                height: auto;
                            }
                            @media print {
                                body { padding: 0; }
                                @page { margin: 1cm; }
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${imageDataUrl}" alt="Comprovante de Agendamento" />
                    </body>
                </html>
            `)

            printWindow.document.close()
            setTimeout(() => {
                printWindow.print()
                printWindow.close()
                setIsGenerating(false)
            }, 500)
        } catch (error) {
            console.error('Print error:', error)
            toast.error('Erro ao imprimir')
            setIsGenerating(false)
        }
    }

    // 3. Copy link
    async function handleCopyLink() {
        if (!appointment.qr_code) {
            toast.error('QR Code não disponível')
            return
        }
        try {
            await navigator.clipboard.writeText(appointment.qr_code.url)
            setCopied(true)
            toast.success('Link copiado!')
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            toast.error('Erro ao copiar link')
        }
    }

    // 4. Download Voucher (PNG)
    async function handleDownloadQR() {
        if (!appointment.qr_code || !voucherRef.current) {
            toast.error('QR Code não disponível')
            return
        }

        setIsGenerating(true)

        try {
            const imageDataUrl = await generateVoucherImage(voucherRef.current)
            downloadVoucherImage(
                imageDataUrl,
                `comprovante-${appointment.patient.full_name.replace(/\s+/g, '-').toLowerCase()}.png`
            )
            toast.success('Comprovante baixado!')
        } catch (error) {
            console.error('Download error:', error)
            toast.error('Erro ao baixar comprovante')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-6 w-6" />
                        Agendamento Confirmado!
                    </DialogTitle>
                    <div className="space-y-1 text-left text-sm text-muted-foreground">
                        <p><strong>Paciente:</strong> {appointment.patient.full_name}</p>
                        <p><strong>Data:</strong> {formattedDate}</p>
                        <p><strong>Médico:</strong> Dr(a). {doctorName}</p>
                    </div>
                </DialogHeader>

                {/* QR CODE - HIGHLIGHT */}
                {appointment.qr_code ? (
                    <div className="flex flex-col items-center gap-4 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                        <p className="text-sm font-semibold text-blue-900">QR Code para Check-in</p>
                        <div className="bg-white p-4 rounded-lg shadow-lg">
                            <img
                                src={appointment.qr_code.image}
                                alt="QR Code Check-in"
                                className="w-56 h-56"
                            />
                        </div>
                        <p className="text-xs text-gray-600 max-w-[280px] text-center px-4">
                            Apresente este código na recepção para fazer check-in automaticamente
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 py-6 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                        <p className="text-sm font-semibold text-yellow-900">QR Code não disponível</p>
                        <p className="text-xs text-gray-600 max-w-[280px] text-center px-4">
                            O agendamento foi criado com sucesso, mas o QR code não pôde ser gerado.
                        </p>
                    </div>
                )}

                {/* 4 ACTION BUTTONS - Only show if QR code exists */}
                {appointment.qr_code && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                            onClick={handleShareWhatsApp}
                            variant="outline"
                            size="sm"
                            disabled={isGenerating}
                        >
                            <Share2 className="h-4 w-4 mr-2" />
                            {isGenerating ? 'Gerando...' : 'WhatsApp'}
                        </Button>

                        <Button
                            onClick={handlePrint}
                            variant="outline"
                            size="sm"
                            disabled={isGenerating}
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            {isGenerating ? 'Gerando...' : 'Imprimir'}
                        </Button>

                        <Button
                            onClick={handleCopyLink}
                            variant="outline"
                            size="sm"
                            disabled={isGenerating}
                        >
                            {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                            {copied ? 'Copiado!' : 'Copiar Link'}
                        </Button>

                        <Button
                            onClick={handleDownloadQR}
                            variant="outline"
                            size="sm"
                            disabled={isGenerating}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            {isGenerating ? 'Gerando...' : 'Baixar QR'}
                        </Button>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={onClose} className="w-full" disabled={isGenerating}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* Hidden voucher component for PNG generation */}
            {appointment.qr_code && (
                <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none">
                    <AppointmentVoucher
                        ref={voucherRef}
                        patientName={appointment.patient.full_name}
                        appointmentDate={format(new Date(scheduledDate), 'dd/MM/yyyy', { locale: ptBR })}
                        appointmentTime={format(new Date(scheduledDate), 'HH:mm', { locale: ptBR })}
                        doctorName={doctorName}
                        qrCodeImage={appointment.qr_code.image}
                        appointmentType={(appointment as any).appointment_type || (appointment as any).type || 'presencial'}
                    />
                </div>
            )}
        </Dialog>
    )
}
