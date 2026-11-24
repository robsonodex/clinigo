import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { decodeFamilyFeedback, encodeFamilyFeedbackV2 } from '@/lib/family-portal/feedback-codec'

export const dynamic = 'force-dynamic'

const TOKEN_REGEX = /^[a-f0-9]{32,128}$/i

interface RouteParams {
    params: Promise<{ token: string }>
}

function buildPublicDto(share: any, clinic: any, patient: any) {
    const rawName = String(patient?.full_name || 'Paciente').trim()
    const patientFirstName = rawName.split(/\s+/)[0] || 'Paciente'
    const decoded = decodeFamilyFeedback(share.home_activity_feedback)

    return {
        id: share.id,
        shareType: share.share_type as 'family' | 'school_doctor',
        title: share.title,
        introMessage: share.intro_message || null,
        patientFirstName,
        clinicName: clinic?.name || 'CliniGo',
        clinicLogoUrl: clinic?.logo_url || null,
        clinicPhone: clinic?.phone || null,
        especialidade: share.especialidade || null,
        recipientName: share.recipient_name || null,
        summaryHighlights: Array.isArray(share.summary_highlights) ? share.summary_highlights : [],
        progressSnapshot: Array.isArray(share.progress_snapshot) ? share.progress_snapshot : [],
        homeActivityTitle: share.home_activity_title || null,
        homeActivityInstructions: share.home_activity_instructions || null,
        homeActivityCompleted: Boolean(share.home_activity_completed),
        homeActivityCompletedAt: share.home_activity_completed_at || null,
        homeActivityFeedback: decoded.note || null,
        confidenceScore: decoded.confidenceScore,
        weeklyContextTags: decoded.weeklyContextTags,
        schoolReturn: decoded.schoolReturn,
        parentConsentConfirmed: Boolean(share.parent_consent_confirmed),
        expiresAt: share.expires_at,
        createdAt: share.created_at,
    }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { token } = await params
        if (!token || !TOKEN_REGEX.test(token)) {
            return NextResponse.json({ error: 'Link inválido ou não encontrado.' }, { status: 404 })
        }

        const serviceClient = createServiceRoleClient() as any
        const { data: share, error } = await serviceClient
            .from('family_portal_shares')
            .select('*')
            .eq('token', token)
            .maybeSingle()

        if (error || !share) {
            return NextResponse.json({ error: 'Link inválido ou não encontrado.' }, { status: 404 })
        }

        if (share.revoked_at) {
            return NextResponse.json(
                { error: 'Este link foi revogado pela clínica.', code: 'REVOKED' },
                { status: 410 }
            )
        }

        if (new Date(share.expires_at).getTime() < Date.now()) {
            return NextResponse.json(
                { error: 'Este link temporário expirou. Solicite um novo envio à clínica.', code: 'EXPIRED' },
                { status: 410 }
            )
        }

        const [{ data: clinic }, { data: patient }] = await Promise.all([
            serviceClient
                .from('clinics')
                .select('name, logo_url, phone')
                .eq('id', share.clinic_id)
                .maybeSingle(),
            serviceClient
                .from('patients')
                .select('full_name')
                .eq('id', share.patient_id)
                .eq('clinic_id', share.clinic_id)
                .maybeSingle(),
        ])

        // Incrementa contador de visualização sem bloquear a resposta
        await serviceClient
            .from('family_portal_shares')
            .update({
                view_count: (Number(share.view_count) || 0) + 1,
                last_viewed_at: new Date().toISOString(),
            })
            .eq('id', share.id)

        return NextResponse.json({
            success: true,
            data: buildPublicDto(share, clinic, patient),
        })
    } catch (err) {
        console.error('[PUBLIC-FAMILIA-GET] Erro:', err)
        return NextResponse.json({ error: 'Não foi possível carregar o boletim.' }, { status: 500 })
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { token } = await params
        if (!token || !TOKEN_REGEX.test(token)) {
            return NextResponse.json({ error: 'Link inválido ou não encontrado.' }, { status: 404 })
        }

        const body = await request.json()
        const serviceClient = createServiceRoleClient() as any

        const { data: share } = await serviceClient
            .from('family_portal_shares')
            .select('id, share_type, revoked_at, expires_at, home_activity_feedback')
            .eq('token', token)
            .maybeSingle()

        if (!share) {
            return NextResponse.json({ error: 'Link inválido ou não encontrado.' }, { status: 404 })
        }
        if (share.revoked_at || new Date(share.expires_at).getTime() < Date.now()) {
            return NextResponse.json({ error: 'Este link não está mais ativo.' }, { status: 410 })
        }

        const existingDecoded = decodeFamilyFeedback(share.home_activity_feedback)

        // Modo Escola / Neuropediatra: permite apenas o micro-retorno estruturado de 3 campos (sem chat aberto)
        if (share.share_type === 'school_doctor') {
            if (!body.schoolReturn || typeof body.schoolReturn !== 'object') {
                return NextResponse.json(
                    { error: 'Envie o formulário estruturado de observação da escola.' },
                    { status: 400 }
                )
            }

            const schoolReturnPayload = {
                participation: body.schoolReturn.participation || 'moderada',
                regulation: body.schoolReturn.regulation || 'regulado',
                observation: String(body.schoolReturn.observation || '').trim().slice(0, 500),
                respondentName: String(body.schoolReturn.respondentName || '').trim().slice(0, 100),
                submittedAt: new Date().toISOString(),
            }

            const encoded = encodeFamilyFeedbackV2({
                ...existingDecoded,
                schoolReturn: schoolReturnPayload,
            })

            const { error: updateError } = await serviceClient
                .from('family_portal_shares')
                .update({
                    home_activity_feedback: encoded,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', share.id)

            if (updateError) {
                return NextResponse.json({ error: 'Erro ao registrar retorno da escola.' }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                schoolReturn: schoolReturnPayload,
            })
        }

        const completed = body.completed !== false
        const feedback =
            typeof body.feedback === 'string' ? body.feedback.trim().slice(0, 600) : ''
        const confidenceScore =
            typeof body.confidenceScore === 'number' &&
            body.confidenceScore >= 1 &&
            body.confidenceScore <= 5
                ? Math.round(body.confidenceScore)
                : existingDecoded.confidenceScore
        const weeklyContextTags = Array.isArray(body.weeklyContextTags)
            ? body.weeklyContextTags.map(String).filter(Boolean).slice(0, 6)
            : existingDecoded.weeklyContextTags

        const encoded = encodeFamilyFeedbackV2({
            note: feedback,
            confidenceScore,
            weeklyContextTags,
            schoolReturn: existingDecoded.schoolReturn,
        })

        const completedAt = completed ? new Date().toISOString() : null

        const { error: updateError } = await serviceClient
            .from('family_portal_shares')
            .update({
                home_activity_completed: completed,
                home_activity_completed_at: completedAt,
                home_activity_feedback: encoded,
                updated_at: new Date().toISOString(),
            })
            .eq('id', share.id)

        if (updateError) {
            return NextResponse.json({ error: 'Erro ao registrar retorno.' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            homeActivityCompleted: completed,
            homeActivityCompletedAt: completedAt,
            homeActivityFeedback: feedback || null,
            confidenceScore,
            weeklyContextTags,
        })
    } catch (err) {
        console.error('[PUBLIC-FAMILIA-POST] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao registrar atividade.' }, { status: 500 })
    }
}

