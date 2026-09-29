import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFaturamentoPremiumEnabled, setFaturamentoPremiumStatus } from '@/lib/tiss/feature-flag';
import { enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';
import { z } from 'zod';

const toggleSchema = z.object({
    enabled: z.boolean(),
});

export async function GET(request: NextRequest) {
    const guard = await enforceTissAdministrativeGuard(request);
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
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 });
        }

        const enabled = await isFaturamentoPremiumEnabled(profile.clinic_id);

        return NextResponse.json({
            success: true,
            data: {
                clinic_id: profile.clinic_id,
                faturamento_premium: enabled,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Erro ao consultar configurações' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const guard = await enforceTissAdministrativeGuard(request);
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
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 });
        }

        // Restrito a administradores
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json(
                { error: 'Apenas administradores da clínica podem ativar ou desativar o faturamento premium' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const parsed = toggleSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Parâmetro enabled obrigatório e deve ser booleano' },
                { status: 400 }
            );
        }

        const result = await setFaturamentoPremiumStatus(
            profile.clinic_id,
            parsed.data.enabled,
            user.id
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                faturamento_premium: parsed.data.enabled,
                message: parsed.data.enabled
                    ? 'Módulo de Faturamento Premium ativado com sucesso.'
                    : 'Módulo de Faturamento Premium desativado com sucesso.',
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Erro ao alterar configuração' }, { status: 500 });
    }
}
