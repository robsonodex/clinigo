/**
 * TISS Version Auto-Migration Job
 * 
 * Scheduled to run on December 1, 2026 at midnight UTC.
 * Automatically migrates all health insurances and clinics from TISS 4.01.00 to 4.02.00.
 * 
 * **Important**: This is configured for Dec 1, 2026 to allow testing during 2026.
 * Adjust the date if needed based on your deployment timeline.
 * 
 * Trigger: Vercel Cron (configured in vercel.json)
 * Frequency: Once on Dec 1, 2026
 * Can also be manually triggered via API endpoint
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { TissVersion } from '@/lib/types/tiss-versions';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Target transition date
 * Set to Dec 1, 2026 to allow full year of testing with both versions
 */
const TRANSITION_DATE = new Date('2026-12-01T00:00:00Z');

/**
 * Source and target versions for migration
 */
const SOURCE_VERSION: TissVersion = '4.01.00';
const TARGET_VERSION: TissVersion = '4.02.00';

// ============================================================================
// Type Definitions
// ============================================================================

interface MigrationResult {
    success: boolean;
    insurancesUpdated: number;
    clinicsUpdated: number;
    timestamp: string;
    insuranceIds?: string[];
    clinicIds?: string[];
    error?: string;
}

interface MigrationLog {
    event_type: string;
    description: string;
    metadata: {
        insurances_migrated: number;
        clinics_migrated: number;
        insurance_ids: string[];
        clinic_ids: string[];
        source_version: string;
        target_version: string;
        scheduled_date: string;
        actual_execution: string;
    };
    created_at: string;
}

// ============================================================================
// Main Migration Function
// ============================================================================

/**
 * Execute automatic TISS version migration
 * 
 * This function:
 * 1. Checks if current date >= transition date
 * 2. Updates all insurances on 4.01.00 to 4.02.00
 * 3. Updates all clinic defaults on 4.01.00 to 4.02.00
 * 4. Creates audit log entry
 * 5. Returns migration statistics
 * 
 * @returns Migration result with statistics
 */
export async function autoMigrateTissVersion(): Promise<MigrationResult> {
    const now = new Date();

    console.log('========================================');
    console.log('[TISS Auto-Migrate] Job triggered');
    console.log(`[TISS Auto-Migrate] Current time: ${now.toISOString()}`);
    console.log(`[TISS Auto-Migrate] Transition date: ${TRANSITION_DATE.toISOString()}`);
    console.log('========================================');

    // ========================================================================
    // Step 1: Check if it's time to migrate
    // ========================================================================

    if (now < TRANSITION_DATE) {
        const daysUntil = Math.ceil((TRANSITION_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`[TISS Auto-Migrate] ⏰ Not yet time to migrate. ${daysUntil} days remaining.`);

        return {
            success: false,
            insurancesUpdated: 0,
            clinicsUpdated: 0,
            timestamp: now.toISOString(),
            error: `Migration scheduled for ${TRANSITION_DATE.toISOString()}. ${daysUntil} days remaining.`,
        };
    }

    console.log('[TISS Auto-Migrate] ✅ Migration date reached. Starting migration...');

    const supabase = createServiceRoleClient();

    try {
        // ========================================================================
        // Step 2: Migrate Health Insurances
        // ========================================================================

        console.log(`[TISS Auto-Migrate] Migrating health insurances from ${SOURCE_VERSION} to ${TARGET_VERSION}...`);

        const { data: insurances, error: insuranceError } = await supabase
            .from('health_insurances' as any)
            .update({ tiss_version: TARGET_VERSION })
            .eq('tiss_version', SOURCE_VERSION)
            .select('id, name, clinic_id');

        if (insuranceError) {
            console.error('[TISS Auto-Migrate] ❌ Error migrating insurances:', insuranceError);
            throw insuranceError;
        }

        const insurancesCount = insurances?.length || 0;
        console.log(`[TISS Auto-Migrate] ✅ Migrated ${insurancesCount} health insurance${insurancesCount !== 1 ? 's' : ''}`);

        // Log each migrated insurance
        if (insurances && insurances.length > 0) {
            console.log('[TISS Auto-Migrate] Migrated insurances:');
            insurances.forEach((ins: any, idx: number) => {
                console.log(`  ${idx + 1}. ${ins.name} (ID: ${ins.id})`);
            });
        }

        // ========================================================================
        // Step 3: Migrate Clinic Defaults
        // ========================================================================

        console.log(`[TISS Auto-Migrate] Migrating clinic defaults from ${SOURCE_VERSION} to ${TARGET_VERSION}...`);

        const { data: clinics, error: clinicsError } = await supabase
            .from('clinics' as any)
            .update({ tiss_default_version: TARGET_VERSION })
            .eq('tiss_default_version', SOURCE_VERSION)
            .select('id, name');

        if (clinicsError) {
            console.error('[TISS Auto-Migrate] ❌ Error migrating clinics:', clinicsError);
            throw clinicsError;
        }

        const clinicsCount = clinics?.length || 0;
        console.log(`[TISS Auto-Migrate] ✅ Migrated ${clinicsCount} clinic${clinicsCount !== 1 ? 's' : ''}`);

        // Log each migrated clinic
        if (clinics && clinics.length > 0) {
            console.log('[TISS Auto-Migrate] Migrated clinics:');
            clinics.forEach((clinic, idx) => {
                console.log(`  ${idx + 1}. ${clinic.name} (ID: ${clinic.id})`);
            });
        }

        // ========================================================================
        // Step 4: Create Audit Log
        // ========================================================================

        console.log('[TISS Auto-Migrate] Creating audit log entry...');

        const logDetails = {
            description: `Migração automática TISS ${SOURCE_VERSION} → ${TARGET_VERSION} concluída. ${insurancesCount} operadora(s) + ${clinicsCount} clínica(s) atualizadas.`,
            stats: {
                insurances_migrated: insurancesCount,
                clinics_migrated: clinicsCount,
                insurance_ids: insurances?.map(i => i.id) || [],
                clinic_ids: clinics?.map(c => c.id) || [],
                source_version: SOURCE_VERSION,
                target_version: TARGET_VERSION,
                scheduled_date: TRANSITION_DATE.toISOString(),
                actual_execution: now.toISOString(),
            }
        };

        const { error: logError } = await supabase
            .from('audit_logs' as any)
            .insert({
                entity_type: 'TISS_MIGRATION',
                action: 'AUTO_MIGRATE_VERSION',
                metadata: logDetails
            });

        if (logError) {
            console.warn('[TISS Auto-Migrate] ⚠️  Warning: Could not create audit log:', logError);
            // Don't throw - migration was successful even if logging failed
        } else {
            console.log('[TISS Auto-Migrate] ✅ Audit log created successfully');
        }

        // ========================================================================
        // Step 5: Return Success Result
        // ========================================================================

        console.log('========================================');
        console.log('[TISS Auto-Migrate] 🎉 Migration completed successfully!');
        console.log(`[TISS Auto-Migrate] Summary:`);
        console.log(`  - Insurances migrated: ${insurancesCount}`);
        console.log(`  - Clinics migrated: ${clinicsCount}`);
        console.log(`  - From version: ${SOURCE_VERSION}`);
        console.log(`  - To version: ${TARGET_VERSION}`);
        console.log('========================================');

        return {
            success: true,
            insurancesUpdated: insurancesCount,
            clinicsUpdated: clinicsCount,
            timestamp: now.toISOString(),
            insuranceIds: insurances?.map(i => i.id),
            clinicIds: clinics?.map(c => c.id),
        };

    } catch (error: any) {
        console.error('========================================');
        console.error('[TISS Auto-Migrate] ❌ MIGRATION FAILED');
        console.error('[TISS Auto-Migrate] Error:', error);
        console.error('========================================');

        // Log error to system logs (if possible)
        try {
            await supabase.from('audit_logs' as any).insert({
                entity_type: 'TISS_MIGRATION',
                action: 'AUTO_MIGRATE_ERROR',
                metadata: {
                    error: error.message,
                    stack: error.stack,
                    scheduled_date: TRANSITION_DATE.toISOString(),
                    attempted_execution: now.toISOString(),
                }
            });
        } catch (logError) {
            console.error('[TISS Auto-Migrate] Could not log error to database');
        }

        return {
            success: false,
            insurancesUpdated: 0,
            clinicsUpdated: 0,
            timestamp: now.toISOString(),
            error: error.message || 'Unknown error during migration',
        };
    }
}

// ============================================================================
// Manual Rollback Function (Emergency Use)
// ============================================================================

/**
 * Rollback migration (emergency use only)
 * 
 * Reverts all insurances and clinics back to TISS 4.01.00
 * 
 * @returns Rollback result
 */
export async function rollbackTissMigration(): Promise<MigrationResult> {
    const now = new Date();
    console.log('[TISS Rollback] Starting emergency rollback...');

    const supabase = createServiceRoleClient();

    try {
        // Rollback Insurances
        const { data: insurances, error: insuranceError } = await supabase
            .from('health_insurances' as any)
            .update({ tiss_version: SOURCE_VERSION })
            .eq('tiss_version' as any, TARGET_VERSION)
            .select('id, name');

        if (insuranceError) throw insuranceError;

        // Rollback Clinics
        const { data: clinics, error: clinicsError } = await supabase
            .from('clinics' as any)
            .update({ tiss_default_version: SOURCE_VERSION })
            .eq('tiss_default_version' as any, TARGET_VERSION)
            .select('id, name');

        if (clinicsError) throw clinicsError;

        // Log Rollback (Audit Log)
        await supabase.from('audit_logs' as any).insert({
            entity_type: 'TISS_MIGRATION',
            action: 'ROLLBACK_VERSION',
            metadata: {
                description: `Rollback TISS ${TARGET_VERSION} → ${SOURCE_VERSION}. ${insurances?.length || 0} operadoras + ${clinics?.length || 0} clínicas revertidas.`,
                stats: {
                    insurances_rolled_back: insurances?.length || 0,
                    clinics_rolled_back: clinics?.length || 0,
                    from_version: TARGET_VERSION,
                    to_version: SOURCE_VERSION,
                    rollback_time: now.toISOString(),
                }
            }
        });

        console.log(`[TISS Rollback] ✅ Rollback successful. ${insurances?.length || 0} insurances, ${clinics?.length || 0} clinics reverted.`);

        return {
            success: true,
            insurancesUpdated: insurances?.length || 0,
            clinicsUpdated: clinics?.length || 0,
            timestamp: now.toISOString(),
        };

    } catch (error: any) {
        console.error('[TISS Rollback] ❌ Rollback failed:', error);
        return {
            success: false,
            insurancesUpdated: 0,
            clinicsUpdated: 0,
            timestamp: now.toISOString(),
            error: error.message,
        };
    }
}

// ============================================================================
// Check Migration Status
// ============================================================================

/**
 * Check if migration has already been performed
 * 
 * @returns Migration status information
 */
export async function checkMigrationStatus() {
    const supabase = createServiceRoleClient();
    const now = new Date();

    try {
        // Count insurances by version
        const { count: v401Count } = await supabase
            .from('health_insurances' as any)
            .select('*', { count: 'exact', head: true })
            .eq('tiss_version' as any, '4.01.00');

        const { count: v402Count } = await supabase
            .from('health_insurances' as any)
            .select('*', { count: 'exact', head: true })
            .eq('tiss_version' as any, '4.02.00');

        // Check for migration log
        const { data: migrationLog } = await supabase
            .from('audit_logs' as any)
            .select('*')
            .eq('entity_type', 'TISS_MIGRATION')
            .eq('action', 'AUTO_MIGRATE_VERSION')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const daysUntilTransition = Math.ceil((TRANSITION_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            hasTransitionDatePassed: now >= TRANSITION_DATE,
            daysUntilTransition: daysUntilTransition > 0 ? daysUntilTransition : 0,
            transitionDate: TRANSITION_DATE.toISOString(),
            insurancesOn401: v401Count || 0,
            insurancesOn402: v402Count || 0,
            totalInsurances: (v401Count || 0) + (v402Count || 0),
            percentOn402: ((v402Count || 0) / Math.max((v401Count || 0) + (v402Count || 0), 1)) * 100,
            migrationExecuted: !!migrationLog,
            lastMigrationDate: migrationLog?.created_at || null,
        };

    } catch (error: any) {
        console.error('[TISS Migration Status] Error:', error);
        throw error;
    }
}
