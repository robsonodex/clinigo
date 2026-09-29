import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/tiss/glosas/reasons
 * Lista motivos de glosa oficiais da ANS (Tabela 38/61)
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const searchRaw = searchParams.get('q') || '';
        const sanitized = searchRaw.replace(/[,()]/g, '').trim();

        let query = supabase
            .from('tiss_glosa_reasons_ans')
            .select('*')
            .eq('is_active', true);

        if (category) {
            query = query.eq('category', category);
        }

        if (sanitized) {
            if (/^\d+$/.test(sanitized)) {
                query = query.ilike('code', `${sanitized}%`);
            } else {
                query = query.ilike('description', `%${sanitized}%`);
            }
        }

        const { data, error } = await query.order('code', { ascending: true });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
