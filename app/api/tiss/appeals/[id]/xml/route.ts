import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { generateAppealDossierAndXml } from '@/lib/services/tiss/appeal-dossier';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tiss/appeals/[id]/xml
 * Exporta arquivo XML TISS ANS oficial de Recurso de Glosa
 */
export const GET = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'recurso.gerar_lote_recurso');
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
        return new NextResponse(dossier.xml_recurso_glosa, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Content-Disposition': `attachment; filename="recurso_glosa_${dossier.appeal_number}.xml"`,
            },
        });
    } catch (err: any) {
        request.log.error('tiss/appeals/[id]/xml GET', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao exportar XML de recurso' }, { status: 500 });
    }
});

