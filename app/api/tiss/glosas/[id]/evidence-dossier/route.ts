import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTissAction } from '@/lib/auth/tiss-role-guard'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request as any, 'glosa.revisar')
    if (!guard.authorized) {
        return 'response' in guard
            ? guard.response
            : NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }

    try {
        const { id: guideId } = await params
        if (!guideId || !UUID_REGEX.test(guideId)) {
            return NextResponse.json({ success: false, error: 'Guia inválida' }, { status: 404 })
        }

        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = (await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .maybeSingle()) as { data: { clinic_id: string | null } | null }

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 })
        }

        const clinicId = profile.clinic_id
        const db = supabase as any

        // 1. Guia TISS (multi-tenant)
        const { data: guide } = await db
            .from('tiss_guides')
            .select(
                'id, batch_id, appointment_id, patient_id, doctor_id, guide_number, patient_name, patient_card_number, procedure_code, procedure_name, total_value, approved_value:paid_value, glosa_value, glosa_code, glosa_description, authorization_code, execution_date, cid10_code, biometric_proof_id, status'
            )
            .eq('id', guideId)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (!guide) {
            return NextResponse.json({ success: false, error: 'Guia não encontrada' }, { status: 404 })
        }

        // 2. Buscar em paralelo: Clínica, Lote, Glosas, Agendamento, Evolução Assinada e Biometria Facial
        const [
            { data: clinic },
            { data: batch },
            { data: glosas },
            { data: appointment },
            { data: medicalRecords },
            { data: biometrics },
        ] = await Promise.all([
            db.from('clinics').select('name, cnpj, phone, address').eq('id', clinicId).maybeSingle(),
            guide.batch_id
                ? db
                      .from('tiss_batches')
                      .select('batch_number, insurance_company_name, protocol_number, submission_date')
                      .eq('id', guide.batch_id)
                      .eq('clinic_id', clinicId)
                      .maybeSingle()
                : Promise.resolve({ data: null }),
            db
                .from('tiss_glosas')
                .select(
                    'id, glosa_code, glosa_description, glosa_value, operator_note, is_irrecoverable, item_code, item_description'
                )
                .eq('guide_id', guideId)
                .eq('clinic_id', clinicId)
                .is('deleted_at', null),
            guide.appointment_id
                ? db
                      .from('appointments')
                      .select('id, appointment_date, appointment_time, status, checked_in_at, completed_at')
                      .eq('id', guide.appointment_id)
                      .eq('clinic_id', clinicId)
                      .maybeSingle()
                : Promise.resolve({ data: null }),
            guide.appointment_id
                ? db
                      .from('medical_records')
                      .select(
                          'id, chief_complaint, signed_at, digital_signature_signer, digital_signature_hash, digital_signature_at, status, created_at'
                      )
                      .eq('appointment_id', guide.appointment_id)
                      .eq('clinic_id', clinicId)
                      .order('created_at', { ascending: false })
                      .limit(1)
                : guide.patient_id && guide.execution_date
                ? db
                      .from('medical_records')
                      .select(
                          'id, chief_complaint, signed_at, digital_signature_signer, digital_signature_hash, digital_signature_at, status, created_at'
                      )
                      .eq('patient_id', guide.patient_id)
                      .eq('clinic_id', clinicId)
                      .order('created_at', { ascending: false })
                      .limit(1)
                : Promise.resolve({ data: [] }),
            guide.patient_id
                ? db
                      .from('patient_face_biometrics')
                      .select('id, detection_score, consent_given, consent_date, created_at')
                      .eq('patient_id', guide.patient_id)
                      .eq('clinic_id', clinicId)
                      .order('created_at', { ascending: false })
                      .limit(1)
                : Promise.resolve({ data: [] }),
        ])

        const evolution = Array.isArray(medicalRecords) ? medicalRecords[0] || null : null
        const biometric = Array.isArray(biometrics) ? biometrics[0] || null : null
        const glosaList = Array.isArray(glosas) ? glosas : []

        const proofScore =
            (evolution?.signed_at ? 45 : evolution ? 20 : 0) +
            (biometric || guide.biometric_proof_id ? 35 : 0) +
            (appointment?.checked_in_at || appointment?.status === 'COMPLETED' ? 20 : 0)

        return NextResponse.json({
            success: true,
            data: {
                generatedAt: new Date().toISOString(),
                clinic: {
                    name: clinic?.name || 'Clínica',
                    cnpj: clinic?.cnpj || null,
                    phone: clinic?.phone || null,
                },
                batch: batch || null,
                guide: {
                    id: guide.id,
                    guideNumber: guide.guide_number,
                    patientName: guide.patient_name,
                    cardNumberMasked: guide.patient_card_number
                        ? `****${String(guide.patient_card_number).slice(-4)}`
                        : 'Não informado',
                    procedureCode: guide.procedure_code,
                    procedureName: guide.procedure_name,
                    authorizationCode: guide.authorization_code || null,
                    cid10Code: guide.cid10_code || null,
                    executionDate: guide.execution_date,
                    totalValue: Number(guide.total_value || 0),
                    glosaValue: Number(guide.glosa_value || 0),
                },
                glosas: glosaList,
                proofs: {
                    strengthScore: Math.min(100, proofScore),
                    attendance: appointment
                        ? {
                              status: appointment.status,
                              date: appointment.appointment_date,
                              time: appointment.appointment_time,
                              checkedInAt: appointment.checked_in_at || null,
                              completedAt: appointment.completed_at || null,
                          }
                        : null,
                    evolution: evolution
                        ? {
                              signed: Boolean(evolution.signed_at),
                              signedAt: evolution.signed_at || evolution.digital_signature_at || null,
                              signerName: evolution.digital_signature_signer || null,
                              signatureHash: evolution.digital_signature_hash || null,
                              summary: evolution.chief_complaint
                                  ? String(evolution.chief_complaint).slice(0, 240)
                                  : 'Atendimento registrado em prontuário eletrônico.',
                          }
                        : null,
                    biometrics: biometric
                        ? {
                              active: true,
                              consentGiven: Boolean(biometric.consent_given),
                              consentDate: biometric.consent_date || biometric.created_at,
                              detectionScore: biometric.detection_score || null,
                              proofId: guide.biometric_proof_id || biometric.id,
                          }
                        : guide.biometric_proof_id
                        ? {
                              active: true,
                              consentGiven: true,
                              consentDate: null,
                              detectionScore: null,
                              proofId: guide.biometric_proof_id,
                          }
                        : null,
                },
            },
        })
    } catch (error) {
        console.error('[TISS-GLOSA-EVIDENCE-DOSSIER] Erro:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao compilar dossiê probatório' },
            { status: 500 }
        )
    }
}

