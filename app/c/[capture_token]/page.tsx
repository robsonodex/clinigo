// app/c/[capture_token]/page.tsx
// Página pública mobile para check-in biométrico do paciente
// Sem login, sem QR Code, sem dependência de autenticação de usuário

import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PatientMobileCaptureClient } from './PatientMobileCaptureClient'

export const dynamic = 'force-dynamic'

interface PatientCheckinPageProps {
    params: Promise<{ capture_token: string }>
}

export default async function PatientMobileCheckinPage({ params }: PatientCheckinPageProps) {
    const { capture_token: captureToken } = await params

    if (!captureToken || typeof captureToken !== 'string') {
        notFound()
    }

    const adminDb = createServiceRoleClient()

    // 1. Consultar token de captura
    const { data: tokenRecord, error } = await (adminDb as any)
        .from('checkin_capture_tokens')
        .select(`
            id,
            token,
            clinic_id,
            status,
            expires_at,
            patient:patients(id, full_name)
        `)
        .eq('token', captureToken)
        .maybeSingle()

    // Se o token não existir, não estiver pendente ou estiver expirado: 404 genérico imediato
    if (error || !tokenRecord) {
        notFound()
    }

    if (tokenRecord.status !== 'pending') {
        notFound()
    }

    const now = new Date()
    const expiresAt = new Date(tokenRecord.expires_at)
    if (now > expiresAt) {
        // Marca token como expirado no banco
        await (adminDb as any)
            .from('checkin_capture_tokens')
            .update({ status: 'expired' })
            .eq('id', tokenRecord.id)

        notFound()
    }

    const rawFullName = (tokenRecord.patient?.full_name || 'Paciente').trim()
    const firstName = rawFullName.split(/\s+/)[0] || 'Paciente'

    return (
        <PatientMobileCaptureClient
            captureToken={tokenRecord.token}
            patientFirstName={firstName}
            expiresAt={tokenRecord.expires_at}
        />
    )
}
