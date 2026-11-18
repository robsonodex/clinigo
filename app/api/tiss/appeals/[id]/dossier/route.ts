import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { generateAppealDossierAndXml } from '@/lib/services/tiss/appeal-dossier';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tiss/appeals/[id]/dossier
 * Compila automaticamente o Dossiê Probatório (espelho da guia + biometria/check-in + evolução clínica)
 */
export const GET = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'recurso.ver');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: appealId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: profile } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = profile?.clinic_id || guard.session.clinicId;
        if (!clinicId) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const dossier = await generateAppealDossierAndXml(adminDb, clinicId, appealId);
        return NextResponse.json({ success: true, data: dossier });
    } catch (err: any) {
        request.log.error('tiss/appeals/[id]/dossier GET', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao gerar dossiê probatório' }, { status: 500 });
    }
});

