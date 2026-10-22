import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const GET = withAxiom(async (request: AxiomRequest) => {
    // Check auth
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createClient();

        // 1. Get demo clinic id
        const { data: demoClinic } = await supabase
            .from('clinics')
            .select('id')
            .eq('slug', 'demo')
            .single();

        if (!demoClinic) throw new Error('Demo clinic not found');

        // 2. Delete data created today (modifyables)
        // In a real scenario, we might want to run a full reset SQL script.
        // For now, we will just delete appointments created today as a simple restoration example.
        const today = new Date().toISOString().split('T')[0];

        const { error: deleteError } = await supabase
            .from('appointments')
            .delete()
            .eq('clinic_id', demoClinic.id)
            .gte('created_at', today);

        if (deleteError) throw deleteError;

        // We can expand this to delete patients/doctors created today as well.
        // await supabase.from('patients').delete().eq('clinic_id', demoClinic.id).gte('created_at', today);

        return NextResponse.json({
            success: true,
            message: 'Demo reset completed',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        request.log.error('cron/reset-demo', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
})
