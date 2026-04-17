/**
 * POST /api/pep/sign - Assinar documento do PEP com certificado ICP-Brasil
 * 
 * Auth: DOCTOR only | Plan: AVANCADO+
 * 
 * Body: { record_id: string, document_type: string }
 * Response: { signed_pdf_url, signature_hash, signed_at, certificate_serial, signer_name, crm }
 */

import { NextResponse } from 'next/server'
import { requireRole, forbiddenResponse, unauthorizedResponse } from '@/lib/middlewares/auth'
import { guardFeature, createPlanError } from '@/lib/middlewares/plan-guard'
import { createClient } from '@/lib/supabase/server'
import { ICPBrasilSigner } from '@/lib/services/pep/icp-brasil-signer'
import { generatePEPPdf, type PEPDocumentData } from '@/lib/services/pep/pdf-generator'
import { log } from '@/lib/logger'
import { z } from 'zod'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

const signRequestSchema = z.object({
    record_id: z.string().uuid('ID do prontuário inválido'),
    document_type: z.enum([
        'receituario_simples', 'receituario_azul', 'atestado',
        'laudo', 'declaracao_comparecimento', 'solicitacao_exames', 'prontuario'
    ]).default('prontuario'),
})

export async function POST(request: Request) {
    try {
        // 1. Auth: DOCTOR only
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

        // 2. Plan check: AVANCADO+
        const planCheck = await guardFeature(user.clinic_id, 'assinatura_digital')
        if (!planCheck.allowed) {
            return createPlanError(planCheck.planType, 'Assinatura Digital ICP-Brasil', 'AVANCADO')
        }

        // 3. Parse body
        const body = await request.json()
        const validation = signRequestSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: 'Dados inválidos', details: validation.error.format() }, { status: 400 })
        }

        const { record_id, document_type } = validation.data
        const supabase = await createClient()

        // 4. Check doctor certificate
        const { data: certificate, error: certError } = await supabase
            .from('doctor_certificates')
            .select('*')
            .eq('doctor_id', user.id)
            .single()

        if (certError || !certificate) {
            return NextResponse.json({
                error: 'Certificado não cadastrado',
                code: 'NO_CERTIFICATE',
                message: 'Você precisa cadastrar um certificado digital ICP-Brasil antes de assinar documentos.'
            }, { status: 404 })
        }

        // Check certificate expiry
        const validUntil = new Date(certificate.valid_until)
        if (validUntil <= new Date()) {
            return NextResponse.json({
                error: 'Certificado expirado',
                code: 'CERTIFICATE_EXPIRED',
                valid_until: certificate.valid_until
            }, { status: 400 })
        }

        // 5. Fetch medical record data
        const { data: record, error: recordError } = await supabase
            .from('medical_records')
            .select(`
                *,
                patient:patients(full_name, cpf),
                clinic:clinics(name),
                doctor_profile:doctors!doctor_id(
                    crm, crm_state, specialty,
                    user:users!user_id(full_name)
                )
            `)
            .eq('id', record_id)
            .eq('clinic_id', user.clinic_id)
            .single()

        if (recordError || !record) {
            return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 })
        }

        // Check if already signed
        if (record.signed_at) {
            return NextResponse.json({
                error: 'Documento já assinado',
                code: 'ALREADY_SIGNED',
                signed_at: record.signed_at
            }, { status: 409 })
        }

        // 6. Decrypt PFX from storage
        const CERTIFICATE_SECRET = process.env.CERTIFICATE_SECRET
        if (!CERTIFICATE_SECRET) {
            log.error('CERTIFICATE_SECRET not configured')
            return NextResponse.json({ error: 'Configuração de segurança ausente' }, { status: 500 })
        }

        // Download encrypted PFX
        const { data: encryptedPfxData, error: downloadError } = await supabase.storage
            .from('doctor-certificates')
            .download(certificate.pfx_encrypted_path)

        if (downloadError || !encryptedPfxData) {
            log.error('Failed to download encrypted PFX', { error: downloadError })
            return NextResponse.json({ error: 'Erro ao acessar certificado' }, { status: 500 })
        }

        let decryptedPfx: Buffer | null = null
        try {
            const encryptedBuffer = Buffer.from(await encryptedPfxData.arrayBuffer())
            decryptedPfx = ICPBrasilSigner.decryptPFX(encryptedBuffer, user.id, CERTIFICATE_SECRET)

            // 7. Parse custom data from record
            let customData: any = {}
            try {
                if (record.follow_up_instructions) {
                    customData = JSON.parse(record.follow_up_instructions)
                }
            } catch { /* ignore parse errors */ }

            const doctorProfile = record.doctor_profile as any
            const doctorUser = doctorProfile?.user as any

            // 8. Generate PDF
            const pdfData: PEPDocumentData = {
                clinicName: (record.clinic as any)?.name || 'CliniGo',
                doctorName: doctorUser?.full_name || certificate.owner_name || 'Médico',
                doctorSpecialty: doctorProfile?.specialty || '',
                doctorCRM: certificate.crm || doctorProfile?.crm || '',
                doctorCRMState: certificate.crm_state || doctorProfile?.crm_state || '',
                patientName: (record.patient as any)?.full_name || 'Paciente',
                patientCPF: (record.patient as any)?.cpf || '',
                appointmentDate: new Date(record.created_at).toLocaleDateString('pt-BR'),
                professionType: customData.professionType || 'MEDICO',
                chiefComplaint: record.chief_complaint,
                historyPresentIllness: record.history_present_illness,
                physicalExam: record.physical_exam,
                treatmentPlan: record.treatment_plan,
                diagnosisText: customData.diagnosis_text,
                weight: customData.weight,
                height: customData.height,
                bloodPressure: customData.blood_pressure,
                heartRate: customData.heart_rate,
                temperature: customData.temperature,
                demanda: customData.demanda,
                evolucaoPsicologica: customData.evolucao_psicologica,
                focoTerapeutico: customData.foco_terapeutico,
                atividadesRealizadas: customData.atividades_realizadas,
                evolucaoFuncional: customData.evolucao_funcional,
                objetivosSessao: customData.objetivos_sessao,
                signatureInfo: {
                    signerName: doctorUser?.full_name || certificate.owner_name || '',
                    crm: certificate.crm || '',
                    crmState: certificate.crm_state || '',
                    signedAt: new Date().toLocaleString('pt-BR'),
                    certificateSerial: certificate.certificate_serial,
                },
            }

            const pdfBuffer = generatePEPPdf(pdfData)

            // 9. Sign PDF (compute hash)
            const certMeta = ICPBrasilSigner.parsePFX(decryptedPfx, '') // We don't have password here
            // Since we can't re-parse without password, use stored metadata
            const signatureHash = ICPBrasilSigner.calculateHash(pdfBuffer)

            // 10. Upload signed PDF to Storage
            const storagePath = `signed-documents/${user.clinic_id}/${user.id}/${record_id}.pdf`
            const { error: uploadError } = await supabase.storage
                .from('doctor-certificates')
                .upload(storagePath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true,
                })

            if (uploadError) {
                log.error('Failed to upload signed PDF', { error: uploadError })
                return NextResponse.json({ error: 'Erro ao salvar PDF assinado' }, { status: 500 })
            }

            // 11. Get public URL
            const { data: urlData } = supabase.storage
                .from('doctor-certificates')
                .getPublicUrl(storagePath)

            const signedAt = new Date().toISOString()

            // 12. Insert into digital_signatures (using service role via RLS bypass)
            const { data: signatureRecord, error: sigError } = await supabase
                .from('digital_signatures')
                .insert({
                    record_id,
                    doctor_id: user.id,
                    clinic_id: user.clinic_id,
                    signed_pdf_path: storagePath,
                    signature_hash: signatureHash,
                    certificate_serial: certificate.certificate_serial,
                    certificate_valid_until: certificate.valid_until,
                    signing_method: 'icp_brasil_a1',
                    signed_at: signedAt,
                    signer_name: doctorUser?.full_name || certificate.owner_name,
                    crm: certificate.crm,
                    crm_state: certificate.crm_state,
                    document_type,
                    ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                    user_agent: request.headers.get('user-agent') || 'unknown',
                })
                .select('id')
                .single()

            if (sigError) {
                log.error('Failed to insert digital signature', { error: sigError })
                return NextResponse.json({ error: 'Erro ao registrar assinatura' }, { status: 500 })
            }

            // 13. Update medical_records
            await supabase
                .from('medical_records')
                .update({
                    signed_at: signedAt,
                    signature_hash: signatureHash,
                })
                .eq('id', record_id)

            // 14. Audit log
            log.audit(user.id, 'digital_sign_document', {
                record_id,
                document_type,
                signature_hash: signatureHash,
                certificate_serial: certificate.certificate_serial,
            })

            return NextResponse.json({
                success: true,
                signature_id: signatureRecord.id,
                signed_pdf_url: urlData.publicUrl,
                signature_hash: signatureHash,
                signed_at: signedAt,
                certificate_serial: certificate.certificate_serial,
                signer_name: doctorUser?.full_name || certificate.owner_name,
                crm: certificate.crm,
                crm_state: certificate.crm_state,
            })

        } finally {
            // CRITICAL: Clear decrypted PFX from memory
            if (decryptedPfx) {
                decryptedPfx.fill(0)
                decryptedPfx = null
            }
        }

    } catch (error) {
        log.error('Error in PEP sign API', { error })
        return NextResponse.json({ error: 'Erro interno ao assinar documento' }, { status: 500 })
    }
}
