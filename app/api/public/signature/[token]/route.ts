import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import * as crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
    try {
        const { token } = await params

        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()

        // 1. Busca documento pelo token único
        const { data: doc, error } = await serviceRole
            .from('patient_term_signatures')
            .select(`
                id,
                title,
                category,
                document_content,
                signer_name,
                signer_cpf,
                signer_phone,
                signer_email,
                status,
                signing_token,
                signature_data_url,
                signed_at,
                signed_ip,
                signed_user_agent,
                security_hash,
                expires_at,
                created_at,
                clinic_id,
                patient_id
            `)
            .eq('signing_token', token)
            .maybeSingle()

        if (error || !doc) {
            return NextResponse.json({ error: 'Documento não encontrado ou link inválido' }, { status: 404 })
        }

        // 2. Busca dados da clínica
        const { data: clinic } = await serviceRole
            .from('clinics')
            .select('name, logo_url, phone, address')
            .eq('id', doc.clinic_id)
            .maybeSingle()

        // 3. Busca dados do paciente
        const { data: patient } = await serviceRole
            .from('patients')
            .select('full_name, date_of_birth')
            .eq('id', doc.patient_id)
            .maybeSingle()

        const isExpired = doc.expires_at ? new Date(doc.expires_at).getTime() < Date.now() : false

        return NextResponse.json({
            document: {
                id: doc.id,
                title: doc.title,
                category: doc.category,
                content: doc.document_content,
                signer_name: doc.signer_name,
                signer_cpf: doc.signer_cpf,
                signer_phone: doc.signer_phone,
                signer_email: doc.signer_email,
                status: isExpired && doc.status === 'PENDING' ? 'EXPIRED' : doc.status,
                signed_at: doc.signed_at,
                signed_ip: doc.signed_ip,
                security_hash: doc.security_hash,
                signature_image: doc.signature_data_url,
                created_at: doc.created_at,
                is_expired: isExpired,
            },
            clinic: {
                name: clinic?.name || 'Clínica',
                logo_url: clinic?.logo_url || null,
                phone: clinic?.phone || null,
            },
            patient: {
                name: patient?.full_name || 'Paciente',
            },
        })
    } catch (err: any) {
        console.error('[PUBLIC-SIGNATURE] Erro GET:', err)
        return NextResponse.json({ error: 'Erro ao carregar documento' }, { status: 500 })
    }
}

export async function POST(request: NextRequest, { params }: Props) {
    try {
        const { token } = await params

        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 })
        }

        const body = await request.json()
        const { signature_data_url, signer_name, signer_cpf } = body

        if (!signature_data_url) {
            return NextResponse.json({ error: 'Assinatura (desenho na tela) é obrigatória' }, { status: 400 })
        }

        if (!signer_name?.trim()) {
            return NextResponse.json({ error: 'Nome do responsável é obrigatório' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()

        // 1. Busca documento para validação de estado
        const { data: doc, error: fetchErr } = await serviceRole
            .from('patient_term_signatures')
            .select('*')
            .eq('signing_token', token)
            .maybeSingle()

        if (fetchErr || !doc) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
        }

        if (doc.status === 'SIGNED') {
            return NextResponse.json({ error: 'Este documento já foi assinado anteriormente' }, { status: 400 })
        }

        if (doc.expires_at && new Date(doc.expires_at).getTime() < Date.now()) {
            return NextResponse.json({ error: 'O prazo deste link de assinatura expirou' }, { status: 410 })
        }

        // 2. Coleta evidências probatórias de autoria e integridade (Lei 14.063/2020)
        const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
        const clientIp = ipHeader ? ipHeader.split(',')[0].trim() : '127.0.0.1'
        const userAgent = request.headers.get('user-agent') || 'Dispositivo Móvel / Web'
        const signedAt = new Date().toISOString()

        // 3. Gera Hash SHA-256 criptográfico do documento com metadados
        const hashPayload = [
            doc.id,
            doc.document_content,
            signer_name.trim(),
            signer_cpf?.trim() || '',
            signedAt,
            clientIp,
            userAgent,
        ].join('|')

        const securityHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

        // 4. Persiste a assinatura com as evidências de auditoria
        const { data: updated, error: updateErr } = await serviceRole
            .from('patient_term_signatures')
            .update({
                status: 'SIGNED',
                signer_name: signer_name.trim(),
                signer_cpf: signer_cpf?.trim() || doc.signer_cpf,
                signature_data_url: signature_data_url,
                signed_at: signedAt,
                signed_ip: clientIp,
                signed_user_agent: userAgent,
                security_hash: securityHash,
                updated_at: signedAt,
            })
            .eq('id', doc.id)
            .select()
            .single()

        if (updateErr) {
            console.error('[PUBLIC-SIGNATURE] Erro ao salvar assinatura:', updateErr)
            return NextResponse.json({ error: 'Erro ao registrar assinatura' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            certificate: {
                document_id: updated.id,
                signed_at: signedAt,
                security_hash: securityHash,
                ip: clientIp,
                signer: signer_name.trim(),
            }
        })
    } catch (err: any) {
        console.error('[PUBLIC-SIGNATURE] Erro POST:', err)
        return NextResponse.json({ error: 'Erro interno ao processar assinatura' }, { status: 500 })
    }
}
