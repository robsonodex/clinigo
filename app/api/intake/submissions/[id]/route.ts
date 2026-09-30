/**
 * Internal Intake API — /api/intake/submissions/[id]
 * 
 * GET: Get submission details
 * PATCH: Edit submission data or change status (approve, correction, cancel, reopen, delete)
 * DELETE: Permanently delete submission
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
    getSubmissionById,
    editSubmission,
    approveSubmission,
    approveAndUpdateExisting,
    requestCorrection,
    cancelSubmission,
    reopenSubmission,
    deleteSubmission,
} from '@/lib/services/patient-intake'
import { sendWhatsAppMessage, checkInstanceStatus } from '@/lib/whatsapp/service'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

async function getAuthContext() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return null

    const { data: userData } = await supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single()

    if (!userData?.clinic_id) return null

    return { userId: user.id, clinicId: userData.clinic_id, role: userData.role }
}

/**
 * GET /api/intake/submissions/[id]
 */
export async function GET(request: NextRequest, { params }: Props) {
    try {
        const auth = await getAuthContext()
        if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { id } = await params
        const submission = await getSubmissionById(id, auth.clinicId)

        // Generate signed URLs for files
        if (submission.patient_intake_files?.length > 0) {
            const supabase = createServiceRoleClient()
            for (const file of submission.patient_intake_files) {
                const { data } = await supabase.storage
                    .from('intake-files')
                    .createSignedUrl(file.storage_path, 3600) // 1 hour

                file.signed_url = data?.signedUrl || null
            }
        }

        return NextResponse.json({ submission })
    } catch (error: any) {
        console.error('[Intake Submission GET]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * PATCH /api/intake/submissions/[id]
 * Body: { action: 'edit' | 'approve' | 'approve_update' | 'correction' | 'cancel' | 'reopen', ...data }
 */
export async function PATCH(request: NextRequest, { params }: Props) {
    try {
        const auth = await getAuthContext()
        if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { id } = await params
        const body = await request.json()
        const { action } = body

        switch (action) {
            case 'edit': {
                if (!body.edited_data) {
                    return NextResponse.json({ error: 'edited_data obrigatório' }, { status: 400 })
                }
                await editSubmission(id, auth.clinicId, body.edited_data, auth.userId)
                return NextResponse.json({ success: true })
            }

            case 'approve': {
                const result = await approveSubmission(id, auth.clinicId, auth.userId)

                if (!result.success && result.error === 'CPF_DUPLICADO') {
                    return NextResponse.json({
                        success: false,
                        error: 'CPF_DUPLICADO',
                        existing_patient: result.existing_patient,
                    }, { status: 409 })
                }

                if (!result.success) {
                    return NextResponse.json({ error: result.error }, { status: 400 })
                }

                return NextResponse.json({
                    success: true,
                    patient_id: result.patient_id,
                })
            }

            case 'approve_update': {
                if (!body.existing_patient_id) {
                    return NextResponse.json({ error: 'existing_patient_id obrigatório' }, { status: 400 })
                }
                const result = await approveAndUpdateExisting(
                    id, auth.clinicId, body.existing_patient_id, auth.userId
                )
                if (!result.success) {
                    return NextResponse.json({ error: result.error }, { status: 400 })
                }
                return NextResponse.json({
                    success: true,
                    patient_id: result.patient_id,
                })
            }

            case 'correction': {
                if (!body.correction_note) {
                    return NextResponse.json({ error: 'correction_note obrigatório' }, { status: 400 })
                }
                await requestCorrection(id, auth.clinicId, body.correction_note, auth.userId)

                // Try to send WhatsApp notification about correction
                if (body.send_whatsapp) {
                    try {
                        const submission = await getSubmissionById(id, auth.clinicId)
                        const leadPhone = submission.patient_intake_links?.lead_phone
                        const leadName = submission.patient_intake_links?.lead_name

                        if (leadPhone) {
                            const status = await checkInstanceStatus(auth.clinicId)
                            if (status.connected) {
                                const supabase = createServiceRoleClient()
                                const { data: clinic } = await supabase
                                    .from('clinics')
                                    .select('name')
                                    .eq('id', auth.clinicId)
                                    .single()

                                const message = `${leadName ? `Olá, ${leadName}!` : 'Olá!'} A ${clinic?.name || 'clínica'} precisa de uma correção na sua ficha de cadastro: "${body.correction_note}". Por favor, acesse o mesmo link que você recebeu para corrigir.`

                                await sendWhatsAppMessage(
                                    auth.clinicId,
                                    leadPhone,
                                    message,
                                    'pre-cadastro-correcao'
                                )
                            }
                        }
                    } catch (whatsappErr: any) {
                        console.warn('[Intake] Correction WhatsApp failed:', whatsappErr.message)
                    }
                }

                return NextResponse.json({ success: true })
            }

            case 'cancel': {
                if (!body.cancel_reason) {
                    return NextResponse.json({ error: 'cancel_reason obrigatório' }, { status: 400 })
                }
                await cancelSubmission(id, auth.clinicId, body.cancel_reason, auth.userId)
                return NextResponse.json({ success: true })
            }

            case 'reopen': {
                await reopenSubmission(id, auth.clinicId, auth.userId)
                return NextResponse.json({ success: true })
            }

            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }
    } catch (error: any) {
        console.error('[Intake Submission PATCH]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * DELETE /api/intake/submissions/[id]
 * Permanently delete submission and its files
 */
export async function DELETE(request: NextRequest, { params }: Props) {
    try {
        const auth = await getAuthContext()
        if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { id } = await params

        await deleteSubmission(id, auth.clinicId, auth.userId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[Intake Submission DELETE]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
