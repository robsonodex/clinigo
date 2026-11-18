import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';

/**
 * GET /api/tiss/glosas
 * List glosas for clinic (suporta eligible_for_appeal=true excluindo glosas irrecuperáveis)
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'retorno.ver');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: profile } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = profile?.clinic_id || guard.session?.clinicId;
        if (!clinicId) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const eligibleForAppeal = searchParams.get('eligible_for_appeal') === 'true';

        let query = adminDb
            .from('tiss_glosas')
            .select(`
                *,
                guide:tiss_guides(id, guide_number, patient_name, procedure_name, health_insurance_id, batch_id)
            `)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .neq('status', 'CANCELLED');

        if (eligibleForAppeal) {
            query = query
                .eq('is_irrecoverable', false)
                .eq('can_appeal', true)
                .eq('status', 'OPEN');
        }

        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
        }

        const { data: glosas, error } = await query
            .order('created_at', { ascending: false })
            .limit(150);

        if (error) {
            console.error('[TISS] Erro ao buscar glosas:', error);
            return NextResponse.json(
                { success: false, error: 'Erro ao buscar glosas' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: glosas || [],
            count: (glosas || []).length,
        });
    } catch (error: any) {
        request.log.error('tiss/glosas', { error: error instanceof Error ? error.message : String(error) });
        console.error('[TISS] Erro na listagem de glosas:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
});
