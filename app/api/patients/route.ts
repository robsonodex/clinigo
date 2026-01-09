import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema
const PatientSchema = z.object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().min(10, 'Telefone inválido'),
    date_of_birth: z.string().optional(),
    gender: z.enum(['M', 'F', 'O']).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),
    blood_type: z.string().optional(),
    allergies: z.string().optional(),
    observations: z.string().optional(),
})

// GET - List patients for clinic
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Get user's clinic
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id && profile?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Get search params
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('page_size') || '50')

        // Build query
        let query = supabase
            .from('patients')
            .select('*', { count: 'exact' })
            .eq('is_active', true)

        // Filter by clinic (unless super admin viewing all)
        if (profile?.clinic_id) {
            query = query.eq('clinic_id', profile.clinic_id)
        }

        // Search filter
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,cpf.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
        }

        // Pagination and ordering
        query = query
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1)

        const { data: patients, error, count } = await query

        if (error) {
            console.error('Patients fetch error:', error)
            return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 })
        }

        return NextResponse.json(patients || [], {
            headers: {
                'X-Total-Count': String(count || 0),
            }
        })

    } catch (error) {
        console.error('Patients error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST - Create new patient
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Get user's clinic
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const body = await request.json()
        const validatedData = PatientSchema.parse(body)

        // Check for duplicate CPF if provided
        if (validatedData.cpf) {
            const { data: existing } = await supabase
                .from('patients')
                .select('id')
                .eq('clinic_id', profile.clinic_id)
                .eq('cpf', validatedData.cpf)
                .eq('is_active', true)
                .single()

            if (existing) {
                return NextResponse.json({
                    error: 'Já existe um paciente com este CPF cadastrado'
                }, { status: 409 })
            }
        }

        // Insert patient
        const { data: patient, error } = await supabase
            .from('patients')
            .insert({
                clinic_id: profile.clinic_id,
                full_name: validatedData.full_name,
                cpf: validatedData.cpf || null,
                email: validatedData.email || null,
                phone: validatedData.phone,
                date_of_birth: validatedData.date_of_birth || null,
                gender: validatedData.gender || null,
                address: validatedData.address || null,
                city: validatedData.city || null,
                state: validatedData.state || null,
                zip_code: validatedData.zip_code || null,
                blood_type: validatedData.blood_type || null,
                allergies: validatedData.allergies || null,
                observations: validatedData.observations || null,
            })
            .select()
            .single()

        if (error) {
            console.error('Patient create error:', error)
            return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 })
        }

        return NextResponse.json(patient, { status: 201 })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Dados inválidos',
                details: error.errors
            }, { status: 400 })
        }
        console.error('Patient create error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
