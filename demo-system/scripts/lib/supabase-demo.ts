/**
 * Supabase Demo Client
 * Client configured for demo environment
 */
import { createClient } from '@supabase/supabase-js';

// Demo environment uses the same Supabase project
const supabaseUrl = process.env.DEMO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.DEMO_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for demo');
}

// Service role client for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Demo clinic ID (fixed for consistency)
export const DEMO_CLINIC_ID = 'de000000-0000-0000-0000-000000000001';

// Demo password for all users
export const DEMO_PASSWORD = 'Demo@2026!';

// Check if running in demo mode
export const isDemoMode = () => process.env.DEMO_MODE === 'true';
