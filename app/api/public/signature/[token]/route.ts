import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import * as crypto from 'crypto'
import { isClinicAuthorizedForContracts } from '@/lib/constants/contracts-allowlist'

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

        // 1. Tenta buscar no novo módulo unificado: contract_signers
        const { data: signer } = await serviceRole
            .from('contract_signers')
            .select(`
                id,
                clinic_id,
                contract_document_id,
                role,
                name,
                email,
                phone,
                document_tax_id,
                signing_token,
                status,
                signing_order,
                viewed_at,
                signed_at,
                signed_ip,
                signed_user_agent,
                signature_image_url,
                signer_hash
            `)
            .eq('signing_token', token)
            .maybeSingle()

        if (signer) {
            if (!isClinicAuthorizedForContracts(signer.clinic_id)) {
                return NextResponse.json({ error: 'Assinatura eletrônica não autorizada para esta instituição.' }, { status: 403 })
            }

            // Busca o documento do contrato
            const { data: contractDoc } = await serviceRole
                .from('contract_documents')
                .select('*')
                .eq('id', signer.contract_document_id)
                .maybeSingle()

            if (!contractDoc) {
                return NextResponse.json({ error: 'Documento associado não encontrado' }, { status: 404 })
            }

            // Busca dados da clínica
            const { data: clinic } = await serviceRole
                .from('clinics')
                .select('id, name, logo_url, phone, cnpj, address')
                .eq('id', signer.clinic_id)
                .maybeSingle()

            // Busca os outros signatários para exibir status de progresso
            const { data: otherSigners } = await serviceRole
                .from('contract_signers')
                .select('id, role, name, status, signed_at')
                .eq('contract_document_id', contractDoc.id)
                .order('signing_order', { ascending: true })

            const isExpired = contractDoc.expires_at ? new Date(contractDoc.expires_at).getTime() < Date.now() : false

            // Se for a primeira visualização, registra evento auditável
            if (signer.status === 'PENDING' && !signer.viewed_at) {
                const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
                const userAgent = request.headers.get('user-agent') || 'Dispositivo Móvel'

                await serviceRole
                    .from('contract_signers')
                    .update({
                        status: 'VIEWED',
                        viewed_at: new Date().toISOString()
                    })
                    .eq('id', signer.id)

                await serviceRole
                    .from('contract_audit_events')
                    .insert({
                        clinic_id: signer.clinic_id,
                        contract_document_id: contractDoc.id,
                        signer_id: signer.id,
                        event_type: 'VISUALIZADO',
                        ip_address: clientIp,
                        user_agent: userAgent,
                        details: {
                            signer_name: signer.name,
                            role: signer.role
                        }
                    })
            }

            return NextResponse.json({
                target_type: 'CONTRACT',
                document: {
                    id: contractDoc.id,
                    signer_id: signer.id,
                    title: contractDoc.title,
                    document_number: contractDoc.document_number,
                    category: contractDoc.category,
                    content: contractDoc.rendered_content,
                    signer_name: signer.name,
                    signer_cpf: signer.document_tax_id,
                    signer_role: signer.role,
                    status: isExpired && signer.status !== 'SIGNED' ? 'EXPIRED' : signer.status,
                    signed_at: signer.signed_at,
                    signed_ip: signer.signed_ip,
                    security_hash: signer.signer_hash,
                    signature_image: signer.signature_image_url,
                    created_at: contractDoc.created_at,
                    is_expired: isExpired,
                    all_signers: otherSigners || [],
                },
                clinic: {
                    name: clinic?.name || 'Clínica',
                    logo_url: clinic?.logo_url || null,
                    phone: clinic?.phone || null,
                    cnpj: clinic?.cnpj || null,
                }
            })
        }

        // 2. Fallback: Tenta buscar em patient_term_signatures (Legado / Termos de Pacientes)
        const { data: patientDoc } = await serviceRole
            .from('patient_term_signatures')
            .select('*')
            .eq('signing_token', token)
            .maybeSingle()

        if (patientDoc) {
            const { data: clinic } = await serviceRole
                .from('clinics')
                .select('name, logo_url, phone, address')
                .eq('id', patientDoc.clinic_id)
                .maybeSingle()

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

        // 3. Fallback: Tenta buscar em professional_term_signatures (Legado / Equipe)
        const { data: profDoc } = await serviceRole
            .from('professional_term_signatures')
            .select('*')
            .eq('signing_token', token)
            .maybeSingle()

        if (profDoc) {
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
            return NextResponse.json({ error: 'A assinatura manuscrita na tela é obrigatória' }, { status: 400 })
        }

        if (!signer_name?.trim()) {
            return NextResponse.json({ error: 'O nome completo do signatário é obrigatório' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()

        // 1. Verifica se pertence ao novo módulo: contract_signers
        const { data: signer } = await serviceRole
            .from('contract_signers')
            .select('*, contract_documents(*)')
            .eq('signing_token', token)
            .maybeSingle()

        if (signer) {
            if (!isClinicAuthorizedForContracts(signer.clinic_id)) {
                return NextResponse.json({ error: 'Assinatura eletrônica não autorizada para esta instituição.' }, { status: 403 })
            }

            if (signer.status === 'SIGNED') {
                return NextResponse.json({ error: 'Este documento já foi assinado por você anteriormente' }, { status: 400 })
            }

            const contractDoc = signer.contract_documents
            if (!contractDoc) {
                return NextResponse.json({ error: 'Documento contratual não localizado' }, { status: 404 })
            }

            if (contractDoc.expires_at && new Date(contractDoc.expires_at).getTime() < Date.now()) {
                return NextResponse.json({ error: 'O prazo deste link de assinatura expirou' }, { status: 410 })
            }

            // Coleta de evidências probatórias de autoria e integridade (MP 2.200-2/2001 e Lei 14.063/2020)
            const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
            const clientIp = ipHeader ? ipHeader.split(',')[0].trim() : '127.0.0.1'
            const userAgent = request.headers.get('user-agent') || 'Dispositivo Móvel'
            const signedAt = new Date().toISOString()

            // Gera Hash SHA-256 probatório
            const hashPayload = [
                contractDoc.id,
                signer.id,
                signer.clinic_id,
                signer_name.trim(),
                signer_cpf?.trim() || '',
                signedAt,
                clientIp,
                userAgent,
                signature_data_url.slice(0, 100)
            ].join('|')

            const signerSecurityHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

            // Atualiza status do signatário
            const { error: updateSignerErr } = await serviceRole
                .from('contract_signers')
                .update({
                    status: 'SIGNED',
                    name: signer_name.trim(),
                    document_tax_id: signer_cpf?.trim() || signer.document_tax_id,
                    signed_at: signedAt,
                    signed_ip: clientIp,
                    signed_user_agent: userAgent,
                    signature_image_url: signature_data_url,
                    signer_hash: signerSecurityHash,
                    updated_at: signedAt
                })
                .eq('id', signer.id)

            if (updateSignerErr) {
                console.error('[PUBLIC-SIGNATURE] Erro ao salvar assinatura:', updateSignerErr)
                return NextResponse.json({ error: 'Erro ao processar assinatura' }, { status: 500 })
            }

            // Registra evento de auditoria
            await serviceRole
                .from('contract_audit_events')
                .insert({
                    clinic_id: signer.clinic_id,
                    contract_document_id: contractDoc.id,
                    signer_id: signer.id,
                    event_type: 'ASSINADO',
                    ip_address: clientIp,
                    user_agent: userAgent,
                    details: {
                        signer_name: signer_name.trim(),
                        signer_tax_id: signer_cpf?.trim() || null,
                        signer_hash: signerSecurityHash,
                        signed_at: signedAt
                    }
                })

            // Verifica se todos os signatários assinaram
            const { data: allSigners } = await serviceRole
                .from('contract_signers')
                .select('id, status, signer_hash')
                .eq('contract_document_id', contractDoc.id)

            const total = allSigners?.length || 0
            const signedCount = allSigners?.filter(s => s.status === 'SIGNED').length || 0

            let newDocStatus = contractDoc.status
            let finalDocHash = contractDoc.final_document_hash

            if (signedCount === total && total > 0) {
                newDocStatus = 'assinado'
                // Consolida hash de todos os signatários e do documento
                const allHashes = allSigners?.map(s => s.signer_hash || '').sort().join('::')
                finalDocHash = crypto.createHash('sha256').update(`${contractDoc.id}|${allHashes}`).digest('hex')
            } else if (signedCount > 0) {
                newDocStatus = 'assinado_parcial'
            }

            await serviceRole
                .from('contract_documents')
                .update({
                    status: newDocStatus,
                    final_document_hash: finalDocHash,
                    updated_at: signedAt
                })
                .eq('id', contractDoc.id)

            return NextResponse.json({
                success: true,
                message: 'Assinatura realizada e registrada com sucesso com validade jurídica',
                signed_at: signedAt,
                security_hash: signerSecurityHash,
                document_status: newDocStatus,
                signer_name: signer_name.trim(),
            })
        }

        // 2. Fallback: patient_term_signatures (Legado)
        const { data: patientDoc } = await serviceRole
            .from('patient_term_signatures')
            .select('*')
            .eq('signing_token', token)
            .maybeSingle()

        if (patientDoc) {
            if (patientDoc.status === 'SIGNED') {
                return NextResponse.json({ error: 'Este documento já foi assinado anteriormente' }, { status: 400 })
            }

            const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
            const clientIp = ipHeader ? ipHeader.split(',')[0].trim() : '127.0.0.1'
            const userAgent = request.headers.get('user-agent') || 'Dispositivo Móvel'
            const signedAt = new Date().toISOString()

            const hashPayload = [patientDoc.id, signer_name, signer_cpf, signedAt, clientIp, userAgent].join('|')
            const securityHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

            await serviceRole
                .from('patient_term_signatures')
                .update({
                    status: 'SIGNED',
                    signer_name: signer_name.trim(),
                    signer_cpf: signer_cpf?.trim() || null,
                    signature_data_url: signature_data_url,
                    signed_at: signedAt,
                    signed_ip: clientIp,
                    signed_user_agent: userAgent,
                    security_hash: securityHash,
                    updated_at: signedAt,
                })
                .eq('id', patientDoc.id)

            return NextResponse.json({
                success: true,
                message: 'Termo assinado com sucesso',
                signed_at: signedAt,
                security_hash: securityHash,
            })
        }

        // 3. Fallback: professional_term_signatures (Legado)
        const { data: profDoc } = await serviceRole
            .from('professional_term_signatures')
            .select('*')
            .eq('signing_token', token)
            .maybeSingle()

        if (profDoc) {
            if (profDoc.status === 'SIGNED') {
                return NextResponse.json({ error: 'Este contrato já foi assinado anteriormente' }, { status: 400 })
            }

            const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
            const clientIp = ipHeader ? ipHeader.split(',')[0].trim() : '127.0.0.1'
            const userAgent = request.headers.get('user-agent') || 'Dispositivo Móvel'
            const signedAt = new Date().toISOString()

            const hashPayload = [profDoc.id, signer_name, signer_cpf, signedAt, clientIp, userAgent].join('|')
            const securityHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

            await serviceRole
                .from('professional_term_signatures')
                .update({
                    status: 'SIGNED',
                    signer_name: signer_name.trim(),
                    signer_cpf: signer_cpf?.trim() || null,
                    signature_data_url: signature_data_url,
                    signed_at: signedAt,
                    signed_ip: clientIp,
                    signed_user_agent: userAgent,
                    security_hash: securityHash,
                    updated_at: signedAt,
                })
                .eq('id', profDoc.id)

            return NextResponse.json({
                success: true,
                message: 'Contrato assinado com sucesso',
                signed_at: signedAt,
                security_hash: securityHash,
            })
        }

        return NextResponse.json({ error: 'Documento não encontrado para assinatura' }, { status: 404 })
    } catch (err: any) {
        console.error('[PUBLIC-SIGNATURE] Erro POST:', err)
        return NextResponse.json({ error: 'Erro ao processar assinatura' }, { status: 500 })
    }
}
