/**
 * Satisfaction Survey API (Public)
 * GET /api/surveys?token=xxx - Load survey data (public)
 * POST /api/surveys - Save survey response (public via token)
 * POST /api/surveys/generate - Generate survey for an appointment (authenticated)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// GET: Load survey data by token (PUBLIC)
export async function GET(request: NextRequest) {
    try {
        const token = request.nextUrl.searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
        }

        const supabase = getServiceClient()

        const { data: survey, error } = await supabase
            .from('satisfaction_surveys')
            .select(`
                id,
                completed_at,
                survey_token_expires_at,
                patient:patients(full_name),
                doctor:doctors(specialty, user:users(full_name)),
                clinic:clinics(name),
                appointment:appointments(appointment_date, appointment_time)
            `)
            .eq('survey_token', token)
            .single()

        if (error || !survey) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
        }

        // Check expiration
        if (survey.survey_token_expires_at) {
            const expiresAt = new Date(survey.survey_token_expires_at)
            if (expiresAt < new Date()) {
                return NextResponse.json({ error: 'Token expirado' }, { status: 410 })
            }
        }

        // Already completed
        if (survey.completed_at) {
            return NextResponse.json({
                already_completed: true,
                clinic_name: (survey as any).clinic?.name,
            })
        }

        return NextResponse.json({
            survey_id: survey.id,
            patient_name: (survey as any).patient?.full_name,
            doctor_name: (survey as any).doctor?.user?.full_name,
            doctor_specialty: (survey as any).doctor?.specialty,
            clinic_name: (survey as any).clinic?.name,
            appointment_date: (survey as any).appointment?.appointment_date,
            already_completed: false,
        })

    } catch (error: any) {
        console.error('Survey GET error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Save survey response (PUBLIC via token) OR generate survey (authenticated)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Generate mode (authenticated)
        if (body.appointment_id && !body.token) {
            return handleGenerate(request, body)
        }

        // Submit mode (public via token)
        const { token, nps_score, professional_rating, comment } = body

        if (!token) {
            return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
        }

        if (nps_score === undefined || nps_score === null) {
            return NextResponse.json({ error: 'Nota NPS obrigatória' }, { status: 400 })
        }

        const supabase = getServiceClient()

        // Validate token
        const { data: survey, error: findError } = await supabase
            .from('satisfaction_surveys')
            .select('id, completed_at, survey_token_expires_at, clinic_id, patient_id, doctor_id')
            .eq('survey_token', token)
            .single()

        if (findError || !survey) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
        }

        if (survey.completed_at) {
            return NextResponse.json({ error: 'Pesquisa já respondida' }, { status: 409 })
        }

        if (survey.survey_token_expires_at) {
            const expiresAt = new Date(survey.survey_token_expires_at)
            if (expiresAt < new Date()) {
                return NextResponse.json({ error: 'Token expirado' }, { status: 410 })
            }
        }

        // Save response
        const { error: updateError } = await supabase
            .from('satisfaction_surveys')
            .update({
                nps_score: parseInt(nps_score),
                professional_rating: professional_rating ? parseInt(professional_rating) : null,
                comment: comment || null,
                completed_at: new Date().toISOString(),
                survey_token: null, // Invalidate token
                survey_token_expires_at: null,
            })
            .eq('id', survey.id)

        if (updateError) {
            return NextResponse.json({ error: 'Erro ao salvar resposta' }, { status: 500 })
        }

        // Also insert into nps_responses if table exists (for backwards compat with existing NPS page)
        try {
            await supabase.from('nps_responses').insert({
                clinic_id: survey.clinic_id,
                patient_id: survey.patient_id,
                doctor_id: survey.doctor_id,
                score: parseInt(nps_score),
                comment: comment || null,
                source: 'survey_link',
            })
        } catch (npsError) {
            // Non-critical - nps_responses may not exist
            console.log('NPS insert skipped:', npsError)
        }

        return NextResponse.json({
            success: true,
            message: 'Obrigado pelo seu feedback!',
        })

    } catch (error: any) {
        console.error('Survey POST error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// Generate a survey for an appointment (authenticated)
async function handleGenerate(request: NextRequest, body: any) {
    const supabase = await createClient()

    const userId = request.headers.get('x-user-id')
    const clinicId = request.headers.get('x-clinic-id')

    if (!userId || !clinicId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { appointment_id, send_whatsapp, patient_phone } = body

    // Get appointment data
    const { data: appointment, error: apptError } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, clinic_id, patients(full_name, phone)')
        .eq('id', appointment_id)
        .eq('clinic_id', clinicId)
        .single()

    if (apptError || !appointment) {
        return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }

    // Check if survey already exists
    const serviceClient = getServiceClient()
    const { data: existing } = await serviceClient
        .from('satisfaction_surveys')
        .select('id, survey_token')
        .eq('appointment_id', appointment_id)
        .single()

    if (existing) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
        return NextResponse.json({
            success: true,
            survey_url: existing.survey_token ? `${baseUrl}/survey/${existing.survey_token}` : null,
            message: 'Pesquisa já existe para esta consulta',
        })
    }

    // Generate token
    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const { error: insertError } = await serviceClient
        .from('satisfaction_surveys')
        .insert({
            clinic_id: clinicId,
            appointment_id: appointment_id,
            patient_id: appointment.patient_id,
            doctor_id: appointment.doctor_id,
            survey_token: token,
            survey_token_expires_at: expiresAt.toISOString(),
            sent_via: send_whatsapp ? 'whatsapp' : 'manual',
        })

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const surveyUrl = `${baseUrl}/survey/${token}`

    // Send WhatsApp
    if (send_whatsapp) {
        const phone = patient_phone || (appointment as any).patients?.phone
        if (phone) {
            const patientName = (appointment as any).patients?.full_name || 'Paciente'
            const message = `Olá ${patientName}! 😊\n\nComo foi sua experiência na consulta? Adoraríamos ouvir sua opinião!\n\nLeva menos de 1 minuto:\n${surveyUrl}\n\n_Enviado via CliniGo_`

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
            } catch (e) {
                console.error('WhatsApp survey send failed:', e)
            }
        }
    }

    return NextResponse.json({
        success: true,
        survey_url: surveyUrl,
        token,
        expires_at: expiresAt.toISOString(),
    })
}
