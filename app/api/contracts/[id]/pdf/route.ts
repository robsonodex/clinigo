import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'
import { isClinicAuthorizedForContracts } from '@/lib/constants/contracts-allowlist'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return new NextResponse('Não autenticado', { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        let clinicId = userData?.clinic_id
        if (!clinicId && userData?.role === 'SUPER_ADMIN') {
            const cookieStore = await cookies()
            clinicId = cookieStore.get('impersonation_clinic_id')?.value || cookieStore.get('clinic_id')?.value
        }

        const serviceRole = createServiceRoleClient()

        // 1. Busca documento
        let docQuery = serviceRole
            .from('contract_documents')
            .select('*')
            .eq('id', id)

        if (userData?.role !== 'SUPER_ADMIN') {
            docQuery = docQuery.eq('clinic_id', clinicId)
        }

        const { data: doc } = await docQuery.maybeSingle()

        if (!doc) {
            return new NextResponse('Documento não encontrado', { status: 404 })
        }

        if (!clinicId) {
            return new NextResponse('Clínica não identificada', { status: 400 })
        }

        if (!isClinicAuthorizedForContracts(clinicId)) {
            return new NextResponse('Módulo de Contratos não autorizado para esta clínica', { status: 403 })
        }

        // 2. Busca clínica
        const { data: clinic } = await serviceRole
            .from('clinics')
            .select('*')
            .eq('id', doc.clinic_id)
            .single()

        // 3. Busca signatários
        const { data: signers } = await serviceRole
            .from('contract_signers')
            .select('*')
            .eq('contract_document_id', doc.id)
            .order('signing_order', { ascending: true })

        // 4. Busca eventos de auditoria
        const { data: events } = await serviceRole
            .from('contract_audit_events')
            .select('*')
            .eq('contract_document_id', doc.id)
            .order('created_at', { ascending: true })

        const formattedDate = (isoDate?: string) => {
            if (!isoDate) return 'Pendente'
            try {
                return new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                    timeZone: 'America/Sao_Paulo'
                }).format(new Date(isoDate))
            } catch {
                return isoDate
            }
        }

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${doc.title} - ${doc.document_number}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 15mm 20mm 15mm;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            font-size: 13px;
            background: #fff;
        }
        .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .clinic-name {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
        }
        .doc-meta {
            text-align: right;
            font-size: 11px;
            color: #64748b;
        }
        .doc-number {
            font-size: 14px;
            font-weight: 700;
            color: #047857;
        }
        .doc-title {
            text-align: center;
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            margin: 24px 0 20px 0;
            letter-spacing: 0.5px;
        }
        .content {
            white-space: pre-wrap;
            text-align: justify;
            margin-bottom: 30px;
        }
        .signatures-section {
            page-break-inside: avoid;
            margin-top: 30px;
            border-top: 1px solid #cbd5e1;
            padding-top: 20px;
        }
        .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        .signer-box {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            background: #f8fafc;
            font-size: 11px;
        }
        .signer-name {
            font-weight: 700;
            font-size: 12px;
            color: #0f172a;
        }
        .signer-role {
            color: #047857;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 10px;
            margin-bottom: 6px;
        }
        .signature-img {
            max-height: 48px;
            margin: 8px 0;
            display: block;
        }
        .hash-text {
            font-family: monospace;
            font-size: 9px;
            color: #475569;
            word-break: break-all;
            background: #e2e8f0;
            padding: 4px;
            border-radius: 4px;
            margin-top: 4px;
        }
        .page-break {
            page-break-before: always;
        }
        .audit-trail {
            margin-top: 20px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 16px;
            background: #ffffff;
        }
        .audit-title {
            font-size: 14px;
            font-weight: 700;
            margin-top: 0;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            display: flex;
            justify-content: space-between;
        }
        .audit-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 10px;
        }
        .audit-table th, .audit-table td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            text-align: left;
        }
        .audit-table th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 600;
        }
        .legal-notice {
            font-size: 10px;
            color: #64748b;
            margin-top: 15px;
            line-height: 1.4;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
        }
        @media print {
            .no-print {
                display: none;
            }
            body {
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #047857; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
            Imprimir / Salvar em PDF
        </button>
    </div>

    <div class="header">
        <div>
            <h1 class="clinic-name">${clinic?.name || 'Clínica Médica'}</h1>
            <div style="font-size: 11px; color: #64748b;">
                ${clinic?.cnpj ? 'CNPJ: ' + clinic.cnpj : ''} 
                ${clinic?.phone ? '• Telefone: ' + clinic.phone : ''}
            </div>
        </div>
        <div class="doc-meta">
            <div class="doc-number">${doc.document_number}</div>
            <div>Status: <strong>${doc.status.toUpperCase()}</strong></div>
            <div>Emitido em: ${formattedDate(doc.created_at)}</div>
        </div>
    </div>

    <div class="doc-title">${doc.title}</div>

    <div class="content">${doc.rendered_content}</div>

    <div class="signatures-section">
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 8px; color: #0f172a;">SIGNATÁRIOS E ASSINATURAS ELETRÔNICAS</div>
        <div class="signatures-grid">
            ${(signers || []).map(s => `
                <div class="signer-box">
                    <div class="signer-role">${s.role}</div>
                    <div class="signer-name">${s.name}</div>
                    <div>${s.document_tax_id ? 'CPF/CNPJ: ' + s.document_tax_id : ''}</div>
                    ${s.email ? '<div>E-mail: ' + s.email : ''}</div>
                    
                    ${s.status === 'SIGNED' ? `
                        <div style="margin-top: 8px; color: #047857; font-weight: 600;">✓ Assinado Eletronicamente</div>
                        <div>Data/Hora: ${formattedDate(s.signed_at)}</div>
                        <div>IP de Conexão: ${s.signed_ip || 'N/A'}</div>
                        ${s.signature_image_url ? `<img src="${s.signature_image_url}" class="signature-img" alt="Assinatura" />` : ''}
                        <div style="font-size: 8px; margin-top: 4px; color: #64748b;">Hash SHA-256 de Autoria:</div>
                        <div class="hash-text">${s.signer_hash || 'Registrado'}</div>
                    ` : `
                        <div style="margin-top: 12px; color: #b45309; font-weight: 600;">Aguardando Assinatura</div>
                    `}
                </div>
            `).join('')}
        </div>
    </div>

    <div class="page-break"></div>

    <div class="audit-trail">
        <div class="audit-title">
            <span>TERMO DE INTEGRIDADE E TRILHA DE AUDITORIA</span>
            <span style="font-size: 11px; font-weight: normal; color: #047857;">Lei nº 14.063/2020 • MP nº 2.200-2/2001</span>
        </div>

        <div style="margin-top: 10px; font-size: 11px; line-height: 1.5;">
            <div><strong>Identificador do Documento:</strong> ${doc.id}</div>
            <div><strong>Número de Controle:</strong> ${doc.document_number}</div>
            ${doc.final_document_hash ? `
                <div style="margin-top: 6px;"><strong>Hash Criptográfico Geral (SHA-256):</strong></div>
                <div class="hash-text">${doc.final_document_hash}</div>
            ` : ''}
        </div>

        <div style="font-weight: 700; font-size: 12px; margin-top: 16px; margin-bottom: 6px; color: #0f172a;">Histórico Auditável de Eventos:</div>
        <table class="audit-table">
            <thead>
                <tr>
                    <th style="width: 130px;">Data e Hora (UTC)</th>
                    <th style="width: 110px;">Evento</th>
                    <th style="width: 100px;">IP</th>
                    <th>Dispositivo / Detalhes</th>
                </tr>
            </thead>
            <tbody>
                ${(events || []).map(ev => `
                    <tr>
                        <td>${formattedDate(ev.created_at)}</td>
                        <td><strong>${ev.event_type}</strong></td>
                        <td>${ev.ip_address || '-'}</td>
                        <td>
                            ${ev.user_agent ? `<span style="color: #64748b;">${ev.user_agent.slice(0, 70)}</span><br>` : ''}
                            <span style="color: #0f172a;">${JSON.stringify(ev.details || {})}</span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="legal-notice">
            Este documento foi emitido e assinado eletronicamente por meio da plataforma corporativa Clinigo, em conformidade com o art. 10, §2º da Medida Provisória nº 2.200-2, de 24 de agosto de 2001, com a Lei nº 14.063, de 23 de setembro de 2020, e com o art. 784, §4º do Código de Processo Civil, possuindo plena eficácia jurídica e força probatória executiva extrajudicial entre as partes signatárias.
        </div>
    </div>
</body>
</html>`

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        })
    } catch (err: any) {
        console.error('[CONTRACTS-PDF] Erro fatal:', err)
        return new NextResponse('Erro interno ao gerar visualização do contrato', { status: 500 })
    }
}
