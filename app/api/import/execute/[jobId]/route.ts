import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { parseExcelFile } from '@/lib/services/import/file-parser';
import { importPatients } from '@/lib/services/import/importers/patient-importer';
import { importDoctors } from '@/lib/services/import/importers/doctor-importer';
import { importFinancial } from '@/lib/services/import/importers/financial-importer';

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

    if (!job || (job.status !== 'validated' && job.status !== 'failed')) { // Allow failed if user wants to proceed with partial? No, strictly validated for now or per requirements.
        // User requirement: "status: 'validated'"
        if (job.status !== 'validated' && job.status !== 'failed') { // failed usually blocks, but maybe warnings only?
            // If criticalErrors > 0, status is failed.
            // User might re-upload.
            // If status is 'failed', block execution.
        }
    }

    if (job.status !== 'validated') {
        // if failed, return error
        return Response.json({ error: 'Job não está pronto para execução. Corrija os erros.' }, { status: 400 });
    }

    // Update status to processing
    await supabase
        .from('import_jobs')
        .update({
            status: 'processing',
            started_at: new Date().toISOString()
        })
        .eq('id', jobId);

    // Trigger background process
    // Note: relying on un-awaited promise for background work
    processImportInBackground(jobId, job);

    return Response.json({
        message: 'Importação iniciada',
        jobId: jobId
    });
}

async function processImportInBackground(jobId: string, job: any) {
    // Use Service Role for background processing
    const supabase = createServiceRoleClient();

    try {
        const fileResponse = await fetch(job.file_url);
        const fileBuffer = await fileResponse.arrayBuffer();
        const { rows } = await parseExcelFile(Buffer.from(fileBuffer));

        switch (job.import_type) {
            case 'patients':
                await importPatients(jobId, rows, job.field_mapping || {}, supabase, job.clinic_id);
                break;
            case 'doctors':
                await importDoctors(jobId, rows, job.field_mapping || {}, supabase, job.clinic_id);
                break;
            case 'financial':
                await importFinancial(jobId, rows, job.field_mapping || {}, supabase, job.clinic_id);
                break;
        }

        // Notification logic here (optional for now)
    } catch (error: any) {
        console.error('Background Import Error', error);
        await supabase
            .from('import_jobs')
            .update({
                status: 'failed',
                processing_errors: [{ message: error.message }]
            })
            .eq('id', jobId);
    }
}
