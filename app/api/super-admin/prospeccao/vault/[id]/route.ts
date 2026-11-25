import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdminSalesHq } from '../../_auth'
import { VAULT_CATEGORIES } from '@/lib/sales/prospect-types'

const BUCKET_ID = 'sales-vault'
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const updateVaultSchema = z.object({
    title: z.string().trim().min(2).max(160).optional(),
    category: z.enum(VAULT_CATEGORIES).optional(),
    description: z.string().trim().max(500).optional(),
})

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { id } = await context.params
    if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { data: doc, error } = await auth.supabaseAdmin
        .from('sales_vault_documents' as any)
        .select('*')
        .eq('id', id)
        .single()

    if (error || !doc) {
        return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    const shouldDownload = request.nextUrl.searchParams.get('download') === '1'
    const record = doc as unknown as { file_path: string; file_name: string }

    const { data: signed, error: signError } = await auth.supabaseAdmin.storage
        .from(BUCKET_ID)
        .createSignedUrl(record.file_path, 300, shouldDownload ? { download: record.file_name } : undefined)

    if (signError || !signed?.signedUrl) {
        console.error('[SALES_HQ] Erro ao gerar URL assinada:', signError)
        return NextResponse.json({ error: 'Falha ao gerar link seguro do documento' }, { status: 500 })
    }

    return NextResponse.json({
        url: signed.signedUrl,
        expiresInSeconds: 300,
        fileName: record.file_name,
    })
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { id } = await context.params
    if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 })
    }

    const parsed = updateVaultSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Dados inválidos' },
            { status: 400 }
        )
    }

    const { data, error } = await auth.supabaseAdmin
        .from('sales_vault_documents' as any)
        .update(parsed.data as any)
        .eq('id', id)
        .select('*')
        .single()

    if (error) {
        console.error('[SALES_HQ] Erro ao atualizar documento:', error)
        return NextResponse.json({ error: 'Falha ao atualizar documento' }, { status: 500 })
    }

    return NextResponse.json({ data })
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { id } = await context.params
    if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { data: doc, error: fetchError } = await auth.supabaseAdmin
        .from('sales_vault_documents' as any)
        .select('file_path')
        .eq('id', id)
        .single()

    if (fetchError || !doc) {
        return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    const filePath = (doc as unknown as { file_path: string }).file_path
    const { error: removeError } = await auth.supabaseAdmin.storage.from(BUCKET_ID).remove([filePath])
    if (removeError) {
        console.error('[SALES_HQ] Erro ao remover arquivo do storage:', removeError)
        return NextResponse.json({ error: 'Falha ao remover arquivo do armazenamento' }, { status: 500 })
    }

    const { error: deleteError } = await auth.supabaseAdmin
        .from('sales_vault_documents' as any)
        .delete()
        .eq('id', id)

    if (deleteError) {
        console.error('[SALES_HQ] Erro ao remover metadado do documento:', deleteError)
        return NextResponse.json({ error: 'Falha ao remover registro do documento' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

