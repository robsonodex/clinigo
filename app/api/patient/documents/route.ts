import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPatientToken } from '@/lib/patient-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const patient = await verifyPatientToken(request)
        if (!patient) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()

        // Buscar documentos do paciente (excluindo os de categoria 'personal')
        const { data, error } = await supabase
            .from('patient_documents')
            .select(`
                id,
                file_name,
                file_url,
                file_size,
                file_type,
                category,
                description,
                created_at,
                uploaded_by_user:users!uploaded_by(full_name)
            `)
            .eq('patient_id', patient.sub)
            .neq('category', 'personal')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Erro ao buscar documentos do paciente:', error)
            return NextResponse.json({ error: 'Erro ao buscar documentos' }, { status: 500 })
        }

        const documents = (data || []).map((doc: any) => ({
            id: doc.id,
            name: doc.file_name,
            file_url: doc.file_url,
            file_size: doc.file_size,
            file_type: doc.file_type,
            category: doc.category,
            description: doc.description,
            created_at: doc.created_at,
            uploaded_by: doc.uploaded_by_user?.full_name || 'Profissional'
        }))

        return NextResponse.json({ documents })

    } catch (error) {
        console.error('Erro no endpoint de documentos do paciente:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
