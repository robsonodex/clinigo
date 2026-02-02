/**
 * Demo Cleanup Script
 * Removes all demo data from the database
 * 
 * Usage: npx tsx scripts/cleanup-demo.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.demo') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const DEMO_CLINIC_ID = 'de000000-0000-0000-0000-000000000001';

async function cleanup() {
    console.log('🧹 ==========================================');
    console.log('   CliniGo Demo Environment Cleanup');
    console.log('   ==========================================\n');

    console.log('⚠️  WARNING: This will delete ALL demo data!\n');

    try {
        // Delete in reverse order of dependencies

        console.log('📦 Deleting financial entries...');
        await supabase.from('financial_entries').delete().eq('clinic_id', DEMO_CLINIC_ID);

        console.log('📦 Deleting medical records...');
        await supabase.from('medical_records').delete().eq('clinic_id', DEMO_CLINIC_ID);

        console.log('📦 Deleting appointments...');
        await supabase.from('appointments').delete().eq('clinic_id', DEMO_CLINIC_ID);

        console.log('📦 Deleting schedules...');
        const { data: doctors } = await supabase.from('doctors').select('id').eq('clinic_id', DEMO_CLINIC_ID);
        if (doctors) {
            for (const doc of doctors) {
                await supabase.from('schedules').delete().eq('doctor_id', doc.id);
            }
        }

        console.log('📦 Deleting patients...');
        await supabase.from('patients').delete().eq('clinic_id', DEMO_CLINIC_ID);

        console.log('📦 Deleting doctors...');
        await supabase.from('doctors').delete().eq('clinic_id', DEMO_CLINIC_ID);

        console.log('📦 Deleting users...');
        await supabase.from('users').delete().eq('clinic_id', DEMO_CLINIC_ID);
        await supabase.from('users').delete().like('email', '%@demo.clinigo.internal');

        console.log('📦 Deleting health insurances...');
        await supabase.from('health_insurances').delete().eq('clinic_id', DEMO_CLINIC_ID);

        console.log('📦 Deleting clinic...');
        await supabase.from('clinics').delete().eq('id', DEMO_CLINIC_ID);

        // Delete auth users
        console.log('📦 Deleting auth users...');
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        if (authUsers?.users) {
            for (const user of authUsers.users) {
                if (user.email?.includes('@demo.clinigo.internal')) {
                    await supabase.auth.admin.deleteUser(user.id);
                    console.log(`   ✓ Deleted auth user: ${user.email}`);
                }
            }
        }

        console.log('\n✅ Demo data cleanup complete!');

    } catch (error) {
        console.error('\n❌ Cleanup error:', error);
        process.exit(1);
    }
}

cleanup();
