import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { generateClinicBackupPackage } from '@/lib/services/clinic-backup-service'

// Permitir tempo de execução para download de anexos e compactação
export const maxDuration = 120

export async function POST(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clinicId } = await context.params
        if (!clinicId) {
            return NextResponse.json({ error: 'ID da clínica não fornecido.' }, { status: 400 })
        }

        // 1. Validar autenticação e autorização de Super Admin
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        const supabaseAdmin = createServiceRoleClient()
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('role, email')
            .eq('id', user.id)
            .single()

        const isSuperAdmin = userData?.role === 'SUPER_ADMIN' || user.email === 'contato@clinigo.app'
        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Acesso restrito a Super Administradores.' }, { status: 403 })
        }

        // 2. Executar compilação do pacote oficial de portabilidade
        console.log(`[API_BACKUP_START] Iniciando exportação para clínica ID: ${clinicId}`)
        const result = await generateClinicBackupPackage(clinicId)

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[API_CLINIC_BACKUP_EXECUTION_ERROR]:', error)
        return NextResponse.json(
            { error: error?.message || 'Falha durante a geração do pacote de backup.' },
            { status: 500 }
        )
    }
}
