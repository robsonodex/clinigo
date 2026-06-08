import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    const { data: clinics } = await supabase.from('clinics').select('id, name, slug, is_active');
    console.log('--- CLINICS ---');
    console.log(JSON.stringify(clinics, null, 2));

    const { data: doctors } = await supabase.from('doctors').select('id, clinic_id, specialty, user:users(full_name)');
    console.log('--- DOCTORS ---');
    console.log(JSON.stringify(doctors, null, 2));
}
run();
