import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminSalesHq } from '../_auth'
import { VAULT_CATEGORIES, type VaultCategory } from '@/lib/sales/prospect-types'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
const BUCKET_ID = 'sales-vault'

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp',
])

function sanitizeFileName(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 120)
}

export async function GET() {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabaseAdmin
        .from('sales_vault_documents' as any)
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[SALES_HQ] Erro ao listar cofre:', error)
        return NextResponse.json({ error: 'Falha ao carregar documentos do cofre' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
}

export async function POST(request: NextRequest) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    let formData: FormData
    try {
        formData = await request.formData()
    } catch {
        return NextResponse.json({ error: 'Envio multipart inválido' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Selecione um arquivo para envio' }, { status: 400 })
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'O arquivo deve ter entre 1 byte e 25 MB' }, { status: 400 })
    }

    const mimeType = file.type || 'application/octet-stream'
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
            { error: 'Formato não permitido. Envie PDF, PPTX, DOCX, XLSX, CSV, TXT ou imagem (PNG/JPG/WEBP).' },
            { status: 400 }
        )
    }

    const rawTitle = String(formData.get('title') || '').trim()
    const rawCategory = String(formData.get('category') || 'Apresentação').trim()
    const rawDescription = String(formData.get('description') || '').trim().slice(0, 500)

    const category: VaultCategory = (VAULT_CATEGORIES as readonly string[]).includes(rawCategory)
        ? (rawCategory as VaultCategory)
        : 'Outro'

    const safeName = sanitizeFileName(file.name || 'documento')
    const title = rawTitle || file.name.replace(/\.[^.]+$/, '') || 'Documento comercial'
    const filePath = `${new Date().getFullYear()}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await auth.supabaseAdmin.storage
        .from(BUCKET_ID)
        .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: false,
        })

    if (uploadError) {
        console.error('[SALES_HQ] Erro ao fazer upload no storage:', uploadError)
        return NextResponse.json({ error: 'Falha ao armazenar arquivo no cofre' }, { status: 500 })
    }

    const { data, error: insertError } = await auth.supabaseAdmin
        .from('sales_vault_documents' as any)
        .insert({
            title: title.slice(0, 160),
            category,
            description: rawDescription,
            file_name: file.name.slice(0, 180),
            file_path: filePath,
            mime_type: mimeType,
            file_size_bytes: file.size,
            uploaded_by: auth.user.id,
        } as any)
        .select('*')
        .single()

    if (insertError) {
        console.error('[SALES_HQ] Erro ao registrar documento no banco:', insertError)
        await auth.supabaseAdmin.storage.from(BUCKET_ID).remove([filePath])
        return NextResponse.json({ error: 'Falha ao registrar metadados do documento' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
}

