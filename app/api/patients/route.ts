import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET /api/patients?search=query
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // OBRIGATÓRIO: Buscar clinic_id do usuário logado para isolamento multi-tenant
        const { data: userDataRaw } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const userData = userDataRaw as { clinic_id: string | null; role: string | null } | null

        // Somente SUPER_ADMIN pode ver sem filtro de clínica
        if (!userData) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 400 })
        }

        if (!userData.clinic_id && userData.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        // Get search params
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''

        let query = supabase
            .from('patients')
            .select(`
        id,
        full_name,
        cpf,
        date_of_birth,
        phone,
        email,
        created_at,
        updated_at,
        billing_type,
        health_insurance_id,
        insurance_card_number,
        insurance_validity,
        insurance_plan_name,
        insurance_holder_name,
        insurance_holder_cpf,
        health_insurances (
            id,
            name,
            code
        )
      `)

        // OBRIGATÓRIO: Filtro por clinic_id (exceto Super Admin)
        if (userData.role !== 'SUPER_ADMIN') {
            query = query.eq('clinic_id', userData.clinic_id)
        }

        // Não listar pacientes excluídos (soft-deleted) ou inativos
        query = query.is('deleted_at', null).neq('is_active', false)

        // DOCTOR não-coordenador: filtrar apenas pacientes com agendamentos do doctor
        if (userData.role === 'DOCTOR') {
            const { data: userFull } = await supabase
                .from('users')
                .select('is_coordinator')
                .eq('id', user.id)
                .single()

            if (!(userFull as any)?.is_coordinator) {
                // Buscar doctor_id do usuário
                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()

                if (doctor) {
                    // Buscar patient_ids dos agendamentos deste doctor
                    const { data: appointments } = await supabase
                        .from('appointments')
                        .select('patient_id')
                        .eq('doctor_id', doctor.id)

                    const patientIds = [...new Set((appointments || []).map((a: any) => a.patient_id).filter(Boolean))]
                    if (patientIds.length > 0) {
                        query = query.in('id', patientIds)
                    } else {
                        return NextResponse.json({ patients: [] })
                    }
                }
            }
        }

        // Search functionality
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,cpf.ilike.%${search}%,email.ilike.%${search}%`)
        }

        // Limit support (default to 1000 so clinics can see all patients without truncation)
        const limitParam = searchParams.get('limit')
        const limit = limitParam === 'all' ? 10000 : limitParam ? parseInt(limitParam, 10) : 1000

        // Order by name
        query = query.order('full_name', { ascending: true }).limit(limit)

        const { data: patients, error } = await query

        if (error) {
            console.error('Error fetching patients:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ 
            patients,
            total: patients?.length || 0
        })
    } catch (error) {
        console.error('Error in patients API:', error)
        return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 })
    }
}

const createPatientSchema = z.object({
    full_name: z.string().min(3),
    cpf: z.string().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    date_of_birth: z.string().optional(),
    gender: z.string().optional(),
    address: z.any().optional(),
    address_street: z.string().optional().or(z.literal('')),
    address_number: z.string().optional().or(z.literal('')),
    address_complement: z.string().optional().or(z.literal('')),
    address_neighborhood: z.string().optional().or(z.literal('')),
    address_city: z.string().optional().or(z.literal('')),
    address_state: z.string().optional().or(z.literal('')),
    address_zip_code: z.string().optional().or(z.literal('')),
    insurance_holder_name: z.string().optional().or(z.literal('')),
    insurance_holder_cpf: z.string().optional().or(z.literal('')),
    billing_type: z.enum(['particular', 'convenio', 'ambos']).optional().default('particular'),
    health_insurance_id: z.string().uuid().optional().nullable().or(z.literal('')),
    insurance_card_number: z.string().optional().or(z.literal('')),
    insurance_validity: z.string().optional().or(z.literal('')),
    insurance_plan_name: z.string().optional().or(z.literal('')),
    clinic_id: z.string().optional()
})

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()
        const data = createPatientSchema.parse(body)

        // Clean CPF if provided
        const cleanCPF = data.cpf ? data.cpf.replace(/\D/g, '') : null

        // Get user clinic if not provided
        let clinicId = data.clinic_id
        if (!clinicId) {
            const { data: profile } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single()
            clinicId = profile?.clinic_id
        }

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        // Montar objeto de endereço JSONB estruturado (compatível com a tela de edição)
        let addressObj: any = null
        if (data.address && typeof data.address === 'object') {
            addressObj = data.address
        } else {
            const obj: any = {}
            if (data.address_street?.trim()) obj.street = data.address_street.trim()
            if (data.address_number?.trim()) obj.number = data.address_number.trim()
            if (data.address_complement?.trim()) obj.complement = data.address_complement.trim()
            if (data.address_neighborhood?.trim()) obj.neighborhood = data.address_neighborhood.trim()
            if (data.address_city?.trim()) obj.city = data.address_city.trim()
            if (data.address_state?.trim()) obj.state = data.address_state.trim().toUpperCase()
            if (data.address_zip_code?.trim()) obj.zip_code = data.address_zip_code.replace(/\D/g, '')

            if (Object.keys(obj).length > 0) {
                addressObj = obj
            } else if (typeof data.address === 'string' && data.address.trim()) {
                addressObj = { street: data.address.trim() }
            }
        }

        // Mapear também para colunas separadas para consistência total
        const addressNumber = addressObj?.number || data.address_number || null
        const addressComplement = addressObj?.complement || data.address_complement || null
        const neighborhood = addressObj?.neighborhood || data.address_neighborhood || null
        const city = addressObj?.city || data.address_city || null
        const state = addressObj?.state || data.address_state || null
        const zipCode = addressObj?.zip_code || (data.address_zip_code ? data.address_zip_code.replace(/\D/g, '') : null)

        const isConvenioOrBoth = data.billing_type === 'convenio' || data.billing_type === 'ambos'
        const billingType = ['particular', 'convenio', 'ambos'].includes(data.billing_type as string)
            ? data.billing_type
            : 'particular'
        const healthInsuranceId = isConvenioOrBoth && data.health_insurance_id ? data.health_insurance_id : null
        const insuranceCardNumber = isConvenioOrBoth ? (data.insurance_card_number?.trim() || null) : null
        const insuranceValidity = isConvenioOrBoth && data.insurance_validity ? data.insurance_validity : null
        const insurancePlanName = isConvenioOrBoth ? (data.insurance_plan_name?.trim() || null) : null

        const insertData = {
            full_name: data.full_name,
            cpf: cleanCPF,
            email: data.email || null,
            phone: data.phone || null,
            date_of_birth: data.date_of_birth || null,
            gender: data.gender || null,
            billing_type: billingType,
            health_insurance_id: healthInsuranceId,
            insurance_card_number: insuranceCardNumber,
            insurance_validity: insuranceValidity,
            insurance_plan_name: insurancePlanName,
            insurance_holder_name: data.insurance_holder_name || null,
            insurance_holder_cpf: data.insurance_holder_cpf ? data.insurance_holder_cpf.replace(/\D/g, '') : null,
            health_insurance: {
                billing_type: billingType,
                health_insurance_id: healthInsuranceId,
                insurance_card_number: insuranceCardNumber,
                insurance_validity: insuranceValidity,
                insurance_plan_name: insurancePlanName,
                insurance_holder_name: data.insurance_holder_name || null,
                insurance_holder_cpf: data.insurance_holder_cpf || null,
            },
            clinic_id: clinicId,
            address: addressObj,
            address_number: addressNumber,
            address_complement: addressComplement,
            neighborhood: neighborhood,
            city: city,
            state: state,
            zip_code: zipCode,
            updated_at: new Date().toISOString()
        } as any

        const { data: patient, error } = await supabase
            .from('patients')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            console.error('Error creating patient:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json(patient)

    } catch (error) {
        console.error('Error in patients POST:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 })
        }
        return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 })
    }
}
