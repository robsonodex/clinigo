import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
    const { data, error } = await supabase
        .from('scheduled_billings')
        .select('*')
        .order('scheduled_for', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching scheduled_billings:', error);
        return;
    }

    console.log('Total scheduled billings found:', data?.length || 0);
    console.table(data?.map(b => ({
        id: b.id,
        clinic_name: b.clinic_name,
        title: b.title,
        scheduled_for: b.scheduled_for,
        status: b.status,
        updated_at: b.updated_at
    })));
}

check();
