import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { z } from 'zod';

const manualGlosaSchema = z.object({
    guide_id: z.string().uuid('ID da guia inválido'),
    item_code: z.string().min(1, 'Código do item/procedimento obrigatório'),
    item_description: z.string().optional(),
    glosa_code: z.string().min(1, 'Código ANS da glosa obrigatório'),
    glosa_description: z.string().min(3, 'Descrição do motivo da glosa obrigatória'),
    glosa_type: z.enum(['ADMINISTRATIVA', 'TECNICA', 'LINEAR'], {
        errorMap: () => ({ message: 'Classificação da glosa inválida' })
    }),
    glosa_value: z.number().positive('O valor glosado deve ser maior que zero'),
});

export async function POST(request: NextRequest) {
    const guard = await requireTissAction(request, 'retorno.lancar_glosa_manual');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const body = await request.json();
        const validated = manualGlosaSchema.parse(body);

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

        // 1. Buscar guia
        const { data: guide, error: guideError } = await supabase
            .from('tiss_guides')
            .select('id, guide_number, total_value, paid_value, glosa_value, status, batch_id, patient_name')
            .eq('id', validated.guide_id)
            .eq('clinic_id', clinicId)
            .single();

        if (guideError || !guide) {
            return NextResponse.json({ success: false, error: 'Guia não encontrada' }, { status: 404 });
        }

        if (guide.status === 'CANCELLED') {
            return NextResponse.json({ success: false, error: 'Não é possível lançar glosa em guia cancelada' }, { status: 400 });
        }

        // 2. Buscar glosas ativas já lançadas para esta guia
        const { data: existingGlosas } = await supabase
            .from('tiss_glosas')
            .select('id, glosa_value')
            .eq('guide_id', validated.guide_id)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .neq('status', 'CANCELLED');

        const totalGlosasExistentes = (existingGlosas || []).reduce((acc, g) => acc + (Number(g.glosa_value) || 0), 0);
        const guideTotalValue = Number(guide.total_value) || 0;
        const saldoDisponivel = Math.max(0, guideTotalValue - totalGlosasExistentes);

        // 3. Trava de Valor Estrita: nunca acima do apresentado menos glosas já lançadas
        if (validated.glosa_value > Number(saldoDisponivel.toFixed(2))) {
            return NextResponse.json({
                success: false,
                error: `Valor da glosa (R$ ${validated.glosa_value.toFixed(2)}) não pode ser superior ao saldo apresentado da guia disponível (R$ ${saldoDisponivel.toFixed(2)}).`,
                code: 'GLOSA_VALUE_EXCEEDS_BALANCE',
                saldo_disponivel: Number(saldoDisponivel.toFixed(2)),
                glosas_anteriores: Number(totalGlosasExistentes.toFixed(2)),
                valor_apresentado: guideTotalValue
            }, { status: 422 });
        }

        const now = new Date().toISOString();
        const novaGlosaTotal = Number((totalGlosasExistentes + validated.glosa_value).toFixed(2));
        const novoValorPago = Math.max(0, Number((guideTotalValue - novaGlosaTotal).toFixed(2)));
        const novoStatusGuia = novoValorPago > 0 ? 'PARTIALLY_GLOSED' : 'TOTALLY_GLOSED';

        // 4. Inserir registro em tiss_glosas
        const { data: glosa, error: glosaError } = await supabase
            .from('tiss_glosas')
            .insert({
                clinic_id: clinicId,
                guide_id: validated.guide_id,
                batch_id: guide.batch_id || null,
                item_code: validated.item_code,
                glosa_code: validated.glosa_code,
                glosa_description: validated.glosa_description,
                glosa_type: validated.glosa_type,
                glosa_value: validated.glosa_value,
                source: 'MANUAL',
                status: 'GLOSADA',
                created_at: now
            })
            .select()
            .single();

        if (glosaError) {
            console.error('[TISS] Erro ao inserir glosa manual:', glosaError);
            return NextResponse.json({ success: false, error: 'Erro ao registrar glosa no banco de dados' }, { status: 500 });
        }

        // 5. Atualizar guia
        const { data: updatedGuide } = await supabase
            .from('tiss_guides')
            .update({
                glosa_value: novaGlosaTotal,
                paid_value: novoValorPago,
                status: novoStatusGuia,
                updated_at: now
            })
            .eq('id', validated.guide_id)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        // 6. Registro financeiro / contábil da retenção de glosa
        await supabase
            .from('financial_entries')
            .insert({
                clinic_id: clinicId,
                type: 'EXPENSE',
                category: 'GLOSA_CONVENIO',
                description: `Retenção de Glosa Manual - Guia nº ${guide.guide_number} (${validated.glosa_code})`,
                amount: validated.glosa_value,
                status: 'PENDING',
                notes: `Motivo ANS: ${validated.glosa_description} - Procedimento ${validated.item_code}`,
                created_at: now
            });

        // 7. Gravar auditoria oficial
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'retorno.lancar_glosa_manual',
            entityType: 'tiss_glosa',
            entityId: glosa.id,
            newState: {
                glosa_id: glosa.id,
                guide_id: validated.guide_id,
                glosa_value: validated.glosa_value,
                glosa_code: validated.glosa_code,
                novo_status_guia: novoStatusGuia
            },
            metadata: {
                guide_number: guide.guide_number,
                glosa_code: validated.glosa_code,
                glosa_value: validated.glosa_value,
                previous_glosas: totalGlosasExistentes,
                new_guide_total_glosa: novaGlosaTotal,
                new_guide_paid_value: novoValorPago
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                glosa,
                guide: updatedGuide,
                saldo_restante: Number((guideTotalValue - novaGlosaTotal).toFixed(2))
            },
            message: `Glosa manual de R$ ${validated.glosa_value.toFixed(2)} lançada com sucesso na guia ${guide.guide_number}.`
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao lançar glosa manual:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro interno ao lançar glosa manual' }, { status: 500 });
    }
}
