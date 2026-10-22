import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const PUT = withAxiom(async (request: AxiomRequest, { params }: { params: { id: string } }) => {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const body = await request.json();
        
        const { data, error } = await supabase
            .from('patient_credits')
            .update({
                amount: body.amount,
                reason: body.reason,
                expires_at: body.expires_at || null,
                used_at: body.used_at || null,
            })
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)
            .select()
            .single();

        if (error) {
            console.error('[CREDITS] Erro ao atualizar:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        request.log.error('financial/credits/[id]', { error: error instanceof Error ? error.message : String(error) })
        console.error('[CREDITS] Erro interno:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
})

export const DELETE = withAxiom(async (request: AxiomRequest, { params }: { params: { id: string } }) => {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { error } = await supabase
            .from('patient_credits')
            .delete()
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id);

        if (error) {
            console.error('[CREDITS] Erro ao excluir:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        request.log.error('financial/credits/[id]', { error: error instanceof Error ? error.message : String(error) })
        console.error('[CREDITS] Erro interno:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
})
