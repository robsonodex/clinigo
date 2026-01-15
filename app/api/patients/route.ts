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

        // Get search params
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const clinicId = searchParams.get('clinic_id')

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
        updated_at
      `)

        // Filter by clinic if provided
        if (clinicId) {
            query = query.eq('clinic_id', clinicId)
        }

        // Search functionality
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,cpf.ilike.%${search}%,email.ilike.%${search}%`)
        }

        // Order by name
        query = query.order('full_name', { ascending: true }).limit(50)

        const { data: patients, error } = await query

        if (error) {
            console.error('Error fetching patients:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ patients })
    } catch (error) {
        console.error('Error in patients API:', error)
        return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 })
    }
}

const createPatientSchema = z.object({
    full_name: z.string().min(3),
    cpf: z.string().min(11),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    date_of_birth: z.string().optional(),
    gender: z.string().optional(),
    address: z.any().optional(),
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

        // Clean CPF
        const cleanCPF = data.cpf.replace(/\D/g, '')

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

        const insertData = {
            ...data,
            cpf: cleanCPF,
            clinic_id: clinicId,
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
