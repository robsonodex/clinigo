import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
/**
 * GET /api/patients/search
 * Search patients by CPF, name (accent-insensitive), phone, or email
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
    getDoctorLinkedPatientIds,
    matchesPatientSearch,
    normalizeDigits,
    normalizeSearchText,
} from '@/lib/patients/doctor-patient-scope'

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

        // Se o usuário for DOCTOR não-coordenador, restringir sempre aos seus pacientes vinculados
        // (mesmo quando doctor_id não for enviado), usando SELECT DISTINCT no PostgreSQL (zero truncamento de 1.000 linhas)
        let allowedPatientIds: string[] | null = null
        const isCoordinatorOrAdmin =
            profile.role === 'SUPER_ADMIN' ||
            profile.role === 'CLINIC_ADMIN' ||
            profile.role === 'RECEPTIONIST' ||
            Boolean(profile.is_coordinator)

        let effectiveDoctorId = doctorIdFilter
        if (!effectiveDoctorId && profile.role === 'DOCTOR' && !profile.is_coordinator) {
            const { data: myDoctor } = await adminSupabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()
            effectiveDoctorId = myDoctor?.id || null
        }

        if (effectiveDoctorId && (!isCoordinatorOrAdmin || Boolean(doctorIdFilter))) {
            const linkedIds = await getDoctorLinkedPatientIds(
                adminSupabase,
                effectiveDoctorId,
                profile.role !== 'SUPER_ADMIN' ? profile.clinic_id : null
            )

            if (linkedIds.length === 0) {
                return NextResponse.json({ data: [] })
            }
            allowedPatientIds = linkedIds
        }

        // Limpeza de query
        const cleanQuery = query.replace(/[,()]/g, ' ').trim()
        const numericQuery = normalizeDigits(cleanQuery)

        // Busca todos os candidatos do escopo (terapeuta ou clínica) e aplica filtro sem acentos/espaços duplos
        let searchQuery = adminSupabase
            .from('patients')
            .select('id, full_name, cpf, email, phone, date_of_birth')
            .is('deleted_at', null)
            .neq('is_active', false)
            .order('full_name', { ascending: true })

        // Filtro estrito por clínica (exceto Super Admin)
        if (profile.role !== 'SUPER_ADMIN' && profile.clinic_id) {
            searchQuery = searchQuery.eq('clinic_id', profile.clinic_id)
        }

        if (allowedPatientIds) {
            searchQuery = searchQuery.in('id', allowedPatientIds).limit(500)
        } else {
            searchQuery = searchQuery.limit(2000)
        }

        const { data: candidatePatients, error } = await searchQuery

        if (error) {
            console.error('Patient search error:', error)
            return NextResponse.json(
                { error: 'Erro ao buscar pacientes' },
                { status: 500 }
            )
        }

        // Filtro insensível a acentos, caixa, espaços duplos e máscara de CPF/telefone
        const matchedPatients =
            cleanQuery.length >= 2
                ? (candidatePatients || []).filter((patient: any) => matchesPatientSearch(patient, cleanQuery))
                : candidatePatients || []

        const maxResults = allowedPatientIds ? 200 : 50
        const slicedPatients = matchedPatients.slice(0, maxResults)

        // Format results
        const results = slicedPatients.map((patient: any) => ({
            id: patient.id,
            full_name: patient.full_name,
            cpf: patient.cpf ? formatCPF(patient.cpf) : null,
            email: patient.email,
            phone: patient.phone ? formatPhone(patient.phone) : null,
            date_of_birth: patient.date_of_birth,
            match_type: determineMatchType(patient, cleanQuery, numericQuery),
        }))

        // Sort by relevance (exact matches first, keeping alphabetical order on tie)
        if (cleanQuery.length >= 2) {
            results.sort((a: any, b: any) => {
                if (a.match_type === 'exact' && b.match_type !== 'exact') return -1
                if (b.match_type === 'exact' && a.match_type !== 'exact') return 1
                return 0
            })
        }

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
    const cleanCpf = normalizeDigits(patient.cpf)
    const cleanPhone = normalizeDigits(patient.phone)
    const normName = normalizeSearchText(patient.full_name)
    const normEmail = normalizeSearchText(patient.email)
    const normQuery = normalizeSearchText(query)

    if (numericQuery && (cleanCpf === numericQuery || cleanPhone === numericQuery)) return 'exact'
    if (normQuery && (normName === normQuery || normEmail === normQuery)) return 'exact'

    return 'partial'
}
