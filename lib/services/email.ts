/**
 * Email Service — Clean Nodemailer / Multi-Tenant Delegation
 * Compatible with Next.js App Router & Turbopack without @react-email runtime overhead.
 */

import { sendEmailMultiTenant } from '@/lib/services/email-multi-tenant'

export function isEmailConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_PASSWORD)
}

export async function sendEmail(params: {
    to: string
    subject?: string
    template?: string
    data?: Record<string, any>
    html?: string
    clinicId?: string
}): Promise<boolean> {
    if (!params.to) return false
    const subject = params.subject || params.data?.subject || 'Notificação CliniGo'
    const html = params.html || `<p>${params.data?.message || 'Você possui uma nova atualização na plataforma CliniGo.'}</p>`
    const res = await sendEmailMultiTenant({
        clinicId: params.clinicId || 'system',
        to: params.to,
        subject,
        html,
    })
    return res.success
}

export async function sendConfirmationEmail(params: {
    patient_email: string
    patient_name: string
    doctor_name: string
    specialty: string
    clinic_name: string
    appointment_date: string
    appointment_time: string
    video_link: string
    appointment_id: string
    clinic_id?: string
}): Promise<void> {
    if (!params.patient_email) return
    await sendEmailMultiTenant({
        clinicId: params.clinic_id || 'system',
        to: params.patient_email,
        subject: `Consulta Confirmada - ${params.appointment_date} às ${params.appointment_time}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #047857;">Agendamento Confirmado</h2>
                <p>Olá <strong>${params.patient_name}</strong>,</p>
                <p>Sua consulta na clínica <strong>${params.clinic_name}</strong> foi confirmada:</p>
                <p><strong>Profissional:</strong> ${params.doctor_name} (${params.specialty || 'Clínico'})<br/>
                <strong>Data:</strong> ${params.appointment_date} às ${params.appointment_time}</p>
            </div>
        `,
    })
}

export async function sendCancellationEmail(appointment: any): Promise<void> {
    const email = appointment?.patient?.email || appointment?.patient_email
    if (!email) return
    await sendEmailMultiTenant({
        clinicId: appointment?.clinic_id || 'system',
        to: email,
        subject: 'Aviso de Cancelamento de Agendamento',
        html: `<p>Informamos que o seu agendamento foi cancelado. Entre em contato com a clínica caso deseje reagendar.</p>`,
    })
}

export async function sendReminderEmail(appointment: any, hoursBeforeAppt: number): Promise<void> {
    const email = appointment?.patient?.email || appointment?.patient_email
    if (!email) return
    await sendEmailMultiTenant({
        clinicId: appointment?.clinic_id || 'system',
        to: email,
        subject: `Lembrete de Consulta (${hoursBeforeAppt}h)`,
        html: `<p>Lembrete: você possui um atendimento agendado nas próximas ${hoursBeforeAppt} horas.</p>`,
    })
}

export async function sendCancellationNoticeEmail(params: {
    patient_email: string
    patient_name: string
    doctor_name: string
    clinic_name: string
    appointment_date: string
    appointment_time: string
    reason: string
    refund_status: string
    clinic_id?: string
}): Promise<void> {
    if (!params.patient_email) return
    await sendEmailMultiTenant({
        clinicId: params.clinic_id || 'system',
        to: params.patient_email,
        subject: `Cancelamento de Agendamento - ${params.clinic_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #be123c;">Agendamento Cancelado</h2>
                <p>Olá <strong>${params.patient_name}</strong>,</p>
                <p>Seu agendamento com <strong>${params.doctor_name}</strong> em <strong>${params.appointment_date}</strong> às <strong>${params.appointment_time}</strong> na clínica <strong>${params.clinic_name}</strong> foi cancelado.</p>
                ${params.reason ? `<p><strong>Motivo:</strong> ${params.reason}</p>` : ''}
            </div>
        `,
    })
}

export async function sendClinicWelcomeEmail(params: {
    email: string
    fullName: string
    clinicName: string
    loginUrl: string
}): Promise<void> {
    if (!params.email) return
    await sendEmailMultiTenant({
        clinicId: 'system',
        to: params.email,
        subject: `Bem-vindo ao CliniGo - ${params.clinicName}`,
        html: `<p>Olá <strong>${params.fullName}</strong>, o ambiente da clínica <strong>${params.clinicName}</strong> está pronto. Acesse: <a href="${params.loginUrl}">${params.loginUrl}</a></p>`,
    })
}

export async function sendWelcomeEmail(params: {
    email: string
    fullName: string
    role: string
    clinicName?: string
}): Promise<void> {
    if (!params.email) return
    await sendEmailMultiTenant({
        clinicId: 'system',
        to: params.email,
        subject: 'Bem-vindo ao CliniGo',
        html: `<p>Olá <strong>${params.fullName}</strong>, seu acesso ao CliniGo foi configurado.</p>`,
    })
}
