/**
 * API Route: TISS Auto-Migration Cron Job
 * 
 * GET /api/cron/tiss-auto-migrate
 * 
 * Triggered by Vercel Cron on December 1, 2026 at midnight UTC.
 * Can also be manually triggered for testing purposes.
 * 
 * **Security**: Should be protected by Vercel Cron Secret in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    autoMigrateTissVersion,
    checkMigrationStatus,
    rollbackTissMigration,
} from '@/lib/cron/tiss-version-auto-migrate';

// ============================================================================
// GET Handler - Execute Migration
// ============================================================================

export async function GET(req: NextRequest) {
    try {
        console.log('[API] TISS auto-migration cron triggered');

        // Optional: Verify Vercel Cron Secret for security
        // const authHeader = req.headers.get('authorization');
        // const cronSecret = process.env.CRON_SECRET;
        // if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        // Execute migration
        const result = await autoMigrateTissVersion();

        // Return appropriate status code
        const statusCode = result.success ? 200 : 400;

        return NextResponse.json(result, { status: statusCode });

    } catch (error: any) {
        console.error('[API] TISS auto-migration error:', error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Migration failed',
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST Handler - Check Status or Rollback
// ============================================================================

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { action } = body;

        if (action === 'status') {
            // Check migration status
            const status = await checkMigrationStatus();
            return NextResponse.json(status);
        }

        if (action === 'rollback') {
            // Emergency rollback
            console.warn('[API] TISS migration rollback requested');
            const result = await rollbackTissMigration();
            return NextResponse.json(result);
        }

        // Default: same as GET (execute migration)
        const result = await autoMigrateTissVersion();
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[API] TISS migration POST error:', error);

        return NextResponse.json(
            { error: error.message || 'Request failed' },
            { status: 500 }
        );
    }
}
