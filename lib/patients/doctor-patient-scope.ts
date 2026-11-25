/**
 * Escopo de pacientes vinculados a um profissional (DOCTOR não-coordenador) e busca sem acentos.
 *
 * Resolve dois bugs críticos em clínicas com agenda recorrente:
 * 1. Truncamento silencioso de 1.000 linhas do PostgREST ao consultar `appointments` sem DISTINCT
 *    (profissionais com > 1.000 agendamentos perdiam pacientes mais recentes).
 * 2. Busca sensível a acentos e espaços duplos (ex.: "heloisa" não encontrava "Heloísa  Vasco  Remédio ").
 */

export function normalizeSearchText(value: string | null | undefined): string {
    if (!value) return ''
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\uFFFD/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

export function normalizeDigits(value: string | null | undefined): string {
    if (!value) return ''
    return value.replace(/\D/g, '')
}

export interface SearchablePatientFields {
    full_name?: string | null
    cpf?: string | null
    phone?: string | null
    email?: string | null
}

/**
 * Avalia se um paciente corresponde à busca (insensível a acentos, caixa, espaços extras e máscara de CPF/telefone).
 */
export function matchesPatientSearch(patient: SearchablePatientFields, rawQuery: string): boolean {
    const cleanQuery = rawQuery.replace(/[,()]/g, ' ').trim()
    if (!cleanQuery) return true

    const normalizedQuery = normalizeSearchText(cleanQuery)
    const numericQuery = normalizeDigits(cleanQuery)

    if (numericQuery.length >= 3) {
        const cpfDigits = normalizeDigits(patient.cpf)
        const phoneDigits = normalizeDigits(patient.phone)
        if (cpfDigits.includes(numericQuery) || phoneDigits.includes(numericQuery)) {
            return true
        }
    }

    const normalizedName = normalizeSearchText(patient.full_name)
    const normalizedEmail = normalizeSearchText(patient.email)

    if (normalizedQuery && normalizedEmail.includes(normalizedQuery)) {
        return true
    }

    const words = normalizedQuery.split(' ').filter(Boolean)
    if (words.length === 0) return true

    return words.every((word) => normalizedName.includes(word))
}

async function fetchAllPaginatedIds(
    buildPageQuery: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>,
    field: string = 'patient_id'
): Promise<string[]> {
    const PAGE_SIZE = 1000
    const MAX_PAGES = 20 // Até 20.000 linhas no fallback se a RPC não estiver disponível
    const ids: string[] = []

    for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE - 1
        const { data, error } = await buildPageQuery(from, to)
        if (error || !data || data.length === 0) break

        for (const row of data) {
            const val = row?.[field]
            if (typeof val === 'string' && val.trim() !== '' && val !== 'null') {
                ids.push(val)
            }
        }

        if (data.length < PAGE_SIZE) break
    }

    return ids
}

/**
 * Retorna todos os patient_id distintos vinculados a um profissional sem truncamento de 1.000 linhas.
 * Usa preferencialmente a RPC SQL `get_doctor_linked_patient_ids` (SELECT DISTINCT no PostgreSQL)
 * com fallback paginado automático para resiliência.
 */
export async function getDoctorLinkedPatientIds(
    supabase: any,
    doctorId: string,
    clinicId?: string | null
): Promise<string[]> {
    if (!doctorId) return []

    // 1. Caminho primário: RPC SQL com SELECT DISTINCT direto no PostgreSQL (~2ms, zero truncamento)
    try {
        const { data: rpcRows, error: rpcError } = await supabase.rpc('get_doctor_linked_patient_ids', {
            p_doctor_id: doctorId,
            p_clinic_id: clinicId || null,
        })

        if (!rpcError && Array.isArray(rpcRows)) {
            return Array.from(
                new Set(
                    rpcRows
                        .map((r: any) => (typeof r === 'string' ? r : r?.patient_id))
                        .filter((id: any): id is string => typeof id === 'string' && id.trim() !== '' && id !== 'null')
                )
            )
        }
    } catch {
        // Fallback paginado abaixo
    }

    // 2. Fallback paginado (nunca trunca em 1.000 linhas mesmo sem RPC)
    const [apptIds, evoIds, rateIds, recordIds] = await Promise.all([
        fetchAllPaginatedIds((from, to) => {
            let q = supabase
                .from('appointments')
                .select('patient_id')
                .or(`doctor_id.eq.${doctorId},co_doctor_id.eq.${doctorId},professional_supervised_id.eq.${doctorId}`)
                .not('status', 'eq', 'CANCELLED')
                .order('id', { ascending: true })
                .range(from, to)
            if (clinicId) q = q.eq('clinic_id', clinicId)
            return q
        }),
        fetchAllPaginatedIds((from, to) =>
            supabase
                .from('session_evolutions')
                .select('patient_id')
                .eq('doctor_id', doctorId)
                .order('id', { ascending: true })
                .range(from, to)
        ),
        fetchAllPaginatedIds((from, to) =>
            supabase
                .from('doctor_patient_rates')
                .select('patient_id')
                .eq('doctor_id', doctorId)
                .order('id', { ascending: true })
                .range(from, to)
        ),
        fetchAllPaginatedIds((from, to) => {
            let q = supabase
                .from('medical_records')
                .select('patient_id')
                .eq('doctor_id', doctorId)
                .order('id', { ascending: true })
                .range(from, to)
            if (clinicId) q = q.eq('clinic_id', clinicId)
            return q
        }),
    ])

    return Array.from(new Set([...apptIds, ...evoIds, ...rateIds, ...recordIds]))
}

