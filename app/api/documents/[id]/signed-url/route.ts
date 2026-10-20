import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isDoctorAllowedForDocument } from '../route'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/documents/[id]/signed-url
 * Gera uma URL assinada temporaria (10 min) para acesso seguro a documentos de pacientes.
 * O documento NUNCA mais e servido via URL publica estatica.
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id: documentId } = await params
        const supabase = await createClient()

        // 1. Validar autenticacao
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        // 2. Obter perfil e clinica do usuario
        const { data: currentUser } = await supabase
            .from('users')
            .select('id, role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser) {
            return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 401 })
        }

        // 3. Buscar documento e clinica do paciente
        const adminDb = createServiceRoleClient() as any
        const { data: document, error: docError } = await adminDb
            .from('patient_documents')
            .select(`
                id,
                file_name,
                file_url,
                file_type,
                category,
                patient_id,
                uploaded_by,
                patient:patients!patient_documents_patient_id_fkey(id, clinic_id, full_name)
            `)
            .eq('id', documentId)
            .single()

        if (docError || !document) {
            return NextResponse.json({ error: 'Documento nao encontrado' }, { status: 404 })
        }

        const patientClinicId = (document.patient as any)?.clinic_id

        // 4. Validacao estrita de isolamento multi-tenant
        if (currentUser.role !== 'SUPER_ADMIN') {
            const headerClinicId = request.headers.get('x-clinic-id')
            const effectiveClinicId = headerClinicId || currentUser.clinic_id

            if (patientClinicId && patientClinicId !== effectiveClinicId && patientClinicId !== currentUser.clinic_id) {
                return NextResponse.json(
                    { error: 'Acesso negado: documento pertence a outra clinica' },
                    { status: 403 }
                )
            }

            // Restricao para documentos pessoais/administrativos sensiveis
            if (document.category === 'personal' && currentUser.role !== 'CLINIC_ADMIN') {
                return NextResponse.json(
                    { error: 'Acesso negado: apenas administradores podem visualizar documentos pessoais' },
                    { status: 403 }
                )
            }

            // Restricao para medicos/terapeutas
            if (currentUser.role === 'DOCTOR') {
                const allowed = await isDoctorAllowedForDocument(supabase, currentUser.id, document.patient_id)
                if (!allowed) {
                    return NextResponse.json(
                        { error: 'Acesso negado: paciente nao vinculado aos seus atendimentos' },
                        { status: 403 }
                    )
                }
            }
        }

        // 5. Detectar provedor de armazenamento e gerar URL assinada
        let storageFilePath = document.file_url || ''
        const expiresInSeconds = 600
        let signedUrl = ''

        // Se for URL direta do Supabase
        if (storageFilePath.startsWith('http://') || storageFilePath.startsWith('https://')) {
            return NextResponse.json({
                success: true,
                signedUrl: storageFilePath,
                expiresIn: expiresInSeconds,
                fileName: document.file_name,
                fileType: document.file_type
            })
        }

        const isExplicitR2 = storageFilePath.startsWith('r2://')

        // 1. Se estiver explicitamente prefixado com r2://, priorizar Cloudflare R2
        if (isExplicitR2) {
            try {
                const { R2StorageAdapter } = await import('@/lib/services/storage/adapters/r2-adapter')
                const r2Adapter = new R2StorageAdapter()
                signedUrl = await r2Adapter.getSignedReadUrl({ key: storageFilePath, expiresInSeconds })
            } catch (r2Err: any) {
                console.warn('[R2_SIGNED_URL_FALLBACK_ATTEMPT]', r2Err?.message || r2Err)
            }
        }

        // 2. Se NÃO é explicitamente R2 (upload padrão no Supabase Storage) ou se falhou no R2: tenta no Supabase Storage
        if (!signedUrl) {
            let cleanPath = storageFilePath.replace(/^r2:\/\//, '').replace(/^supabase:\/\//, '')
            if (cleanPath.includes('patient-documents/')) {
                cleanPath = cleanPath.split('patient-documents/')[1].split('?')[0]
            }

            const { data: signedData, error: signError } = await adminDb
                .storage
                .from('patient-documents')
                .createSignedUrl(cleanPath, expiresInSeconds)

            if (!signError && signedData?.signedUrl) {
                signedUrl = signedData.signedUrl
            }
        }

        // 3. Fallback adicional: se não era explicitamente r2:// e falhou no Supabase Storage, verifica se existe no R2 antes de assinar
        if (!signedUrl && !isExplicitR2) {
            try {
                const { R2StorageAdapter } = await import('@/lib/services/storage/adapters/r2-adapter')
                const r2Adapter = new R2StorageAdapter()
                const existsInR2 = await r2Adapter.exists({ key: storageFilePath })
                if (existsInR2) {
                    signedUrl = await r2Adapter.getSignedReadUrl({ key: storageFilePath, expiresInSeconds })
                }
            } catch (err: any) {
                console.warn('[R2_FALLBACK_CHECK_FAILED]', err?.message || err)
            }
        }

        if (!signedUrl) {
            return NextResponse.json({ error: 'Arquivo do documento não encontrado no armazenamento seguro.' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            signedUrl,
            expiresIn: expiresInSeconds,
            fileName: document.file_name,
            fileType: document.file_type
        })

    } catch (error: any) {
        console.error('[GET_SIGNED_URL]', error)
        return NextResponse.json(
            { error: error?.message || 'Erro interno ao gerar link do documento' },
            { status: 500 }
        )
    }
}
