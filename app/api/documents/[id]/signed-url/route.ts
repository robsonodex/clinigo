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
        let storageFilePath = document.file_url
        const expiresInSeconds = 600
        let signedUrl = ''

        // Se a chave estiver no padrao R2: {clinic_id}/patient-documents/{entity_id}/...
        const isR2Key = storageFilePath.includes('/patient-documents/') && !storageFilePath.startsWith('http')

        if (isR2Key) {
            try {
                const { R2StorageAdapter } = await import('@/lib/services/storage/adapters/r2-adapter')
                const r2Adapter = new R2StorageAdapter()
                signedUrl = await r2Adapter.getSignedReadUrl({ key: storageFilePath, expiresInSeconds })
            } catch (r2Err: any) {
                console.error('[R2_SIGNED_URL_ERROR]', r2Err)
                return NextResponse.json({ error: 'Falha ao obter acesso seguro no Cloudflare R2' }, { status: 500 })
            }
        } else {
            // Supabase Storage tradicional
            if (storageFilePath.includes('patient-documents/')) {
                storageFilePath = storageFilePath.split('patient-documents/')[1].split('?')[0]
            }

            const { data: signedData, error: signError } = await adminDb
                .storage
                .from('patient-documents')
                .createSignedUrl(storageFilePath, expiresInSeconds)

            if (signError || !signedData?.signedUrl) {
                console.error('[SIGNED_URL_ERROR]', signError)
                return NextResponse.json({ error: 'Falha ao gerar link seguro para o documento' }, { status: 500 })
            }
            signedUrl = signedData.signedUrl
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
