import { createClient } from '@/lib/supabase/server';
import { parseExcelFile } from '@/lib/services/import/file-parser';
import { validatePatientRow } from '@/lib/services/import/validators/patient-validator';
import { validateDoctorRow } from '@/lib/services/import/validators/doctor-validator';
import { validateFinancialRow } from '@/lib/services/import/validators/financial-validator';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const resolvedParams = await (params as any);
    const jobId = resolvedParams?.jobId || (params as any).jobId;

    const supabase = await createClient();

    const { data: job } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

    if (!job) {
        return Response.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    await supabase
        .from('import_jobs')
        .update({ status: 'validating' })
        .eq('id', jobId);

    let fileBuffer: Buffer;
    try {
        const fileResponse = await fetch(job.file_url);
        if (!fileResponse.ok) throw new Error('Failed to fetch file');
        const arrayBuffer = await fileResponse.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
    } catch (e) {
        return Response.json({ error: 'Erro ao baixar arquivo' }, { status: 500 });
    }

    const { rows } = await parseExcelFile(fileBuffer);

    const validationErrors: any[] = [];
    const existingKeys = new Set<string>(); // CPF or CRM+State
    let validRows = 0;
    let criticalErrors = 0;
    let warnings = 0;

    for (let i = 0; i < rows.length; i++) {
        let result: any = { isValid: true, errors: [] };
        const rowNum = i + 2;

        if (job.import_type === 'patients') {
            result = await validatePatientRow(rows[i], rowNum, existingKeys, supabase, job.clinic_id);
        } else if (job.import_type === 'doctors') {
            result = await validateDoctorRow(rows[i], rowNum, existingKeys, supabase, job.clinic_id);
        } else if (job.import_type === 'financial') {
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
}
