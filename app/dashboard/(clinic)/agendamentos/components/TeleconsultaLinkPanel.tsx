'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Mail, MessageCircle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface VideoRoom {
    room_id: string
    patient_token: string
    doctor_token: string
}

interface Patient {
    full_name: string
    email?: string
    phone?: string
}

interface Doctor {
    user: {
        full_name: string
    }
}

interface Appointment {
    id: string
    appointment_date: string
    appointment_time: string
    patient: Patient
    doctor: Doctor
    video_room: VideoRoom
}

interface TeleconsultaLinkPanelProps {
    appointment: Appointment
}

export function TeleconsultaLinkPanel({ appointment }: TeleconsultaLinkPanelProps) {
    const [isCopied, setIsCopied] = useState(false)
    const [isSendingEmail, setIsSendingEmail] = useState(false)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
    const patientLink = `${baseUrl}/video/${appointment.video_room.room_id}?role=patient&token=${appointment.video_room.patient_token}`

    const appointmentDate = new Date(appointment.appointment_date)
    const formattedDate = format(appointmentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    const formattedDateTime = `${formattedDate} às ${appointment.appointment_time}`

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(patientLink)
            setIsCopied(true)
            toast.success('Link copiado para a área de transferência!')
            setTimeout(() => setIsCopied(false), 3000)
        } catch (error) {
            toast.error('Erro ao copiar link')
            console.error('[COPY ERROR]', error)
        }
    }

    const handleSendEmail = async () => {
        if (!appointment.patient.email) {
            toast.error('Paciente não possui e-mail cadastrado')
            return
        }

        setIsSendingEmail(true)
        try {
            const response = await fetch('/api/appointments/send-teleconsulta-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    appointment_id: appointment.id,
                    patient_email: appointment.patient.email,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Erro ao enviar e-mail')
            }

            toast.success('E-mail enviado com sucesso!')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao enviar e-mail')
            console.error('[EMAIL ERROR]', error)
        } finally {
            setIsSendingEmail(false)
        }
    }

    const handleSendWhatsApp = () => {
        if (!appointment.patient.phone) {
            toast.error('Paciente não possui telefone cadastrado')
            return
        }

        const phoneNumber = appointment.patient.phone.replace(/\D/g, '')
        const message = encodeURIComponent(
            `Olá ${appointment.patient.full_name}! 👋\n\n` +
            `Seu link de teleconsulta está pronto:\n\n` +
            `🔗 ${patientLink}\n\n` +
            `📅 Data: ${formattedDateTime}\n` +
            `👨‍⚕️ Médico(a): ${appointment.doctor.user.full_name}\n\n` +
            `Clique no link no horário da consulta para entrar na sala de vídeo.`
        )

        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
        toast.success('WhatsApp aberto! Envie a mensagem para o paciente.')
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    Link da Teleconsulta
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Link Display */}
                <div className="flex items-center gap-2">
                    <Input
                        value={patientLink}
                        readOnly
                        className="flex-1 font-mono text-sm"
                        onClick={(e) => e.currentTarget.select()}
                    />
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopyLink}
                        title="Copiar link"
                    >
                        {isCopied ? (
                            <Check className="w-4 h-4 text-green-600" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </Button>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        className="w-full"
                        disabled={isCopied}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        {isCopied ? 'Copiado!' : 'Copiar'}
                    </Button>

                    <Button
                        onClick={handleSendEmail}
                        variant="outline"
                        className="w-full"
                        disabled={isSendingEmail || !appointment.patient.email}
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        {isSendingEmail ? 'Enviando...' : 'E-mail'}
                    </Button>

                    <Button
                        onClick={handleSendWhatsApp}
                        variant="outline"
                        className="w-full"
                        disabled={!appointment.patient.phone}
                    >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                    </Button>
                </div>

                {/* Appointment Info */}
                <Alert>
                    <AlertDescription className="space-y-1 text-sm">
                        <div>
                            <strong>Paciente:</strong> {appointment.patient.full_name}
                        </div>
                        <div>
                            <strong>Médico(a):</strong> {appointment.doctor.user.full_name}
                        </div>
                        <div>
                            <strong>Data/Hora:</strong> {formattedDateTime}
                        </div>
                    </AlertDescription>
                </Alert>

                {/* Warning if no contact info */}
                {!appointment.patient.email && !appointment.patient.phone && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            ⚠️ Paciente sem e-mail ou telefone cadastrado. Copie o link e compartilhe manualmente.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    )
}
