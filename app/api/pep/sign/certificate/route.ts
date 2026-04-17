/**
 * GET/POST /api/pep/sign/certificate - Gerenciar certificado digital ICP-Brasil
 * 
 * GET: Verifica se médico tem certificado cadastrado
 * POST: Upload e validação de certificado PFX
 * 
 * Auth: DOCTOR only
 */

import { NextResponse } from 'next/server'
import { requireRole, forbiddenResponse, unauthorizedResponse } from '@/lib/middlewares/auth'
import { createClient } from '@/lib/supabase/server'
import { ICPBrasilSigner } from '@/lib/services/pep/icp-brasil-signer'
import { log } from '@/lib/logger'

export const maxDuration = 15
export const dynamic = 'force-dynamic'

// ============================================================================
// GET - Check if doctor has a valid certificate
// ============================================================================

export async function GET() {
    try {
        const authResult = await requireRole(['DOCTOR'])
        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult
        const supabase = await createClient()

        const { data: certificate, error } = await supabase
            .from('doctor_certificates')
            .select('id, certificate_serial, valid_until, crm, crm_state, owner_name, uploaded_at')
            .eq('doctor_id', user.id)
            .single()

        if (error || !certificate) {
            return NextResponse.json({
                has_certificate: false,
                message: 'Nenhum certificado digital cadastrado'
            })
        }

        const validUntil = new Date(certificate.valid_until)
        const now = new Date()
        const daysUntilExpiry = Math.floor(
            (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        return NextResponse.json({
            has_certificate: true,
            certificate: {
                id: certificate.id,
                certificate_serial: certificate.certificate_serial,
                valid_until: certificate.valid_until,
                crm: certificate.crm,
                crm_state: certificate.crm_state,
                owner_name: certificate.owner_name,
                uploaded_at: certificate.uploaded_at,
                is_expired: validUntil <= now,
                days_until_expiry: daysUntilExpiry,
            }
        })

    } catch (error) {
        log.error('Error checking certificate', { error })
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// ============================================================================
// POST - Upload and validate PFX certificate
// ============================================================================

export async function POST(request: Request) {
    try {
        const authResult = await requireRole(['DOCTOR'])
        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult
        if (!user.clinic_id) {
            return NextResponse.json({ error: 'Médico não vinculado a uma clínica' }, { status: 400 })
        }

        // Parse multipart form data
        const formData = await request.formData()
        const pfxFile = formData.get('pfx_file') as File | null
        const pfxPassword = formData.get('pfx_password') as string | null

        if (!pfxFile) {
            return NextResponse.json({ error: 'Arquivo .pfx é obrigatório' }, { status: 400 })
        }

        if (!pfxPassword) {
            return NextResponse.json({ error: 'Senha do certificado é obrigatória' }, { status: 400 })
        }

        // Validate file extension
        const fileName = pfxFile.name.toLowerCase()
        if (!fileName.endsWith('.pfx') && !fileName.endsWith('.p12')) {
            return NextResponse.json({
                error: 'Formato inválido. Envie um arquivo .pfx ou .p12'
            }, { status: 400 })
        }

        // Read file buffer
        let pfxBuffer: Buffer | null = null

        try {
            const arrayBuffer = await pfxFile.arrayBuffer()
            pfxBuffer = Buffer.from(arrayBuffer)

            // 1. Parse and validate PFX
            const metadata = ICPBrasilSigner.parsePFX(pfxBuffer, pfxPassword)

            // 2. Check if certificate is expired
            if (metadata.isExpired) {
                return NextResponse.json({
                    error: 'Certificado expirado',
                    valid_until: metadata.validUntil.toLocaleDateString('pt-BR'),
                }, { status: 400 })
            }

            // 3. Get CRM from certificate or from doctors table
            let crm = metadata.crm
            let crmState = metadata.crmState

            if (!crm || !crmState) {
                const supabase = await createClient()
                const { data: doctorData } = await supabase
                    .from('doctors')
                    .select('crm, crm_state')
                    .eq('user_id', user.id)
                    .single()

                if (doctorData) {
                    crm = crm || doctorData.crm
                    crmState = crmState || doctorData.crm_state
                }
            }

            // 4. Encrypt PFX for storage
            const CERTIFICATE_SECRET = process.env.CERTIFICATE_SECRET
            if (!CERTIFICATE_SECRET) {
                log.error('CERTIFICATE_SECRET not configured')
                return NextResponse.json({ error: 'Configuração de segurança ausente no servidor' }, { status: 500 })
            }

            const encryptedPfx = ICPBrasilSigner.encryptPFX(pfxBuffer, user.id, CERTIFICATE_SECRET)

            // 5. Upload encrypted PFX to Supabase Storage
            const supabase = await createClient()
            const storagePath = `${user.id}.pfx.enc`

            const { error: uploadError } = await supabase.storage
                .from('doctor-certificates')
                .upload(storagePath, encryptedPfx, {
                    contentType: 'application/octet-stream',
                    upsert: true,
                })

            if (uploadError) {
                log.error('Failed to upload encrypted PFX', { error: uploadError })
                return NextResponse.json({ error: 'Erro ao salvar certificado' }, { status: 500 })
            }

            // 6. Upsert doctor_certificates record
            const { error: upsertError } = await supabase
                .from('doctor_certificates')
                .upsert({
                    doctor_id: user.id,
                    clinic_id: user.clinic_id,
                    pfx_encrypted_path: storagePath,
                    certificate_serial: metadata.serialNumber,
                    valid_until: metadata.validUntil.toISOString().split('T')[0],
                    crm,
                    crm_state: crmState,
                    owner_name: metadata.ownerName,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'doctor_id',
                })

            if (upsertError) {
                log.error('Failed to upsert doctor certificate', { error: upsertError })
                return NextResponse.json({ error: 'Erro ao registrar certificado' }, { status: 500 })
            }

            // 7. Audit log
            log.audit(user.id, 'upload_icp_certificate', {
                certificate_serial: metadata.serialNumber,
                valid_until: metadata.validUntil.toISOString(),
                owner_name: metadata.ownerName,
            })

            return NextResponse.json({
                success: true,
                certificate_serial: metadata.serialNumber,
                valid_until: metadata.validUntil.toLocaleDateString('pt-BR'),
                crm,
                crm_state: crmState,
                owner_name: metadata.ownerName,
                issuer: metadata.issuer,
                days_until_expiry: metadata.daysUntilExpiry,
            })

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido'

            if (message.includes('Senha do certificado incorreta') || message.includes('Invalid password')) {
                return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 400 })
            }

            log.error('Error processing PFX certificate', { error: message })
            return NextResponse.json({ error: message }, { status: 400 })

        } finally {
            // CRITICAL: Clear PFX buffer and password from memory
            if (pfxBuffer) {
                pfxBuffer.fill(0)
                pfxBuffer = null
            }
            // pfxPassword is a string - JS will GC it, but we can't zero it
        }

    } catch (error) {
        log.error('Error in certificate API', { error })
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
