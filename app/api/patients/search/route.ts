import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
/**
 * GET /api/patients/search
 * Search patients by CPF, name, phone, or email
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        // Get user profile to check permissions, clinic and coordinator flag
        const { data: profile } = await supabase
            .from('users')
            .select('role, clinic_id, is_coordinator')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json(
                { error: 'Perfil não encontrado' },
                { status: 404 }
            )
        }

        // Check permissions
        const allowedRoles = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR']
        if (!allowedRoles.includes(profile.role)) {
            return NextResponse.json(
                { error: 'Sem permissão para buscar pacientes' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q') || ''
        const doctorIdFilter = searchParams.get('doctor_id')

        // Se query estiver vazia ou menor que 2 caracteres e NÃO houver doctor_id, retorna vazio
        if ((!query || query.trim().length < 2) && !doctorIdFilter) {
            return NextResponse.json({ data: [] })
        }

        // Cliente administrativo para busca veloz e segura restrita a clinic_id (evita 502/timeouts de RLS)
        const adminSupabase = createServiceRoleClient()

        // Se doctor_id for informado e o usuário não for coordenador nem admin geral,
        // restringir aos pacientes vinculados a esse profissional
        let allowedPatientIds: string[] | null = null
        const isCoordinatorOrAdmin = profile.role === 'SUPER_ADMIN' || profile.role === 'CLINIC_ADMIN' || Boolean(profile.is_coordinator)

        if (doctorIdFilter && !isCoordinatorOrAdmin) {
            const [apptsRes, evosRes, ratesRes] = await Promise.all([
                adminSupabase
                    .from('appointments')
                    .select('patient_id')
                    .or(`doctor_id.eq.${doctorIdFilter},co_doctor_id.eq.${doctorIdFilter},professional_supervised_id.eq.${doctorIdFilter}`)
                    .not('status', 'eq', 'CANCELLED'),
                adminSupabase
                    .from('session_evolutions')
                    .select('patient_id')
                    .eq('doctor_id', doctorIdFilter),
                adminSupabase
                    .from('doctor_patient_rates')
                    .select('patient_id')
                    .eq('doctor_id', doctorIdFilter),
            ])

            const allIds = [
                ...(apptsRes.data || []).map((a: any) => a.patient_id),
                ...(evosRes.data || []).map((e: any) => e.patient_id),
                ...(ratesRes.data || []).map((r: any) => r.patient_id),
            ].filter((id: any): id is string => Boolean(id) && typeof id === 'string' && id.trim() !== '' && id !== 'null')

            if (allIds.length === 0) {
                return NextResponse.json({ data: [] })
            }
            allowedPatientIds = [...new Set(allIds)]
        }

        // Limpeza de query
        const cleanQuery = query.replace(/[,()]/g, ' ').trim()
        const numericQuery = cleanQuery.replace(/\D/g, '')
        const words = cleanQuery.split(/\s+/).filter(w => w.length > 0)

        // Montar busca
        let searchQuery = adminSupabase
            .from('patients')
            .select('id, full_name, cpf, email, phone, date_of_birth')
            .limit(20)

        // Filtro estrito por clínica (exceto Super Admin)
        if (profile.role !== 'SUPER_ADMIN' && profile.clinic_id) {
            searchQuery = searchQuery.eq('clinic_id', profile.clinic_id)
        }

        // Excluir deletados ou inativos
        searchQuery = searchQuery.is('deleted_at', null).neq('is_active', false)

        // Filtro por pacientes autorizados do terapeuta
        if (allowedPatientIds) {
            searchQuery = searchQuery.in('id', allowedPatientIds)
        }

        // Se houver texto digitado com 2 ou mais caracteres
        if (cleanQuery.length >= 2) {
            if (numericQuery.length >= 3) {
                // Busca por CPF ou telefone
                searchQuery = searchQuery.or(
                    `cpf.ilike.%${numericQuery}%,phone.ilike.%${numericQuery}%`
                )
            } else if (words.length > 1) {
                // Busca multi-palavra (ex: "Davi Oliveira", "Davi Cavalcante")
                for (const w of words) {
                    searchQuery = searchQuery.ilike('full_name', `%${w}%`)
                }
            } else {
                // Busca por nome simples ou e-mail
                searchQuery = searchQuery.or(
                    `full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`
                )
            }
        } else {
            // Se não digitou texto mas há doctor_id, ordena por nome dos pacientes do terapeuta
            searchQuery = searchQuery.order('full_name', { ascending: true })
        }

        const { data: patients, error } = await searchQuery

        if (error) {
            console.error('Patient search error:', error)
            return NextResponse.json(
                { error: 'Erro ao buscar pacientes' },
                { status: 500 }
            )
        }

        // Format results
        const results = (patients || []).map(patient => ({
            id: patient.id,
            full_name: patient.full_name,
            cpf: patient.cpf ? formatCPF(patient.cpf) : null,
            email: patient.email,
            phone: patient.phone ? formatPhone(patient.phone) : null,
            date_of_birth: patient.date_of_birth,
            // Relevance hint for UI
            match_type: determineMatchType(patient, cleanQuery, numericQuery),
        }))

        // Sort by relevance (exact matches first)
        results.sort((a, b) => {
            if (a.match_type === 'exact' && b.match_type !== 'exact') return -1
            if (b.match_type === 'exact' && a.match_type !== 'exact') return 1
            return 0
        })

        return NextResponse.json({ data: results })

    } catch (error) {
        request.log.error('patients/search', { error: error instanceof Error ? error.message : String(error) })
        console.error('Patient search error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
})

// Helper functions
function formatCPF(cpf: string): string {
    const clean = cpf.replace(/\D/g, '')
    if (clean.length !== 11) return cpf
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
}

function formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '')
    if (clean.length === 11) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
    }
    if (clean.length === 10) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
    }
    return phone
}

function determineMatchType(
    patient: { cpf?: string; phone?: string; full_name?: string; email?: string },
    query: string,
    numericQuery: string
): 'exact' | 'partial' {
    const cleanCpf = patient.cpf?.replace(/\D/g, '') || ''
    const cleanPhone = patient.phone?.replace(/\D/g, '') || ''
    const lowerName = patient.full_name?.toLowerCase() || ''
    const lowerEmail = patient.email?.toLowerCase() || ''
    const lowerQuery = query.toLowerCase()

    // Exact matches
    if (cleanCpf === numericQuery) return 'exact'
    if (cleanPhone === numericQuery) return 'exact'
    if (lowerName === lowerQuery) return 'exact'
    if (lowerEmail === lowerQuery) return 'exact'

    return 'partial'
}
