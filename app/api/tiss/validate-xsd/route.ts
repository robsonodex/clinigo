/**
 * TISS XSD Validation API Endpoint
 * 
 * POST /api/tiss/validate-xsd
 * Validates TISS XML against official ANS XSD schemas
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTISSXSDValidator } from '@/lib/services/tiss/tiss-xsd-validator';

interface ValidateXSDRequest {
    xml?: string;
    guide_id?: string;
    batch_id?: string;
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const body: ValidateXSDRequest = await request.json();

        let xmlContent: string | null = null;

        // Option 1: Direct XML string
        if (body.xml) {
            xmlContent = body.xml;
        }
        // Option 2: Fetch from guide_id
        else if (body.guide_id) {
            const { data: guide, error: guideError } = await supabase
                .from('tiss_guides')
                .select('xml_content')
                .eq('id', body.guide_id)
                .single();

            if (guideError || !guide?.xml_content) {
                return NextResponse.json(
                    { error: 'Guide not found or has no XML content' },
                    { status: 404 }
                );
            }

            xmlContent = guide.xml_content;
        }
        // Option 3: Fetch from batch_id
        else if (body.batch_id) {
            const { data: batch, error: batchError } = await supabase
                .from('tiss_batches')
                .select('xml_content')
                .eq('id', body.batch_id)
                .single();

            if (batchError || !batch?.xml_content) {
                return NextResponse.json(
                    { error: 'Batch not found or has no XML content' },
                    { status: 404 }
                );
            }

            xmlContent = batch.xml_content;
        }

        if (!xmlContent) {
            return NextResponse.json(
                { error: 'Either xml, guide_id, or batch_id must be provided' },
                { status: 400 }
            );
        }

        // Validate XML
        const validator = getTISSXSDValidator();
        const result = await validator.validateXML(xmlContent);

        // Log validation attempt
        await supabase
            .from('audit_logs')
            .insert({
                user_id: user.id,
                action: 'TISS_XSD_VALIDATION',
                entity_type: body.batch_id ? 'tiss_batch' : body.guide_id ? 'tiss_guide' : 'xml',
                entity_id: body.batch_id || body.guide_id || null,
                metadata: {
                    valid: result.valid,
                    error_count: result.errors.length,
                    schema_version: result.schemaVersion,
                },
            })
            .select()
            .single();

        return NextResponse.json({
            valid: result.valid,
            errors: result.errors,
            schemaVersion: result.schemaVersion,
            validatedAt: result.validatedAt,
        });

    } catch (error) {
        console.error('XSD validation error:', error);
        return NextResponse.json(
            { error: 'Internal server error during validation' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/tiss/validate-xsd
 * Returns available schema versions and cache status
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const validator = getTISSXSDValidator();

        return NextResponse.json({
            availableVersions: ['3.05.00', '4.01.00', '4.02.00'],
            cachedVersions: {
                '3.05.00': validator.isSchemaCached('3.05.00'),
                '4.01.00': validator.isSchemaCached('4.01.00'),
                '4.02.00': validator.isSchemaCached('4.02.00'),
            },
        });

    } catch (error) {
        console.error('Error getting schema info:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
