import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id'

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

        // 2. Buscar dados do usuário e resolver clinicId (com suporte a impersonação)
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const { clinicId } = await resolveClinicId({
            profileClinicId: userData?.clinic_id,
            profileRole: userData?.role || '',
        })

        if (!clinicId) {
            if (userData?.role === 'SUPER_ADMIN') {
                return NextResponse.json({
                    id: null,
                    name: 'Administração Geral',
                    plan_type: 'ENTERPRISE',
                    payment_status: 'PAID',
                })
            }
            return NextResponse.json({ error: 'Usuário não vinculado a uma clínica' }, { status: 400 })
        }

        // 3. Buscar dados da clínica
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id, name, plan_type, subscription_due_date, last_payment_date, payment_status')
            .eq('id', clinicId)
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
