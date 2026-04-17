/**
 * GET /api/pep/sign/verify?record_id=UUID - Verificar autenticidade de um documento assinado
 * 
 * Auth: Qualquer role autenticado da mesma clínica
 */

import { NextResponse } from 'next/server'
import { requireRole, forbiddenResponse, unauthorizedResponse } from '@/lib/middlewares/auth'
import { createClient } from '@/lib/supabase/server'
import { ICPBrasilSigner } from '@/lib/services/pep/icp-brasil-signer'
import { log } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const authResult = await requireRole(['DOCTOR', 'RECEPTIONIST', 'CLINIC_ADMIN', 'SUPER_ADMIN'])
        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult
        const { searchParams } = new URL(request.url)
        const recordId = searchParams.get('record_id')

        if (!recordId) {
            return NextResponse.json({ error: 'record_id é obrigatório' }, { status: 400 })
        }

        const supabase = await createClient()

        // Fetch signature record
        const { data: signature, error: sigError } = await supabase
            .from('digital_signatures')
            .select('*')
            .eq('record_id', recordId)
            .single()

        if (sigError || !signature) {
            return NextResponse.json({
                is_valid: false,
                error: 'Nenhuma assinatura digital encontrada para este documento'
            })
        }

        // Verify clinic access
        if (signature.clinic_id !== user.clinic_id && user.role !== 'SUPER_ADMIN') {
            return forbiddenResponse('Sem acesso a esta assinatura')
        }

        // Download signed PDF and verify hash
        let hashVerified = false
        try {
            const { data: pdfData, error: downloadError } = await supabase.storage
                .from('doctor-certificates')
                .download(signature.signed_pdf_path)

            if (!downloadError && pdfData) {
                const pdfBuffer = Buffer.from(await pdfData.arrayBuffer())
                const currentHash = ICPBrasilSigner.calculateHash(pdfBuffer)
                hashVerified = currentHash === signature.signature_hash
            }
        } catch {
            // If we can't verify hash, report it
            hashVerified = false
        }

        return NextResponse.json({
            is_valid: hashVerified,
            signer_name: signature.signer_name,
            crm: signature.crm,
            crm_state: signature.crm_state,
            signed_at: signature.signed_at,
            signing_method: signature.signing_method,
            certificate_serial: signature.certificate_serial,
            certificate_valid_until: signature.certificate_valid_until,
            signature_hash: signature.signature_hash,
            document_type: signature.document_type,
            hash_verified: hashVerified,
        })

    } catch (error) {
        log.error('Error verifying signature', { error })
        return NextResponse.json({ error: 'Erro ao verificar assinatura' }, { status: 500 })
    }
}
