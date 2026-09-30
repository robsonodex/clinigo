/**
 * Patient Intake Service — Core Business Logic
 * Gerencia links de pré-cadastro, submissões, aprovação e auditoria
 */

import * as crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { INTAKE_CONSENT_TEXT, INTAKE_CONSENT_VERSION, type IntakeFormData } from '@/lib/validations/patient-intake'
import { PLANS, type PlanType } from '@/lib/constants/plans'

// ============================================
// Token Management
// ============================================

/** Generate a cryptographically secure random token (32 bytes = 64 hex chars) */
export function generateIntakeToken(): string {
    return crypto.randomBytes(32).toString('hex')
}

/** Hash a token with SHA-256 for storage */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}

/** Generate consent hash */
export function generateConsentHash(
    consentText: string,
    timestamp: string,
    ip: string,
    userAgent: string
): string {
    const data = `${consentText}|${INTAKE_CONSENT_VERSION}|${timestamp}|${ip}|${userAgent}`
    return crypto.createHash('sha256').update(data).digest('hex')
}

// ============================================
// Link Operations
// ============================================

export interface CreateLinkOptions {
    clinicId: string
    leadName?: string
    leadPhone?: string
    createdBy: string
    isStatic?: boolean
    baseUrl?: string
}

export interface IntakeLink {
    id: string
    token: string // Only returned at creation time, never stored
    url: string
    clinic_id: string
    lead_name: string | null
    lead_phone: string | null
    status: string
    is_static: boolean
    expires_at: string | null
    created_at: string
}

export async function createIntakeLink(opts: CreateLinkOptions): Promise<IntakeLink> {
    const supabase = createServiceRoleClient()
    const token = generateIntakeToken()
    const tokenHash = hashToken(token)

    const expiresAt = opts.isStatic
        ? null
        : new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72h

    const { data, error } = await supabase
        .from('patient_intake_links')
        .insert({
            clinic_id: opts.clinicId,
            token_hash: tokenHash,
            lead_name: opts.leadName || null,
            lead_phone: opts.leadPhone || null,
            is_static: opts.isStatic || false,
            expires_at: expiresAt,
            created_by: opts.createdBy,
            status: 'created',
        })
        .select()
        .single()

    if (error) throw new Error(`Erro ao criar link: ${error.message}`)

    // Audit log
    await logIntakeEvent({
        clinicId: opts.clinicId,
        linkId: data.id,
        event: 'link_criado',
        actorId: opts.createdBy,
    })

    const baseUrl = opts.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'

    return {
        ...data,
        token,
        url: `${baseUrl}/pre-cadastro/${token}`,
    }
}

export async function getClinicStaticLink(clinicId: string, createdBy: string, customBaseUrl?: string): Promise<IntakeLink> {
    const supabase = createServiceRoleClient()

    // Check if static link already exists
    const { data: existing } = await supabase
        .from('patient_intake_links')
        .select()
        .eq('clinic_id', clinicId)
        .eq('is_static', true)
        .maybeSingle()

    if (existing) {
        // We can't recover the original token from hash, so generate a new one
        // and update the hash. This is intentional for static links.
        const token = generateIntakeToken()
        const tokenHash = hashToken(token)

        await supabase
            .from('patient_intake_links')
            .update({ token_hash: tokenHash })
            .eq('id', existing.id)

        const baseUrl = customBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'
        return {
            ...existing,
            token,
            url: `${baseUrl}/pre-cadastro/${token}`,
        }
    }

    // Create new static link
    return createIntakeLink({
        clinicId,
        createdBy,
        isStatic: true,
        baseUrl: customBaseUrl,
    })
}


export async function getClinicLinks(clinicId: string) {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
        .from('patient_intake_links')
        .select('*, patient_intake_submissions(id, status)')
        .eq('clinic_id', clinicId)
        .eq('is_static', false)
        .order('created_at', { ascending: false })
        .limit(100)

    if (error) throw new Error(`Erro ao listar links: ${error.message}`)
    return data || []
}

export async function markLinkAsSent(linkId: string, clinicId: string, actorId: string) {
    const supabase = createServiceRoleClient()

    await supabase
        .from('patient_intake_links')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', linkId)
        .eq('clinic_id', clinicId)

    await logIntakeEvent({ clinicId, linkId, event: 'link_enviado', actorId })
}

// ============================================
// Public Token Validation
// ============================================

export interface TokenValidation {
    valid: boolean
    link?: any
    clinic?: { id: string; name: string; logo_url: string | null }
    error?: string
}

export async function validateIntakeToken(token: string): Promise<TokenValidation> {
    const supabase = createServiceRoleClient()
    const tokenHash = hashToken(token)

    const { data: link, error } = await supabase
        .from('patient_intake_links')
        .select('*, clinics(id, name, logo_url)')
        .eq('token_hash', tokenHash)
        .maybeSingle()

    if (error || !link) {
        return { valid: false, error: 'Link inválido ou não encontrado' }
    }

    // Check expiration (non-static links)
    if (!link.is_static && link.expires_at) {
        if (new Date(link.expires_at) < new Date()) {
            // Update status to expired
            await supabase
                .from('patient_intake_links')
                .update({ status: 'expired' })
                .eq('id', link.id)
            return { valid: false, error: 'Este link expirou. Solicite um novo link à clínica.' }
        }
    }

    // Non-static: check if already submitted
    if (!link.is_static && link.status === 'submitted') {
        return { valid: false, error: 'Esta ficha já foi preenchida.' }
    }

    // Cancelled
    if (link.status === 'cancelled') {
        return { valid: false, error: 'Este link foi cancelado.' }
    }

    // Check if needs_correction (allow re-submission)
    const { data: pendingSubmission } = await supabase
        .from('patient_intake_submissions')
        .select('id, status, correction_note, original_data')
        .eq('link_id', link.id)
        .eq('status', 'needs_correction')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    const clinic = Array.isArray(link.clinics) ? link.clinics[0] : link.clinics

    // Mark as opened
    if (link.status !== 'opened' && link.status !== 'submitted') {
        await supabase
            .from('patient_intake_links')
            .update({ status: 'opened', opened_at: new Date().toISOString() })
            .eq('id', link.id)

        await logIntakeEvent({
            clinicId: link.clinic_id,
            linkId: link.id,
            event: 'link_aberto',
        })
    }

    return {
        valid: true,
        link: {
            id: link.id,
            clinic_id: link.clinic_id,
            lead_phone: link.lead_phone,
            is_static: link.is_static,
            correction: pendingSubmission ? {
                note: pendingSubmission.correction_note,
                previous_data: pendingSubmission.original_data,
                submission_id: pendingSubmission.id,
            } : null,
        },
        clinic: clinic ? {
            id: clinic.id,
            name: clinic.name,
            logo_url: clinic.logo_url || null,
        } : undefined,
    }
}

// ============================================
// Submission Operations
// ============================================

export async function submitIntakeForm(
    token: string,
    formData: IntakeFormData,
    ip: string,
    userAgent: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient()
    const tokenHash = hashToken(token)

    // Re-validate token
    const { data: link } = await supabase
        .from('patient_intake_links')
        .select('id, clinic_id, is_static, status, expires_at')
        .eq('token_hash', tokenHash)
        .maybeSingle()

    if (!link) return { success: false, error: 'Link inválido' }

    // Check expiration
    if (!link.is_static && link.expires_at && new Date(link.expires_at) < new Date()) {
        return { success: false, error: 'Link expirado' }
    }

    // Non-static: check if already submitted (unless needs_correction)
    if (!link.is_static && link.status === 'submitted') {
        return { success: false, error: 'Esta ficha já foi preenchida' }
    }

    // Build consent data with hash
    const consentTimestamp = new Date().toISOString()
    const consentHash = generateConsentHash(
        INTAKE_CONSENT_TEXT,
        consentTimestamp,
        ip,
        userAgent
    )

    const consentRecord = {
        accepted: true,
        consent_text: INTAKE_CONSENT_TEXT,
        consent_version: INTAKE_CONSENT_VERSION,
        accepted_at: consentTimestamp,
        ip,
        user_agent: userAgent,
        consent_hash: consentHash,
    }

    // If correcting, update existing submission
    const { data: existingCorrection } = await supabase
        .from('patient_intake_submissions')
        .select('id')
        .eq('link_id', link.id)
        .eq('status', 'needs_correction')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    // Strip honeypot field before storing
    const { _hp_field, consent, ...cleanData } = formData as any

    if (existingCorrection) {
        // Update the existing submission
        await supabase
            .from('patient_intake_submissions')
            .update({
                original_data: cleanData,
                edited_data: null,
                status: 'pending',
                correction_note: null,
                consent: consentRecord,
            })
            .eq('id', existingCorrection.id)

        await logIntakeEvent({
            clinicId: link.clinic_id,
            linkId: link.id,
            submissionId: existingCorrection.id,
            event: 'correcao_reenviada',
        })
    } else {
        // Create new submission
        const { data: submission, error } = await supabase
            .from('patient_intake_submissions')
            .insert({
                clinic_id: link.clinic_id,
                link_id: link.id,
                status: 'pending',
                original_data: cleanData,
                consent: consentRecord,
            })
            .select('id')
            .single()

        if (error) return { success: false, error: `Erro ao salvar ficha: ${error.message}` }

        await logIntakeEvent({
            clinicId: link.clinic_id,
            linkId: link.id,
            submissionId: submission.id,
            event: 'ficha_enviada',
        })
    }

    // Mark link as submitted (non-static only)
    if (!link.is_static) {
        await supabase
            .from('patient_intake_links')
            .update({ status: 'submitted', submitted_at: new Date().toISOString() })
            .eq('id', link.id)
    }

    return { success: true }
}

// ============================================
// Dashboard: Submissions Management
// ============================================

export async function getClinicSubmissions(clinicId: string, status?: string) {
    const supabase = createServiceRoleClient()

    let query = supabase
        .from('patient_intake_submissions')
        .select(`
            *,
            patient_intake_links(lead_name, lead_phone, is_static),
            patient_intake_files(id, storage_path, mime, kind)
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })

    if (status) {
        query = query.eq('status', status)
    }

    const { data, error } = await query.limit(200)
    if (error) throw new Error(`Erro ao listar submissões: ${error.message}`)
    return data || []
}

export async function getSubmissionById(submissionId: string, clinicId: string) {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
        .from('patient_intake_submissions')
        .select(`
            *,
            patient_intake_links(id, lead_name, lead_phone, is_static, token_hash),
            patient_intake_files(id, storage_path, mime, size, kind)
        `)
        .eq('id', submissionId)
        .eq('clinic_id', clinicId)
        .single()

    if (error) throw new Error(`Submissão não encontrada: ${error.message}`)
    return data
}

export async function editSubmission(
    submissionId: string,
    clinicId: string,
    editedData: Record<string, any>,
    reviewerId: string
) {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
        .from('patient_intake_submissions')
        .update({ edited_data: editedData })
        .eq('id', submissionId)
        .eq('clinic_id', clinicId)

    if (error) throw new Error(`Erro ao editar: ${error.message}`)

    await logIntakeEvent({
        clinicId,
        submissionId,
        event: 'ficha_editada',
        actorId: reviewerId,
    })
}

export async function requestCorrection(
    submissionId: string,
    clinicId: string,
    correctionNote: string,
    reviewerId: string
) {
    const supabase = createServiceRoleClient()

    // Update submission
    const { error } = await supabase
        .from('patient_intake_submissions')
        .update({
            status: 'needs_correction',
            correction_note: correctionNote,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .eq('clinic_id', clinicId)

    if (error) throw new Error(`Erro ao pedir correção: ${error.message}`)

    // Reopen the link so patient can resubmit
    const { data: submission } = await supabase
        .from('patient_intake_submissions')
        .select('link_id')
        .eq('id', submissionId)
        .single()

    if (submission?.link_id) {
        await supabase
            .from('patient_intake_links')
            .update({ status: 'sent' })
            .eq('id', submission.link_id)
    }

    await logIntakeEvent({
        clinicId,
        submissionId,
        event: 'correcao_solicitada',
        actorId: reviewerId,
    })
}

export async function cancelSubmission(
    submissionId: string,
    clinicId: string,
    cancelReason: string,
    reviewerId: string
) {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
        .from('patient_intake_submissions')
        .update({
            status: 'cancelled',
            cancel_reason: cancelReason,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .eq('clinic_id', clinicId)

    if (error) throw new Error(`Erro ao cancelar: ${error.message}`)

    await logIntakeEvent({
        clinicId,
        submissionId,
        event: 'ficha_cancelada',
        actorId: reviewerId,
        metadata: { motivo: cancelReason },
    })
}

export async function reopenSubmission(
    submissionId: string,
    clinicId: string,
    reviewerId: string
) {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
        .from('patient_intake_submissions')
        .update({
            status: 'pending',
            cancel_reason: null,
            reviewed_by: null,
            reviewed_at: null,
        })
        .eq('id', submissionId)
        .eq('clinic_id', clinicId)
        .eq('status', 'cancelled')

    if (error) throw new Error(`Erro ao reabrir: ${error.message}`)

    await logIntakeEvent({
        clinicId,
        submissionId,
        event: 'ficha_reaberta',
        actorId: reviewerId,
    })
}

export async function deleteSubmission(
    submissionId: string,
    clinicId: string,
    actorId: string
) {
    const supabase = createServiceRoleClient()

    // 1. Get files to delete from storage
    const { data: files } = await supabase
        .from('patient_intake_files')
        .select('storage_path')
        .eq('submission_id', submissionId)
        .eq('clinic_id', clinicId)

    // 2. Delete files from storage
    if (files && files.length > 0) {
        const paths = files.map(f => f.storage_path)
        await supabase.storage.from('intake-files').remove(paths)
    }

    // 3. Delete submission (cascades to files via FK)
    const { error } = await supabase
        .from('patient_intake_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('clinic_id', clinicId)

    if (error) throw new Error(`Erro ao excluir: ${error.message}`)

    // 4. Audit log (only IDs, no PII)
    await logIntakeEvent({
        clinicId,
        submissionId,
        event: 'ficha_excluida',
        actorId,
    })
}

// ============================================
// Approval — Atomic Patient Creation
// ============================================

export interface ApprovalResult {
    success: boolean
    patient_id?: string
    existing_patient?: any
    error?: string
}

export function sanitizeDateOfBirth(raw: any): string | null {
    if (!raw) return null
    const str = String(raw).trim()
    // Match YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) {
        const y = parseInt(isoMatch[1], 10)
        const m = parseInt(isoMatch[2], 10)
        const d = parseInt(isoMatch[3], 10)
        const currentYear = new Date().getFullYear() + 1
        if (y >= 1900 && y <= currentYear && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return str
        }
    }
    // Match DD/MM/YYYY
    const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (brMatch) {
        const d = parseInt(brMatch[1], 10)
        const m = parseInt(brMatch[2], 10)
        const y = parseInt(brMatch[3], 10)
        const currentYear = new Date().getFullYear() + 1
        if (y >= 1900 && y <= currentYear && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        }
    }
    return null
}

export async function approveSubmission(

    submissionId: string,
    clinicId: string,
    reviewerId: string
): Promise<ApprovalResult> {
    const supabase = createServiceRoleClient()

    // 1. Get submission with files
    const submission = await getSubmissionById(submissionId, clinicId)
    if (!submission) return { success: false, error: 'Submissão não encontrada' }
    if (submission.status === 'approved') return { success: false, error: 'Já aprovada' }

    // Use edited_data if available, otherwise original_data
    const formData = submission.edited_data || submission.original_data

    // 2. Check patient limit for clinic plan
    const { data: clinic } = await supabase
        .from('clinics')
        .select('plan_type')
        .eq('id', clinicId)
        .single()

    const planType = (clinic?.plan_type || 'BASICO') as PlanType
    const planConfig = PLANS[planType] || PLANS.BASICO
    const maxPatients = planConfig.limits.max_patients

    if (maxPatients > 0) {
        const { count } = await supabase
            .from('patients')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .neq('is_active', false)

        if (count !== null && count >= maxPatients) {
            return {
                success: false,
                error: `Limite de ${maxPatients} pacientes do plano ${planConfig.name} atingido. Atualize seu plano para continuar.`,
            }
        }
    }

    // 3. Check for duplicate CPF
    const cpf = formData.cpf?.replace(/\D/g, '')
    if (cpf) {
        const { data: existingPatient } = await supabase
            .from('patients')
            .select('id, full_name, cpf, phone, email, billing_type')
            .eq('clinic_id', clinicId)
            .eq('cpf', cpf)
            .is('deleted_at', null)
            .maybeSingle()

        if (existingPatient) {
            return {
                success: false,
                existing_patient: existingPatient,
                error: 'CPF_DUPLICADO',
            }
        }
    }

    // 4. Create patient — atomic
    const sanitizedDob = sanitizeDateOfBirth(formData.date_of_birth)

    const patientData: Record<string, any> = {
        clinic_id: clinicId,
        full_name: formData.full_name,
        date_of_birth: sanitizedDob,
        cpf: cpf || null,
        phone: formData.phone || null,
        email: formData.email || null,
        billing_type: formData.billing_type || 'particular',
        is_active: true,
    }


    // Insurance fields
    if (formData.billing_type === 'convenio' && formData.insurance) {
        patientData.health_insurance_id = formData.insurance.health_insurance_id || null
        patientData.insurance_card_number = formData.insurance.insurance_card_number || null
        patientData.insurance_validity = formData.insurance.insurance_validity || null
        patientData.insurance_plan_name = formData.insurance.insurance_plan_name || null

        if (!formData.insurance.is_holder) {
            patientData.insurance_holder_name = formData.insurance.holder_name || null
            patientData.insurance_holder_cpf = formData.insurance.holder_cpf?.replace(/\D/g, '') || null
        }
    }

    // Guardian / responsible
    if (formData.patient_type === 'other' && formData.guardian) {
        patientData.guardian_name = formData.guardian.guardian_name
        patientData.guardian_cpf = formData.guardian.guardian_cpf?.replace(/\D/g, '')
    }

    const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert(patientData)
        .select('id')
        .single()

    if (patientError) {
        return { success: false, error: `Erro ao criar paciente: ${patientError.message}` }
    }

    // 5. Move insurance card files to patient_documents
    const files = submission.patient_intake_files || []
    for (const file of files) {
        await supabase.from('patient_documents').insert({
            patient_id: newPatient.id,
            file_name: file.kind === 'carteirinha_frente' ? 'Carteirinha - Frente' : 'Carteirinha - Verso',
            file_url: file.storage_path,
            file_type: file.mime,
            file_size_bytes: file.size || null,
            document_type: 'CONVENIO_CARD',
            doc_group: 'admin',
            uploaded_by: reviewerId,
        })
    }

    // 6. Register LGPD consent
    if (submission.consent?.accepted) {
        await supabase.from('patient_consents').insert({
            patient_id: newPatient.id,
            clinic_id: clinicId,
            consent_type: 'DATA_PROCESSING',
            consent_text: submission.consent.consent_text || INTAKE_CONSENT_TEXT,
            version: submission.consent.consent_version || INTAKE_CONSENT_VERSION,
            accepted: true,
            accepted_at: submission.consent.accepted_at,
            ip_address: submission.consent.ip || 'intake-form',
            user_agent: submission.consent.user_agent || 'intake-form',
        }).then(() => {}).catch(() => {
            // Non-critical: consent table may not exist in all environments
            console.warn('[Intake] Consent insert skipped (table may not exist)')
        })
    }

    // 7. Update submission as approved
    await supabase
        .from('patient_intake_submissions')
        .update({
            status: 'approved',
            approved_patient_id: newPatient.id,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId)

    // 8. Audit log
    await logIntakeEvent({
        clinicId,
        submissionId,
        event: 'ficha_aprovada',
        actorId: reviewerId,
        metadata: { patient_id: newPatient.id },
    })

    return { success: true, patient_id: newPatient.id }
}

export async function approveAndUpdateExisting(
    submissionId: string,
    clinicId: string,
    existingPatientId: string,
    reviewerId: string
): Promise<ApprovalResult> {
    const supabase = createServiceRoleClient()

    const submission = await getSubmissionById(submissionId, clinicId)
    if (!submission) return { success: false, error: 'Submissão não encontrada' }

    const formData = submission.edited_data || submission.original_data

    // Update existing patient
    const updateData: Record<string, any> = {
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth || null,
        phone: formData.phone || null,
        email: formData.email || null,
        billing_type: formData.billing_type || 'particular',
    }

    if (formData.billing_type === 'convenio' && formData.insurance) {
        updateData.health_insurance_id = formData.insurance.health_insurance_id || null
        updateData.insurance_card_number = formData.insurance.insurance_card_number || null
        updateData.insurance_validity = formData.insurance.insurance_validity || null
        updateData.insurance_plan_name = formData.insurance.insurance_plan_name || null
    }

    if (formData.patient_type === 'other' && formData.guardian) {
        updateData.guardian_name = formData.guardian.guardian_name
        updateData.guardian_cpf = formData.guardian.guardian_cpf?.replace(/\D/g, '')
    }

    const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', existingPatientId)
        .eq('clinic_id', clinicId)

    if (error) return { success: false, error: `Erro ao atualizar: ${error.message}` }

    // Move files
    const files = submission.patient_intake_files || []
    for (const file of files) {
        await supabase.from('patient_documents').insert({
            patient_id: existingPatientId,
            file_name: file.kind === 'carteirinha_frente' ? 'Carteirinha - Frente' : 'Carteirinha - Verso',
            file_url: file.storage_path,
            file_type: file.mime,
            file_size_bytes: file.size || null,
            document_type: 'CONVENIO_CARD',
            doc_group: 'admin',
            uploaded_by: reviewerId,
        })
    }

    // Update submission
    await supabase
        .from('patient_intake_submissions')
        .update({
            status: 'approved',
            approved_patient_id: existingPatientId,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId)

    await logIntakeEvent({
        clinicId,
        submissionId,
        event: 'ficha_aprovada_atualizada',
        actorId: reviewerId,
        metadata: { patient_id: existingPatientId },
    })

    return { success: true, patient_id: existingPatientId }
}

// ============================================
// File Upload (Public, via token)
// ============================================

export async function uploadIntakeFile(
    token: string,
    file: File,
    kind: 'carteirinha_frente' | 'carteirinha_verso'
): Promise<{ success: boolean; file_id?: string; error?: string }> {
    const supabase = createServiceRoleClient()
    const tokenHash = hashToken(token)

    // Validate token
    const { data: link } = await supabase
        .from('patient_intake_links')
        .select('id, clinic_id')
        .eq('token_hash', tokenHash)
        .maybeSingle()

    if (!link) return { success: false, error: 'Token inválido' }

    // Get or create a pending submission for this link
    let { data: submission } = await supabase
        .from('patient_intake_submissions')
        .select('id')
        .eq('link_id', link.id)
        .in('status', ['pending', 'needs_correction'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    // If no submission yet, create a placeholder
    if (!submission) {
        const { data: newSub, error } = await supabase
            .from('patient_intake_submissions')
            .insert({
                clinic_id: link.clinic_id,
                link_id: link.id,
                status: 'pending',
                original_data: {},
                consent: {},
            })
            .select('id')
            .single()

        if (error) return { success: false, error: 'Erro ao preparar upload' }
        submission = newSub
    }

    // Validate file
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedMimes.includes(file.type)) {
        return { success: false, error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.' }
    }
    if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'Arquivo muito grande. Máximo: 5 MB.' }
    }

    // Upload to storage
    const ext = file.name.split('.').pop() || 'jpg'
    const storagePath = `${link.clinic_id}/${submission.id}/${kind}.${ext}`

    const { error: uploadError } = await supabase.storage
        .from('intake-files')
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: true,
        })

    if (uploadError) return { success: false, error: `Erro no upload: ${uploadError.message}` }

    // Record in intake_files
    // First delete any existing file of same kind for this submission
    await supabase
        .from('patient_intake_files')
        .delete()
        .eq('submission_id', submission.id)
        .eq('kind', kind)

    const { data: fileRecord, error: fileError } = await supabase
        .from('patient_intake_files')
        .insert({
            submission_id: submission.id,
            clinic_id: link.clinic_id,
            storage_path: storagePath,
            mime: file.type,
            size: file.size,
            kind,
        })
        .select('id')
        .single()

    if (fileError) return { success: false, error: `Erro ao registrar arquivo: ${fileError.message}` }

    return { success: true, file_id: fileRecord.id }
}

// ============================================
// Audit Log
// ============================================

interface AuditEvent {
    clinicId: string
    linkId?: string
    submissionId?: string
    event: string
    actorId?: string
    metadata?: Record<string, any>
}

async function logIntakeEvent(evt: AuditEvent) {
    try {
        const supabase = createServiceRoleClient()
        await supabase.from('patient_intake_audit').insert({
            clinic_id: evt.clinicId,
            link_id: evt.linkId || null,
            submission_id: evt.submissionId || null,
            event: evt.event,
            actor_id: evt.actorId || null,
            metadata: evt.metadata || {},
        })
    } catch (err) {
        console.error('[Intake Audit] Error logging event:', err)
    }
}

// ============================================
// WhatsApp Message Template
// ============================================

export function buildIntakeWhatsAppMessage(
    leadName: string | undefined,
    clinicName: string,
    linkUrl: string
): string {
    const greeting = leadName ? `Olá, ${leadName}!` : 'Olá!'
    return `${greeting} Para agilizar seu atendimento na ${clinicName}, preencha sua ficha por este link seguro: ${linkUrl} (válido por 72h).`
}
