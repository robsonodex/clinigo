import { NextRequest, NextResponse } from 'next/server';
import { isFaturamentoPremiumEnabled, setFaturamentoPremiumStatus } from '@/lib/tiss/feature-flag';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { z } from 'zod';

const toggleSchema = z.object({
    enabled: z.boolean(),
    clinic_id: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
    const guard = await requireTissAction(request, 'config.premium_flag.ver');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { role, clinicId } = guard.session;
        const requestedClinicId = request.nextUrl.searchParams.get('clinic_id');
        const targetClinicId = (role === 'SUPER_ADMIN' && requestedClinicId)
            ? requestedClinicId
            : clinicId;

        if (!targetClinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 });
        }

        const enabled = await isFaturamentoPremiumEnabled(targetClinicId);

        return NextResponse.json(
            {
                success: true,
                data: {
                    clinic_id: targetClinicId,
                    faturamento_premium: enabled,
                },
            },
            {
                headers: {
                    'Cache-Control': 'private, max-age=120, stale-while-revalidate=300',
                },
            }
        );
    } catch (err: any) {
        console.error('[tiss/settings/premium] GET error:', err instanceof Error ? err.message : String(err));
        return NextResponse.json({ error: err.message || 'Erro ao consultar configurações' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const guard = await requireTissAction(request, 'config.premium.editar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { userId, role, clinicId } = guard.session;

        if (!clinicId && role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 });
        }

        const body = await request.json();
        const parsed = toggleSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Parâmetro enabled obrigatório e deve ser booleano' },
                { status: 400 }
            );
        }

        const targetClinicId = (role === 'SUPER_ADMIN' && parsed.data.clinic_id)
            ? parsed.data.clinic_id
            : clinicId;

        if (!targetClinicId) {
            return NextResponse.json({ error: 'Clínica não informada ou não encontrada' }, { status: 400 });
        }

        const result = await setFaturamentoPremiumStatus(
            targetClinicId,
            parsed.data.enabled,
            userId
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    clinic_id: targetClinicId,
                    faturamento_premium: parsed.data.enabled,
                    message: parsed.data.enabled
                        ? 'Módulo de Faturamento Premium ativado com sucesso.'
                        : 'Módulo de Faturamento Premium desativado com sucesso.',
                },
            },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            }
        );
    } catch (err: any) {
        console.error('[tiss/settings/premium] POST error:', err instanceof Error ? err.message : String(err));
        return NextResponse.json({ error: err.message || 'Erro ao alterar configuração' }, { status: 500 });
    }
}
