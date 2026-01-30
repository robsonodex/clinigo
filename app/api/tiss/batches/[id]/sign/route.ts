/**
 * TISS Batch Signing API Endpoint
 * 
 * POST /api/tiss/batches/[id]/sign
 * Signs a TISS batch XML with a digital certificate (A1 - PFX/P12)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TISSDigitalSigner } from '@/lib/services/tiss/tiss-digital-signer';
import { getTISSXSDValidator } from '@/lib/services/tiss/tiss-xsd-validator';

interface SignBatchRequest {
    certificate: string; // Base64 encoded PFX/P12
    password: string;
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const batchId = params.id;

        // Get batch data
        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select('*, clinic:clinics(name)')
            .eq('id', batchId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json(
                { error: 'Batch not found' },
                { status: 404 }
            );
        }

        // Check if batch has XML content
        if (!batch.xml_content) {
            return NextResponse.json(
                { error: 'Batch has no XML content to sign. Generate XML first.' },
                { status: 400 }
            );
        }

        // Check if already signed
        const { data: existingSignature } = await supabase
            .from('tiss_batch_signatures')
            .select('id')
            .eq('batch_id', batchId)
            .single();

        if (existingSignature) {
            return NextResponse.json(
                { error: 'Batch is already signed. Create a new batch to sign again.' },
                { status: 409 }
            );
        }

        // Parse request body
        const body: SignBatchRequest = await request.json();

        if (!body.certificate || !body.password) {
            return NextResponse.json(
                { error: 'Certificate and password are required' },
                { status: 400 }
            );
        }

        // Decode certificate from base64
        let pfxBuffer: Buffer;
        try {
            pfxBuffer = Buffer.from(body.certificate, 'base64');
        } catch (e) {
            return NextResponse.json(
                { error: 'Invalid certificate format. Must be base64 encoded.' },
                { status: 400 }
            );
        }

        // Create signer and load certificate
        const signer = new TISSDigitalSigner();

        let certInfo;
        try {
            certInfo = signer.loadCertificate(pfxBuffer, body.password);
        } catch (error) {
            return NextResponse.json(
                {
                    error: 'Failed to load certificate',
                    details: error instanceof Error ? error.message : 'Invalid password or corrupt certificate'
                },
                { status: 400 }
            );
        }

        // Check certificate validity
        if (certInfo.isExpired) {
            return NextResponse.json(
                {
                    error: 'Certificate has expired',
                    details: {
                        validUntil: certInfo.validUntil,
                        expiredDaysAgo: Math.abs(certInfo.daysUntilExpiry),
                    }
                },
                { status: 400 }
            );
        }

        // Validate XML before signing (optional but recommended)
        const validator = getTISSXSDValidator();
        const validationResult = await validator.validateXML(batch.xml_content);

        if (!validationResult.valid) {
            return NextResponse.json(
                {
                    error: 'XML validation failed. Fix errors before signing.',
                    validationErrors: validationResult.errors
                },
                { status: 400 }
            );
        }

        // Sign the XML
        const signResult = signer.signXML(batch.xml_content);

        if (!signResult.success || !signResult.signedXml) {
            return NextResponse.json(
                {
                    error: 'Failed to sign XML',
                    details: signResult.error
                },
                { status: 500 }
            );
        }

        // Upload signed XML to storage
        const signedFileName = `tiss-signed/${batchId}_${Date.now()}.xml`;
        const { error: uploadError } = await supabase.storage
            .from('tiss-files')
            .upload(signedFileName, signResult.signedXml, {
                contentType: 'application/xml',
                upsert: true,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            // Continue anyway - we can still store the signature record
        }

        // Get public URL for signed file
        const { data: urlData } = supabase.storage
            .from('tiss-files')
            .getPublicUrl(signedFileName);

        // Save signature record
        const { data: signature, error: sigError } = await supabase
            .from('tiss_batch_signatures')
            .insert({
                batch_id: batchId,
                certificate_hash: signResult.certificateHash,
                certificate_cn: certInfo.commonName,
                certificate_valid_from: certInfo.validFrom.toISOString(),
                certificate_valid_until: certInfo.validUntil.toISOString(),
                signed_xml_url: urlData?.publicUrl || null,
                signed_by: user.id,
            })
            .select()
            .single();

        if (sigError) {
            console.error('Error saving signature:', sigError);
            return NextResponse.json(
                { error: 'Failed to save signature record' },
                { status: 500 }
            );
        }

        // Update batch with signed XML
        await supabase
            .from('tiss_batches')
            .update({
                xml_content: signResult.signedXml,
                updated_at: new Date().toISOString(),
            })
            .eq('id', batchId);

        // Log audit
        await supabase
            .from('audit_logs')
            .insert({
                user_id: user.id,
                action: 'TISS_BATCH_SIGNED',
                entity_type: 'tiss_batch',
                entity_id: batchId,
                metadata: {
                    certificate_cn: certInfo.commonName,
                    certificate_hash: signResult.certificateHash,
                    valid_until: certInfo.validUntil,
                },
            });

        return NextResponse.json({
            success: true,
            signatureId: signature.id,
            signedXmlUrl: urlData?.publicUrl,
            certificateInfo: {
                commonName: certInfo.commonName,
                issuer: certInfo.issuer,
                validFrom: certInfo.validFrom,
                validUntil: certInfo.validUntil,
                daysUntilExpiry: certInfo.daysUntilExpiry,
            },
            signedAt: signResult.signedAt,
        });

    } catch (error) {
        console.error('Sign batch error:', error);
        return NextResponse.json(
            { error: 'Internal server error during signing' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/tiss/batches/[id]/sign
 * Get signature status for a batch
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const batchId = params.id;

        // Get signature info
        const { data: signature, error: sigError } = await supabase
            .from('tiss_batch_signatures')
            .select('*, signer:users(email, full_name)')
            .eq('batch_id', batchId)
            .single();

        if (sigError || !signature) {
            return NextResponse.json({
                signed: false,
                message: 'Batch is not signed',
            });
        }

        return NextResponse.json({
            signed: true,
            signature: {
                id: signature.id,
                certificateCN: signature.certificate_cn,
                certificateValidUntil: signature.certificate_valid_until,
                signedAt: signature.signed_at,
                signedBy: signature.signer?.full_name || signature.signer?.email,
                signedXmlUrl: signature.signed_xml_url,
            },
        });

    } catch (error) {
        console.error('Get signature error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
