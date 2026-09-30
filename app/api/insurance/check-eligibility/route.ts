import { requireTissAction, enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';
// app/api/insurance/check-eligibility/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkInsuranceEligibilityService, checkEligibilityInputSchema } from '@/lib/services/insurance/eligibility-service';

/**
 * POST /api/insurance/check-eligibility
 * Verifica elegibilidade do paciente no convênio (Validação cadastral interna + Registro de conferência manual)
 */
export async function POST(request: NextRequest) {
    const guard = await requireTissAction(request, 'guia.validar');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, full_name')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const body = await request.json();
        const validated = checkEligibilityInputSchema.parse(body);

        const result = await checkInsuranceEligibilityService(
            validated,
            supabase,
            {
                userId: user.id,
                clinicId: profile.clinic_id,
                fullName: profile.full_name,
            }
        );

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error: any) {
        console.error('[ELIGIBILITY] Erro na verificação:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
    }
}
