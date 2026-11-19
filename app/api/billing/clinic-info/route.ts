import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id'

// =============================================================================
// API GET /api/billing/clinic-info
// =============================================================================

export const GET = withAxiom(async (req: AxiomRequest) => {
    try {
        const supabase = await createClient()

        // 1. Verificar autenticação (aproveita headers já verificados pelo middleware)
        let clinicId: string | null = req.headers.get('x-clinic-id')
        let userRole: string | null = req.headers.get('x-user-role')

        if (!clinicId && userRole !== 'SUPER_ADMIN') {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser()

            if (authError || !user) {
                return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
            }

            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id, role')
                .eq('id', user.id)
                .single()

            userRole = userData?.role || null
            const resolved = await resolveClinicId({
                profileClinicId: userData?.clinic_id,
                profileRole: userData?.role || '',
            })
            clinicId = resolved.clinicId
        }

        if (!clinicId) {
            if (userRole === 'SUPER_ADMIN') {
                return NextResponse.json(
                    {
                        id: null,
                        name: 'Administração Geral',
                        plan_type: 'ENTERPRISE',
                        payment_status: 'PAID',
                    },
                    {
                        headers: {
                            'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
                        },
                    }
                )
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

        return NextResponse.json(clinic, {
            headers: {
                'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
            },
        })
    } catch (error) {
        req.log.error('billing/clinic-info', { error: error instanceof Error ? error.message : String(error) })
        console.error('Erro ao buscar dados da clínica:', error)
        return NextResponse.json(
            {
                error: 'Erro ao carregar dados',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
})
