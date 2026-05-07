import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, clinic_id, role')
            .eq('id', user.id)
            .single()

        return NextResponse.json({ id: user.id, email: user.email, ...userData })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
