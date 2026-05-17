/**
 * Digital Signature API for Medical Records
 * POST /api/records/signature - Generate signature token and send WhatsApp
 * GET /api/records/signature?token=xxx - Validate token (public)
 * PATCH /api/records/signature - Save signature (public, via token)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// POST: Generate signature token and (optionally) send WhatsApp link
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const userId = request.headers.get('x-user-id')
        const clinicId = request.headers.get('x-clinic-id')

        if (!userId || !clinicId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { record_id, send_whatsapp, patient_phone } = await request.json()

        if (!record_id) {
            return NextResponse.json({ error: 'record_id é obrigatório' }, { status: 400 })
        }

        // Verify record belongs to this clinic
        const { data: record, error: recError } = await supabase
            .from('medical_records')
            .select('id, patient_id, clinic_id, patients(full_name, phone)')
            .eq('id', record_id)
            .eq('clinic_id', clinicId)
            .single()

        if (recError || !record) {
            return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 })
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72h

        // Update record with token
        const { error: updateError } = await supabase
            .from('medical_records')
            .update({
                signature_token: token,
                signature_token_expires_at: expiresAt.toISOString(),
            })
            .eq('id', record_id)

        if (updateError) {
            return NextResponse.json({ error: 'Erro ao gerar token' }, { status: 500 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
        const signUrl = `${baseUrl}/sign/${token}`

        // Optionally send WhatsApp
        if (send_whatsapp) {
            const phone = patient_phone || (record as any).patients?.phone
            if (phone) {
                const patientName = (record as any).patients?.full_name || 'Paciente'
                const message = `Olá ${patientName}! 📋\n\nSeu prontuário está disponível para assinatura digital. Acesse o link abaixo para revisar e assinar:\n\n${signUrl}\n\nEste link é válido por 72 horas.\n\n_Enviado via CliniGo_`

                // Try internal WhatsApp API
                try {
                    await fetch(`${baseUrl}/api/whatsapp/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            clinic_id: clinicId,
                            phone: phone.replace(/\D/g, ''),
                            message,
                        }),
                    })
                } catch (whatsappError) {
                    console.error('WhatsApp send failed:', whatsappError)
                    // Don't fail the request if WhatsApp fails
                }
            }
        }

        return NextResponse.json({
            success: true,
            sign_url: signUrl,
            token,
            expires_at: expiresAt.toISOString(),
        })

    } catch (error: any) {
        console.error('Signature POST error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}

// GET: Validate token and return record data (PUBLIC - no auth needed)
export async function GET(request: NextRequest) {
    try {
        const token = request.nextUrl.searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
        }

        const supabase = getServiceClient()

        const { data: record, error } = await supabase
            .from('medical_records')
            .select(`
                id,
                chief_complaint,
                diagnosis,
                treatment_plan,
                created_at,
                signed_at,
                signed_by_patient,
                signature_token_expires_at,
                patient:patients(full_name),
                doctor:doctors(specialty, user:users(full_name)),
                clinic:clinics(name)
            `)
            .eq('signature_token', token)
            .single()

        if (error || !record) {
            return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 404 })
        }

        // Check expiration
        if (record.signature_token_expires_at) {
            const expiresAt = new Date(record.signature_token_expires_at)
            if (expiresAt < new Date()) {
                return NextResponse.json({ error: 'Token expirado' }, { status: 410 })
            }
        }

        // Check if already signed
        if (record.signed_by_patient) {
            return NextResponse.json({
                already_signed: true,
                signed_at: record.signed_at,
                clinic_name: (record as any).clinic?.name,
            })
        }

        return NextResponse.json({
            record_id: record.id,
            patient_name: (record as any).patient?.full_name,
            doctor_name: (record as any).doctor?.user?.full_name,
            doctor_specialty: (record as any).doctor?.specialty,
            clinic_name: (record as any).clinic?.name,
            chief_complaint: record.chief_complaint,
            diagnosis: record.diagnosis,
            treatment_plan: record.treatment_plan,
            date: record.created_at,
            already_signed: false,
        })

    } catch (error: any) {
        console.error('Signature GET error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Save signature (PUBLIC - via token auth)
export async function PATCH(request: NextRequest) {
    try {
        const { token, signature_data_url } = await request.json()

        if (!token || !signature_data_url) {
            return NextResponse.json({ error: 'Token e assinatura são obrigatórios' }, { status: 400 })
        }

        const supabase = getServiceClient()

        // Validate token
        const { data: record, error: findError } = await supabase
            .from('medical_records')
            .select('id, signature_token_expires_at, signed_by_patient')
            .eq('signature_token', token)
            .single()

        if (findError || !record) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
        }

        if (record.signed_by_patient) {
            return NextResponse.json({ error: 'Prontuário já assinado' }, { status: 409 })
        }

        if (record.signature_token_expires_at) {
            const expiresAt = new Date(record.signature_token_expires_at)
            if (expiresAt < new Date()) {
                return NextResponse.json({ error: 'Token expirado' }, { status: 410 })
            }
        }

        // Convert data URL to buffer and upload to storage
        let signatureUrl = signature_data_url

        try {
            const base64Data = signature_data_url.replace(/^data:image\/\w+;base64,/, '')
            const buffer = Buffer.from(base64Data, 'base64')
            const fileName = `signatures/${record.id}_${Date.now()}.png`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('medical-files')
                .upload(fileName, buffer, {
                    contentType: 'image/png',
                    upsert: true,
                })

            if (!uploadError && uploadData) {
                const { data: urlData } = supabase.storage
                    .from('medical-files')
                    .getPublicUrl(fileName)
                signatureUrl = urlData.publicUrl
            }
        } catch (storageError) {
            console.error('Storage upload failed, using data URL:', storageError)
            // Fallback: store the data URL directly (truncated if too long)
            signatureUrl = signature_data_url.length > 500000 
                ? signature_data_url.substring(0, 500000) 
                : signature_data_url
        }

        // Update record
        const { error: updateError } = await supabase
            .from('medical_records')
            .update({
                signed_at: new Date().toISOString(),
                signed_by_patient: true,
                signature_url: signatureUrl,
                signature_token: null, // Invalidate token
                signature_token_expires_at: null,
            })
            .eq('id', record.id)

        if (updateError) {
            return NextResponse.json({ error: 'Erro ao salvar assinatura' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Prontuário assinado digitalmente com sucesso',
        })

    } catch (error: any) {
        console.error('Signature PATCH error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
