import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
        birth_date,
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
