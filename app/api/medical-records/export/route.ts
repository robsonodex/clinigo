import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/utils/responses'
import {
    buildMedicalRecordsExcelBuffer,
    fetchFilteredClinicMedicalRecords,
    formatDateBr,
    resolveMatchingPatientIds,
    resolveMedicalRecordsAuth,
} from '@/lib/services/medical-records-export'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}$/
const ALLOWED_EXPORT_ROLES = new Set(['CLINIC_ADMIN', 'SUPER_ADMIN'])

function buildPeriodLabel(startDate?: string, endDate?: string): string {
    if (startDate && endDate) {
        return `${formatDateBr(startDate)} a ${formatDateBr(endDate)}`
    }
    if (startDate) {
        return `A partir de ${formatDateBr(startDate)}`
    }
    if (endDate) {
        return `Até ${formatDateBr(endDate)}`
    }
    return 'Todo o histórico disponível'
}

function buildSafeFilename(clinicName: string, startDate?: string, endDate?: string): string {
    const clinicSlug = clinicName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32) || 'clinica'

    const periodSlug = startDate && endDate
        ? `${startDate}_a_${endDate}`
        : startDate
          ? `desde_${startDate}`
          : endDate
            ? `ate_${endDate}`
            : 'completo'

    return `evolucoes_${clinicSlug}_${periodSlug}.xlsx`
}

/**
 * GET /api/medical-records/export
 * Exporta evoluções clínicas (medical_records) filtradas em planilha Excel (.xlsx).
 * Acesso restrito a CLINIC_ADMIN (e SUPER_ADMIN em suporte).
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const auth = await resolveMedicalRecordsAuth(request, supabase)

        if (!auth) {
            return errorResponse('Não autorizado', { status: 401 })
        }

        if (!auth.userRole || !ALLOWED_EXPORT_ROLES.has(auth.userRole)) {
            return errorResponse('Apenas administradores da clínica podem exportar evoluções em lote', {
                status: 403,
            })
        }

        const { searchParams } = new URL(request.url)
        const requestedClinicId = (searchParams.get('clinic_id') || '').trim()
        const targetClinicId =
            auth.userRole === 'SUPER_ADMIN' ? requestedClinicId || auth.clinicId : auth.clinicId

        if (!targetClinicId) {
            return errorResponse('Clínica não identificada para exportação', { status: 400 })
        }

        const startDate = (searchParams.get('start_date') || '').trim() || undefined
        const endDate = (searchParams.get('end_date') || '').trim() || undefined
        const doctorId = (searchParams.get('doctor_id') || '').trim() || undefined
        const patientId = (searchParams.get('patient_id') || '').trim() || undefined
        const search = (searchParams.get('search') || '').trim() || undefined

        if (startDate && !DATE_PARAM_REGEX.test(startDate)) {
            return errorResponse('Parâmetro start_date inválido (use YYYY-MM-DD)', { status: 400 })
        }
        if (endDate && !DATE_PARAM_REGEX.test(endDate)) {
            return errorResponse('Parâmetro end_date inválido (use YYYY-MM-DD)', { status: 400 })
        }
        if (startDate && endDate && startDate > endDate) {
            return errorResponse('Data inicial não pode ser maior que data final', { status: 400 })
        }

        let matchedPatientIds: string[] | undefined
        if (patientId) {
            matchedPatientIds = [patientId]
        } else if (search) {
            matchedPatientIds = await resolveMatchingPatientIds(supabase, {
                search,
                clinicId: targetClinicId,
                userRole: auth.userRole,
            })

            if (matchedPatientIds.length === 0) {
                return errorResponse('Nenhuma evolução encontrada para os filtros selecionados.', {
                    status: 404,
                })
            }
        }

        const records = await fetchFilteredClinicMedicalRecords(supabase, {
            clinicId: targetClinicId,
            startDate,
            endDate,
            doctorId,
            patientIds: matchedPatientIds,
            includeFullContent: true,
            sortOrder: 'asc',
        })

        if (records.length === 0) {
            return errorResponse('Nenhuma evolução encontrada para o período e filtros selecionados.', {
                status: 404,
            })
        }

        const { data: clinicRow } = await supabase
            .from('clinics')
            .select('name')
            .eq('id', targetClinicId)
            .maybeSingle()

        const clinicName = clinicRow?.name || 'Clínica'
        const periodLabel = buildPeriodLabel(startDate, endDate)
        const buffer = await buildMedicalRecordsExcelBuffer({
            clinicName,
            periodLabel,
            records,
        })

        // Registro de auditoria LGPD (melhor esforço, sem bloquear o download nem expor dados clínicos)
        try {
            await supabase.from('audit_logs').insert({
                clinic_id: targetClinicId,
                user_id: auth.userId,
                action: 'EXPORT_MEDICAL_RECORDS_EXCEL',
                entity_type: 'medical_records',
                user_role: auth.userRole,
                ip_address: request.headers.get('x-forwarded-for') || null,
                user_agent: request.headers.get('user-agent') || null,
                severity: 'INFO',
                metadata: {
                    start_date: startDate || null,
                    end_date: endDate || null,
                    doctor_id: doctorId || null,
                    patient_id: patientId || null,
                    total_exported: records.length,
                },
            })
        } catch {
            // Não interrompe download caso tabela de auditoria falhe
        }

        const fileName = buildSafeFilename(clinicName, startDate, endDate)

        return new Response(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'X-Total-Exported': String(records.length),
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        request.log.error('medical-records/export', {
            error: error instanceof Error ? error.message : String(error),
        })
        console.error('[MedicalRecordsExport] Erro ao exportar evoluções:', error)
        return errorResponse('Erro interno ao gerar planilha de evoluções', { status: 500 })
    }
})

