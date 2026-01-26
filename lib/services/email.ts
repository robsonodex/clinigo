/**
 * Email Service - STUB VERSION
 * 
 * ⚠️ TEMPORARY: This is a minimal stub because @react-email causes Turbopack errors.
 * All email functions are no-ops that log warnings.
 * 
 * To restore full functionality:
 * 1. Install: npm install @react-email/components react-email nodemailer
 * 2. Rename email.ts.disabled back to email.ts
 * 3. Delete this file
 */

// Stub functions that do nothing but don't break the build

export function isEmailConfigured(): boolean {
    console.warn('[EMAIL] Email service is disabled - @react-email not installed')
    return false
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
}): Promise<void> {
    console.warn('[EMAIL STUB] sendConfirmationEmail called but email service is disabled')
    console.warn('[EMAIL STUB] Would send to:', params.patient_email)
}

export async function sendCancellationEmail(appointment: any): Promise<void> {
    console.warn('[EMAIL STUB] sendCancellationEmail called but email service is disabled')
}

export async function sendReminderEmail(appointment: any, hoursBeforeAppt: number): Promise<void> {
    console.warn('[EMAIL STUB] sendReminderEmail called but email service is disabled')
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
}): Promise<void> {
    console.warn('[EMAIL STUB] sendCancellationNoticeEmail called but email service is disabled')
    console.warn('[EMAIL STUB] Would send to:', params.patient_email)
}

export async function sendClinicWelcomeEmail(params: {
    email: string
    fullName: string
    clinicName: string
    loginUrl: string
}): Promise<void> {
    console.warn('[EMAIL STUB] sendClinicWelcomeEmail called but email service is disabled')
    console.warn('[EMAIL STUB] Would send to:', params.email)
}

export async function sendWelcomeEmail(params: {
    email: string
    fullName: string
    role: string
    clinicName?: string
}): Promise<void> {
    console.warn('[EMAIL STUB] sendWelcomeEmail called but email service is disabled')
    console.warn('[EMAIL STUB] Would send to:', params.email)
}
