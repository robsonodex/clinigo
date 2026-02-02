/**
 * Demo Verification Script
 * Checks if demo data was created correctly
 * 
 * Usage: npx tsx scripts/verify-demo-data.ts
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

interface VerificationResult {
    entity: string;
    expected: number;
    actual: number;
    status: '✅' | '❌' | '⚠️';
}

async function verify() {
    console.log('🔍 ==========================================');
    console.log('   CliniGo Demo Data Verification');
    console.log('   ==========================================\n');

    const results: VerificationResult[] = [];

    // Check clinic
    const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', DEMO_CLINIC_ID)
        .single();

    results.push({
        entity: 'Clínica Demo',
        expected: 1,
        actual: clinic ? 1 : 0,
        status: clinic ? '✅' : '❌'
    });

    // Check health insurances
    const { data: insurances, count: insuranceCount } = await supabase
        .from('health_insurances')
        .select('*', { count: 'exact' })
        .eq('clinic_id', DEMO_CLINIC_ID);

    results.push({
        entity: 'Convênios',
        expected: 4,
        actual: insuranceCount || 0,
        status: (insuranceCount || 0) >= 4 ? '✅' : '❌'
    });

    // Check users
    const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .like('email', '%@demo.clinigo.internal');

    results.push({
        entity: 'Usuários',
        expected: 9,
        actual: userCount || 0,
        status: (userCount || 0) >= 9 ? '✅' : (userCount || 0) > 0 ? '⚠️' : '❌'
    });

    // Check doctors
    const { count: doctorCount } = await supabase
        .from('doctors')
        .select('*', { count: 'exact' })
        .eq('clinic_id', DEMO_CLINIC_ID);

    results.push({
        entity: 'Médicos',
        expected: 5,
        actual: doctorCount || 0,
        status: (doctorCount || 0) >= 5 ? '✅' : (doctorCount || 0) > 0 ? '⚠️' : '❌'
    });

    // Check patients
    const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('clinic_id', DEMO_CLINIC_ID);

    results.push({
        entity: 'Pacientes',
        expected: 15,
        actual: patientCount || 0,
        status: (patientCount || 0) >= 15 ? '✅' : (patientCount || 0) > 0 ? '⚠️' : '❌'
    });

    // Check appointments
    const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('clinic_id', DEMO_CLINIC_ID);

    results.push({
        entity: 'Agendamentos',
        expected: 50,
        actual: appointmentCount || 0,
        status: (appointmentCount || 0) >= 50 ? '✅' : (appointmentCount || 0) > 0 ? '⚠️' : '❌'
    });

    // Check medical records
    const { count: recordCount } = await supabase
        .from('medical_records')
        .select('*', { count: 'exact' })
        .eq('clinic_id', DEMO_CLINIC_ID);

    results.push({
        entity: 'Prontuários',
        expected: 15,
        actual: recordCount || 0,
        status: (recordCount || 0) >= 15 ? '✅' : (recordCount || 0) > 0 ? '⚠️' : '❌'
    });

    // Check financial entries
    const { count: financeCount } = await supabase
        .from('financial_entries')
        .select('*', { count: 'exact' })
        .eq('clinic_id', DEMO_CLINIC_ID);

    results.push({
        entity: 'Lançamentos Financeiros',
        expected: 25,
        actual: financeCount || 0,
        status: (financeCount || 0) >= 25 ? '✅' : (financeCount || 0) > 0 ? '⚠️' : '❌'
    });

    // Print results table
    console.log('| Entidade                 | Esperado | Atual | Status |');
    console.log('|--------------------------|----------|-------|--------|');

    for (const result of results) {
        const entityPadded = result.entity.padEnd(24);
        const expectedPadded = result.expected.toString().padStart(8);
        const actualPadded = result.actual.toString().padStart(5);
        console.log(`| ${entityPadded} | ${expectedPadded} | ${actualPadded} | ${result.status}     |`);
    }

    const allPassed = results.every(r => r.status === '✅');
    const hasFailed = results.some(r => r.status === '❌');

    console.log('\n');
    if (allPassed) {
        console.log('✅ All verifications passed! Demo environment is ready.');
    } else if (hasFailed) {
        console.log('❌ Some verifications failed. Please run seed-demo-data.ts again.');
    } else {
        console.log('⚠️  Some data is missing. Check the results above.');
    }

    // Print credentials
    console.log('\n📧 Demo Login Credentials:');
    console.log('   Email: admin@demo.clinigo.internal');
    console.log('   Password: Demo@2026!');
    console.log('   URL: https://clinigo.app/login');
}

verify();
