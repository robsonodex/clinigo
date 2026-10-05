import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';

export async function GET(request: NextRequest) {
    const guard = await requireTissAction(request, 'guia.ver');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('q') || '';

        let query = supabase
            .from('tiss_guides')
            .select('id, guide_number, patient_name, procedure_code, procedure_name, total_value, glosa_value, status, execution_date')
            .eq('clinic_id', profile.clinic_id)
            .is('deleted_at', null)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: false })
            .limit(30);

        if (search.trim()) {
            query = query.or(`guide_number.ilike.%${search.trim()}%,patient_name.ilike.%${search.trim()}%`);
        }

        const { data: guides, error } = await query;

        if (error) {
            console.error('[TISS] Erro ao buscar guias para glosa manual:', error);
            return NextResponse.json({ error: 'Erro ao listar guias' }, { status: 500 });
        }

        const mapped = (guides || []).map((g: any) => {
            const total = Number(g.total_value) || 0;
            const glosa = Number(g.glosa_value) || 0;
            return {
                id: g.id,
                guide_number: g.guide_number,
                patient_name: g.patient_name,
                procedure_code: g.procedure_code,
                procedure_name: g.procedure_name,
                total_value: total,
                glosa_value: glosa,
                available_balance: Math.max(0, Number((total - glosa).toFixed(2))),
                status: g.status,
            };
        });

        return NextResponse.json({ success: true, data: mapped });
    } catch (err: any) {
        console.error('[TISS] Falha interna em available-for-glosa:', err);
        return NextResponse.json({ error: 'Erro interno ao consultar guias' }, { status: 500 });
    }
}
