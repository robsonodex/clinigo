import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { z } from 'zod';

const createAppealSchema = z.object({
    health_insurance_id: z.string().uuid('ID da operadora inválido'),
    general_reason: z.string().min(10, 'A justificativa geral deve ter ao menos 10 caracteres'),
    items: z.array(z.object({
        glosa_id: z.string().uuid('ID da glosa inválido'),
        contested_value: z.number().positive('O valor contestado deve ser maior que zero'),
        item_reason: z.string().optional(),
    })).min(1, 'Selecione ao menos uma glosa para compor o recurso'),
});

// GET /api/tiss/appeals - Listar recursos de glosa com filtros
export async function GET(request: NextRequest) {
    const guard = await requireTissAction(request, 'recurso.ver');
    if (!guard.authorized) {
        return guard.response;
    }

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

        const clinicId = profile.clinic_id;

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const operatorId = searchParams.get('operator_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        let query = supabase
            .from('tiss_appeals')
            .select(`
                *,
                health_insurance:health_insurances(id, name, code, appeal_deadline_days),
                items:tiss_appeal_items(id, original_glosa_value, contested_value, recovered_value, status, item_code),
                attachments:tiss_appeal_attachments(id, file_name, file_size, source_type, created_at)
            `)
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false });

        if (status && status !== 'ALL') {
            query = query.eq('status', status);
        }
        if (operatorId) {
            query = query.eq('health_insurance_id', operatorId);
        }
        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
        }

        const { data: appeals, error } = await query;

        if (error) {
            console.error('[TISS] Erro ao listar recursos de glosa:', error);
            return NextResponse.json({ success: false, error: 'Erro ao buscar recursos' }, { status: 500 });
        }

        const appealList = appeals || [];

        // Calcular contadores por status para filtros F1
        const counts = {
            total: appealList.length,
            in_preparation: appealList.filter(a => a.status === 'IN_PREPARATION').length,
            released: appealList.filter(a => a.status === 'RELEASED').length,
            sent: appealList.filter(a => a.status === 'SENT').length,
            accepted: appealList.filter(a => a.status === 'ACCEPTED').length,
            partial: appealList.filter(a => a.status === 'PARTIAL').length,
            denied: appealList.filter(a => a.status === 'DENIED').length,
            finished: appealList.filter(a => a.status === 'FINISHED').length,
        };

        return NextResponse.json({
            success: true,
            data: appealList,
            counts,
        });

    } catch (error: any) {
        console.error('[TISS] Erro interno ao listar recursos:', error);
        return NextResponse.json({ success: false, error: 'Erro interno ao consultar recursos' }, { status: 500 });
    }
}

// POST /api/tiss/appeals - Criar lote de recurso de glosa (C1, C2, C3, C5)
export async function POST(request: NextRequest) {
    const guard = await requireTissAction(request, 'recurso.criar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const body = await request.json();
        const validated = createAppealSchema.parse(body);

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

        const clinicId = profile.clinic_id;

        // 1. Buscar a operadora para obter appeal_deadline_days (C5)
        const { data: insurance, error: insError } = await supabase
            .from('health_insurances')
            .select('id, name, appeal_deadline_days')
            .eq('id', validated.health_insurance_id)
            .eq('clinic_id', clinicId)
            .single();

        if (insError || !insurance) {
            return NextResponse.json({ success: false, error: 'Operadora não encontrada para esta clínica' }, { status: 404 });
        }

        const deadlineDays = insurance.appeal_deadline_days || 30;

        // 2. Buscar todas as glosas informadas
        const glosaIds = validated.items.map(i => i.glosa_id);
        const { data: glosas, error: glosasError } = await supabase
            .from('tiss_glosas')
            .select(`
                id, guide_id, glosa_value, glosa_code, glosa_description, item_code, created_at,
                guide:tiss_guides(id, guide_number, total_value, operator_id, health_insurance_id)
            `)
            .in('id', glosaIds)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .neq('status', 'CANCELLED');

        if (glosasError || !glosas || glosas.length !== glosaIds.length) {
            return NextResponse.json({
                success: false,
                error: 'Uma ou mais glosas selecionadas são inválidas ou não pertencem a esta clínica.'
            }, { status: 400 });
        }

        // 3. Validação: todas as glosas devem pertencer à mesma operadora (C1)
        for (const g of glosas) {
            const guide = g.guide as any;
            const guideOpId = guide?.operator_id || guide?.health_insurance_id;
            if (guideOpId && guideOpId !== validated.health_insurance_id) {
                return NextResponse.json({
                    success: false,
                    error: `A glosa ${g.glosa_code} da guia ${guide?.guide_number} pertence a operadora diferente da selecionada.`
                }, { status: 400 });
            }
        }

        // 4. Validação: nenhuma glosa pode já estar em recurso ativo
        const { data: activeAppeals } = await supabase
            .from('tiss_appeal_items')
            .select('id, glosa_id, status')
            .in('glosa_id', glosaIds)
            .eq('clinic_id', clinicId)
            .neq('status', 'CANCELLED');

        if (activeAppeals && activeAppeals.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Uma ou mais glosas selecionadas já possuem recurso em andamento.',
                code: 'GLOSA_ALREADY_IN_APPEAL'
            }, { status: 409 });
        }

        // 5. Validação de valor: contested_value <= original_glosa_value para cada item (C2)
        const glosaMap = new Map<string, any>();
        glosas.forEach(g => glosaMap.set(g.id, g));

        let totalGlosa = 0;
        let totalContested = 0;
        let oldestGlosaDate = new Date();

        for (const item of validated.items) {
            const glosaRecord = glosaMap.get(item.glosa_id);
            const originalVal = Number(glosaRecord.glosa_value) || 0;

            if (item.contested_value > originalVal) {
                return NextResponse.json({
                    success: false,
                    error: `Valor recursado (R$ ${item.contested_value.toFixed(2)}) não pode ser superior ao valor glosado original (R$ ${originalVal.toFixed(2)}).`,
                    code: 'CONTESTED_VALUE_EXCEEDS_GLOSA'
                }, { status: 422 });
            }

            totalGlosa += originalVal;
            totalContested += item.contested_value;

            if (glosaRecord.created_at) {
                const gDate = new Date(glosaRecord.created_at);
                if (gDate < oldestGlosaDate) oldestGlosaDate = gDate;
            }
        }

        // Calcular data limite legal de recurso (C5)
        const deadlineDate = new Date(oldestGlosaDate);
        deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);
        const deadlineAtStr = deadlineDate.toISOString().split('T')[0];

        // 6. Gerar número identificador único do recurso
        const appealNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        const now = new Date().toISOString();

        // 7. Inserir recurso mestre em tiss_appeals
        const { data: appeal, error: insertAppealError } = await supabase
            .from('tiss_appeals')
            .insert({
                clinic_id: clinicId,
                health_insurance_id: validated.health_insurance_id,
                appeal_number: appealNumber,
                status: 'IN_PREPARATION',
                deadline_at: deadlineAtStr,
                general_reason: validated.general_reason,
                total_glosa_value: Number(totalGlosa.toFixed(2)),
                total_contested_value: Number(totalContested.toFixed(2)),
                created_by: user.id,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (insertAppealError || !appeal) {
            console.error('[TISS] Erro ao criar recurso de glosa:', insertAppealError);
            return NextResponse.json({ success: false, error: 'Erro ao registrar lote de recurso' }, { status: 500 });
        }

        // 8. Inserir itens em tiss_appeal_items (C2, C3)
        const appealItemsPayload = validated.items.map(item => {
            const glosaRecord = glosaMap.get(item.glosa_id);
            return {
                clinic_id: clinicId,
                appeal_id: appeal.id,
                glosa_id: item.glosa_id,
                guide_id: glosaRecord.guide_id,
                item_code: glosaRecord.item_code || '10101012',
                item_description: glosaRecord.glosa_description || 'Glosa contestada',
                original_glosa_value: Number(glosaRecord.glosa_value),
                contested_value: item.contested_value,
                item_reason: item.item_reason || validated.general_reason,
                status: 'IN_PREPARATION',
                created_at: now
            };
        });

        const { data: insertedItems, error: itemsError } = await supabase
            .from('tiss_appeal_items')
            .insert(appealItemsPayload)
            .select();

        if (itemsError) {
            console.error('[TISS] Erro ao inserir itens de recurso:', itemsError);
            return NextResponse.json({ success: false, error: 'Erro ao detalhar itens do recurso' }, { status: 500 });
        }

        // 9. Atualizar status das guias para APPEALING via state-machine
        const guideIds = Array.from(new Set(glosas.map(g => g.guide_id).filter(Boolean)));
        if (guideIds.length > 0) {
            await supabase
                .from('tiss_guides')
                .update({ status: 'APPEALING', updated_at: now })
                .in('id', guideIds)
                .eq('clinic_id', clinicId);
        }

        // 10. Gravar auditoria oficial
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'recurso.criar',
            entityType: 'tiss_appeal',
            entityId: appeal.id,
            newState: {
                appeal_number: appealNumber,
                status: 'IN_PREPARATION',
                total_contested_value: totalContested,
                total_glosa_value: totalGlosa,
                deadline_at: deadlineAtStr
            },
            metadata: {
                health_insurance_id: validated.health_insurance_id,
                item_count: validated.items.length,
                total_contested: totalContested,
                deadline_at: deadlineAtStr,
                guide_ids: guideIds
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                appeal,
                items: insertedItems,
                deadline_at: deadlineAtStr,
            },
            message: `Recurso de glosa ${appealNumber} criado com sucesso com ${validated.items.length} item(ns).`
        }, { status: 201 });

    } catch (error: any) {
        console.error('[TISS] Erro ao criar recurso de glosa:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro interno ao criar recurso' }, { status: 500 });
    }
}
