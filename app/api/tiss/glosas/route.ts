// app/api/tiss/glosas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/tiss/glosas
 * Lista glosas com filtros
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Obter clinic_id
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        // Buscar glosas
        const { data: glosas, error } = await supabase
            .from('tiss_glosas')
            .select(`
        *,
        guide:tiss_guides(guide_number, patient_name, procedure_name),
        return:tiss_returns(return_file_name)
      `)
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[TISS] Erro ao buscar glosas:', error);
            return NextResponse.json(
                { success: false, error: 'Erro ao buscar glosas' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: glosas,
            count: glosas.length,
        });

    } catch (error: any) {
        console.error('[TISS] Erro na listagem de glosas:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
