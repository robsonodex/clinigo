import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { studentSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/students
 * List students for current clinic with optional search filter
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        const searchParams = request.nextUrl.searchParams
        const search = searchParams.get('search')?.trim() || ''
        const status = searchParams.get('status') || 'active'
        const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

        let query = supabase
            .from('students')
            .select(`
                id,
                full_name,
                contact_phone,
                contact_email,
                program,
                status,
                created_at,
                supervising_doctor_id,
                supervising_doctor:doctors!students_supervising_doctor_id_fkey(
                    id,
                    specialty,
                    user:users(full_name)
                )
            `)
            .eq('clinic_id', profile.clinic_id)

        if (status !== 'all') {
            query = query.eq('status', status)
        }

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,program.ilike.%${search}%,contact_phone.ilike.%${search}%,contact_email.ilike.%${search}%`)
        }

        query = query.order('full_name', { ascending: true }).limit(limit)

        const { data, error } = await query

        if (error) {
            console.error('[API /api/students GET] Error:', error)
            return NextResponse.json({ error: 'Erro ao buscar alunas' }, { status: 500 })
        }

        return NextResponse.json({ data: data || [] })
    } catch (err: any) {
        console.error('[API /api/students GET] Unexpected error:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

/**
 * POST /api/students
 * Create a new student for current clinic
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        const body = await request.json()
        const validated = studentSchema.parse(body)

        const insertPayload = {
            clinic_id: profile.clinic_id,
            full_name: validated.full_name.trim(),
            contact_phone: validated.contact_phone ? validated.contact_phone.replace(/\D/g, '') : null,
            contact_email: validated.contact_email ? validated.contact_email.trim().toLowerCase() : null,
            program: validated.program?.trim() || null,
            supervising_doctor_id: validated.supervising_doctor_id || null,
            status: validated.status || 'active',
            created_by: user.id,
        }

        const { data, error } = await supabase
            .from('students')
            .insert(insertPayload)
            .select('id, full_name, contact_phone, contact_email, program, status, supervising_doctor_id')
            .single()

        if (error) {
            console.error('[API /api/students POST] Error:', error)
            return NextResponse.json({ error: 'Erro ao criar cadastro de aluna' }, { status: 500 })
        }

        return NextResponse.json({ data }, { status: 201 })
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
        }
        console.error('[API /api/students POST] Unexpected error:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
