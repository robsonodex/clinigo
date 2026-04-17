// app/api/tiss/glosas/[id]/contest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// ============================================
// SCHEMAS
// ============================================

const createContestSchema = z.object({
    contest_reason: z.string().min(10, 'Justificativa deve ter ao menos 10 caracteres'),
    deadline_days: z.number().min(1).max(90).optional().default(30),
});

const updateContestSchema = z.object({
    contest_status: z.enum(['IN_REVIEW', 'ACCEPTED', 'REVERSED', 'CLOSED']),
    response_text: z.string().optional(),
    approved_value: z.number().min(0).optional(),
});

// ============================================
// POST /api/tiss/glosas/[id]/contest
// Criar recurso de glosa
// ============================================

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: glosa_id } = await params;
        const supabase = await createClient();

        // Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        // RBAC: CLINIC_ADMIN ou SUPER_ADMIN
        if (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ success: false, error: 'Sem permissão para contestar glosas' }, { status: 403 });
        }

        // Validar body
        const body = await request.json();
        const validated = createContestSchema.parse(body);

        // Buscar glosa
        const { data: glosa } = await supabase
            .from('tiss_glosas')
            .select('*')
            .eq('id', glosa_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!glosa) {
            return NextResponse.json({ success: false, error: 'Glosa não encontrada' }, { status: 404 });
        }

        // Verificar se pode ser contestada
        if (glosa.can_appeal === false) {
            return NextResponse.json(
                { success: false, error: 'Esta glosa não permite recurso' },
                { status: 400 }
            );
        }

        // Verificar se já existe contest ativo
        const { data: existingContest } = await supabase
            .from('tiss_glosa_contests')
            .select('id, contest_status')
            .eq('glosa_id', glosa_id)
            .in('contest_status', ['PENDING', 'IN_REVIEW'])
            .limit(1);

        if (existingContest && existingContest.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Já existe um recurso ativo para esta glosa' },
                { status: 409 }
            );
        }

        // Calcular deadline
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + validated.deadline_days);

        // Criar contest
        const { data: contest, error: createError } = await supabase
            .from('tiss_glosa_contests')
            .insert({
                glosa_id,
                clinic_id: profile.clinic_id,
                contest_reason: validated.contest_reason,
                contest_status: 'PENDING',
                deadline_at: deadline.toISOString().split('T')[0],
                submitted_by: user.id,
                submitted_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (createError) {
            console.error('[TISS] Erro ao criar recurso:', createError);
            return NextResponse.json({ success: false, error: 'Erro ao criar recurso' }, { status: 500 });
        }

        // Atualizar status da glosa
        await supabase
            .from('tiss_glosas')
            .update({ contest_status: 'IN_REVIEW' })
            .eq('id', glosa_id);

        // Audit log
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'TISS_GLOSA_CONTEST_CREATED',
            entity_type: 'tiss_glosa_contest',
            entity_id: contest.id,
            metadata: { glosa_id, glosa_value: glosa.glosa_value, deadline: deadline.toISOString() }
        });

        return NextResponse.json({
            success: true,
            data: contest,
            message: 'Recurso de glosa criado com sucesso',
        }, { status: 201 });

    } catch (error: any) {
        console.error('[TISS] Erro ao criar recurso de glosa:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// ============================================
// GET /api/tiss/glosas/[id]/contest
// Listar contests de uma glosa específica
// ============================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: glosa_id } = await params;
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

        const { data: contests, error } = await supabase
            .from('tiss_glosa_contests')
            .select(`
                *,
                attachments:tiss_glosa_contest_attachments(*),
                submitted_by_user:users!tiss_glosa_contests_submitted_by_fkey(full_name)
            `)
            .eq('glosa_id', glosa_id)
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[TISS] Erro ao listar contests:', error);
            return NextResponse.json({ success: false, error: 'Erro ao buscar recursos' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: contests });

    } catch (error: any) {
        console.error('[TISS] Erro:', error);
        return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// ============================================
// PUT /api/tiss/glosas/[id]/contest
// Atualizar resposta do recurso (operadora respondeu)
// ============================================

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: glosa_id } = await params;
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

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        if (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const validated = updateContestSchema.parse(body);

        // Buscar contest ativo para esta glosa
        const { data: contest } = await supabase
            .from('tiss_glosa_contests')
            .select('*')
            .eq('glosa_id', glosa_id)
            .eq('clinic_id', profile.clinic_id)
            .in('contest_status', ['PENDING', 'IN_REVIEW'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!contest) {
            return NextResponse.json({ success: false, error: 'Nenhum recurso ativo encontrado para esta glosa' }, { status: 404 });
        }

        // Atualizar contest
        const updateData: any = {
            contest_status: validated.contest_status,
            responded_at: new Date().toISOString(),
        };

        if (validated.response_text) updateData.response_text = validated.response_text;
        if (validated.approved_value !== undefined) updateData.approved_value = validated.approved_value;

        // Se REVERSED, calcular valor revertido
        if (validated.contest_status === 'REVERSED') {
            const { data: glosa } = await supabase
                .from('tiss_glosas')
                .select('glosa_value')
                .eq('id', glosa_id)
                .single();

            updateData.reversed_value = validated.approved_value || glosa?.glosa_value || 0;
        }

        const { data: updatedContest, error: updateError } = await supabase
            .from('tiss_glosa_contests')
            .update(updateData)
            .eq('id', contest.id)
            .select()
            .single();

        if (updateError) {
            console.error('[TISS] Erro ao atualizar recurso:', updateError);
            return NextResponse.json({ success: false, error: 'Erro ao atualizar recurso' }, { status: 500 });
        }

        // Atualizar status da glosa
        const glosaContestStatus = validated.contest_status === 'REVERSED' ? 'REVERSED'
            : validated.contest_status === 'ACCEPTED' ? 'ACCEPTED'
            : validated.contest_status === 'CLOSED' ? 'CLOSED'
            : 'IN_REVIEW';

        await supabase
            .from('tiss_glosas')
            .update({ contest_status: glosaContestStatus })
            .eq('id', glosa_id);

        // Se revertido, atualizar a guia (receita líquida)
        if (validated.contest_status === 'REVERSED') {
            const { data: glosa } = await supabase
                .from('tiss_glosas')
                .select('guide_id, glosa_value')
                .eq('id', glosa_id)
                .single();

            if (glosa?.guide_id) {
                const reversedAmount = validated.approved_value || glosa.glosa_value || 0;

                // Buscar guia e recalcular
                const { data: guide } = await supabase
                    .from('tiss_guides')
                    .select('total_value, glosa_value')
                    .eq('id', glosa.guide_id)
                    .single();

                if (guide) {
                    const newGlosaValue = Math.max(0, (guide.glosa_value || 0) - reversedAmount);
                    await supabase
                        .from('tiss_guides')
                        .update({
                            glosa_value: newGlosaValue,
                            status: newGlosaValue === 0 ? 'APPROVED' : 'PARTIAL',
                        })
                        .eq('id', glosa.guide_id);
                }
            }
        }

        // Audit log
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'TISS_GLOSA_CONTEST_UPDATED',
            entity_type: 'tiss_glosa_contest',
            entity_id: contest.id,
            metadata: { new_status: validated.contest_status, glosa_id }
        });

        return NextResponse.json({
            success: true,
            data: updatedContest,
            message: `Recurso atualizado para: ${validated.contest_status}`,
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao atualizar recurso:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
    }
}
