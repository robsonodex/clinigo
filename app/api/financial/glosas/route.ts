import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const postGlosaSchema = z.object({
  guide_id: z.string().uuid(),
  glosa_type: z.enum(["TOTAL", "PARTIAL"]),
  glosa_code: z.string().optional(),
  glosa_description: z.string().min(3),
  glosa_value: z.number().min(0.01),
  original_value: z.number().min(0.01),
  approved_value: z.number().min(0),
});

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id || profile.role === 'RECEPTIONIST') {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
        }

        // We want all guides that are DENIED or PARTIALLY_APPROVED
        // and fetch the current tiss_glosas if it exists.
        // Easiest is to select from tiss_guides and inner join (or left join) tiss_glosas.
        const { data: guides, error } = await supabase
            .from('tiss_guides')
            .select(`
                id,
                guide_number,
                patient_name,
                patient_cpf,
                execution_date,
                total_amount,
                paid_amount,
                glosa_amount,
                glosa_reason,
                status,
                tiss_batches ( batch_number, operator:insurance_operators(name) ),
                tiss_glosas (
                    id,
                    appeal_status,
                    glosa_type,
                    appeal_deadline
                )
            `)
            .in('status', ['DENIED', 'PARTIALLY_APPROVED'])
            .eq('clinic_id', profile.clinic_id)
            .order('execution_date', { ascending: false });

        if (error) {
            console.error('[FINANCIAL GLOSAS] Erro GET:', error);
            return NextResponse.json({ success: false, error: 'Erro ao listar guias para contestação' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: guides });

    } catch (error: any) {
         console.error('[FINANCIAL GLOSAS] Erro Interno GET:', error);
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
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Acesso negado para gerenciar glosas' }, { status: 403 });
        }

        const body = await request.json();
        const validated = postGlosaSchema.parse(body);

        // Calculate a sample deadline (e.g., 30 days from now)
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30);

        // Check if a glosa row already exists for this guide to prevent duplicates causing issues
        const { data: existingGlosa } = await supabase
            .from('tiss_glosas')
            .select('id')
            .eq('guide_id', validated.guide_id)
            .eq('clinic_id', profile.clinic_id)
            .maybeSingle();

        if (existingGlosa) {
            return NextResponse.json({ success: false, error: 'Esta guia já possui um registro ativo em TISS Glosas.' }, { status: 400 });
        }

        // Insert new glosa record with status PENDING_APPEAL
        const { data: newGlosa, error: insertError } = await supabase
            .from('tiss_glosas')
            .insert({
                guide_id: validated.guide_id,
                clinic_id: profile.clinic_id,
                glosa_type: validated.glosa_type,
                glosa_code: validated.glosa_code || null,
                glosa_description: validated.glosa_description,
                glosa_value: validated.glosa_value,
                original_value: validated.original_value,
                approved_value: validated.approved_value,
                can_appeal: true,
                appeal_deadline: deadline.toISOString().split('T')[0],
                appeal_status: 'PENDING_APPEAL'
            })
            .select()
            .single();

        if (insertError) {
            console.error('[FINANCIAL GLOSAS] Insert error:', insertError);
            return NextResponse.json({ success: false, error: 'Falha ao registrar a contestação na base', details: insertError }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: newGlosa });

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Validation Error', details: error.errors }, { status: 400 });
        }
        console.error('[FINANCIAL GLOSAS] Erro Interno POST:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
}
