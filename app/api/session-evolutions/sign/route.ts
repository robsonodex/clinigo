/**
 * POST /api/session-evolutions/sign - Assinar evolução com certificado ICP-Brasil
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
    evolution_id: z.string().uuid('ID da evolução inválido'),
    document_type: z.string().default('evolucao'),
})

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
            return NextResponse.json({ error: 'Profissional não vinculado a uma clínica' }, { status: 400 })
        }

        const planCheck = await guardFeature(user.clinic_id, 'assinatura_digital')
        if (!planCheck.allowed) {
            return createPlanError(planCheck.planType, 'Assinatura Digital ICP-Brasil', 'AVANCADO')
        }

        const body = await request.json()
        const validation = signRequestSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: 'Dados inválidos', details: validation.error.format() }, { status: 400 })
        }

        const { evolution_id, document_type } = validation.data
        const supabase = await createClient()

        // 1. Check doctor certificate
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

        const validUntil = new Date(certificate.valid_until)
        if (validUntil <= new Date()) {
            return NextResponse.json({
                error: 'Certificado expirado',
                code: 'CERTIFICATE_EXPIRED',
                valid_until: certificate.valid_until
            }, { status: 400 })
        }

        // 2. Fetch evolution data
        const { data: record, error: recordError } = await supabase
            .from('session_evolutions')
            .select(`
                *,
                patients!patient_id(full_name, cpf),
                doctors!doctor_id(
                    crm, crm_state, specialty, profession_type,
                    users!user_id(full_name)
                ),
                clinics!clinic_id(name)
            `)
            .eq('id', evolution_id)
            .eq('clinic_id', user.clinic_id)
            .single()

        if (recordError || !record) {
            return NextResponse.json({ error: 'Evolução não encontrada' }, { status: 404 })
        }

        if (record && record.template_type === 'soap') {
            const isEspacoIncluir = record.clinic_id === '5163c916-8b82-4d80-8a71-01726836ee46'
            if (isEspacoIncluir || record.data_description || record.content) {
                record.template_type = 'multidisciplinar'
            }
        }

        if (record.signature_hash) {
            return NextResponse.json({
                error: 'Documento já assinado',
                code: 'ALREADY_SIGNED',
                signed_at: record.signed_at || record.finalized_at
            }, { status: 409 })
        }

        // 3. Decrypt PFX
        const CERTIFICATE_SECRET = process.env.CERTIFICATE_SECRET
        if (!CERTIFICATE_SECRET) {
            log.error('CERTIFICATE_SECRET not configured')
            return NextResponse.json({ error: 'Configuração de segurança ausente' }, { status: 500 })
        }

        const { data: encryptedPfxData, error: downloadError } = await supabase.storage
            .from('doctor-certificates')
            .download(certificate.pfx_encrypted_path)

        if (downloadError || !encryptedPfxData) {
            return NextResponse.json({ error: 'Erro ao acessar certificado' }, { status: 500 })
        }

        let decryptedPfx: Buffer | null = null
        try {
            const encryptedBuffer = Buffer.from(await encryptedPfxData.arrayBuffer())
            decryptedPfx = ICPBrasilSigner.decryptPFX(encryptedBuffer, user.id, CERTIFICATE_SECRET)

            const doctorData = Array.isArray(record.doctors) ? record.doctors[0] : record.doctors
            const patientData = Array.isArray(record.patients) ? record.patients[0] : record.patients
            const clinicData = Array.isArray(record.clinics) ? record.clinics[0] : record.clinics
            const userData = doctorData?.users

            // Map Evolution data to PDF Generator Data
            const pdfData: PEPDocumentData = {
                clinicName: clinicData?.name || 'CliniGo',
                doctorName: userData?.full_name || certificate.owner_name || 'Profissional',
                doctorSpecialty: doctorData?.specialty || 'Clínico',
                doctorCRM: certificate.crm || doctorData?.crm || '',
                doctorCRMState: certificate.crm_state || doctorData?.crm_state || '',
                patientName: patientData?.full_name || 'Paciente',
                patientCPF: patientData?.cpf || '',
                appointmentDate: new Date(record.evolution_date).toLocaleDateString('pt-BR'),
                professionType: doctorData?.profession_type === 'psicologo' ? 'PSICOLOGO' : doctorData?.profession_type === 'terapeuta' ? 'TERAPEUTA' : 'MEDICO',
                
                isMultidisciplinar: record.template_type === 'multidisciplinar',
                multidisciplinarData: record.template_type === 'multidisciplinar' ? {
                    dataDescription: record.data_description,
                    subjective: record.subjective,
                    objective: record.objective,
                    assessment: record.assessment,
                    planNotes: record.plan_notes,
                    content: record.content
                } : undefined,

                // Map based on template type
                chiefComplaint: record.template_type === 'soap' ? record.subjective : undefined,
                historyPresentIllness: record.template_type === 'soap' ? record.objective : undefined,
                diagnosisText: record.template_type === 'soap' ? record.assessment : undefined,
                treatmentPlan: record.template_type === 'soap' ? record.plan_notes : undefined,
                
                demanda: record.template_type === 'dap' ? record.data_description : undefined,
                focoTerapeutico: record.template_type === 'dap' ? record.analysis : undefined,
                evolucaoPsicologica: record.template_type === 'dap' ? record.plan_action : undefined,
                
                objetivosSessao: record.template_type === 'cif' ? record.body_functions : undefined,
                atividadesRealizadas: record.template_type === 'cif' ? record.activities_participation : undefined,
                evolucaoFuncional: record.template_type === 'cif' ? record.environmental_factors : undefined,
                
                // For Free template, put it in treatmentPlan or a general field that PDF generator accepts
                physicalExam: record.template_type === 'free' ? record.content : undefined,

                signatureInfo: {
                    signerName: userData?.full_name || certificate.owner_name || '',
                    crm: certificate.crm || '',
                    crmState: certificate.crm_state || '',
                    signedAt: new Date().toLocaleString('pt-BR'),
                    certificateSerial: certificate.certificate_serial,
                },
            }

            const pdfBuffer = generatePEPPdf(pdfData)
            const signatureHash = ICPBrasilSigner.calculateHash(pdfBuffer)

            const storagePath = `signed-evolutions/${user.clinic_id}/${user.id}/${evolution_id}.pdf`
            const { error: uploadError } = await supabase.storage
                .from('doctor-certificates')
                .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

            if (uploadError) {
                return NextResponse.json({ error: 'Erro ao salvar PDF assinado' }, { status: 500 })
            }

            const { data: urlData } = supabase.storage
                .from('doctor-certificates')
                .getPublicUrl(storagePath)

            const signedAt = new Date().toISOString()

            const { data: signatureRecord, error: sigError } = await supabase
                .from('digital_signatures')
                .insert({
                    record_id: evolution_id,
                    doctor_id: user.id,
                    clinic_id: user.clinic_id,
                    signed_pdf_path: storagePath,
                    signature_hash: signatureHash,
                    certificate_serial: certificate.certificate_serial,
                    certificate_valid_until: certificate.valid_until,
                    signing_method: 'icp_brasil_a1',
                    signed_at: signedAt,
                    signer_name: userData?.full_name || certificate.owner_name,
                    crm: certificate.crm,
                    crm_state: certificate.crm_state,
                    document_type: 'evolucao',
                    ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                    user_agent: request.headers.get('user-agent') || 'unknown',
                })
                .select('id')
                .single()

            if (sigError) {
                return NextResponse.json({ error: 'Erro ao registrar assinatura' }, { status: 500 })
            }

            // Update session_evolutions
            await supabase
                .from('session_evolutions')
                .update({
                    signed_at: signedAt,
                    finalized_at: signedAt,
                    finalized_by: user.id,
                    signature_hash: signatureHash,
                    signed_pdf_url: urlData.publicUrl
                })
                .eq('id', evolution_id)

            log.audit(user.id, 'digital_sign_evolution', { evolution_id, signature_hash: signatureHash })

            return NextResponse.json({
                success: true,
                signature_id: signatureRecord.id,
                signed_pdf_url: urlData.publicUrl,
                signature_hash: signatureHash,
                signed_at: signedAt,
            })

        } finally {
            if (decryptedPfx) {
                decryptedPfx.fill(0)
                decryptedPfx = null
            }
        }

    } catch (error) {
        log.error('Error in Evolution sign API', { error })
        return NextResponse.json({ error: 'Erro interno ao assinar evolução' }, { status: 500 })
    }
}
