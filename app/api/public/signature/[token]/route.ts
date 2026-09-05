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

        // 1. Tenta buscar em patient_term_signatures (Termos e Contratos de Pacientes / Responsáveis)
        const { data: patientDoc } = await serviceRole
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

        if (patientDoc) {
            // Busca dados da clínica
            const { data: clinic } = await serviceRole
                .from('clinics')
                .select('name, logo_url, phone, address')
                .eq('id', patientDoc.clinic_id)
                .maybeSingle()

            // Busca dados do paciente
            const { data: patient } = await serviceRole
                .from('patients')
                .select('full_name, date_of_birth')
                .eq('id', patientDoc.patient_id)
                .maybeSingle()

            const isExpired = patientDoc.expires_at ? new Date(patientDoc.expires_at).getTime() < Date.now() : false

            return NextResponse.json({
                target_type: 'PATIENT',
                document: {
                    id: patientDoc.id,
                    title: patientDoc.title,
                    category: patientDoc.category,
                    content: patientDoc.document_content,
                    signer_name: patientDoc.signer_name,
                    signer_cpf: patientDoc.signer_cpf,
                    signer_phone: patientDoc.signer_phone,
                    signer_email: patientDoc.signer_email,
                    status: isExpired && patientDoc.status === 'PENDING' ? 'EXPIRED' : patientDoc.status,
                    signed_at: patientDoc.signed_at,
                    signed_ip: patientDoc.signed_ip,
                    security_hash: patientDoc.security_hash,
                    signature_image: patientDoc.signature_data_url,
                    created_at: patientDoc.created_at,
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
        }

        // 2. Se não for de paciente, busca em professional_term_signatures (Contratos da Equipe / Médicos / Terapeutas)
        const { data: profDoc } = await serviceRole
            .from('professional_term_signatures')
            .select(`
                id,
                title,
                category,
                document_content,
                signer_name,
                signer_cpf,
                signer_phone,
                signer_email,
                professional_council,
                professional_specialty,
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
                doctor_id
            `)
            .eq('signing_token', token)
            .maybeSingle()

        if (profDoc) {
            // Busca dados da clínica
            const { data: clinic } = await serviceRole
                .from('clinics')
                .select('name, logo_url, phone, address')
                .eq('id', profDoc.clinic_id)
                .maybeSingle()

            const isExpired = profDoc.expires_at ? new Date(profDoc.expires_at).getTime() < Date.now() : false

            return NextResponse.json({
                target_type: 'PROFESSIONAL',
                document: {
                    id: profDoc.id,
                    title: profDoc.title,
                    category: profDoc.category,
                    content: profDoc.document_content,
                    signer_name: profDoc.signer_name,
                    signer_cpf: profDoc.signer_cpf,
                    signer_phone: profDoc.signer_phone,
                    signer_email: profDoc.signer_email,
                    professional_council: profDoc.professional_council,
                    professional_specialty: profDoc.professional_specialty,
                    status: isExpired && profDoc.status === 'PENDING' ? 'EXPIRED' : profDoc.status,
                    signed_at: profDoc.signed_at,
                    signed_ip: profDoc.signed_ip,
                    security_hash: profDoc.security_hash,
                    signature_image: profDoc.signature_data_url,
                    created_at: profDoc.created_at,
                    is_expired: isExpired,
                },
                clinic: {
                    name: clinic?.name || 'Clínica',
                    logo_url: clinic?.logo_url || null,
                    phone: clinic?.phone || null,
                },
                professional: {
                    name: profDoc.signer_name,
                    specialty: profDoc.professional_specialty,
                    council: profDoc.professional_council,
                },
            })
        }

        return NextResponse.json({ error: 'Documento não encontrado ou link inválido' }, { status: 404 })
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
            return NextResponse.json({ error: 'Nome do signatário é obrigatório' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()

        // 1. Tenta encontrar em patient_term_signatures
        const { data: patientDoc } = await serviceRole
            .from('patient_term_signatures')
            .select('*')
            .eq('signing_token', token)
            .maybeSingle()

        if (patientDoc) {
            if (patientDoc.status === 'SIGNED') {
                return NextResponse.json({ error: 'Este documento já foi assinado anteriormente' }, { status: 400 })
            }

            if (patientDoc.expires_at && new Date(patientDoc.expires_at).getTime() < Date.now()) {
                return NextResponse.json({ error: 'O prazo deste link de assinatura expirou' }, { status: 410 })
            }

            // Coleta evidências probatórias de autoria e integridade (Lei 14.063/2020)
            const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
            const clientIp = ipHeader ? ipHeader.split(',')[0].trim() : '127.0.0.1'
            const userAgent = request.headers.get('user-agent') || 'Dispositivo Móvel / Web'
            const signedAt = new Date().toISOString()

            // Gera Hash SHA-256 criptográfico do documento com metadados
            const hashPayload = [
                patientDoc.id,
                patientDoc.document_content,
                signer_name.trim(),
                signer_cpf?.trim() || '',
                signedAt,
                clientIp,
                userAgent,
            ].join('|')

            const securityHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

            const { data: updated, error: updateErr } = await serviceRole
                .from('patient_term_signatures')
                .update({
                    status: 'SIGNED',
                    signer_name: signer_name.trim(),
                    signer_cpf: signer_cpf?.trim() || patientDoc.signer_cpf,
                    signature_data_url: signature_data_url,
                    signed_at: signedAt,
                    signed_ip: clientIp,
                    signed_user_agent: userAgent,
                    security_hash: securityHash,
                    updated_at: signedAt,
                })
                .eq('id', patientDoc.id)
                .select()
                .single()

            if (updateErr) {
                console.error('[PUBLIC-SIGNATURE] Erro ao salvar assinatura paciente:', updateErr)
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
        }

        // 2. Se não for paciente, tenta encontrar em professional_term_signatures
        const { data: profDoc } = await serviceRole
            .from('professional_term_signatures')
            .select('*')
            .eq('signing_token', token)
            .maybeSingle()

        if (profDoc) {
            if (profDoc.status === 'SIGNED') {
                return NextResponse.json({ error: 'Este contrato já foi assinado anteriormente' }, { status: 400 })
            }

            if (profDoc.expires_at && new Date(profDoc.expires_at).getTime() < Date.now()) {
                return NextResponse.json({ error: 'O prazo deste link de assinatura expirou' }, { status: 410 })
            }

            // Coleta evidências probatórias de autoria e integridade (Lei 14.063/2020)
            const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
            const clientIp = ipHeader ? ipHeader.split(',')[0].trim() : '127.0.0.1'
            const userAgent = request.headers.get('user-agent') || 'Dispositivo Móvel / Web'
            const signedAt = new Date().toISOString()

            // Gera Hash SHA-256 criptográfico
            const hashPayload = [
                profDoc.id,
                profDoc.document_content,
                signer_name.trim(),
                signer_cpf?.trim() || '',
                signedAt,
                clientIp,
                userAgent,
            ].join('|')

            const securityHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

            const { data: updated, error: updateErr } = await serviceRole
                .from('professional_term_signatures')
                .update({
                    status: 'SIGNED',
                    signer_name: signer_name.trim(),
                    signer_cpf: signer_cpf?.trim() || profDoc.signer_cpf,
                    signature_data_url: signature_data_url,
                    signed_at: signedAt,
                    signed_ip: clientIp,
                    signed_user_agent: userAgent,
                    security_hash: securityHash,
                    updated_at: signedAt,
                })
                .eq('id', profDoc.id)
                .select()
                .single()

            if (updateErr) {
                console.error('[PUBLIC-SIGNATURE] Erro ao salvar assinatura profissional:', updateErr)
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
        }

        return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    } catch (err: any) {
        console.error('[PUBLIC-SIGNATURE] Erro POST:', err)
        return NextResponse.json({ error: 'Erro interno ao processar assinatura' }, { status: 500 })
    }
}
