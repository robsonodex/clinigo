import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateClinicBackupPackage } from '@/lib/services/clinic-backup-service'

interface Props {
    params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos de timeout para compilação ampla

/**
 * POST /api/super-admin/clinics/[id]/backup
 * Dispara a geração assíncrona do pacote ZIP com upload para o Cloudflare R2
 * Retorna link assinado temporário com 7 dias de validade e hash SHA-256
 * Restrito estritamente a SUPER_ADMIN
 */
export async function POST(request: NextRequest, { params }: Props) {
    try {
        const { id: clinicId } = await params

        // 1. Validar autenticação e perfil SUPER_ADMIN
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || userData.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado: Requer privilégios de Super Admin' }, { status: 403 })
        }

        const body = await request.json().catch(() => ({}))
        const {
            includeExcelAndCsv = true,
            includeR2Files = true,
            includeDossiers = true,
        } = body

        console.log(`[BACKUP_ADMIN] Iniciando compilação para clínica ${clinicId} pelo usuário ${user.id}...`)

        // 2. Executar compilação completa e upload para R2
        const result = await generateClinicBackupPackage(clinicId, {
            includeExcelAndCsv,
            includeR2Files,
            includeDossiers,
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[SUPER_ADMIN_BACKUP_GENERATION_ERROR]', error)
        return NextResponse.json(
            { error: error?.message || 'Erro ao gerar pacote de backup da clínica' },
            { status: 500 }
        )
    }
}
