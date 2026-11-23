import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
/**
 * GET /api/planos-sessao/modulos-ativos
 * Retorna as especialidades de planos de sessão habilitadas para a clínica do usuário logado.
 * Retorna 404 para qualquer clínica fora da Allowlist (Camada A).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
    getEnabledSessionPlanSpecialties,
    verifySessionPlanAccess,
} from '@/lib/services/session-plans-guard'

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: dbUser } = await (supabase as any)
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .maybeSingle()

        const clinicId = (dbUser as { clinic_id?: string | null } | null)?.clinic_id ?? null

        // Validação estrita de acesso
        const access = await verifySessionPlanAccess({
            clinicId,
            userId: user.id,
            route: '/api/planos-sessao/modulos-ativos',
        })

        if (!access.isAllowed) {
            return NextResponse.json({
                success: true,
                isAllowed: false,
                specialties: [],
                evolutionManualEnabled: false,
            })
        }

        return NextResponse.json({
            success: true,
            clinicId,
            specialties: access.enabledSpecialties,
            evolutionManualEnabled: access.evolutionManualEnabled !== false,
        })
    } catch (err) {
        request.log.error('planos-sessao/modulos-ativos', { error: err instanceof Error ? err.message : String(err) })
        console.error('[API-PLANOS-SESSAO] Erro:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
