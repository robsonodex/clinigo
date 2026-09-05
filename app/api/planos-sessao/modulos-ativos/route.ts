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

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: dbUser } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .maybeSingle()

        const clinicId = dbUser?.clinic_id

        // Validação estrita de acesso
        const access = await verifySessionPlanAccess({
            clinicId,
            userId: user.id,
            route: '/api/planos-sessao/modulos-ativos',
        })

        if (!access.isAllowed) {
            // Retorna 404 para não vazar a existência da API para clínicas não autorizadas
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            clinicId,
            specialties: access.enabledSpecialties,
        })
    } catch (err) {
        console.error('[API-PLANOS-SESSAO] Erro:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
