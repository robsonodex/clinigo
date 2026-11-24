'use client'

import React, { useState } from 'react'
import { FileCheck2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface GlosaEvidenceDossierButtonProps {
    guideId: string
    guideNumber?: string
    className?: string
}

function esc(raw: unknown): string {
    return String(raw ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function fmtBRL(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        Number(v || 0)
    )
}

function fmtDate(iso?: string | null): string {
    if (!iso) return 'Não registrado'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function GlosaEvidenceDossierButton({
    guideId,
    guideNumber,
    className,
}: GlosaEvidenceDossierButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleGenerateDossier = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/tiss/glosas/${guideId}/evidence-dossier`)
            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Não foi possível gerar o dossiê probatório.')
            }

            const d = json.data
            const printWin = window.open('', '_blank', 'width=960,height=800')
            if (!printWin) {
                toast.error('Permita pop-ups para imprimir ou salvar o dossiê em PDF.')
                return
            }

            const glosaRows = (d.glosas || [])
                .map(
                    (g: any) => `
                    <tr>
                        <td class="mono">${esc(g.glosa_code || '-')}</td>
                        <td>${esc(g.glosa_description || 'Motivo não informado')}</td>
                        <td class="right">${esc(fmtBRL(g.glosa_value))}</td>
                    </tr>`
                )
                .join('')

            printWin.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Dossiê Probatório de Recurso — Guia ${esc(d.guide.guideNumber)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 28px; line-height: 1.5; font-size: 12px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #155e4b; padding-bottom: 12px; margin-bottom: 18px; }
  h1 { font-size: 17px; margin: 0 0 3px 0; color: #0f172a; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #155e4b; margin: 18px 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; background: #e6f2ee; color: #114d3e; border: 1px solid #c4e1d7; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 18px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
  .item label { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; }
  .item strong { font-size: 12px; color: #0f172a; }
  .proof-box { border: 1px solid #c4e1d7; background: #f7fbf9; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .right { text-align: right; }
  footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10.5px; color: #64748b; display: flex; justify-content: space-between; }
  @media print { body { margin: 14mm; } }
</style>
</head>
<body>
  <header>
    <div>
      <h1>Dossiê Probatório para Recurso de Glosa TISS</h1>
      <div>${esc(d.clinic.name)}${d.clinic.cnpj ? ` · CNPJ ${esc(d.clinic.cnpj)}` : ''}</div>
    </div>
    <div style="text-align:right;">
      <span class="badge">Força Probatória: ${esc(d.proofs.strengthScore)}%</span>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">Emitido em ${esc(fmtDate(d.generatedAt))}</div>
    </div>
  </header>

  <h2>1. Identificação da Guia e do Lote</h2>
  <div class="grid">
    <div class="item"><label>Guia TISS</label><strong class="mono">${esc(d.guide.guideNumber)}</strong></div>
    <div class="item"><label>Operadora / Lote</label><strong>${esc(d.batch?.insurance_company_name || 'Operadora')} · Lote ${esc(d.batch?.batch_number || '-')}</strong></div>
    <div class="item"><label>Beneficiário / Carteirinha</label><strong>${esc(d.guide.patientName)} (${esc(d.guide.cardNumberMasked)})</strong></div>
    <div class="item"><label>Procedimento TUSS</label><strong class="mono">${esc(d.guide.procedureCode)} — ${esc(d.guide.procedureName || '-')}</strong></div>
    <div class="item"><label>Data de Execução</label><strong>${esc(d.guide.executionDate || '-')}</strong></div>
    <div class="item"><label>Senha / Autorização · Valor Cobrado</label><strong>${esc(d.guide.authorizationCode || 'Não informada')} · ${esc(fmtBRL(d.guide.totalValue))}</strong></div>
  </div>

  <h2>2. Motivos de Glosa Contestados</h2>
  <table>
    <thead><tr><th style="width:110px;">Código ANS</th><th>Descrição</th><th class="right" style="width:120px;">Valor Glosado</th></tr></thead>
    <tbody>
      ${glosaRows || `<tr><td colspan="3">Valor glosado total na guia: ${esc(fmtBRL(d.guide.glosaValue))}</td></tr>`}
    </tbody>
  </table>

  <h2>3. Provas Técnicas e Auditáveis de Execução do Atendimento</h2>
  <div class="proof-box">
    <strong>A. Comprovação de Prontuário e Evolução Clínica Assinada:</strong><br/>
    ${
        d.proofs.evolution
            ? `Status: <strong>${d.proofs.evolution.signed ? 'Evolução Assinada Eletronicamente' : 'Evolução Registrada em Prontuário'}</strong><br/>
               Profissional signatário: ${esc(d.proofs.evolution.signerName || 'Profissional responsável')} · Data/Hora: ${esc(fmtDate(d.proofs.evolution.signedAt))}<br/>
               Hash de integridade: <span class="mono">${esc(d.proofs.evolution.signatureHash || 'Registrado no prontuário')}</span><br/>
               Síntese técnica (minimizada LGPD): ${esc(d.proofs.evolution.summary)}`
            : 'Nenhuma evolução vinculada automaticamente a esta guia. Recomenda-se anexar a evolução antes do protocolo.'
    }
  </div>

  <div class="proof-box">
    <strong>B. Evidência Biométrica Facial de Comparecimento:</strong><br/>
    ${
        d.proofs.biometrics
            ? `Biometria Facial: <strong>Ativa e Consentida</strong> · ID da Prova: <span class="mono">${esc(d.proofs.biometrics.proofId)}</span><br/>
               Consentimento LGPD: ${d.proofs.biometrics.consentGiven ? 'Confirmado' : 'Registrado'} (${esc(fmtDate(d.proofs.biometrics.consentDate))})`
            : 'Sem registro biométrico facial vinculado para este paciente.'
    }
  </div>

  <div class="proof-box">
    <strong>C. Trilha de Agendamento e Check-in Presencial:</strong><br/>
    ${
        d.proofs.attendance
            ? `Status do atendimento: <strong>${esc(d.proofs.attendance.status)}</strong> · Data/Hora: ${esc(d.proofs.attendance.date)} ${esc(d.proofs.attendance.time || '')}<br/>
               Check-in: ${esc(fmtDate(d.proofs.attendance.checkedInAt))} · Conclusão: ${esc(fmtDate(d.proofs.attendance.completedAt))}`
            : 'Atendimento faturado diretamente na guia TISS.'
    }
  </div>

  <h2>4. Fundamentação Técnica para Reanálise</h2>
  <p>Solicitamos a reanálise e liberação integral do valor glosado referente à guia <strong>${esc(d.guide.guideNumber)}</strong>, comprovadamente executada conforme trilha de atendimento, prontuário eletrônico assinado e evidências de presença anexas neste dossiê, em conformidade com o padrão TISS/ANS e LGPD.</p>

  <footer>
    <span>${esc(d.clinic.name)}</span>
    <span>Dossiê Probatório TISS · Guia ${esc(d.guide.guideNumber)}</span>
  </footer>
</body>
</html>`)
            printWin.document.close()
            printWin.focus()
            setTimeout(() => printWin.print(), 200)
            toast.success(`Dossiê probatório da guia ${guideNumber || d.guide.guideNumber} pronto para PDF.`)
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao gerar dossiê probatório.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={handleGenerateDossier}
            className={
                className ||
                'h-10 min-h-[40px] px-3 gap-1.5 text-xs font-medium border-[#155E4B]/40 text-[#114D3E] hover:bg-[#E6F2EE]'
            }
            title="Gerar Dossiê Probatório em PDF (Biometria Facial + Evolução Assinada + Guia TISS)"
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <FileCheck2 className="w-3.5 h-3.5" />
            )}
            <span>Dossiê PDF</span>
        </Button>
    )
}

