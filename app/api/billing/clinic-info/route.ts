import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// API GET /api/billing/clinic-info
// =============================================================================

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()

        // 1. Verificar autenticação
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // 2. Buscar clínica do usuário
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!userData?.clinic_id) {
            return NextResponse.json({ error: 'Usuário não vinculado a uma clínica' }, { status: 400 })
        }

        // 3. Buscar dados da clínica
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id, name, plan_type, subscription_due_date, last_payment_date, payment_status')
            .eq('id', userData.clinic_id)
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        return NextResponse.json(clinic)
    } catch (error) {
        console.error('Erro ao buscar dados da clínica:', error)
        return NextResponse.json(
            {
                error: 'Erro ao carregar dados',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
