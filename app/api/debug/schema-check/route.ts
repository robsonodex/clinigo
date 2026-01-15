import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createServiceRoleClient()

        // List of tables to inspect
        const tables = ['medical_records', 'appointments', 'patients', 'users', 'clinics']
        const schemaInfo: Record<string, any> = {}

        for (const table of tables) {
            const { data, error } = await supabase
                .rpc('get_table_info', { table_name: table })
            // Fallback to direct query if RPC doesn't exist (likely won't for schema inspection)
            // Actually, standard users can't read information_schema usually via generic client? 
            // Let's try to select * limit 0 to see headers or use a raw query if possible.
            // Supabase-js doesn't support raw SQL easily without RPC.

            // ALTERNATIVE: Use Postgrest introspection?
            // Simpler: Just try to select 1 row and see the keys (columns)

            const { data: sample, error: sampleError } = await supabase
                .from(table)
                .select('*')
                .limit(1)

            if (sampleError) {
                schemaInfo[table] = { error: sampleError.message, details: sampleError }
            } else {
                schemaInfo[table] = {
                    columns_found: sample && sample.length > 0 ? Object.keys(sample[0]) : 'Table empty (cant inspect cols)',
                    row_count_check: (sample || []).length
                }
            }
        }

        return NextResponse.json({
            status: 'Diagnostic Run',
            timestamp: new Date().toISOString(),
            schema: schemaInfo
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
