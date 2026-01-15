import { createClient } from '@/lib/supabase/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const resolvedParams = await (params as any);
    const jobId = resolvedParams?.jobId || (params as any).jobId;

    const supabase = await createClient();
    const body = await request.json();
    const { mapping } = body;

    await supabase
        .from('import_jobs')
        // @ts-ignore - Supabase types misalignment
        .update({ field_mapping: mapping })
        .eq('id', jobId);

    return Response.json({ success: true });
}
