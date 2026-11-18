import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createTissGenerator } from '@/lib/services/tiss/tiss-xml-generator-v2';
import { getTISSXSDValidator } from '@/lib/services/tiss/tiss-xsd-validator';

export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'guia.imprimir');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: profile } = await adminDb
            .from('users')
            .select('clinic_id, role, full_name')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { data: guide, error: guideError } = await adminDb
            .from('tiss_guides')
            .select(`
                *,
                patient:patients(id, full_name, cpf, date_of_birth, insurance_card_number),
                procedures:tiss_guide_procedures(*),
                health_insurance:health_insurances(id, name, code),
                batch:tiss_batches(id, batch_number, insurance_company_id, insurance_company_name)
            `)
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (guideError || !guide) {
            return NextResponse.json({ success: false, error: 'Guia não encontrada' }, { status: 404 });
        }

        const clinicData = await adminDb
            .from('clinics')
            .select('corporate_name, cnpj, cnes_code')
            .eq('id', profile.clinic_id)
            .single();

        const xmlGenerator = createTissGenerator('4.01.00');

        const procedures = (guide.procedures || []).map((proc: any) => ({
            code: proc.procedure_code || '00000000',
            description: proc.procedure_name || 'Procedimento Padrão',
            quantity: Number(proc.quantity) || 1,
            unitValue: Number(proc.unit_value) || 0,
            executionDate: proc.execution_date || guide.execution_date,
            professionalId: guide.professional_crm || ''
        }));

        if (procedures.length === 0) {
            if (guide.procedure_code) {
                procedures.push({
                    code: guide.procedure_code,
                    description: guide.procedure_name || 'Procedimento',
                    quantity: Number(guide.procedure_quantity) || 1,
                    unitValue: Number(guide.unit_value) || 0,
                    executionDate: guide.execution_date,
                    professionalId: guide.professional_crm || ''
                });
            } else {
                return NextResponse.json({ success: false, error: 'A guia deve conter ao menos um procedimento' }, { status: 400 });
            }
        }

        const beneficiary = {
            cardNumber: guide.patient_card_number || guide.patient?.insurance_card_number || '',
            fullName: guide.patient?.full_name || guide.patient_name || 'Paciente Não Identificado',
            cpf: guide.patient?.cpf || guide.patient_cpf,
            birthDate: guide.patient?.date_of_birth
        };

        const provider = {
            cnesCode: clinicData.data?.cnes_code || '0000000',
            name: clinicData.data?.corporate_name || 'CLÍNICA',
            taxId: clinicData.data?.cnpj || '00000000000000',
            type: 'PJ' as const
        };

        const batchData = {
            batchNumber: guide.guide_number,
            insuranceAnsCode: guide.health_insurance?.code || '000000',
            insuranceName: guide.health_insurance?.name || guide.batch?.insurance_company_name || 'OPERADORA PADRÃO',
            provider,
            createdAt: new Date(),
            guides: [{
                guideNumber: guide.guide_number,
                type: guide.guide_type === 'CONSULTA' ? 'CONSULTA' as const : 'SP/SADT' as const,
                issueDate: guide.execution_date || new Date().toISOString(),
                beneficiary,
                provider,
                procedures,
                totalValue: Number(guide.total_value) || 0,
                observations: guide.notes
            }]
        };

        let xmlString;
        try {
            xmlString = await xmlGenerator.generateBatchXML(batchData);
        } catch (ex) {
            request.log.error('tiss/guides/[id]/xml', { error: ex instanceof Error ? ex.message : String(ex) });
            console.error('Falha ao gerar XML', ex);
            return NextResponse.json({ success: false, error: 'Falha interna ao mapear nós do XML.' }, { status: 500 });
        }

        const validator = getTISSXSDValidator();
        const validationResult = await validator.validateXML(xmlString);
        const finalStatus = validationResult.valid ? 'VALID' : 'INVALID';

        await adminDb
            .from('tiss_guides')
            .update({
                xml_content: xmlString,
                xml_generated_at: new Date().toISOString(),
                status: finalStatus,
                validation_status: finalStatus
            })
            .eq('id', id);

        await adminDb.from('audit_logs').insert({
            user_id: user.id,
            action: 'TISS_XML_GENERATION',
            entity_type: 'tiss_guide',
            entity_id: id,
            metadata: { valid: validationResult.valid, errors: validationResult.errors?.length || 0 }
        });

        await adminDb.from('tiss_validation_errors').delete().eq('guide_id', id);
        if (!validationResult.valid && validationResult.errors && validationResult.errors.length > 0) {
            const errorInserts = validationResult.errors.map(err => ({
                guide_id: id,
                error_message: err.message,
                field_name: err.path || 'XSD',
                severity: 'ERROR',
                resolved: false,
                tiss_version: xmlGenerator.getVersion()
            }));
            await adminDb.from('tiss_validation_errors').insert(errorInserts);
        }

        return NextResponse.json({
            success: true,
            status: finalStatus,
            xml: xmlString,
            validation: validationResult
        });
    } catch (error: any) {
        request.log.error('tiss/guides/[id]/xml', { error: error instanceof Error ? error.message : String(error) });
        console.error('[TISS XML Generation] Erro:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno na geração e validação do XML' },
            { status: 500 }
        );
    }
});
