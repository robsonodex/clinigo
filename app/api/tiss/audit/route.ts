import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTissAuditHistory } from '@/lib/tiss/audit';
import { requireTissAction, enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';

export async function GET(request: NextRequest) {
    const guard = await requireTissAction(request, 'config.premium.ver');
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

        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get('entityType') || undefined;
        const entityId = searchParams.get('entityId') || undefined;
        const action = searchParams.get('action') || undefined;
        const limit = Number(searchParams.get('limit')) || 25;
        const offset = Number(searchParams.get('offset')) || 0;

        const result = await getTissAuditHistory({
            clinicId: profile.clinic_id,
            entityType,
            entityId,
            action,
            limit,
            offset,
        });

        return NextResponse.json({
            success: true,
            data: result.entries,
            total: result.total,
            limit,
            offset,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Erro ao consultar auditoria' }, { status: 500 });
    }
}
