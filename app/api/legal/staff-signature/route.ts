/**
 * API para verificação e registro de assinatura do termo de confidencialidade
 * GET: Verifica se o usuário já assinou o termo obrigatório
 * POST: Registra a assinatura do termo
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ESPACO_INCLUIR_CLINIC_ID = '5163c916-8b82-4d80-8a71-01726836ee46'

// GET: Check if user has signed required documents
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ needs_signature: false })
        }

        // Only for Espaço Incluir
        if (clinicId !== ESPACO_INCLUIR_CLINIC_ID) {
            return NextResponse.json({ needs_signature: false })
        }

        // Get required documents for this clinic
        const { data: requiredDocs } = await (supabase as any)
            .from('legal_documents')
            .select('id, title, content, version, type')
            .eq('clinic_id', clinicId)
            .eq('is_required', true)
            .eq('status', 'published')
            .eq('type', 'confidentiality')

        if (!requiredDocs || requiredDocs.length === 0) {
            return NextResponse.json({ needs_signature: false })
        }

        // Check which ones user has already signed
        const { data: acceptances } = await (supabase as any)
            .from('staff_legal_acceptances')
            .select('document_id')
            .eq('user_id', user.id)

        const signedIds = new Set((acceptances || []).map((a: any) => a.document_id))
        const unsignedDocs = requiredDocs.filter((d: any) => !signedIds.has(d.id))

        if (unsignedDocs.length === 0) {
            return NextResponse.json({ needs_signature: false })
        }

        return NextResponse.json({
            needs_signature: true,
            document: unsignedDocs[0], // First unsigned document
        })

    } catch (error) {
        console.error('Staff signature check error:', error)
        return NextResponse.json({ needs_signature: false })
    }
}

// POST: Sign a document
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const body = await request.json()
        const { document_id, full_name, cpf } = body

        if (!document_id || !full_name) {
            return NextResponse.json({ error: 'Nome completo é obrigatório' }, { status: 400 })
        }

        const { data, error } = await (supabase as any)
            .from('staff_legal_acceptances')
            .insert({
                user_id: user.id,
                document_id,
                clinic_id: clinicId,
                full_name,
                cpf: cpf || null,
                ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                user_agent: request.headers.get('user-agent') || 'unknown',
                document_version: '1.0',
            })
            .select()
            .single()

        if (error) {
            console.error('Staff signature error:', error)
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Documento já assinado' }, { status: 409 })
            }
            return NextResponse.json({ error: 'Erro ao registrar assinatura' }, { status: 500 })
        }

        return NextResponse.json({ acceptance: data })
    } catch (error) {
        console.error('Staff signature POST error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
