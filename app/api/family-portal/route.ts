import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendWhatsAppMessage } from '@/lib/services/whatsapp-provider'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'])

async function resolveAuthContext(patientId?: string | null) {
    const supabase = await createClient()
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
    }

    const { data: dbUser } = (await supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', user.id)
        .maybeSingle()) as { data: { clinic_id: string | null; role: string | null } | null }

    const role = (dbUser?.role || '').toUpperCase()
    if (!ALLOWED_ROLES.has(role)) {
        return { error: NextResponse.json({ error: 'Sem permissão para CliniGo Família' }, { status: 403 }) }
    }

    const serviceClient = createServiceRoleClient() as any
    let clinicId = dbUser?.clinic_id || null

    if (!clinicId && role === 'SUPER_ADMIN') {
        const cookieStore = await cookies()
        clinicId = cookieStore.get('impersonation_clinic_id')?.value || null
        if (!clinicId && patientId) {
            const { data: p } = await serviceClient
                .from('patients')
                .select('clinic_id')
                .eq('id', patientId)
                .maybeSingle()
            clinicId = p?.clinic_id || null
        }
    }

    if (!clinicId) {
        return { error: NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 }) }
    }

    return { user, role, clinicId, serviceClient }
}

function getPublicBaseUrl(request: NextRequest): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (configured && /^https?:\/\//i.test(configured)) {
        return configured.replace(/\/$/, '')
    }
    const host = request.headers.get('host') || 'clinigo.app'
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const patientId = searchParams.get('patientId')
        if (!patientId) {
            return NextResponse.json({ error: 'patientId é obrigatório' }, { status: 400 })
        }

        const ctx = await resolveAuthContext(patientId)
        if ('error' in ctx) return ctx.error

        const { clinicId, serviceClient } = ctx

        const [{ data: patient }, { data: clinic }, { data: shares, error: sharesError }] =
            await Promise.all([
                serviceClient
                    .from('patients')
                    .select('id, full_name, phone')
                    .eq('id', patientId)
                    .eq('clinic_id', clinicId)
                    .maybeSingle(),
                serviceClient
                    .from('clinics')
                    .select('id, name, logo_url')
                    .eq('id', clinicId)
                    .maybeSingle(),
                serviceClient
                    .from('family_portal_shares')
                    .select('*')
                    .eq('clinic_id', clinicId)
                    .eq('patient_id', patientId)
                    .order('created_at', { ascending: false })
                    .limit(30),
            ])

        if (!patient) {
            return NextResponse.json({ error: 'Paciente não encontrado nesta clínica' }, { status: 404 })
        }

        if (sharesError) {
            console.error('[FAMILY-PORTAL-GET] Erro:', sharesError)
            return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            clinic: {
                id: clinic?.id || clinicId,
                name: clinic?.name || 'CliniGo',
                logo_url: clinic?.logo_url || null,
            },
            patient,
            shares: shares || [],
        })
    } catch (err) {
        console.error('[FAMILY-PORTAL-GET] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno ao consultar CliniGo Família' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const patientId = String(body.patientId || '').trim()
        if (!patientId) {
            return NextResponse.json({ error: 'patientId é obrigatório' }, { status: 400 })
        }

        const ctx = await resolveAuthContext(patientId)
        if ('error' in ctx) return ctx.error
        const { user, clinicId, serviceClient } = ctx

        const shareType: 'family' | 'school_doctor' =
            body.shareType === 'school_doctor' ? 'school_doctor' : 'family'

        const parentConsentConfirmed = Boolean(body.parentConsentConfirmed)
        if (shareType === 'school_doctor' && !parentConsentConfirmed) {
            return NextResponse.json(
                {
                    error: 'A confirmação da autorização dos responsáveis (LGPD) é obrigatória para gerar link temporário para Escola ou Neuropediatra.',
                },
                { status: 400 }
            )
        }

        const [{ data: patient }, { data: clinic }] = await Promise.all([
            serviceClient
                .from('patients')
                .select('id, full_name, phone')
                .eq('id', patientId)
                .eq('clinic_id', clinicId)
                .maybeSingle(),
            serviceClient
                .from('clinics')
                .select('id, name, logo_url')
                .eq('id', clinicId)
                .maybeSingle(),
        ])

        if (!patient) {
            return NextResponse.json({ error: 'Paciente não encontrado nesta clínica' }, { status: 404 })
        }

        const title = String(body.title || '').trim() || (
            shareType === 'school_doctor'
                ? 'Relatório de Progresso para Escola / Equipe Médica'
                : 'Boletim da Semana — Evolução Terapêutica'
        )

        const highlights: string[] = Array.isArray(body.summaryHighlights)
            ? body.summaryHighlights
                  .map((h: unknown) => String(h || '').trim())
                  .filter(Boolean)
                  .slice(0, 6)
            : []

        if (highlights.length === 0) {
            return NextResponse.json(
                { error: 'Informe pelo menos 1 conquista ou observação curada para compartilhar.' },
                { status: 400 }
            )
        }

        const progressSnapshot = Array.isArray(body.progressSnapshot)
            ? body.progressSnapshot.slice(0, 8).map((item: any) => ({
                  label: String(item?.label || '').slice(0, 120),
                  pct: Math.min(100, Math.max(0, Math.round(Number(item?.pct) || 0))),
                  status: String(item?.status || 'em_aquisicao'),
              }))
            : []

        const requestedDays = Number(body.expiresInDays)
        const expiresDays =
            shareType === 'school_doctor'
                ? 7
                : Number.isFinite(requestedDays)
                  ? Math.min(90, Math.max(7, Math.round(requestedDays)))
                  : 30

        const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()
        const token = crypto.randomBytes(32).toString('hex')
        const recipientPhone = String(body.recipientPhone || patient.phone || '').trim() || null
        const recipientName = String(body.recipientName || '').trim() || null

        const insertPayload = {
            clinic_id: clinicId,
            patient_id: patientId,
            created_by: user.id,
            especialidade: body.especialidade ? String(body.especialidade).trim() : null,
            token,
            share_type: shareType,
            recipient_name: recipientName,
            recipient_phone: recipientPhone,
            title: title.slice(0, 160),
            intro_message: body.introMessage ? String(body.introMessage).trim().slice(0, 600) : null,
            summary_highlights: highlights,
            progress_snapshot: progressSnapshot,
            home_activity_title:
                shareType === 'family' && body.homeActivityTitle
                    ? String(body.homeActivityTitle).trim().slice(0, 160)
                    : null,
            home_activity_instructions:
                shareType === 'family' && body.homeActivityInstructions
                    ? String(body.homeActivityInstructions).trim().slice(0, 1200)
                    : null,
            parent_consent_confirmed: parentConsentConfirmed,
            parent_consent_note: body.parentConsentNote
                ? String(body.parentConsentNote).trim().slice(0, 240)
                : null,
            expires_at: expiresAt,
        }

        const { data: created, error: insertError } = await serviceClient
            .from('family_portal_shares')
            .insert(insertPayload)
            .select()
            .single()

        if (insertError || !created) {
            console.error('[FAMILY-PORTAL-POST] Erro:', insertError)
            return NextResponse.json({ error: 'Erro ao gerar link seguro' }, { status: 500 })
        }

        const baseUrl = getPublicBaseUrl(request)
        const shareUrl = `${baseUrl}/familia/${token}`
        const clinicDisplayName = clinic?.name?.trim() || 'CliniGo'
        const firstName = String(patient.full_name || 'Paciente').trim().split(/\s+/)[0]

        const whatsappMessage =
            shareType === 'school_doctor'
                ? `Olá${recipientName ? `, ${recipientName}` : ''}! A clínica *${clinicDisplayName}* compartilhou um relatório temporário de evolução (válido por 7 dias, autorizado pelos responsáveis) de *${firstName}*.\n\nAcesse sem precisar de aplicativo:\n${shareUrl}`
                : `Olá${recipientName ? `, ${recipientName}` : ''}! *${clinicDisplayName}* preparou o *${title}* de *${firstName}* com as conquistas da semana e uma atividade rápida de 5 minutos para fazer em casa.\n\nAcesse direto pelo celular (sem baixar aplicativo e sem senha):\n${shareUrl}`

        let whatsappResult: { success: boolean; fallback_url?: string; error?: string } | null = null

        if (body.sendWhatsapp && recipientPhone) {
            const sendRes = await sendWhatsAppMessage(
                clinicId,
                recipientPhone,
                whatsappMessage,
                shareType === 'school_doctor' ? 'family_portal_school_doctor' : 'family_portal_weekly'
            )
            whatsappResult = {
                success: sendRes.success,
                fallback_url: sendRes.fallback_url,
                error: sendRes.error,
            }
            if (sendRes.success) {
                await serviceClient
                    .from('family_portal_shares')
                    .update({ whatsapp_sent_at: new Date().toISOString() })
                    .eq('id', created.id)
                    .eq('clinic_id', clinicId)
                created.whatsapp_sent_at = new Date().toISOString()
            }
        } else if (recipientPhone) {
            const cleanPhone = recipientPhone.replace(/\D/g, '')
            if (cleanPhone.length >= 10) {
                const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
                whatsappResult = {
                    success: false,
                    fallback_url: `https://wa.me/${fullPhone}?text=${encodeURIComponent(whatsappMessage)}`,
                }
            }
        }

        return NextResponse.json({
            success: true,
            share: created,
            shareUrl,
            whatsappMessage,
            whatsappResult,
        })
    } catch (err) {
        console.error('[FAMILY-PORTAL-POST] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno ao criar compartilhamento' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const id = String(body.id || '').trim()
        const action = String(body.action || '').trim()

        if (!id || !['revoke', 'restore'].includes(action)) {
            return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
        }

        const ctx = await resolveAuthContext(body.patientId)
        if ('error' in ctx) return ctx.error
        const { clinicId, serviceClient } = ctx

        const { data: updated, error } = await serviceClient
            .from('family_portal_shares')
            .update({
                revoked_at: action === 'revoke' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .select()
            .single()

        if (error || !updated) {
            return NextResponse.json({ error: 'Compartilhamento não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ success: true, share: updated })
    } catch (err) {
        console.error('[FAMILY-PORTAL-PATCH] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno ao atualizar link' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const patientId = searchParams.get('patientId')
        if (!id) {
            return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
        }

        const ctx = await resolveAuthContext(patientId)
        if ('error' in ctx) return ctx.error
        const { clinicId, serviceClient } = ctx

        const { error } = await serviceClient
            .from('family_portal_shares')
            .delete()
            .eq('id', id)
            .eq('clinic_id', clinicId)

        if (error) {
            return NextResponse.json({ error: 'Erro ao excluir registro' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[FAMILY-PORTAL-DELETE] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno ao excluir registro' }, { status: 500 })
    }
}
