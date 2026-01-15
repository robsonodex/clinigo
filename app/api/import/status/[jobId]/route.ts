import { createClient } from '@/lib/supabase/server';

export async function GET(
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

    return Response.json(job);
}
