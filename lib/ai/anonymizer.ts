/**
 * LGPD Data Anonymizer for AI Processing
 * Removes all PII before sending to external AI services
 */

export interface AnonymizedPatientContext {
    age: number
    gender: string
    medicalHistory: string
    currentMedications: string
    physicalExam: string
    previousDiagnoses: string[]
    allergies: string[]
}

interface PatientData {
    patient: {
        id?: string
        date_of_birth?: string
        gender?: string
    }
    currentRecord?: {
        anamnesis?: string
        physical_exam?: string
        diagnosis?: string
        medications?: string
    }
    history?: Array<{
        date?: string
        medical_record?: {
            diagnosis?: string
            medications?: string
        }
    }>
}

/**
 * Anonymize patient data for AI processing
 * Removes: Name, CPF, address, phone, email, clinic name
 * Keeps: Age (calculated), gender, medical data
 */
export function anonymizePatientData(data: PatientData): AnonymizedPatientContext {
    const patient = data.patient || {}
    const currentRecord = data.currentRecord || {}
    const history = data.history || []

    // Calculate age from date of birth
    const age = calculateAge(patient.date_of_birth)

    // Extract previous diagnoses from history
    const previousDiagnoses = history
        .filter(h => h.medical_record?.diagnosis)
        .map(h => h.medical_record!.diagnosis!)
        .filter((d, i, arr) => arr.indexOf(d) === i) // Unique

    // Clean anamnesis - remove any PII that might be in free text
    const cleanedAnamnesis = cleanPII(currentRecord.anamnesis || '')

    return {
        age,
        gender: normalizeGender(patient.gender),
        medicalHistory: cleanedAnamnesis,
        currentMedications: currentRecord.medications || '',
        physicalExam: currentRecord.physical_exam || '',
        previousDiagnoses: previousDiagnoses.slice(0, 10), // Limit to last 10
        allergies: extractAllergies(cleanedAnamnesis),
    }
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth?: string): number {
    if (!dateOfBirth) return 0

    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }

    return age
}

/**
 * Normalize gender to standard format
 */
function normalizeGender(gender?: string): string {
    if (!gender) return 'Não informado'
    const g = gender.toUpperCase()
    if (g === 'M' || g === 'MALE' || g === 'MASCULINO') return 'Masculino'
    if (g === 'F' || g === 'FEMALE' || g === 'FEMININO') return 'Feminino'
    return 'Outro'
}

/**
 * Clean PII from free text fields
 */
function cleanPII(text: string): string {
    if (!text) return ''

    let cleaned = text

    // Remove CPF patterns (XXX.XXX.XXX-XX or 11 digits)
    cleaned = cleaned.replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '[CPF REMOVIDO]')

    // Remove phone patterns
    cleaned = cleaned.replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[TELEFONE REMOVIDO]')

    // Remove email patterns
    cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL REMOVIDO]')

    // Remove common name patterns (Paciente: Nome, Nome do paciente:)
    cleaned = cleaned.replace(/(?:paciente|nome)[:\s]+[A-Z][a-zA-ZÀ-ú\s]+/gi, '[NOME REMOVIDO]')

    // Remove address patterns
    cleaned = cleaned.replace(/(?:rua|av|avenida|alameda)[:\s]+[^.,]+[.,]/gi, '[ENDEREÇO REMOVIDO]')

    return cleaned.trim()
}

/**
 * Extract allergies from anamnesis text
 */
function extractAllergies(anamnesis: string): string[] {
    if (!anamnesis) return []

    const allergies: string[] = []
    const lowerText = anamnesis.toLowerCase()

    // Common allergy keywords
    const patterns = [
        /alergia[s]? a[o]?\s+([^.,;]+)/gi,
        /alérgico[a]?\s+a[o]?\s+([^.,;]+)/gi,
        /intolerância\s+a[o]?\s+([^.,;]+)/gi,
    ]

    patterns.forEach(pattern => {
        const matches = anamnesis.matchAll(pattern)
        for (const match of matches) {
            if (match[1]) {
                allergies.push(match[1].trim())
            }
        }
    })

    return allergies.filter((a, i, arr) => arr.indexOf(a) === i)
}

