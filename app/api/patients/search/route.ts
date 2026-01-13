/**
 * GET /api/patients/search
 * Search patients by CPF, name, phone, or email
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

        // Get user profile to check permissions and clinic
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, clinic_id')
            .eq('user_id', user.id)
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
        const query = searchParams.get('q')

        if (!query || query.length < 2) {
            return NextResponse.json({ data: [] })
        }

        // Clean query for different search types
        const cleanQuery = query.trim()
        const numericQuery = cleanQuery.replace(/\D/g, '')

        // Build search query
        let searchQuery = supabase
            .from('patients')
            .select('id, full_name, cpf, email, phone, date_of_birth')
            .limit(10)

        // Filter by clinic (unless super admin)
        if (profile.role !== 'SUPER_ADMIN' && profile.clinic_id) {
            searchQuery = searchQuery.eq('clinic_id', profile.clinic_id)
        }

        // Search by different fields
        // Using OR conditions with ilike for partial matching
        if (numericQuery.length >= 3) {
            // Likely CPF or phone search
            searchQuery = searchQuery.or(
                `cpf.ilike.%${numericQuery}%,phone.ilike.%${numericQuery}%`
            )
        } else {
            // Likely name or email search
            searchQuery = searchQuery.or(
                `full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`
            )
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
        console.error('Patient search error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

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
