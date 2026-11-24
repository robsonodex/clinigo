import React from 'react'
import type { Metadata } from 'next'
import { ShieldAlert, Clock } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
    FamilyPortalPublicView,
    type PublicFamilyPortalData,
} from '@/components/family-portal/FamilyPortalPublicView'
import { decodeFamilyFeedback } from '@/lib/family-portal/feedback-codec'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Boletim da Família | CliniGo',
    description: 'Acompanhamento seguro de evolução terapêutica sem necessidade de aplicativo.',
    robots: {
        index: false,
        follow: false,
    },
}

const TOKEN_REGEX = /^[a-f0-9]{32,128}$/i

interface PageProps {
    params: Promise<{ token: string }>
}

function UnavailableState({ title, description, expired }: { title: string; description: string; expired?: boolean }) {
    return (
        <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full rounded-xl border border-[#E6E8E5] bg-white p-7 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#F2F5F3] text-[#155E4B] mx-auto flex items-center justify-center">
                    {expired ? <Clock className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                </div>
                <h1 className="text-lg font-semibold text-[#0F1F1B]">{title}</h1>
                <p className="text-sm text-[#4B5B56] leading-relaxed">{description}</p>
            </div>
        </div>
    )
}

export default async function FamilyPortalPublicPage({ params }: PageProps) {
    const { token } = await params

    if (!token || !TOKEN_REGEX.test(token)) {
        return (
            <UnavailableState
                title="Link não encontrado"
                description="Este endereço não é válido. Peça à clínica o link atualizado pelo WhatsApp."
            />
        )
    }

    const serviceClient = createServiceRoleClient() as any
    const { data: share } = await serviceClient
        .from('family_portal_shares')
        .select('*')
        .eq('token', token)
        .maybeSingle()

    if (!share) {
        return (
            <UnavailableState
                title="Link não encontrado"
                description="Este boletim não existe ou já foi removido pela clínica."
            />
        )
    }

    if (share.revoked_at) {
        return (
            <UnavailableState
                title="Link revogado pela clínica"
                description="Por segurança e privacidade (LGPD), o acesso a este link foi encerrado pela equipe da clínica."
            />
        )
    }

    if (new Date(share.expires_at).getTime() < Date.now()) {
        return (
            <UnavailableState
                expired
                title="Link temporário expirado"
                description="O prazo de acesso deste link terminou. Solicite um novo link atualizado à clínica."
            />
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

    await serviceClient
        .from('family_portal_shares')
        .update({
            view_count: (Number(share.view_count) || 0) + 1,
            last_viewed_at: new Date().toISOString(),
        })
        .eq('id', share.id)

    const rawName = String(patient?.full_name || 'Paciente').trim()
    const patientFirstName = rawName.split(/\s+/)[0] || 'Paciente'
    const decodedFeedback = decodeFamilyFeedback(share.home_activity_feedback)

    const initialData: PublicFamilyPortalData = {
        id: share.id,
        shareType: share.share_type === 'school_doctor' ? 'school_doctor' : 'family',
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
        homeActivityFeedback: decodedFeedback.note || null,
        confidenceScore: decodedFeedback.confidenceScore,
        weeklyContextTags: decodedFeedback.weeklyContextTags,
        schoolReturn: decodedFeedback.schoolReturn,
        parentConsentConfirmed: Boolean(share.parent_consent_confirmed),
        expiresAt: share.expires_at,
        createdAt: share.created_at,
    }

    return <FamilyPortalPublicView token={token} initialData={initialData} />
}

