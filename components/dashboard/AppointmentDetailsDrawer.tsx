'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Share2, Printer, Copy, Download, Loader2, Check, Video, MessageCircle } from 'lucide-react'

interface AppointmentDetailsDrawerProps {
    appointmentId: string | null
    isOpen: boolean
    onClose: () => void
}

export function AppointmentDetailsDrawer({
    appointmentId,
    isOpen,
    onClose
}: AppointmentDetailsDrawerProps) {
    const [appointment, setAppointment] = useState<any>(null)
    const [qrCode, setQrCode] = useState<any>(null)
    const [videoRoom, setVideoRoom] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [teleconsultaCopied, setTeleconsultaCopied] = useState(false)

    useEffect(() => {
        if (appointmentId && isOpen) {
            loadAppointment()
        }
    }, [appointmentId, isOpen])

    async function loadAppointment() {
        setLoading(true)
        try {
            // Fetch appointment with QR code
            const response = await fetch(`/api-v2/appointments/${appointmentId}?include=qr_code`)

            if (!response.ok) {
                // 🔍 Enhanced debugging - capture full error details
                let errorData: any = {};
                const rawText = await response.text();
                try {
                    errorData = JSON.parse(rawText);
                } catch (e) {
                    console.error('[FATAL] API returned non-JSON:', rawText.substring(0, 200));
                    errorData = {
                        error: 'Erro de conexão ou rota não encontrada',
                        code: 'API_ERROR_HTML',
                        details: rawText.substring(0, 100)
                    };
                }

                console.error('[DEBUG] Failed to load appointment:', {
                    status: response.status,
                    statusText: response.statusText,
                    appointmentId,
                    errorData,
                    timestamp: new Date().toISOString()
                })

                // Show user-friendly message based on error type
                if (response.status === 404) {
                    const errorMsg = errorData.code === 'NOT_FOUND'
                        ? 'Agendamento não encontrado no sistema'
                        : 'Agendamento não encontrado'
                    console.error(`[404 ERROR] ${errorMsg}. ID: ${appointmentId}`, errorData)
                    throw new Error(errorMsg)
                } else if (response.status === 403) {
                    const errorMsg = errorData.code === 'FORBIDDEN_RLS'
                        ? 'Você não tem permissão para visualizar este agendamento (RLS)'
                        : 'Você não tem permissão para visualizar este agendamento'
                    console.error(`[403 ERROR] ${errorMsg}. ID: ${appointmentId}`, errorData)
                    throw new Error(errorMsg)
                } else if (response.status === 401) {
                    console.error('[401 ERROR] Usuário não autenticado', errorData)
                    throw new Error('Você precisa estar autenticado para visualizar este agendamento')
                }

                throw new Error(errorData.error || 'Erro ao carregar agendamento')
            }

            const data = await response.json()
            console.log('[DEBUG] Appointment loaded successfully:', {
                appointmentId,
                hasAppointment: !!data.appointment,
                hasQrCode: !!data.qr_code,
                patientName: data.appointment?.patient?.full_name
            })

            setAppointment(data.appointment)

            // If no QR code, generate retroactively
            if (!data.qr_code) {
                console.log('[DEBUG] No QR code found, generating...')
                const qrResponse = await fetch(`/api/appointments/${appointmentId}/generate-qr`, {
                    method: 'POST'
                })

                if (qrResponse.ok) {
                    const qrData = await qrResponse.json()
                    console.log('[DEBUG] QR code generated successfully')
                    setQrCode(qrData.qr_code || qrData.qrCode)
                } else {
                    console.warn('[WARN] Failed to generate QR code:', await qrResponse.text())
                }
            } else {
                console.log('[DEBUG] QR code already exists')
                setQrCode(data.qr_code)
            }

            // Load video room from API response (if exists)
            console.log('[DEBUG] Full API response:', data)
            console.log('[DEBUG] Appointment type:', data.appointment?.type || data.appointment?.appointment_type)
            console.log('[DEBUG] Video room from API:', data.video_room)

            if (data.video_room) {
                console.log('[DEBUG] ✅ Video room found:', data.video_room)
                setVideoRoom(data.video_room)
            } else {
                console.log('[DEBUG] ❌ No video room in API response')
            }
        } catch (error) {
            console.error('[ERROR] Error loading appointment:', error)
            toast.error(error instanceof Error ? error.message : 'Erro ao carregar agendamento')
        } finally {
            setLoading(false)
        }
    }

    // Sharing functions
    function handleShareWhatsApp() {
        if (!appointment || !qrCode) return

        const scheduledDate = appointment.scheduled_at ||
            `${appointment.appointment_date}T${appointment.appointment_time}`
        const formattedDate = format(new Date(scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

        const doctorName = appointment.doctor?.full_name ||
            appointment.doctor?.user?.full_name ||
            'Médico'

        const patientName = appointment.patient?.full_name || 'Paciente'

        const message =
            `✅ *Consulta Agendada!*\n\n` +
            `👤 ${patientName}\n` +
            `📅 ${formattedDate}\n` +
            `👨⚕️ Dr(a). ${doctorName}\n\n` +
            `📲 ${qrCode.url}`

        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }

    function handlePrint() {
        if (!appointment || !qrCode) return

        const scheduledDate = appointment.scheduled_at ||
            `${appointment.appointment_date}T${appointment.appointment_time}`
        const formattedDate = format(new Date(scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

        const doctorName = appointment.doctor?.full_name ||
            appointment.doctor?.user?.full_name ||
            'Médico'

        const patientName = appointment.patient?.full_name || 'Paciente'

        const printWindow = window.open('', '', 'width=400,height=600')
        if (!printWindow) return

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head><meta charset="UTF-8"><title>QR Code</title>
                <style>
                    body { font-family: Arial; text-align: center; padding: 40px; }
                    h1 { font-size: 24px; margin-bottom: 10px; }
                    img { width: 300px; height: 300px; margin: 30px 0; border: 3px solid #e5e7eb; border-radius: 8px; }
                    p { margin: 8px 0; font-size: 14px; }
                </style></head>
                <body>
                    <h1>QR Code - Check-in</h1>
                    <p><strong>${patientName}</strong></p>
                    <img src="${qrCode.image}" />
                    <p>${formattedDate}</p>
                    <p>Dr(a). ${doctorName}</p>
                </body>
            </html>
        `)
        printWindow.document.close()
        setTimeout(() => { printWindow.print(); printWindow.close() }, 250)
    }

    async function handleCopyLink() {
        if (!qrCode) return
        try {
            await navigator.clipboard.writeText(qrCode.url)
            setCopied(true)
            toast.success('Link copiado!')
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            toast.error('Erro ao copiar link')
        }
    }

    // Teleconsulta sharing functions
    async function handleCopyTeleconsultaLink() {
        if (!videoRoom) return
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
        const link = `${baseUrl}/video/${videoRoom.room_id}?role=patient&token=${videoRoom.patient_token}`
        try {
            await navigator.clipboard.writeText(link)
            setTeleconsultaCopied(true)
            toast.success('Link da teleconsulta copiado!')
            setTimeout(() => setTeleconsultaCopied(false), 2000)
        } catch (error) {
            toast.error('Erro ao copiar link')
        }
    }

    function handleTeleconsultaWhatsApp() {
        if (!appointment || !videoRoom) return
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
        const link = `${baseUrl}/video/${videoRoom.room_id}?role=patient&token=${videoRoom.patient_token}`
        const patientName = appointment.patient?.full_name || 'Paciente'
        const message =
            `Olá ${patientName}! 👋\n\n` +
            `Seu link de teleconsulta está pronto:\n\n` +
            `🔗 ${link}\n\n` +
            `📅 Data: ${formattedDate}\n` +
            `👨‍⚕️ Médico(a): Dr(a). ${doctorName}\n\n` +
            `Clique no link no horário da consulta para entrar na sala de vídeo.`
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }

    function handleDownloadQR() {
        if (!appointment || !qrCode) return
        try {
            const link = document.createElement('a')
            link.href = qrCode.image
            link.download = `qrcode-${appointment.patient?.full_name?.replace(/\s+/g, '-') || 'paciente'}.png`
            link.click()
            toast.success('QR Code baixado!')
        } catch (error) {
            toast.error('Erro ao baixar QR Code')
        }
    }

    const scheduledDate = appointment?.scheduled_at ||
        (appointment?.appointment_date && appointment?.appointment_time
            ? `${appointment.appointment_date}T${appointment.appointment_time}`
            : null)

    const formattedDate = scheduledDate
        ? format(new Date(scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
        : ''

    const doctorName = appointment?.doctor?.full_name ||
        appointment?.doctor?.user?.full_name ||
        'Médico'

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Detalhes do Agendamento</SheetTitle>
                    <SheetDescription>
                        Visualize os detalhes do agendamento, QR Code e links de acesso.
                    </SheetDescription>
                </SheetHeader>

                {loading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                )}

                {!loading && appointment && (
                    <div className="space-y-6 py-4">
                        {/* Appointment Info */}
                        <div className="space-y-3">
                            <div>
                                <Label>Paciente</Label>
                                <p className="font-medium">{appointment.patient?.full_name || 'N/A'}</p>
                            </div>
                            <div>
                                <Label>Data e Hora</Label>
                                <p className="font-medium">{formattedDate}</p>
                            </div>
                            <div>
                                <Label>Médico</Label>
                                <p className="font-medium">Dr(a). {doctorName}</p>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Badge>{appointment.status}</Badge>
                            </div>
                        </div>

                        {/* TELECONSULTA LINK SECTION */}
                        {(appointment.type === 'TELEMEDICINA' || appointment.type === 'online' || appointment.appointment_type === 'online') && videoRoom && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Video className="h-5 w-5 text-green-600" />
                                        <Label className="text-base font-medium">Link da Teleconsulta</Label>
                                    </div>
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                                        <p className="text-sm text-green-800">
                                            Compartilhe este link com o paciente para acessar a teleconsulta:
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button onClick={handleCopyTeleconsultaLink} size="sm" variant="outline" className="w-full">
                                                {teleconsultaCopied ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
                                                {teleconsultaCopied ? 'Copiado!' : 'Copiar Link'}
                                            </Button>
                                            <Button onClick={handleTeleconsultaWhatsApp} size="sm" variant="outline" className="w-full">
                                                <MessageCircle className="h-3 w-3 mr-1" />
                                                WhatsApp
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <Separator />

                        {/* QR CODE Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base">QR Code Check-in</Label>
                                <Badge variant={appointment.checked_in ? 'default' : 'outline'}>
                                    {appointment.checked_in ? '✅ Check-in feito' : '⏳ Aguardando'}
                                </Badge>
                            </div>

                            {qrCode ? (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 space-y-4">
                                    <div className="flex justify-center">
                                        <div className="bg-white p-4 rounded-lg shadow-lg">
                                            <img
                                                src={qrCode.image}
                                                alt="QR Code"
                                                className="w-56 h-56"
                                            />
                                        </div>
                                    </div>

                                    {/* 4 ACTION BUTTONS */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button onClick={handleShareWhatsApp} size="sm" variant="outline">
                                            <Share2 className="h-3 w-3 mr-1" />
                                            WhatsApp
                                        </Button>
                                        <Button onClick={handlePrint} size="sm" variant="outline">
                                            <Printer className="h-3 w-3 mr-1" />
                                            Imprimir
                                        </Button>
                                        <Button onClick={handleCopyLink} size="sm" variant="outline">
                                            {copied ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
                                            {copied ? 'Copiado!' : 'Copiar'}
                                        </Button>
                                        <Button onClick={handleDownloadQR} size="sm" variant="outline">
                                            <Download className="h-3 w-3 mr-1" />
                                            Baixar
                                        </Button>
                                    </div>

                                    <p className="text-xs text-gray-600 text-center">
                                        Código: <code>{qrCode.token?.slice(0, 12)}...</code>
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">QR Code não disponível</p>
                            )}
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
