'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
    FileCheck2,
    Download,
    RefreshCw,
    ShieldCheck,
    Calendar,
    Award,
    CheckCircle2,
    Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface InsuranceRenewalReportButtonProps {
    patientId: string
    patientName: string
    triggerClassName?: string
}

interface RenewalReportPayload {
    period: { days: number; start: string; end: string }
    clinic: { name: string; cnpj: string | null; phone: string | null; email: string | null }
    patient: {
        id: string
        full_name: string
        date_of_birth: string | null
        insurance_name: string
        insurance_card_number: string | null
        insurance_validity: string | null
    }
    attendance: {
        completed_sessions: number
        no_shows: number
        cancelled: number
        attendance_rate_pct: number
        biometric_verified_sessions: number
        checkin_verified_sessions: number
        therapist_verified_sessions: number
        signed_medical_records: number
        total_medical_records: number
    }
    professionals: Array<{ name: string; specialty: string; council: string; sessions: number }>
    specialties: Array<{
        especialidade: string
        label: string
        sessionsCount: number
        totalTrials: number
        avgIndependencePct: number
        masteredCount: number
        inProgressCount: number
        topGoals: Array<{
            code: string
            title: string
            baselinePct: number
            latestPct: number
            deltaPct: number
            status: string
            latestHelpLabel: string
        }>
    }>
    generated_by: string
    generated_at: string
}

export function InsuranceRenewalReportButton({
    patientId,
    patientName,
    triggerClassName,
}: InsuranceRenewalReportButtonProps) {
    const [open, setOpen] = useState(false)
    const [days, setDays] = useState('90')
    const [data, setData] = useState<RenewalReportPayload | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const [supervisorName, setSupervisorName] = useState('')
    const [justification, setJustification] = useState(
        'O paciente apresenta resposta clínica favorável e ganhos mensuráveis nos objetivos do Plano Terapêutico Individual (PEI). Recomenda-se a continuidade do acompanhamento multidisciplinar na frequência atual para consolidação das habilidades em aquisição e generalização funcional.'
    )

    const loadReportData = useCallback(async (periodDays: string) => {
        try {
            setIsLoading(true)
            const res = await fetch(
                `/api/patients/${encodeURIComponent(patientId)}/renewal-report?days=${encodeURIComponent(periodDays)}`
            )
            const payload = await res.json()
            if (!res.ok || !payload.success) {
                throw new Error(payload.error || 'Erro ao carregar dados do período')
            }
            setData(payload.data)
            if (payload.data?.generated_by) {
                setSupervisorName((prev) => prev || payload.data.generated_by)
            }
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao consolidar relatório de renovação')
        } finally {
            setIsLoading(false)
        }
    }, [patientId])

    useEffect(() => {
        if (open) {
            loadReportData(days)
        }
    }, [open, days, loadReportData])

    const formatBrDate = (iso?: string | null) => {
        if (!iso) return '-'
        const p = String(iso).split('T')[0].split('-')
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso
    }

    const handleDownloadPdf = async () => {
        if (!data) return
        try {
            setIsGeneratingPdf(true)
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const brand = data.clinic.name || 'CliniGo'

            // 1. Cabeçalho Institucional White-Label
            doc.setFillColor(21, 94, 75)
            doc.rect(0, 0, 210, 28, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(14)
            doc.text(brand, 14, 12)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9.5)
            doc.text('Relatório Clínico e de Frequência para Renovação de Convênio', 14, 19)
            if (data.clinic.cnpj) {
                doc.setFontSize(8)
                doc.text(`CNPJ: ${data.clinic.cnpj}`, 196, 12, { align: 'right' })
            }
            doc.setFontSize(8.5)
            doc.text(
                `Período: ${formatBrDate(data.period.start)} a ${formatBrDate(data.period.end)} (${data.period.days} dias)`,
                196,
                19,
                { align: 'right' }
            )

            // 2. Identificação do Beneficiário
            let y = 37
            doc.setTextColor(15, 31, 27)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10.5)
            doc.text('1. Identificação do Beneficiário', 14, y)
            y += 5
            doc.setFillColor(248, 250, 249)
            doc.setDrawColor(220, 228, 224)
            doc.roundedRect(14, y, 182, 20, 2, 2, 'FD')
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8.5)
            doc.text(`Beneficiário: ${data.patient.full_name}`, 18, y + 6.5)
            doc.text(`Nascimento: ${formatBrDate(data.patient.date_of_birth)}`, 132, y + 6.5)
            doc.text(`Operadora / Plano: ${data.patient.insurance_name}`, 18, y + 14)
            doc.text(
                `Carteirinha: ${data.patient.insurance_card_number || 'Não informada'} · Validade: ${formatBrDate(data.patient.insurance_validity)}`,
                108,
                y + 14
            )
            y += 28

            // 3. Frequência e Comprovação de Presença
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10.5)
            doc.text('2. Assiduidade e Comprovação de Presença (Auditoria Clínica)', 14, y)
            y += 5

            const attendanceBoxes = [
                { label: 'Sessões Concluídas', val: String(data.attendance.completed_sessions) },
                { label: 'Taxa de Assiduidade', val: `${data.attendance.attendance_rate_pct}%` },
                {
                    label: 'Check-in / Biometria',
                    val: `${data.attendance.checkin_verified_sessions} (${data.attendance.biometric_verified_sessions} facial)`,
                },
                {
                    label: 'Evoluções Assinadas',
                    val: `${data.attendance.signed_medical_records}/${data.attendance.total_medical_records}`,
                },
            ]

            attendanceBoxes.forEach((box, idx) => {
                const x = 14 + idx * 46
                doc.setFillColor(248, 250, 249)
                doc.setDrawColor(220, 228, 224)
                doc.roundedRect(x, y, 43, 17, 2, 2, 'FD')
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(7.3)
                doc.setTextColor(75, 91, 86)
                doc.text(box.label, x + 2.5, y + 5.5)
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(10.5)
                doc.setTextColor(21, 94, 75)
                doc.text(box.val, x + 2.5, y + 13)
            })
            y += 25

            // 4. Evolução do PEI por Especialidade
            doc.setTextColor(15, 31, 27)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10.5)
            doc.text('3. Evolução Mensurável de Metas Terapêuticas (PEI)', 14, y)
            y += 6

            if (data.specialties.length === 0) {
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(8.5)
                doc.setTextColor(75, 91, 86)
                doc.text(
                    'Acompanhamento registrado em prontuário eletrônico regular com evoluções clínicas assinadas no período.',
                    14,
                    y
                )
                y += 10
            } else {
                for (const spec of data.specialties) {
                    if (y > 245) {
                        doc.addPage()
                        y = 20
                    }
                    doc.setFillColor(230, 242, 238)
                    doc.rect(14, y, 182, 7, 'F')
                    doc.setFont('helvetica', 'bold')
                    doc.setFontSize(8.5)
                    doc.setTextColor(17, 77, 62)
                    doc.text(
                        `${spec.label} · ${spec.sessionsCount} sessões · Independência média: ${spec.avgIndependencePct}% · Dominadas: ${spec.masteredCount}`,
                        16,
                        y + 4.8
                    )
                    y += 10

                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(15, 31, 27)
                    doc.setFontSize(8)

                    for (const goal of spec.topGoals.slice(0, 6)) {
                        if (y > 268) {
                            doc.addPage()
                            y = 20
                        }
                        const lineLabel = `${goal.code} — ${goal.title}`.slice(0, 58)
                        const statusTxt =
                            goal.status === 'dominada'
                                ? 'Dominada'
                                : goal.status === 'atencao'
                                  ? 'Em ajuste'
                                  : 'Aquisição'
                        doc.text(lineLabel, 16, y)
                        doc.text(`${goal.baselinePct}% -> ${goal.latestPct}%`, 132, y)
                        doc.text(goal.latestHelpLabel.slice(0, 14), 156, y)
                        doc.text(statusTxt, 180, y)
                        y += 6
                    }
                    y += 3
                }
            }

            // 5. Justificativa de Continuidade
            if (y > 225) {
                doc.addPage()
                y = 20
            }
            doc.setTextColor(15, 31, 27)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10.5)
            doc.text('4. Justificativa Clínica para Continuidade do Tratamento', 14, y)
            y += 6
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8.5)
            const splitJust = doc.splitTextToSize(justification.trim(), 182)
            doc.text(splitJust, 14, y)
            y += splitJust.length * 4.5 + 8

            // 6. Equipe e Assinatura
            if (y > 250) {
                doc.addPage()
                y = 20
            }
            if (data.professionals.length > 0) {
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(9)
                doc.text('Equipe Atuante no Período:', 14, y)
                y += 5
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(8)
                data.professionals.slice(0, 5).forEach((prof) => {
                    doc.text(
                        `• ${prof.name} (${prof.specialty}${prof.council ? ` · ${prof.council}` : ''}) — ${prof.sessions} sessão(ões)`,
                        16,
                        y
                    )
                    y += 4.5
                })
                y += 8
            }

            doc.setDrawColor(160, 170, 166)
            doc.line(14, y + 8, 98, y + 8)
            doc.line(112, y + 8, 196, y + 8)
            doc.setFontSize(8)
            doc.setTextColor(75, 91, 86)
            doc.text(supervisorName || 'Coordenação / Profissional Responsável', 14, y + 13)
            doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} · ${brand}`, 112, y + 13)

            // Rodapé LGPD
            doc.setFontSize(7.5)
            doc.setTextColor(110, 122, 118)
            doc.text(
                `Documento confidencial para fins de auditoria e autorização assistencial (LGPD) · ${brand}.`,
                14,
                288
            )

            const safeName = patientName
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]+/g, '_')
                .slice(0, 40)
            doc.save(`Renovacao_Convenio_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success('Relatório de Renovação de Convênio (PDF) gerado com sucesso!')
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao gerar PDF de renovação')
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={
                        triggerClassName ||
                        'h-9 gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50'
                    }
                >
                    <FileCheck2 className="w-3.5 h-3.5 text-[#155E4B]" />
                    <span>Relatório Renovação</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold flex items-center gap-2 text-[#0F1F1B]">
                        <FileCheck2 className="w-5 h-5 text-[#155E4B]" />
                        Relatório de Renovação de Convênio em 1 Clique
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Consolida automaticamente evolução de metas do PEI, frequência comprovada por check-in/biometria e evoluções assinadas em um PDF institucional com a marca da sua clínica.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                    {/* Filtro de período e recarregar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs">Período analisado:</Label>
                            <Select value={days} onValueChange={setDays}>
                                <SelectTrigger className="h-9 w-[160px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                                    <SelectItem value="60">Últimos 60 dias</SelectItem>
                                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                                    <SelectItem value="180">Últimos 180 dias</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => loadReportData(days)}
                            disabled={isLoading}
                            className="h-8 text-xs gap-1"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            Atualizar dados
                        </Button>
                    </div>

                    {isLoading || !data ? (
                        <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-[#155E4B]" />
                            <span>Consolidando frequência, biometria e metas do PEI...</span>
                        </div>
                    ) : (
                        <>
                            {/* Resumo de evidências que entrarão no PDF */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="rounded-lg border border-border bg-[#FAFAF8] p-3">
                                    <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-[#155E4B]" />
                                        Concluídas
                                    </div>
                                    <p className="text-lg font-semibold text-[#0F1F1B] mt-1">
                                        {data.attendance.completed_sessions}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Assiduidade: {data.attendance.attendance_rate_pct}%
                                    </p>
                                </div>

                                <div className="rounded-lg border border-[#C4E1D7] bg-[#E6F2EE]/50 p-3">
                                    <div className="text-[10px] uppercase text-[#114D3E] flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3 text-[#155E4B]" />
                                        Presença Comprovada
                                    </div>
                                    <p className="text-lg font-semibold text-[#114D3E] mt-1">
                                        {data.attendance.checkin_verified_sessions}
                                    </p>
                                    <p className="text-[10px] text-[#114D3E]/80">
                                        {data.attendance.biometric_verified_sessions} via biometria
                                    </p>
                                </div>

                                <div className="rounded-lg border border-border bg-[#FAFAF8] p-3">
                                    <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                                        <Award className="w-3 h-3 text-[#155E4B]" />
                                        Áreas no PEI
                                    </div>
                                    <p className="text-lg font-semibold text-[#0F1F1B] mt-1">
                                        {data.specialties.length}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {data.specialties.reduce((a, s) => a + s.masteredCount, 0)} meta(s) dominada(s)
                                    </p>
                                </div>

                                <div className="rounded-lg border border-border bg-[#FAFAF8] p-3">
                                    <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-[#155E4B]" />
                                        Evoluções Assinadas
                                    </div>
                                    <p className="text-lg font-semibold text-[#0F1F1B] mt-1">
                                        {data.attendance.signed_medical_records}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        de {data.attendance.total_medical_records} registro(s)
                                    </p>
                                </div>
                            </div>

                            {/* Operadora */}
                            <div className="rounded-lg border border-border bg-white px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <span className="text-muted-foreground">Convênio: </span>
                                    <strong className="text-[#0F1F1B]">{data.patient.insurance_name}</strong>
                                </div>
                                <Badge variant="outline" className="font-mono text-[11px]">
                                    Carteirinha: {data.patient.insurance_card_number || 'Não informada'}
                                </Badge>
                            </div>

                            {/* Campos personalizáveis antes de baixar PDF */}
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="ren-supervisor" className="text-xs">
                                        Profissional / Supervisor Responsável pela Assinatura
                                    </Label>
                                    <Input
                                        id="ren-supervisor"
                                        value={supervisorName}
                                        onChange={(e) => setSupervisorName(e.target.value)}
                                        placeholder="Nome e conselho (ex: Dra. Ana Costa · CRP 06/00000)"
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="ren-justification" className="text-xs">
                                        Justificativa Clínica para Continuidade (editável)
                                    </Label>
                                    <Textarea
                                        id="ren-justification"
                                        rows={3}
                                        value={justification}
                                        onChange={(e) => setJustification(e.target.value)}
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                        Fechar
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleDownloadPdf}
                        disabled={isLoading || !data || isGeneratingPdf}
                        className="bg-[#155E4B] hover:bg-[#0F493A] text-white gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF de Renovação'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

