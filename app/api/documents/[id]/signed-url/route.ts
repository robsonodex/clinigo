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
        const isHttp = storageFilePath.startsWith('http://') || storageFilePath.startsWith('https://')
        const isR2Key = isExplicitR2 || (!isHttp && (
            storageFilePath.includes('/patient-documents/') ||
            /^[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\//.test(storageFilePath)
        ))

        // 1. Tentar obter Signed URL do Cloudflare R2
        if (isR2Key || isExplicitR2) {
            try {
                const { R2StorageAdapter } = await import('@/lib/services/storage/adapters/r2-adapter')
                const r2Adapter = new R2StorageAdapter()
                signedUrl = await r2Adapter.getSignedReadUrl({ key: storageFilePath, expiresInSeconds })
            } catch (r2Err: any) {
                console.warn('[R2_SIGNED_URL_FALLBACK_ATTEMPT]', r2Err?.message || r2Err)
            }
        }

        // 2. Fallback para Supabase Storage se não obteve signedUrl
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

        // 3. Fallback adicional para R2 caso não tenha sido detectado inicialmente e tenha falhado no Supabase
        if (!signedUrl && !isR2Key && !isHttp) {
            try {
                const { R2StorageAdapter } = await import('@/lib/services/storage/adapters/r2-adapter')
                const r2Adapter = new R2StorageAdapter()
                signedUrl = await r2Adapter.getSignedReadUrl({ key: storageFilePath, expiresInSeconds })
            } catch (err) {
                // ignorar
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
