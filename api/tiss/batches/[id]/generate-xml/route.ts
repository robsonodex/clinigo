/**
 * API Route: Generate TISS XML for a batch
 * 
 * POST /api/tiss/batches/[id]/generate-xml
 * 
 * Features:
 * - Priority-based version selection (forced > insurance > clinic > fallback)
 * - Stores XML in Supabase Storage
 * - Records version used in batch record
 * - Returns download URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TissXMLGeneratorV2 } from '@/lib/services/tiss/tiss-xml-generator-v2';
import type { TissVersion } from '@/lib/types/tiss-versions';
import { isValidTissVersion, getRecommendedVersion } from '@/lib/types/tiss-versions';

// ============================================================================
// Type Definitions
// ============================================================================

interface GenerateXMLRequest {
    /** Force a specific TISS version (overrides all other settings) */
    forceVersion?: TissVersion;
}

interface GenerateXMLResponse {
    success: boolean;
    version?: TissVersion;
    xmlUrl?: string;
    fileName?: string;
    batchNumber?: string;
    error?: string;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const body: GenerateXMLRequest = await req.json().catch(() => ({}));

        console.log(`[TISS XML] Starting generation for batch ID: ${params.id}`);

        // ========================================================================
        // Step 1: Fetch batch with related data
        // ========================================================================

        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select(`
        *,
        insurance:health_insurances!inner(
          id,
          name,
          ans_code,
          tiss_version
        ),
        clinic:clinics!inner(
          id,
          name,
          cnpj,
          cnes_code,
          tiss_default_version
        )
      `)
            .eq('id', params.id)
            .single();

        if (batchError || !batch) {
            console.error('[TISS XML] Batch not found:', batchError);
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' } as GenerateXMLResponse,
                { status: 404 }
            );
        }

        // ========================================================================
        // Step 2: Determine TISS version to use (PRIORITY LOGIC)
        // ========================================================================

        let tissVersion: TissVersion;

        // Priority 1: Forced version from request
        if (body.forceVersion) {
            if (!isValidTissVersion(body.forceVersion)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Versão TISS inválida: ${body.forceVersion}. Use 4.01.00 ou 4.02.00`
                    } as GenerateXMLResponse,
                    { status: 400 }
                );
            }
            tissVersion = body.forceVersion;
            console.log(`[TISS XML] Using forced version: ${tissVersion}`);
        }
        // Priority 2: Insurance-specific configuration
        else if (batch.insurance?.tiss_version && isValidTissVersion(batch.insurance.tiss_version)) {
            tissVersion = batch.insurance.tiss_version;
            console.log(`[TISS XML] Using insurance version: ${tissVersion} (${batch.insurance.name})`);
        }
        // Priority 3: Clinic default
        else if (batch.clinic?.tiss_default_version && isValidTissVersion(batch.clinic.tiss_default_version)) {
            tissVersion = batch.clinic.tiss_default_version;
            console.log(`[TISS XML] Using clinic default version: ${tissVersion}`);
        }
        // Priority 4: System fallback
        else {
            tissVersion = getRecommendedVersion(); // Returns 4.01.00 or 4.02.00 based on current date
            console.log(`[TISS XML] Using fallback version: ${tissVersion}`);
        }

        // ========================================================================
        // Step 3: Fetch guides belonging to this batch
        // ========================================================================

        const { data: guides, error: guidesError } = await supabase
            .from('tiss_guides')
            .select(`
        *,
        consultation:consultations(
          patient:patients(
            full_name,
            cpf,
            birth_date,
            cns
          ),
          professional:professionals(
            name,
            crm_number
          )
        )
      `)
            .eq('batch_id', params.id)
            .order('created_at', { ascending: true });

        if (guidesError) {
            console.error('[TISS XML] Error fetching guides:', guidesError);
            throw guidesError;
        }

        if (!guides || guides.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Lote não possui guias. Adicione guias antes de gerar XML.'
                } as GenerateXMLResponse,
                { status: 400 }
            );
        }

        console.log(`[TISS XML] Found ${guides.length} guides in batch`);

        // ========================================================================
        // Step 4: Transform data to XML generator format
        // ========================================================================

        const batchData = {
            batchNumber: batch.batch_number,
            insuranceAnsCode: batch.insurance.ans_code || '000000',
            insuranceName: batch.insurance.name,
            provider: {
                cnesCode: batch.clinic.cnes_code || '',
                name: batch.clinic.name,
                taxId: batch.clinic.cnpj || '',
                type: 'PJ' as const,
            },
            guides: guides.map(guide => ({
                guideNumber: guide.guide_number,
                type: (guide.guide_type || 'CONSULTA') as any,
                issueDate: guide.issue_date || new Date().toISOString(),
                beneficiary: {
                    cardNumber: guide.insurance_card_number || '',
                    fullName: guide.consultation?.patient?.full_name || 'Paciente Não Identificado',
                    cpf: guide.consultation?.patient?.cpf,
                    birthDate: guide.consultation?.patient?.birth_date,
                    cns: guide.consultation?.patient?.cns,
                },
                provider: {
                    cnesCode: batch.clinic.cnes_code || '',
                    name: batch.clinic.name,
                    taxId: batch.clinic.cnpj || '',
                    type: 'PJ' as const,
                },
                procedures: [
                    {
                        code: guide.procedure_code || '0101010',
                        description: guide.procedure_description || 'Procedimento não especificado',
                        quantity: guide.quantity || 1,
                        unitValue: parseFloat(guide.unit_value?.toString() || '0'),
                        executionDate: guide.execution_date || guide.issue_date || new Date().toISOString(),
                        professionalId: guide.consultation?.professional?.crm_number,
                    },
                ],
                totalValue: parseFloat(guide.total_value?.toString() || '0'),
                observations: guide.observations,
            })),
            createdAt: new Date(batch.created_at),
        };

        // ========================================================================
        // Step 5: Generate XML using selected version
        // ========================================================================

        console.log(`[TISS XML] Generating XML with version ${tissVersion}...`);
        const generator = new TissXMLGeneratorV2(tissVersion);
        const xmlContent = await generator.generateBatchXML(batchData);

        // ========================================================================
        // Step 6: Upload to Supabase Storage
        // ========================================================================

        const fileName = `tiss_${batch.batch_number}_v${tissVersion.replace(/\./g, '_')}.xml`;
        const filePath = `batches/${batch.clinic.id}/${fileName}`;

        console.log(`[TISS XML] Uploading to storage: ${filePath}`);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('tiss-files')
            .upload(filePath, xmlContent, {
                contentType: 'application/xml',
                upsert: true,
            });

        if (uploadError) {
            console.error('[TISS XML] Upload error:', uploadError);
            throw uploadError;
        }

        // ========================================================================
        // Step 7: Get public URL
        // ========================================================================

        const { data: publicUrlData } = supabase.storage
            .from('tiss-files')
            .getPublicUrl(filePath);

        const xmlUrl = publicUrlData.publicUrl;

        // ========================================================================
        // Step 8: Update batch record with XML info and version used
        // ========================================================================

        const { error: updateError } = await supabase
            .from('tiss_batches')
            .update({
                xml_file_url: xmlUrl,
                tiss_version_used: tissVersion,
                status: 'VALID',
                updated_at: new Date().toISOString(),
            })
            .eq('id', params.id);

        if (updateError) {
            console.error('[TISS XML] Error updating batch:', updateError);
            throw updateError;
        }

        console.log(`[TISS XML] ✅ Generation complete! Version: ${tissVersion}, URL: ${xmlUrl}`);

        // ========================================================================
        // Step 9: Return success response
        // ========================================================================

        return NextResponse.json({
            success: true,
            version: tissVersion,
            xmlUrl,
            fileName,
            batchNumber: batch.batch_number,
        } as GenerateXMLResponse);

    } catch (error: any) {
        console.error('[TISS XML] Generation error:', error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Erro ao gerar XML TISS',
            } as GenerateXMLResponse,
            { status: 500 }
        );
    }
}

// ============================================================================
// GET Handler - Check generation status
// ============================================================================

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();

        const { data: batch, error } = await supabase
            .from('tiss_batches')
            .select('id, batch_number, xml_file_url, tiss_version_used, status')
            .eq('id', params.id)
            .single();

        if (error || !batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            hasXml: !!batch.xml_file_url,
            xmlUrl: batch.xml_file_url,
            version: batch.tiss_version_used,
            status: batch.status,
        });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
