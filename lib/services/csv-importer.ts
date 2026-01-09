/**
 * Bulk CSV Importer Service
 * Processes patient and doctor imports with conflict handling and multi-tenancy isolation
 * 
 * @module lib/services/csv-importer
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { validateCPF } from '@/lib/utils/cpf'

// ============================================================================
// SCHEMAS
// ============================================================================

const patientRowSchema = z.object({
    cpf: z.string().refine(validateCPF, 'CPF inválido'),
    full_name: z.string().min(3, 'Nome muito curto'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(10, 'Telefone inválido'),
    date_of_birth: z.string().optional(),
    gender: z.string().optional(),
    health_insurance_provider: z.string().optional(),
    health_insurance_number: z.string().optional(),
})

const doctorRowSchema = z.object({
    email: z.string().email('Email inválido'),
    full_name: z.string().min(3, 'Nome muito curto'),
    crm: z.string().min(4, 'CRM inválido'),
    crm_state: z.string().length(2, 'UF inválida'),
    specialty: z.string().min(3, 'Especialidade inválida'),
    consultation_price: z.string().or(z.number()),
    phone: z.string().optional(),
    bio: z.string().optional(),
})

type PatientRow = z.infer<typeof patientRowSchema>
type DoctorRow = z.infer<typeof doctorRowSchema>

// ============================================================================
// TYPES
// ============================================================================

export interface ImportResult {
    success: boolean
    totalRows: number
    imported: number
    skipped: number
    errors: Array<{
        row: number
        field?: string
        message: string
    }>
    createdIds: string[]
    duplicateCpfs: string[]
}

export interface ImportProgress {
    currentRow: number
    totalRows: number
    status: 'parsing' | 'validating' | 'importing' | 'complete' | 'error'
    message: string
}

export type ProgressCallback = (progress: ImportProgress) => void

// ============================================================================
// CSV PARSER
// ============================================================================

function parseCSV(csvContent: string): string[][] {
    const lines = csvContent.split('\n').filter(line => line.trim())
    return lines.map(line => {
        const values: string[] = []
        let current = ''
        let inQuotes = false

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }
        values.push(current.trim())
        return values
    })
}

function rowToObject<T>(headers: string[], values: string[]): Partial<T> {
    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
        const key = header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        obj[key] = values[i] || ''
    })
    return obj as Partial<T>
}

// ============================================================================
// PATIENT IMPORTER
// ============================================================================

export async function importPatients(
    clinicId: string,
    csvContent: string,
    options: {
        skipDuplicates?: boolean
        updateExisting?: boolean
        onProgress?: ProgressCallback
    } = {}
): Promise<ImportResult> {
    const { skipDuplicates = true, updateExisting = false, onProgress } = options
    const supabase = createServiceRoleClient()

    const result: ImportResult = {
        success: true,
        totalRows: 0,
        imported: 0,
        skipped: 0,
        errors: [],
        createdIds: [],
        duplicateCpfs: [],
    }

    try {
        onProgress?.({ currentRow: 0, totalRows: 0, status: 'parsing', message: 'Parsing CSV...' })

        const rows = parseCSV(csvContent)
        if (rows.length < 2) {
            throw new Error('CSV must have at least a header and one data row')
        }

        const headers = rows[0]
        const dataRows = rows.slice(1)
        result.totalRows = dataRows.length

        onProgress?.({ currentRow: 0, totalRows: result.totalRows, status: 'validating', message: 'Validating data...' })

        // Get existing CPFs in this clinic
        const { data: existingPatients } = await supabase
            .from('patients')
            .select('cpf')
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)

        const existingCpfs = new Set(existingPatients?.map(p => p.cpf.replace(/\D/g, '')) || [])

        // Process rows in batches
        const batchSize = 50
        const toInsert: Array<{
            clinic_id: string
            cpf: string
            full_name: string
            email: string
            phone: string
            date_of_birth?: string | null
            gender?: string | null
            health_insurance?: Record<string, string>
        }> = []

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i]
            const rowNum = i + 2 // 1-indexed + header

            onProgress?.({
                currentRow: i + 1,
                totalRows: result.totalRows,
                status: 'validating',
                message: `Validating row ${i + 1} of ${result.totalRows}`,
            })

            try {
                const obj = rowToObject<PatientRow>(headers, row)
                const parsed = patientRowSchema.safeParse(obj)

                if (!parsed.success) {
                    result.errors.push({
                        row: rowNum,
                        field: parsed.error.errors[0]?.path[0] as string,
                        message: parsed.error.errors[0]?.message || 'Validation error',
                    })
                    continue
                }

                const data = parsed.data
                const normalizedCpf = data.cpf.replace(/\D/g, '')

                // Check for duplicates
                if (existingCpfs.has(normalizedCpf)) {
                    result.duplicateCpfs.push(normalizedCpf)

                    if (skipDuplicates && !updateExisting) {
                        result.skipped++
                        continue
                    }

                    if (updateExisting) {
                        // Update existing patient
                        await supabase
                            .from('patients')
                            .update({
                                full_name: data.full_name,
                                email: data.email,
                                phone: data.phone,
                                date_of_birth: data.date_of_birth || null,
                                gender: data.gender || null,
                                health_insurance: data.health_insurance_provider ? {
                                    provider: data.health_insurance_provider,
                                    number: data.health_insurance_number,
                                } : null,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('clinic_id', clinicId)
                            .eq('cpf', normalizedCpf)

                        result.imported++
                        continue
                    }
                }

                // Add to insert batch
                toInsert.push({
                    clinic_id: clinicId,
                    cpf: normalizedCpf,
                    full_name: data.full_name,
                    email: data.email,
                    phone: data.phone,
                    date_of_birth: data.date_of_birth || null,
                    gender: data.gender || null,
                    health_insurance: data.health_insurance_provider ? {
                        provider: data.health_insurance_provider,
                        number: data.health_insurance_number || '',
                    } : undefined,
                })

                existingCpfs.add(normalizedCpf)

            } catch (err) {
                result.errors.push({
                    row: rowNum,
                    message: (err as Error).message,
                })
            }
        }

        // Batch insert
        onProgress?.({
            currentRow: result.totalRows,
            totalRows: result.totalRows,
            status: 'importing',
            message: `Importing ${toInsert.length} patients...`,
        })

        for (let i = 0; i < toInsert.length; i += batchSize) {
            const batch = toInsert.slice(i, i + batchSize)

            const { data: inserted, error } = await supabase
                .from('patients')
                .insert(batch as any)
                .select('id')

            if (error) {
                logger.error({ error, batch: i }, 'Batch insert failed')
                result.errors.push({
                    row: i + 2,
                    message: `Batch insert failed: ${error.message}`,
                })
            } else {
                result.imported += inserted?.length || 0
                result.createdIds.push(...(inserted?.map(p => p.id) || []))
            }
        }

        result.success = result.errors.length === 0

        onProgress?.({
            currentRow: result.totalRows,
            totalRows: result.totalRows,
            status: 'complete',
            message: `Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`,
        })

        logger.info({
            clinicId,
            imported: result.imported,
            skipped: result.skipped,
            errors: result.errors.length,
        }, 'Patient CSV import completed')

        return result

    } catch (error) {
        logger.error({ error, clinicId }, 'Patient CSV import failed')
        result.success = false
        result.errors.push({
            row: 0,
            message: (error as Error).message,
        })
        return result
    }
}

// ============================================================================
// DOCTOR IMPORTER
// ============================================================================

export async function importDoctors(
    clinicId: string,
    csvContent: string,
    options: {
        defaultPassword?: string
        sendInvites?: boolean
        onProgress?: ProgressCallback
    } = {}
): Promise<ImportResult> {
    const { defaultPassword = 'CliniGo2026!', onProgress } = options
    const supabase = createServiceRoleClient()

    const result: ImportResult = {
        success: true,
        totalRows: 0,
        imported: 0,
        skipped: 0,
        errors: [],
        createdIds: [],
        duplicateCpfs: [],
    }

    try {
        onProgress?.({ currentRow: 0, totalRows: 0, status: 'parsing', message: 'Parsing CSV...' })

        const rows = parseCSV(csvContent)
        if (rows.length < 2) {
            throw new Error('CSV must have at least a header and one data row')
        }

        const headers = rows[0]
        const dataRows = rows.slice(1)
        result.totalRows = dataRows.length

        // Get existing emails
        const { data: existingUsers } = await supabase
            .from('users')
            .select('email')
            .eq('clinic_id', clinicId)

        const existingEmails = new Set(existingUsers?.map(u => u.email.toLowerCase()) || [])

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i]
            const rowNum = i + 2

            onProgress?.({
                currentRow: i + 1,
                totalRows: result.totalRows,
                status: 'importing',
                message: `Processing doctor ${i + 1} of ${result.totalRows}`,
            })

            try {
                const obj = rowToObject<DoctorRow>(headers, row)
                const parsed = doctorRowSchema.safeParse(obj)

                if (!parsed.success) {
                    result.errors.push({
                        row: rowNum,
                        field: parsed.error.errors[0]?.path[0] as string,
                        message: parsed.error.errors[0]?.message || 'Validation error',
                    })
                    continue
                }

                const data = parsed.data

                // Check for duplicate email
                if (existingEmails.has(data.email.toLowerCase())) {
                    result.skipped++
                    continue
                }

                // Create auth user via Supabase Admin API
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                    email: data.email,
                    password: defaultPassword,
                    email_confirm: true,
                    user_metadata: {
                        full_name: data.full_name,
                        role: 'DOCTOR',
                        clinic_id: clinicId,
                    },
                })

                if (authError || !authUser.user) {
                    result.errors.push({
                        row: rowNum,
                        field: 'email',
                        message: authError?.message || 'Failed to create auth user',
                    })
                    continue
                }

                // Create user record
                const { error: userError } = await supabase
                    .from('users')
                    .insert({
                        id: authUser.user.id,
                        email: data.email,
                        full_name: data.full_name,
                        phone: data.phone || null,
                        role: 'DOCTOR',
                        clinic_id: clinicId,
                        is_active: true,
                    })

                if (userError) {
                    result.errors.push({
                        row: rowNum,
                        message: `User record failed: ${userError.message}`,
                    })
                    continue
                }

                // Create doctor profile
                const { data: doctor, error: doctorError } = await supabase
                    .from('doctors')
                    .insert({
                        user_id: authUser.user.id,
                        clinic_id: clinicId,
                        crm: data.crm,
                        crm_state: data.crm_state.toUpperCase(),
                        specialty: data.specialty,
                        consultation_price: parseFloat(String(data.consultation_price).replace(',', '.')),
                        bio: data.bio || null,
                        is_accepting_appointments: true,
                        is_active: true,
                    })
                    .select('id')
                    .single()

                if (doctorError || !doctor) {
                    result.errors.push({
                        row: rowNum,
                        message: `Doctor profile failed: ${doctorError?.message}`,
                    })
                    continue
                }

                result.imported++
                result.createdIds.push(doctor.id)
                existingEmails.add(data.email.toLowerCase())

            } catch (err) {
                result.errors.push({
                    row: rowNum,
                    message: (err as Error).message,
                })
            }
        }

        result.success = result.errors.length === 0

        onProgress?.({
            currentRow: result.totalRows,
            totalRows: result.totalRows,
            status: 'complete',
            message: `Import complete: ${result.imported} doctors imported`,
        })

        logger.info({
            clinicId,
            imported: result.imported,
            errors: result.errors.length,
        }, 'Doctor CSV import completed')

        return result

    } catch (error) {
        logger.error({ error, clinicId }, 'Doctor CSV import failed')
        result.success = false
        result.errors.push({
            row: 0,
            message: (error as Error).message,
        })
        return result
    }
}
