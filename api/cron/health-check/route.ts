import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isEmailConfigured } from '@/lib/services/email';
import { isWhatsAppConfigured } from '@/lib/services/whatsapp';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const checks: any[] = [];
    let overallStatus = 'HEALTHY';

    // 1. Database Check
    const startDb = performance.now();
    try {
        const { count, error } = await supabase.from('clinics').select('*', { count: 'exact', head: true });
        if (error) throw error;
        checks.push({
            name: 'database',
            status: 'HEALTHY',
            latency: Math.round(performance.now() - startDb),
            details: { count }
        });
    } catch (error: any) {
        overallStatus = 'DEGRADED';
        checks.push({
            name: 'database',
            status: 'DOWN',
            latency: Math.round(performance.now() - startDb),
            error: error.message
        });
    }

    // 2. Storage Check
    const startStorage = performance.now();
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        checks.push({
            name: 'storage',
            status: 'HEALTHY',
            latency: Math.round(performance.now() - startStorage),
            details: { buckets: data.length }
        });
    } catch (error: any) {
        overallStatus = 'DEGRADED';
        checks.push({
            name: 'storage',
            status: 'DOWN',
            latency: Math.round(performance.now() - startStorage),
            error: error.message
        });
    }

    // 3. Services Configuration Check
    checks.push({
        name: 'email_service',
        status: isEmailConfigured() ? 'HEALTHY' : 'DEGRADED',
        latency: 0,
        details: { configured: isEmailConfigured() }
    });

    checks.push({
        name: 'whatsapp_service',
        status: isWhatsAppConfigured() ? 'HEALTHY' : 'DEGRADED',
        latency: 0,
        details: { configured: isWhatsAppConfigured() }
    });

    // Log to DB
    try {
        const { error: logError } = await (supabase as any).from('system_health_checks').insert({
            check_name: 'CRON_FULL_SYSTEM',
            status: overallStatus,
            response_time_ms: Math.round(performance.now() - startDb), // Total approx
            metadata: { checks },
            checked_at: new Date().toISOString()
        });

        if (logError) console.error('Failed to log health check', logError);
    } catch (err) {
        console.error('Failed to insert health log', err);
    }

    return NextResponse.json({
        status: overallStatus,
        checks,
        timestamp: new Date().toISOString()
    });
}
