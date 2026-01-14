import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Buscar dados do perfil
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Buscar dados completos do usuário
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
        *,
        clinic:clinics(id, name, plan_type),
        doctor:doctors(crm, crm_uf, specialty, consultation_price, consultation_duration)
      `)
            .eq('id', authUser.id)
            .single()

        if (userError) {
            return NextResponse.json({ error: userError.message }, { status: 500 })
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 })
    }
}

// PATCH - Atualizar dados do perfil
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()
        const {
            name,
            phone,
            bio,
            gender,
            birth_date,
            address_street,
            address_number,
            address_complement,
            address_neighborhood,
            address_city,
            address_state,
            address_zipcode,
        } = body

        // Atualizar dados do usuário
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                name,
                phone,
                bio,
                gender,
                birth_date,
                address_street,
                address_number,
                address_complement,
                address_neighborhood,
                address_city,
                address_state,
                address_zipcode,
                updated_at: new Date().toISOString(),
            })
            .eq('id', authUser.id)
            .select()
            .single()

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ user: updatedUser })
    } catch (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
    }
}
