// app/api/tiss/batches/[id]/generate-xml/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTissGenerator, type TissGuideData, type TissBatchData, type TissProcedure, type TissBeneficiary, type TissProvider } from '@/lib/services/tiss/tiss-xml-generator-v2';
import { getTISSXSDValidator } from '@/lib/services/tiss/tiss-xsd-validator';

/**
 * POST /api/tiss/batches/[id]/generate-xml
 * Gera XML TISS consolidado de um lote usando o TissXMLGeneratorV2.
 * Valida via XSD offline, salva no Storage e atualiza a máquina de estados do batch.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: batch_id } = await params;
        const supabase = await createClient();

        // 1. Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        // 2. RBAC: Apenas ADMIN pode gerar XML de lote
        if (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Sem permissão para gerar XML' },
                { status: 403 }
            );
        }

        // 3. Buscar lote
        const { data: batch } = await supabase
            .from('tiss_batches')
            .select('*')
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        if (batch.status === 'SENT' || batch.status === 'SUBMITTED') {
            return NextResponse.json(
                { success: false, error: 'Lote já foi enviado. Não é possível regenerar o XML.' },
                { status: 400 }
            );
        }

        // 4. Buscar guias do lote com procedimentos normalizados
        const { data: guides } = await supabase
            .from('tiss_guides')
            .select(`
                *,
                patient:patients(id, full_name, cpf, date_of_birth),
                procedures:tiss_guide_procedures(*)
            `)
            .eq('batch_id', batch_id)
            .order('created_at', { ascending: true });

        if (!guides || guides.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Lote não possui guias' },
                { status: 400 }
            );
        }

        // 5. Buscar dados da clínica e operadora
        const { data: clinic } = await supabase
            .from('clinics')
            .select('corporate_name, cnpj, cnes_code')
            .eq('id', profile.clinic_id)
            .single();

        const { data: operadora } = await supabase
            .from('health_insurances')
            .select('id, name, code, ans_code')
            .eq('id', batch.insurance_company_id)
            .single();

        // 6. Mapear para a interface do TissXMLGeneratorV2
        const provider: TissProvider = {
            cnesCode: clinic?.cnes_code || '0000000',
            name: clinic?.corporate_name || 'CLÍNICA',
            taxId: clinic?.cnpj || '00000000000000',
            type: 'PJ' as const,
        };

        const guidesData: TissGuideData[] = guides.map((guide: any) => {
            // Prioriza procedimentos normalizados (tiss_guide_procedures), fallback para colunas flat
            let procedures: TissProcedure[] = [];

            if (guide.procedures && guide.procedures.length > 0) {
                procedures = guide.procedures.map((proc: any) => ({
                    code: proc.procedure_code || '00000000',
                    description: proc.procedure_name || 'Procedimento',
                    quantity: Number(proc.quantity) || 1,
                    unitValue: Number(proc.unit_value) || 0,
                    executionDate: proc.execution_date || guide.execution_date,
                    professionalId: guide.professional_crm || '',
                }));
            } else if (guide.procedure_code) {
                procedures = [{
                    code: guide.procedure_code,
                    description: guide.procedure_name || 'Procedimento',
                    quantity: Number(guide.procedure_quantity) || 1,
                    unitValue: Number(guide.unit_value) || 0,
                    executionDate: guide.execution_date,
                    professionalId: guide.professional_crm || '',
                }];
            }

            const beneficiary: TissBeneficiary = {
                cardNumber: guide.patient_card_number || '',
                fullName: guide.patient?.full_name || guide.patient_name || 'Paciente',
                cpf: guide.patient?.cpf || guide.patient_cpf,
                birthDate: guide.patient?.date_of_birth,
            };

            return {
                guideNumber: guide.guide_number,
                type: guide.guide_type === 'CONSULTATION' || guide.guide_type === 'CONSULTA' ? 'CONSULTA' as const : 'SP/SADT' as const,
                issueDate: guide.execution_date || new Date().toISOString(),
                beneficiary,
                provider,
                procedures,
                totalValue: Number(guide.total_value) || 0,
                observations: guide.notes,
            };
        });

        const batchData: TissBatchData = {
            batchNumber: batch.batch_number,
            insuranceAnsCode: operadora?.ans_code || operadora?.code || '000000',
            insuranceName: operadora?.name || 'OPERADORA',
            provider,
            guides: guidesData,
            createdAt: new Date(),
        };

        // 7. Gerar XML via TissXMLGeneratorV2
        const xmlGenerator = createTissGenerator('4.01.00');
        let xmlContent: string;
        try {
            xmlContent = await xmlGenerator.generateBatchXML(batchData);
        } catch (ex) {
            console.error('[TISS] Falha na geração do XML do lote:', ex);
            return NextResponse.json(
                { success: false, error: 'Falha interna ao gerar XML do lote' },
                { status: 500 }
            );
        }

        // 8. Validação XSD offline
        const validator = getTISSXSDValidator();
        const validationResult = await validator.validateXML(xmlContent);

        // 9. Salvar XML no Supabase Storage
        const fileName = `${batch.batch_number}.xml`;
        const filePath = `tiss-batches/${profile.clinic_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, xmlContent, {
                contentType: 'application/xml',
                upsert: true,
            });

        if (uploadError) {
            console.error('[TISS] Erro ao fazer upload do XML:', uploadError);
            return NextResponse.json(
                { success: false, error: 'Erro ao salvar XML no Storage' },
                { status: 500 }
            );
        }

        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        const xmlUrl = urlData.publicUrl;

        // 10. Atualizar máquina de estados do batch
        const finalStatus = validationResult.valid ? 'VALID' : 'INVALID';

        await supabase
            .from('tiss_batches')
            .update({
                xml_content: xmlContent,
                xml_file_url: xmlUrl,
                xml_file_size: Buffer.from(xmlContent).length,
                xml_generated_at: new Date().toISOString(),
                status: finalStatus,
                total_guides: guides.length,
                total_value: guidesData.reduce((sum, g) => sum + g.totalValue, 0),
            })
            .eq('id', batch_id);

        // 11. Limpar e registrar erros de validação se houver
        await supabase.from('tiss_validation_errors').delete().eq('batch_id', batch_id);

        if (!validationResult.valid && validationResult.errors.length > 0) {
            const errorInserts = validationResult.errors.map(err => ({
                batch_id: batch_id,
                error_message: err.message,
                field_name: err.field || 'XSD',
                severity: 'ERROR',
                resolved: false,
                tiss_version: xmlGenerator.getVersion(),
            }));
            await supabase.from('tiss_validation_errors').insert(errorInserts);
        }

        // 12. Audit log
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'TISS_BATCH_XML_GENERATION',
            entity_type: 'tiss_batch',
            entity_id: batch_id,
            metadata: {
                valid: validationResult.valid,
                guide_count: guides.length,
                errors_count: validationResult.errors?.length || 0,
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                xml_url: xmlUrl,
                file_size: Buffer.from(xmlContent).length,
                guide_count: guides.length,
                status: finalStatus,
                validation: validationResult,
                generated_at: new Date().toISOString(),
            },
            message: validationResult.valid
                ? 'XML gerado e validado com sucesso'
                : `XML gerado com ${validationResult.errors.length} erro(s) de validação`,
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao gerar XML do lote:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/tiss/batches/[id]/generate-xml
 * Download do XML já gerado
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: batch_id } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        const { data: batch } = await supabase
            .from('tiss_batches')
            .select('batch_number, xml_file_url, xml_content')
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        if (!batch.xml_file_url && !batch.xml_content) {
            return NextResponse.json(
                { success: false, error: 'XML ainda não foi gerado para este lote' },
                { status: 400 }
            );
        }

        // Se tiver xml_content direto, retorna inline
        if (batch.xml_content) {
            return new NextResponse(batch.xml_content, {
                status: 200,
                headers: {
                    'Content-Type': 'application/xml',
                    'Content-Disposition': `attachment; filename="${batch.batch_number}.xml"`,
                },
            });
        }

        // Fallback: redireciona para a URL do Storage
        return NextResponse.redirect(batch.xml_file_url);

    } catch (error: any) {
        console.error('[TISS] Erro ao buscar XML:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
