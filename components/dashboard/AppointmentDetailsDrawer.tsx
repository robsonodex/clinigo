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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Share2, Printer, Copy, Download, Loader2, Check, Video, MessageCircle, Send, DollarSign, Sparkles } from 'lucide-react'
import { DoctorCheckinButton } from '@/components/appointments/DoctorCheckinButton'

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
    const [isResending, setIsResending] = useState(false)
    const [rateModalOpen, setRateModalOpen] = useState(false)
    const [rateType, setRateType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE')
    const [rateValue, setRateValue] = useState<number>(70)
    const [savingRate, setSavingRate] = useState(false)

    async function handleSavePermanentRate() {
        if (!appointment?.doctor_id || !appointment?.patient_id) {
            toast.error('Dados do médico ou paciente não disponíveis')
            return
        }
        setSavingRate(true)
        try {
            const res = await fetch('/api/doctor-patient-rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doctor_id: appointment.doctor_id,
                    patient_id: appointment.patient_id,
                    rate_type: rateType,
                    fixed_value: rateType === 'FIXED' ? rateValue : null,
                    percentage: rateType === 'PERCENTAGE' ? rateValue : null,
                })
            })
            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Falha ao salvar valor permanente')
            }
            toast.success('Valor permanente definido para este paciente com sucesso!')
            setRateModalOpen(false)
            loadAppointment()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar valor do paciente')
        } finally {
            setSavingRate(false)
        }
    }

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
            // API uses successResponse() which wraps in { success, data }
            const apiData = data.data || data
            console.log('[DEBUG] Appointment loaded successfully:', {
                appointmentId,
                hasAppointment: !!apiData,
                hasQrCode: !!apiData?.qr_code,
                patientName: apiData?.patient?.full_name
            })

            setAppointment(apiData)

            // If no QR code, generate retroactively
            if (!apiData?.qr_code) {
                console.log('[DEBUG] No QR code found, generating...')
                const qrResponse = await fetch(`/api-v2/appointments/${appointmentId}/generate-qr`, {
                    method: 'POST'
                })

                if (qrResponse.ok) {
                    const qrData = await qrResponse.json()
                    console.log('[DEBUG] QR code generated successfully:', qrData)
                    // generate-qr returns { qrCode: {id,token,...}, qrCodeImage, preRegistrationUrl }
                    setQrCode({
                        id: qrData.qrCode?.id,
                        token: qrData.qrCode?.token,
                        image: qrData.qrCodeImage,
                        url: qrData.preRegistrationUrl,
                        expires_at: qrData.qrCode?.expiresAt
                    })
                } else {
                    console.warn('[WARN] Failed to generate QR code:', await qrResponse.text())
                }
            } else {
                console.log('[DEBUG] QR code already exists')
                setQrCode(apiData.qr_code)
            }

            // Load video room from API response (if exists)
            console.log('[DEBUG] Full API response:', data)
            console.log('[DEBUG] Appointment type:', apiData?.type || apiData?.appointment_type)
            console.log('[DEBUG] Video room from API:', apiData?.video_room)

            if (apiData?.video_room) {
                console.log('[DEBUG] ✅ Video room found:', apiData.video_room)
                setVideoRoom(apiData.video_room)
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

    async function handleResendWhatsApp() {
        if (!appointment) return
        try {
            setIsResending(true)
            const response = await fetch(`/api/appointments/${appointmentId}/resend`, {
                method: 'POST',
                headers: {
                    'x-clinic-id': appointment.clinic_id || ''
                }
            })
            
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Falha ao reenviar notificação.')
            }
            
            toast.success('Confirmação reenviada via WhatsApp com sucesso!')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsResending(false)
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

    const patientName = appointment?.patient?.full_name ||
        appointment?.patient?.name ||
        'Paciente'

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
                                <div className="mt-1">
                                    <Badge variant="outline" className={
                                        appointment.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200' :
                                        appointment.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 font-medium' :
                                        appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 border-red-200 font-semibold' :
                                        appointment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200' :
                                        'bg-slate-100 text-slate-800 dark:bg-slate-950/30 dark:text-slate-400 border-slate-200'
                                    }>
                                        {
                                            appointment.status === 'PENDING' ? 'Pendente' :
                                            appointment.status === 'CONFIRMED' ? 'Confirmado' :
                                            appointment.status === 'CANCELLED' ? 'Cancelado' :
                                            appointment.status === 'COMPLETED' ? 'Realizado' :
                                            appointment.status === 'NO_SHOW' ? 'Falta' : appointment.status
                                        }
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {appointment.status === 'CANCELLED' && (
                            <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/50 rounded-lg p-4 space-y-2.5">
                                <h4 className="font-semibold text-sm text-red-800 dark:text-red-400 flex items-center gap-1.5">
                                    ⚠️ Informações do Cancelamento
                                </h4>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-muted-foreground font-medium">Justificativa:</span>
                                        <p className="mt-0.5 text-sm text-foreground bg-white dark:bg-slate-900 border border-red-200/40 p-2 rounded italic">
                                            &ldquo;{appointment.cancellation_reason || 'Nenhuma justificativa fornecida.'}&rdquo;
                                        </p>
                                    </div>
                                    {appointment.cancelled_by_name && (
                                        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                            <span>Responsável pelo cancelamento:</span>
                                            <span className="font-semibold text-foreground">{appointment.cancelled_by_name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* CHECK-IN DO PROFISSIONAL (EVENTO-GATILHO CENTRAL) */}
                        <div className="pt-3 pb-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                                Atendimento Clínico
                            </Label>
                            <DoctorCheckinButton
                                appointmentId={appointment.id}
                                patientName={patientName}
                                scheduledTime={formattedDate}
                                status={appointment.status}
                                hasReceptionCheckin={Boolean(appointment.checked_in || appointment.checked_in_at)}
                                doctorCheckedInAt={appointment.doctor_checked_in_at}
                                verificationLevel={appointment.verification_level}
                                repasseAmount={appointment.repasse_amount}
                                className="w-full justify-center"
                                onSuccess={() => {
                                    loadAppointment();
                                }}
                            />

                            {/* REPASSE & ATALHO DE VALOR PERMANENTE */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 mt-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                        Repasse do Atendimento:
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {appointment.repasse_amount != null && Number(appointment.repasse_amount) > 0 ? (
                                            <span className="font-bold text-foreground">
                                                R$ {Number(appointment.repasse_amount).toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">Gravado no check-in</span>
                                        )}
                                        {appointment.rate_source && (
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] px-1.5 py-0 ${
                                                    appointment.rate_source === 'PATIENT_OVERRIDE'
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
                                                }`}
                                            >
                                                {appointment.rate_source === 'PATIENT_OVERRIDE' ? 'Personalizado' : 'Contrato'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {appointment.doctor_id && appointment.patient_id && (
                                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRateValue(
                                                    appointment.repasse_rate_applied
                                                        ? Number(appointment.repasse_rate_applied)
                                                        : 70
                                                );
                                                setRateModalOpen(true);
                                            }}
                                            className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 min-h-[36px]"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            <span>Ajustar valor permanente deste paciente</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button 
                                variant="outline" 
                                className="w-full" 
                                onClick={handleResendWhatsApp}
                                disabled={isResending}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                {isResending ? 'Enviando...' : 'Reenviar WhatsApp'}
                            </Button>
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

                {/* MINI-MODAL PARA AJUSTAR VALOR PERMANENTE DESTE PACIENTE */}
                <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
                    <DialogContent className="rounded-2xl max-w-md w-[95vw] sm:w-full">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                                <span>Ajustar Repasse Permanente</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Defina o repasse para o paciente <strong>{patientName}</strong> com o profissional <strong>Dr(a). {doctorName}</strong>.
                                Este valor será aplicado automaticamente nos próximos atendimentos.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-3">
                            <div>
                                <Label className="text-xs font-semibold">Tipo de Repasse</Label>
                                <Select
                                    value={rateType}
                                    onValueChange={(val: 'PERCENTAGE' | 'FIXED') => setRateType(val)}
                                >
                                    <SelectTrigger className="mt-1 h-11 min-h-[44px] rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
                                        <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold">
                                    {rateType === 'PERCENTAGE' ? 'Percentual (%)' : 'Valor Fixo (R$)'}
                                </Label>
                                <div className="relative mt-1">
                                    <Input
                                        type="number"
                                        step={rateType === 'PERCENTAGE' ? '0.5' : '1.00'}
                                        min={0}
                                        max={rateType === 'PERCENTAGE' ? 100 : 99999}
                                        value={rateValue}
                                        onChange={(e) => setRateValue(Number(e.target.value))}
                                        className="h-11 text-base font-bold pr-8 rounded-xl"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                        {rateType === 'PERCENTAGE' ? '%' : 'R$'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                            <Button
                                variant="outline"
                                onClick={() => setRateModalOpen(false)}
                                className="min-h-[44px] rounded-xl w-full sm:w-auto"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSavePermanentRate}
                                disabled={savingRate}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[44px] rounded-xs w-full sm:w-auto"
                            >
                                {savingRate ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <span>Salvar Valor Permanente</span>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SheetContent>
        </Sheet>
    )
}
