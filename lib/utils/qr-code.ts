import { randomBytes } from 'crypto'

/**
 * Generate a unique QR code token for an appointment
 * Format: clinigo_[appointmentId_prefix]_[random]_[timestamp]
 */
export function generateQRToken(appointmentId: string): string {
    const prefix = appointmentId.slice(0, 8)
    const random = randomBytes(4).toString('hex')
    const timestamp = Date.now().toString(36)
    return `clinigo_${prefix}_${random}_${timestamp}`
}

/**
 * Generate QR code data payload (JSON that will be encoded in QR)
 */
export function generateQRData(params: {
    appointmentId: string
    token: string
    clinicSlug: string
    patientName: string
    appointmentDate: string
    appointmentTime: string
}): string {
    return JSON.stringify({
        type: 'clinigo_checkin',
        token: params.token,
        appointment_id: params.appointmentId,
        clinic: params.clinicSlug,
        patient: params.patientName,
        date: params.appointmentDate,
        time: params.appointmentTime,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })
}

/**
 * Generate WhatsApp share URL with QR code link
 */
export function generateWhatsAppShareUrl(params: {
    clinicName: string
    doctorName: string
    appointmentDate: string
    appointmentTime: string
    appointmentId: string
    baseUrl: string
}): string {
    const formattedDate = new Date(params.appointmentDate).toLocaleDateString('pt-BR')

    const message = `✅ *Consulta Agendada - ${params.clinicName}*

📅 Data: ${formattedDate}
⏰ Horário: ${params.appointmentTime}
👨‍⚕️ Médico: ${params.doctorName}

🔗 Acesse seu QR Code de check-in:
${params.baseUrl}/checkin/${params.appointmentId}

Apresente o QR Code na recepção no dia da consulta.`

    return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/**
 * Generate email-safe QR code URL for the appointment
 */
export function generateCheckinUrl(baseUrl: string, appointmentId: string): string {
    return `${baseUrl}/checkin/${appointmentId}`
}
