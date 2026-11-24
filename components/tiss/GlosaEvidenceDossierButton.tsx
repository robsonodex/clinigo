'use client'

import React, { useState } from 'react'
import { Copy, Cpu, FileCheck2, Loader2, Printer, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [generatingAppeal, setGeneratingAppeal] = useState(false)
    const [dossierData, setDossierData] = useState<any | null>(null)
    const [appealText, setAppealText] = useState('')

    const handleOpenDossier = async () => {
        try {
            setOpen(true)
            setLoading(true)
            const res = await fetch(`/api/tiss/glosas/${guideId}/evidence-dossier`)
            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Não foi possível carregar o dossiê probatório.')
            }
            const d = json.data
            setDossierData(d)
            setAppealText((prev) =>
                prev
                    ? prev
                    : `Solicitamos a reanálise e liberação integral do valor glosado referente à guia ${d.guide.guideNumber}, comprovadamente executada conforme trilha de atendimento, prontuário eletrônico assinado e evidências de presença anexas neste dossiê, em conformidade com o padrão TISS/ANS e LGPD.`
            )
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao carregar dossiê probatório.')
            setOpen(false)
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateAiAppeal = async () => {
        try {
            setGeneratingAppeal(true)
            const res = await fetch('/api/ai/tiss-glosa-appeal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guideId }),
            })
            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Não foi possível redigir a carta de recurso.')
            }
            if (json.data?.appealText) {
                setAppealText(json.data.appealText)
            }
            toast.success(
                'Carta Técnica de Recurso redigida pelo Advogado Anti-Glosa CliniGo IA (com Escudo LGPD). Revise antes de protocolar.'
            )
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao redigir recurso com IA.')
        } finally {
            setGeneratingAppeal(false)
        }
    }

    const handlePrintDossier = () => {
        if (!dossierData) return
        const d = dossierData
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

        const formattedAppealHtml = esc(appealText).replace(/\r?\n/g, '<br/>')

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

  <h2>4. Fundamentação Técnica para Reanálise (Carta de Recurso)</h2>
  <p>${formattedAppealHtml}</p>

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
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenDossier}
                className={
                    className ||
                    'h-10 min-h-[40px] px-3 gap-1.5 text-xs font-medium border-[#155E4B]/40 text-[#114D3E] hover:bg-[#E6F2EE]'
                }
                title="Abrir Dossiê Probatório e Advogado Anti-Glosa IA (Biometria + Evolução Assinada + Carta de Recurso)"
            >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Dossiê PDF</span>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold flex items-center gap-2 text-[#0F1F1B]">
                            <FileCheck2 className="w-5 h-5 text-[#155E4B]" />
                            Dossiê Probatório & Advogado Anti-Glosa TISS
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Revise as provas reais reunidas para a guia {guideNumber || dossierData?.guide?.guideNumber || ''}, redija a Carta Técnica de Recurso ANS com IA em 1 clique e emita o PDF pronto.
                        </DialogDescription>
                    </DialogHeader>

                    {loading || !dossierData ? (
                        <div className="py-10 flex flex-col items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin text-[#155E4B]" />
                            <span>Reunindo guia TISS, biometria facial e evolução assinada...</span>
                        </div>
                    ) : (
                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="rounded-lg border border-[#C4E1D7] bg-[#E6F2EE]/50 p-2.5">
                                    <span className="text-[10px] uppercase text-[#114D3E]">Força Probatória</span>
                                    <p className="text-lg font-bold text-[#114D3E] tabular-nums">
                                        {dossierData.proofs.strengthScore}%
                                    </p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                    <span className="text-[10px] uppercase text-slate-500">Evolução Assinada</span>
                                    <p className="text-xs font-semibold text-slate-900 mt-1">
                                        {dossierData.proofs.evolution?.signed ? 'Sim (Assinada)' : dossierData.proofs.evolution ? 'Em rascunho' : 'Não vinculada'}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                    <span className="text-[10px] uppercase text-slate-500">Biometria Facial</span>
                                    <p className="text-xs font-semibold text-slate-900 mt-1">
                                        {dossierData.proofs.biometrics ? 'Ativa / Consentida' : 'Não cadastrada'}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                    <span className="text-[10px] uppercase text-slate-500">Valor Glosado</span>
                                    <p className="text-xs font-bold text-slate-900 mt-1 tabular-nums">
                                        {fmtBRL(dossierData.guide.glosaValue)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 rounded-lg border border-[#C4E1D7] bg-[#FAFAF8] p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="tiss-appeal-text" className="text-xs font-semibold text-[#0F1F1B]">
                                            Seção 4 — Carta Técnica de Recurso (ANS)
                                        </Label>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] bg-white border-[#C4E1D7] text-[#114D3E] gap-1"
                                        >
                                            <ShieldCheck className="w-3 h-3" />
                                            Escudo LGPD
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={generatingAppeal}
                                            onClick={handleGenerateAiAppeal}
                                            className="h-8 px-3 text-[11px] bg-[#155E4B] hover:bg-[#0F493A] text-white gap-1.5"
                                        >
                                            {generatingAppeal ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Cpu className="w-3.5 h-3.5" />
                                            )}
                                            <span>
                                                {generatingAppeal
                                                    ? 'Redigindo Recurso...'
                                                    : 'Redigir Recurso com IA'}
                                            </span>
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(appealText)
                                                    toast.success('Carta de recurso copiada para colar no portal da operadora.')
                                                } catch {
                                                    toast.error('Não foi possível copiar.')
                                                }
                                            }}
                                            className="h-8 px-2.5 text-[11px] bg-white gap-1"
                                        >
                                            <Copy className="w-3 h-3" />
                                            Copiar
                                        </Button>
                                    </div>
                                </div>

                                <Textarea
                                    id="tiss-appeal-text"
                                    rows={6}
                                    value={appealText}
                                    onChange={(e) => setAppealText(e.target.value)}
                                    className="text-xs bg-white leading-relaxed"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                            Fechar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={loading || !dossierData}
                            onClick={handlePrintDossier}
                            className="bg-[#155E4B] hover:bg-[#0F493A] text-white gap-1.5"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir / Salvar Dossiê PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
