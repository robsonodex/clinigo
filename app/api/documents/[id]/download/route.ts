import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isDoctorAllowedForDocument } from '../route'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/documents/[id]/download
 * Rota segura para visualização/download de documentos de pacientes.
 * Suporta Cloudflare R2 e Supabase Storage, redirecionando o navegador
 * para uma URL assinada (presigned URL) válida e temporária.
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
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // 2. Obter perfil e clinica do usuario
        const { data: currentUser } = await supabase
            .from('users')
            .select('id, role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 })
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
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
        }

        const patientClinicId = (document.patient as any)?.clinic_id

        // 4. Validacao estrita de isolamento multi-tenant
        if (currentUser.role !== 'SUPER_ADMIN') {
            const headerClinicId = request.headers.get('x-clinic-id')
            const effectiveClinicId = headerClinicId || currentUser.clinic_id

            if (patientClinicId && patientClinicId !== effectiveClinicId && patientClinicId !== currentUser.clinic_id) {
                return NextResponse.json(
                    { error: 'Acesso negado: documento pertence a outra clínica' },
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
                        { error: 'Acesso negado: paciente não vinculado aos seus atendimentos' },
                        { status: 403 }
                    )
                }
            }
        }

        // 5. Resolver caminho e obter Signed URL
        let storageFilePath = document.file_url || ''
        const expiresInSeconds = 600
        let signedUrl = ''

        // Normalizar caso venha como URL estática http do Supabase
        if (storageFilePath.startsWith('http://') || storageFilePath.startsWith('https://')) {
            // Se for URL pública antiga do Supabase, pode redirecionar diretamente
            return NextResponse.redirect(storageFilePath, { status: 302 })
        }

        // Detectar se está no padrão R2 ou prefixado com r2://
        const isR2Key = storageFilePath.startsWith('r2://') || 
            (storageFilePath.includes('/patient-documents/') && !storageFilePath.startsWith('http'))

        if (isR2Key) {
            try {
                const { R2StorageAdapter } = await import('@/lib/services/storage/adapters/r2-adapter')
                const r2Adapter = new R2StorageAdapter()
                signedUrl = await r2Adapter.getSignedReadUrl({ key: storageFilePath, expiresInSeconds })
            } catch (r2Err: any) {
                console.error('[R2_DOWNLOAD_ERROR]', r2Err)
                // Fallback para Supabase se falhar no R2
            }
        }

        // Se ainda não gerou signedUrl, tenta no Supabase Storage
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

        if (!signedUrl) {
            return NextResponse.json(
                { error: 'Arquivo do documento não encontrado no armazenamento seguro.' },
                { status: 404 }
            )
        }

        return NextResponse.redirect(signedUrl, { status: 302 })

    } catch (error: any) {
        console.error('[GET_DOWNLOAD_DOCUMENT]', error)
        return NextResponse.json(
            { error: error?.message || 'Erro interno ao acessar arquivo do documento' },
            { status: 500 }
        )
    }
}
