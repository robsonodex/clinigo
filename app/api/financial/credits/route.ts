import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patientId');
        
        let query = supabase
            .from('patient_credits')
            .select(`
                *,
                patient:patients(full_name, cpf),
                origin:financial_entries!patient_credits_origin_entry_id_fkey(description),
                used:financial_entries!patient_credits_used_entry_id_fkey(description)
            `)
            .eq('clinic_id', profile.clinic_id);

        if (patientId) {
            query = query.eq('patient_id', patientId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('[CREDITS] Erro ao buscar:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('[CREDITS] Erro interno:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
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
        
        // Validação básica
        if (!body.patient_id || !body.amount || !body.reason) {
            return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('patient_credits')
            .insert({
                clinic_id: profile.clinic_id,
                patient_id: body.patient_id,
                amount: body.amount,
                reason: body.reason,
                expires_at: body.expires_at || null,
            })
            .select()
            .single();

        if (error) {
            console.error('[CREDITS] Erro ao criar:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('[CREDITS] Erro interno:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
}
