import { createClient } from '@/lib/supabase/server'

async function getClinicById(clinicId: string) {
    const supabase = await createClient()
    const { data } = await supabase.from('clinics').select('is_demo').eq('id', clinicId).single()
    return data
}

export async function sendEmail(to: string, subject: string, body: string, clinicId?: string) {
    if (clinicId) {
        const clinic = await getClinicById(clinicId)
        if (clinic?.is_demo) {
            console.log('[DEMO MODE] Email blocked:', { to, subject })
            return { success: true, message: 'Email simulado (demo)' }
        }
    }

    // In a real implementation, this would call the actual email provider (e.g. Resend/Nodemailer)
    console.log('Sending real email to:', to)
    return { success: true, message: 'Email sent' }
}

export async function sendWhatsApp(phone: string, message: string, clinicId?: string) {
    if (clinicId) {
        const clinic = await getClinicById(clinicId)
        if (clinic?.is_demo) {
            console.log('[DEMO MODE] WhatsApp blocked:', { phone, message })
            return { success: true, message: 'WhatsApp simulado (demo)' }
        }
    }

    // Call actual WhatsApp API
    console.log('Sending real WhatsApp to:', phone)
    return { success: true, message: 'WhatsApp sent' }
}

export async function createMercadoPagoPreference(clinicId: string) {
    const clinic = await getClinicById(clinicId)

    if (clinic?.is_demo) {
        throw new Error('Pagamentos não disponíveis em conta demo. Crie uma conta real.')
    }

    // Call actual Mercado Pago logic
    return { preferenceId: 'mock-pref-id' }
}
