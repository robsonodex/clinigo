import { createClient } from '@/lib/supabase/server';
import { parseExcelFile } from '@/lib/services/import/file-parser';
import { validatePatientRow } from '@/lib/services/import/validators/patient-validator';
import { validateDoctorRow } from '@/lib/services/import/validators/doctor-validator';
import { validateFinancialRow } from '@/lib/services/import/validators/financial-validator';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const resolvedParams = await (params as any);
        const jobId = resolvedParams?.jobId || (params as any).jobId;

        console.log('[Import Validate] Starting validation for job:', jobId);

        const supabase = await createClient();

        const { data: job, error: jobError } = await supabase
            .from('import_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (jobError) {
            console.error('[Import Validate] Error fetching job:', jobError);
            return Response.json({
                error: 'Erro ao buscar job de importação',
                details: jobError.message,
                code: jobError.code
            }, { status: 500 });
        }

        if (!job) {
            return Response.json({ error: 'Job não encontrado' }, { status: 404 });
        }

        const importJob = job as any;
        console.log('[Import Validate] Job found:', importJob.id, 'Type:', importJob.import_type);

        await supabase
            .from('import_jobs')
            .update({ status: 'validating' })
            .eq('id', jobId);

        let fileBuffer: Buffer;
        try {
            console.log('[Import Validate] Fetching file from:', importJob.file_url);
            const { downloadImportFile } = await import('@/lib/services/import/file-downloader');
            fileBuffer = await downloadImportFile(importJob.file_url, supabase);
            console.log('[Import Validate] File fetched, size:', fileBuffer.length);
        } catch (e: any) {
            console.error('[Import Validate] Error fetching file:', e);
            return Response.json({ error: 'Erro ao baixar arquivo', details: e.message }, { status: 500 });
        }

        const { rows } = await parseExcelFile(fileBuffer);
        console.log('[Import Validate] Parsed', rows.length, 'rows');

        const validationErrors: any[] = [];
        const existingKeys = new Set<string>(); // CPF or CRM+State
        let validRows = 0;
        let criticalErrors = 0;
        let warnings = 0;

        for (let i = 0; i < rows.length; i++) {
            let result: any = { isValid: true, errors: [] };
            const rowNum = i + 2;

            if (importJob.import_type === 'patients') {
                result = await validatePatientRow(rows[i], rowNum, existingKeys, supabase, importJob.clinic_id);
            } else if (importJob.import_type === 'doctors') {
                result = await validateDoctorRow(rows[i], rowNum, existingKeys, supabase, importJob.clinic_id);
            } else if (importJob.import_type === 'financial') {
                result = await validateFinancialRow(rows[i]);
            }
            // Add other types

            if (result.errors.length > 0) {
                validationErrors.push({
                    row: rowNum,
                    data: rows[i],
                    errors: result.errors
                });

                const hasCritical = result.errors.some((e: any) => e.severity === 'CRITICAL');
                if (hasCritical) {
                    criticalErrors++;
                } else {
                    warnings++;
                }
            } else {
                validRows++;
            }
        }

        await supabase
            .from('import_jobs')
            .update({
                status: criticalErrors > 0 ? 'failed' : 'validated',
                validation_errors: validationErrors,
                successful_rows: validRows,
                failed_rows: criticalErrors // In validation phase, failed means invalid
            })
            .eq('id', jobId);

        return Response.json({
            totalRows: rows.length,
            validRows,
            criticalErrors,
            warnings,
            errors: validationErrors
        });
    } catch (error: any) {
        console.error('[Import Validate] Unexpected error:', error);

        // Atualizar o status do job para 'failed' para não ficar travado em 'validating'
        try {
            const supabase = await createClient();
            const resolvedParams = await (params as any);
            const failedJobId = resolvedParams?.jobId || (params as any).jobId;
            await supabase
                .from('import_jobs')
                .update({
                    status: 'failed',
                    validation_errors: [{ row: 0, errors: [{ field: 'system', message: error.message, severity: 'CRITICAL' }] }]
                })
                .eq('id', failedJobId);
        } catch (updateError) {
            console.error('[Import Validate] Failed to update job status after error:', updateError);
        }

        return Response.json({
            error: 'Erro inesperado na validação',
            details: error.message
        }, { status: 500 });
    }
}
