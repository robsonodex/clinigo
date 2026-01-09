/**
 * CSV Import Service - Enterprise Feature
 * Handles bulk import of patients and doctors from CSV files
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { cleanCPF, isValidCPF } from '@/lib/utils/cpf'

export interface ImportResult {
    success: boolean
    total: number
    imported: number
    updated: number
    failed: number
    errors: Array<{ row: number; message: string; data?: Record<string, string> }>
}

export interface PatientCSVRow {
    nome: string
    cpf: string
    email?: string
    telefone: string
    data_nascimento?: string
}

export interface DoctorCSVRow {
    nome: string
    email: string
    crm: string
    especialidade: string
    telefone?: string
    preco_consulta?: string
}

/**
 * Parse CSV content into rows
 */
export function parseCSV(content: string): string[][] {
    const lines = content.trim().split('\n')
    return lines.map(line => {
        // Handle quoted fields with commas
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }
        result.push(current.trim())
        return result
    })
}

/**
 * Import patients from CSV
 */
export async function importPatients(
    csvContent: string,
    clinicId: string
): Promise<ImportResult> {
    const supabase = createServiceRoleClient() as any
    const rows = parseCSV(csvContent)

    if (rows.length < 2) {
        return {
            success: false,
            total: 0,
            imported: 0,
            updated: 0,
            failed: 0,
            errors: [{ row: 0, message: 'CSV deve ter cabeçalho e pelo menos uma linha de dados' }]
        }
    }

    // Extract header and normalize
    const header = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'))
    const dataRows = rows.slice(1)

    const result: ImportResult = {
        success: true,
        total: dataRows.length,
        imported: 0,
        updated: 0,
        failed: 0,
        errors: []
    }

    // Find column indices
    const nameIdx = header.findIndex(h => h.includes('nome'))
    const cpfIdx = header.findIndex(h => h.includes('cpf'))
    const emailIdx = header.findIndex(h => h.includes('email'))
    const phoneIdx = header.findIndex(h => h.includes('telefone') || h.includes('celular') || h.includes('phone'))
    const dobIdx = header.findIndex(h => h.includes('nascimento') || h.includes('data_nasc'))

    if (nameIdx === -1 || cpfIdx === -1) {
        return {
            ...result,
            success: false,
            errors: [{ row: 0, message: 'Colunas obrigatórias não encontradas: nome, cpf' }]
        }
    }

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        const rowNum = i + 2 // 1-indexed + header

        try {
            const nome = row[nameIdx]?.trim()
            const cpfRaw = row[cpfIdx]?.trim()
            const email = emailIdx !== -1 ? row[emailIdx]?.trim() : ''
            const telefone = phoneIdx !== -1 ? row[phoneIdx]?.trim() : ''
            const dataNascimento = dobIdx !== -1 ? row[dobIdx]?.trim() : null

            // Validations
            if (!nome) {
                result.failed++
                result.errors.push({ row: rowNum, message: 'Nome é obrigatório' })
                continue
            }

            if (!cpfRaw) {
                result.failed++
                result.errors.push({ row: rowNum, message: 'CPF é obrigatório' })
                continue
            }

            const cpf = cleanCPF(cpfRaw)
            if (!isValidCPF(cpf)) {
                result.failed++
                result.errors.push({ row: rowNum, message: `CPF inválido: ${cpfRaw}` })
                continue
            }

            // Check if patient exists
            const { data: existing } = await supabase
                .from('patients')
                .select('id')
                .eq('clinic_id', clinicId)
                .eq('cpf', cpf)
                .single()

            if (existing) {
                // Update existing patient
                const { error } = await supabase
                    .from('patients')
                    .update({
                        full_name: nome,
                        email: email || undefined,
                        phone: telefone || undefined,
                        date_of_birth: dataNascimento ? formatDate(dataNascimento) : undefined,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)

                if (error) {
                    result.failed++
                    result.errors.push({ row: rowNum, message: `Erro ao atualizar: ${error.message}` })
                } else {
                    result.updated++
                }
            } else {
                // Insert new patient
                const { error } = await supabase
                    .from('patients')
                    .insert({
                        clinic_id: clinicId,
                        full_name: nome,
                        cpf,
                        email: email || `paciente_${cpf}@temp.clinigo.app`,
                        phone: telefone || '',
                        date_of_birth: dataNascimento ? formatDate(dataNascimento) : null,
                    })

                if (error) {
                    result.failed++
                    result.errors.push({ row: rowNum, message: `Erro ao inserir: ${error.message}` })
                } else {
                    result.imported++
                }
            }
        } catch (error: unknown) {
            result.failed++
            result.errors.push({
                row: rowNum,
                message: `Erro inesperado: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
        }
    }

    result.success = result.failed === 0
    return result
}

/**
 * Import doctors from CSV
 */
export async function importDoctors(
    csvContent: string,
    clinicId: string
): Promise<ImportResult> {
    const supabase = createServiceRoleClient() as any
    const rows = parseCSV(csvContent)

    if (rows.length < 2) {
        return {
            success: false,
            total: 0,
            imported: 0,
            updated: 0,
            failed: 0,
            errors: [{ row: 0, message: 'CSV deve ter cabeçalho e pelo menos uma linha de dados' }]
        }
    }

    const header = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'))
    const dataRows = rows.slice(1)

    const result: ImportResult = {
        success: true,
        total: dataRows.length,
        imported: 0,
        updated: 0,
        failed: 0,
        errors: []
    }

    // Find column indices
    const nameIdx = header.findIndex(h => h.includes('nome'))
    const emailIdx = header.findIndex(h => h.includes('email'))
    const crmIdx = header.findIndex(h => h.includes('crm'))
    const specialtyIdx = header.findIndex(h => h.includes('especialidade') || h.includes('specialty'))
    const phoneIdx = header.findIndex(h => h.includes('telefone') || h.includes('phone'))
    const priceIdx = header.findIndex(h => h.includes('preco') || h.includes('valor') || h.includes('price'))

    if (nameIdx === -1 || emailIdx === -1 || crmIdx === -1 || specialtyIdx === -1) {
        return {
            ...result,
            success: false,
            errors: [{ row: 0, message: 'Colunas obrigatórias: nome, email, crm, especialidade' }]
        }
    }

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        const rowNum = i + 2

        try {
            const nome = row[nameIdx]?.trim()
            const email = row[emailIdx]?.trim()
            const crm = row[crmIdx]?.trim()
            const especialidade = row[specialtyIdx]?.trim()
            const telefone = phoneIdx !== -1 ? row[phoneIdx]?.trim() : ''
            const precoRaw = priceIdx !== -1 ? row[priceIdx]?.trim() : '150'
            const preco = parseFloat(precoRaw.replace(/[^0-9.,]/g, '').replace(',', '.')) || 150

            // Validations
            if (!nome || !email || !crm || !especialidade) {
                result.failed++
                result.errors.push({ row: rowNum, message: 'Todos os campos obrigatórios devem ser preenchidos' })
                continue
            }

            // Check if doctor with this CRM exists
            const { data: existingDoctor } = await supabase
                .from('doctors')
                .select('id, user_id')
                .eq('clinic_id', clinicId)
                .eq('crm', crm)
                .single()

            if (existingDoctor) {
                // Update existing
                const { error } = await supabase
                    .from('doctors')
                    .update({
                        specialty: especialidade,
                        consultation_price: preco * 100, // Convert to cents
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingDoctor.id)

                if (error) {
                    result.failed++
                    result.errors.push({ row: rowNum, message: `Erro ao atualizar médico: ${error.message}` })
                } else {
                    result.updated++
                }
            } else {
                // Create user first, then doctor
                const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
                    email,
                    email_confirm: true,
                    password: `CliniGo2026!${crm}`,
                    user_metadata: {
                        full_name: nome,
                        role: 'DOCTOR',
                        clinic_id: clinicId
                    }
                })

                if (userError || !newUser?.user) {
                    result.failed++
                    result.errors.push({ row: rowNum, message: `Erro ao criar usuário: ${userError?.message || 'Unknown'}` })
                    continue
                }

                // Create user profile
                await supabase.from('users').insert({
                    id: newUser.user.id,
                    email,
                    full_name: nome,
                    phone: telefone,
                    role: 'DOCTOR',
                    clinic_id: clinicId,
                    is_active: true
                })

                // Create doctor record
                const { error: doctorError } = await supabase.from('doctors').insert({
                    clinic_id: clinicId,
                    user_id: newUser.user.id,
                    specialty: especialidade,
                    crm,
                    consultation_price: preco * 100,
                    is_accepting_appointments: true,
                    is_active: true
                })

                if (doctorError) {
                    result.failed++
                    result.errors.push({ row: rowNum, message: `Erro ao criar médico: ${doctorError.message}` })
                } else {
                    result.imported++
                }
            }
        } catch (error: unknown) {
            result.failed++
            result.errors.push({
                row: rowNum,
                message: `Erro inesperado: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
        }
    }

    result.success = result.failed === 0
    return result
}

/**
 * Format date from various formats to ISO
 */
function formatDate(dateStr: string): string | null {
    if (!dateStr) return null

    // Try DD/MM/YYYY
    const brMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (brMatch) {
        const [, day, month, year] = brMatch
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // Try YYYY-MM-DD
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (isoMatch) {
        return dateStr
    }

    return null
}
