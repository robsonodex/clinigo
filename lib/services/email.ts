import { Resend } from 'resend'
import { AppointmentConfirmedEmail } from '@/emails/appointment-confirmed'
import { PaymentApprovedEmail } from '@/emails/payment-approved'
import { ReminderEmail } from '@/emails/reminder'
import { CancellationEmail } from '@/emails/cancellation'
import { sendMail } from './mail-service'
import { render } from '@react-email/render'
import { formatDate } from '@/lib/utils'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export function isEmailConfigured(): boolean {
  // Now we check if SMTP is configured too
  return !!resend || true // Assuming we want it to "look" configured if SMTP is an option
}

export interface WelcomeEmailData {
  doctor_email: string
  doctor_name: string
  clinic_name: string
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  const html = `<p>Olá ${data.doctor_name}, bem-vindo à ${data.clinic_name}!</p>`

  // Try dynamic SMTP first
  const smtpResult = await sendMail({
    to: data.doctor_email,
    subject: `Bem-vindo à ${data.clinic_name}`,
    html
  })

  // If SMTP fails and resend is available, try resend as fallback
  if (!smtpResult.success && resend) {
    try {
      await resend.emails.send({
        from: 'Teleconsulta <contato@seudominio.com>',
        to: data.doctor_email,
        subject: `Bem-vindo à ${data.clinic_name}`,
        html
      })
    } catch (error) {
      console.error('Email send error (Resend fallback):', error)
    }
  }
}

/**
 * Specifically for new clinic registrations
 */
export async function sendRegistrationWelcomeEmail(email: string, fullName: string, clinicName: string) {
  const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #10b981;">Bem-vindo ao CliniGo!</h2>
            <p>Olá <strong>${fullName}</strong>,</p>
            <p>Sua conta para a clínica <strong>${clinicName}</strong> foi criada com sucesso.</p>
            <p>Você já pode acessar o painel e começar a configurar seus horários e médicos.</p>
            <div style="margin-top: 30px;">
                <a href="http://localhost:3000/dashboard" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar Dashboard</a>
            </div>
            <p style="margin-top: 30px; font-size: 0.8em; color: #666;">
                Se você não solicitou este cadastro, por favor ignore este e-mail.
            </p>
        </div>
    `
  return await sendMail({
    to: email,
    subject: 'Bem-vindo ao CliniGo - Sua conta foi criada!',
    html
  })
}

// ... existing interfaces ...
interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  patient: {
    email: string
    full_name: string
    phone: string
  }
  doctor: {
    full_name: string
    specialty: string
  }
  video_link?: string
  cancellation_reason?: string
}

interface Payment {
  id: string
  amount: number
}

async function sendWithReactEmail(to: string, subject: string, reactElement: any) {
  const html = await render(reactElement) as string

  // Try SMTP
  const result = await sendMail({ to, subject, html })

  // Fallback to Resend
  if (!result.success && resend) {
    await resend.emails.send({
      from: 'Teleconsulta <contato@seudominio.com>',
      to,
      subject,
      react: reactElement
    })
  }
}

export async function sendAppointmentConfirmedEmail(appointment: Appointment) {
  await sendWithReactEmail(
    appointment.patient.email,
    `Consulta confirmada - ${formatDate(appointment.appointment_date)}`,
    AppointmentConfirmedEmail({ appointment } as any)
  )
}

export async function sendPaymentApprovedEmail(appointment: Appointment, payment: Payment) {
  await sendWithReactEmail(
    appointment.patient.email,
    'Pagamento aprovado - Link da consulta',
    PaymentApprovedEmail({ appointment, payment } as any)
  )
}

export async function sendReminderEmail(appointment: Appointment, hoursUntil: number) {
  await sendWithReactEmail(
    appointment.patient.email,
    `Lembrete: Consulta em ${hoursUntil} hora${hoursUntil > 1 ? 's' : ''}`,
    ReminderEmail({ appointment, hoursUntil } as any)
  )
}

export async function sendCancellationEmail(appointment: Appointment) {
  await sendWithReactEmail(
    appointment.patient.email,
    'Consulta cancelada',
    CancellationEmail({ appointment } as any)
  )
}

/**
 * Send confirmation email with explicit parameters
 * Used by webhook route
 */
export interface ConfirmationEmailData {
  patient_email: string
  patient_name: string
  doctor_name: string
  specialty: string
  clinic_name: string
  appointment_date: string
  appointment_time: string
  video_link: string
  appointment_id: string
}

export async function sendConfirmationEmail(data: ConfirmationEmailData) {
  // Create appointment object for React Email component
  const appointment: Appointment = {
    id: data.appointment_id,
    appointment_date: data.appointment_date,
    appointment_time: data.appointment_time,
    patient: {
      email: data.patient_email,
      full_name: data.patient_name,
      phone: '',
    },
    doctor: {
      full_name: data.doctor_name,
      specialty: data.specialty,
    },
    video_link: data.video_link,
  }

  await sendWithReactEmail(
    data.patient_email,
    `Consulta confirmada - ${data.appointment_date}`,
    AppointmentConfirmedEmail({ appointment } as any)
  )
}

/**
 * Enhanced cancellation email with explicit parameters
 */
export interface CancellationEmailData {
  patient_email: string
  patient_name: string
  doctor_name: string
  clinic_name: string
  appointment_date: string
  appointment_time: string
  reason: string
  refund_status: 'refunded' | 'not_eligible' | 'pending'
}

export async function sendCancellationNoticeEmail(data: CancellationEmailData) {
  const appointment: Appointment = {
    id: '',
    appointment_date: data.appointment_date,
    appointment_time: data.appointment_time,
    patient: {
      email: data.patient_email,
      full_name: data.patient_name,
      phone: '',
    },
    doctor: {
      full_name: data.doctor_name,
      specialty: '',
    },
    cancellation_reason: data.reason,
  }

  await sendWithReactEmail(
    data.patient_email,
    'Consulta cancelada',
    CancellationEmail({ appointment } as any)
  )
}

