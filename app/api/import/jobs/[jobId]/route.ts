import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> | { jobId: string } }
) {
    try {
        const resolvedParams = await (params as any);
        const jobId = resolvedParams?.jobId || (params as any).jobId;
        
        if (!jobId) {
            return NextResponse.json({ error: 'Job ID missing' }, { status: 400 });
        }

        const supabase = await createClient();
        
        // 1. Get the job info
        const { data: job, error: jobErr } = await supabase
            .from('import_jobs')
            .select('import_type, clinic_id')
            .eq('id', jobId)
            .single();
            
        if (jobErr || !job) {
            return NextResponse.json({ error: 'Importação não encontrada.' }, { status: 404 });
        }

        // 2. Fetch all successfully imported logs to delete their entities
        const { data: logs } = await supabase
            .from('import_logs')
            .select('entity_id, action')
            .eq('import_job_id', jobId)
            .eq('action', 'imported');

        if (logs && logs.length > 0) {
            const entityIds = (logs as any[]).map(l => l.entity_id).filter(Boolean);
            
            if (entityIds.length > 0) {
                // Delete the inserted rows based on type
                switch ((job as any).import_type) {
                    case 'financial':
                        await supabase.from('financial_entries').delete().in('id', entityIds);
                        break;
                    case 'patients':
                        await supabase.from('patients').delete().in('id', entityIds);
                        break;
                    case 'doctors':
                        await supabase.from('doctors').delete().in('id', entityIds);
                        break;
                    case 'insurances':
                        await supabase.from('insurances').delete().in('id', entityIds);
                        break;
                }
            }
        }

        // 3. Delete the import_logs (if cascade is somehow off, we do it manually to avoid foreign key issues)
        await supabase.from('import_logs').delete().eq('import_job_id', jobId);

        // 4. Delete the import job itself
        const { error: delErr } = await supabase.from('import_jobs').delete().eq('id', jobId);
        
        if (delErr) {
            throw delErr;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[DELETE /api/import/jobs/[jobId]] Error:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}
