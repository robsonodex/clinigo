/**
 * Public Intake File Upload — POST /api/public/intake/[token]/upload
 * 
 * Receives insurance card photos (front/back) attached to a token-validated intake.
 * No authentication required. Validates: token, file type, file size.
 */

import { NextRequest, NextResponse } from 'next/server'
import { hashToken } from '@/lib/services/patient-intake'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ token: string }>
}

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest, { params }: Props) {
    try {
        const { token } = await params

        if (!token || token.length < 32) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
        }

        // Rate limit
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
        const rateLimitResult = await checkRateLimit('api', `intake-upload:${ip}`)
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Muitas tentativas. Aguarde um momento.' },
                { status: 429 }
            )
        }

        // Validate token
        const supabase = createServiceRoleClient()
        const tokenHash = hashToken(token)

        const { data: link } = await supabase
            .from('patient_intake_links')
            .select('id, clinic_id, status, is_static, expires_at')
            .eq('token_hash', tokenHash)
            .maybeSingle()

        if (!link) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
        }

        // Check expiration
        if (!link.is_static && link.expires_at && new Date(link.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Link expirado' }, { status: 410 })
        }

        // Parse multipart form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const kind = formData.get('kind') as string | null

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
        }

        if (!kind || !['carteirinha_frente', 'carteirinha_verso'].includes(kind)) {
            return NextResponse.json(
                { error: 'Tipo de arquivo inválido. Use: carteirinha_frente ou carteirinha_verso' },
                { status: 400 }
            )
        }

        // Validate file type and size
        if (!ALLOWED_MIMES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.' },
                { status: 400 }
            )
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'Arquivo muito grande. Máximo: 5 MB.' },
                { status: 400 }
            )
        }

        // Get or create a pending submission for this link
        let { data: submission } = await supabase
            .from('patient_intake_submissions')
            .select('id')
            .eq('link_id', link.id)
            .in('status', ['pending', 'needs_correction'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!submission) {
            const { data: newSub, error: subError } = await supabase
                .from('patient_intake_submissions')
                .insert({
                    clinic_id: link.clinic_id,
                    link_id: link.id,
                    status: 'pending',
                    original_data: {},
                    consent: {},
                })
                .select('id')
                .single()

            if (subError) {
                return NextResponse.json({ error: 'Erro ao preparar upload' }, { status: 500 })
            }
            submission = newSub
        }

        // Upload to storage
        const ext = file.name.split('.').pop() || 'jpg'
        const storagePath = `${link.clinic_id}/${submission.id}/${kind}.${ext}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase.storage
            .from('intake-files')
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: true,
            })

        if (uploadError) {
            console.error('[Intake Upload] Storage error:', uploadError)
            return NextResponse.json(
                { error: 'Erro ao salvar arquivo. Tente novamente.' },
                { status: 500 }
            )
        }

        // Delete existing file of same kind (replace)
        await supabase
            .from('patient_intake_files')
            .delete()
            .eq('submission_id', submission.id)
            .eq('kind', kind)

        // Record in database
        const { data: fileRecord, error: fileError } = await supabase
            .from('patient_intake_files')
            .insert({
                submission_id: submission.id,
                clinic_id: link.clinic_id,
                storage_path: storagePath,
                mime: file.type,
                size: file.size,
                kind,
            })
            .select('id')
            .single()

        if (fileError) {
            console.error('[Intake Upload] DB error:', fileError)
            return NextResponse.json(
                { error: 'Erro ao registrar arquivo' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            file_id: fileRecord.id,
            kind,
        })
    } catch (error: any) {
        console.error('[Intake Upload] Error:', error.message)
        return NextResponse.json(
            { error: 'Erro interno. Tente novamente.' },
            { status: 500 }
        )
    }
}
