'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
    CheckCircle2,
    Download,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    Loader2,
    RotateCcw,
    ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/dialog'
import {
    COMMON_SPECIALTIES,
    addDaysIsoDate,
    type PdfDocumentType,
    type SalesProspect,
} from '@/lib/sales/prospect-types'
import {
    OFFICIAL_COMMERCIAL_PLANS,
    recommendOfficialPlan,
} from '@/lib/sales/prospect-templates'
import {
    generateCommercialProposalPdf,
    generateContinuityReportPdf,
    generateExecutivePresentationPdf,
} from '@/lib/sales/prospect-pdf-generator'

interface PdfGeneratorTabProps {
    prospects: SalesProspect[]
    activeProspect: SalesProspect | null
    onSelectProspect: (prospect: SalesProspect) => void
    onProspectUpdated: () => Promise<void>
}

export function PdfGeneratorTab({
    prospects,
    activeProspect,
    onSelectProspect,
    onProspectUpdated,
}: PdfGeneratorTabProps) {
    const [clinicName, setClinicName] = useState(activeProspect?.clinic_name || 'Clínica Você')
    const [programFocus, setProgramFocus] = useState(activeProspect?.program_focus || 'Você TEA')
    const [contactName, setContactName] = useState(activeProspect?.contact_name || '')
    const [specialties, setSpecialties] = useState<string[]>(
        activeProspect?.specialties?.length ? activeProspect.specialties : ['Fonoaudiologia', 'Terapia Ocupacional']
    )
    const [estimatedProfessionals, setEstimatedProfessionals] = useState(
        activeProspect?.estimated_professionals || 8
    )
    const [needsTiss, setNeedsTiss] = useState(true)
    const [setupFeeBrl, setSetupFeeBrl] = useState(0)
    const [setupFeeNote, setSetupFeeNote] = useState('Isenta na condição comercial desta apresentação')
    const [validityDays, setValidityDays] = useState(15)
    const [customNote, setCustomNote] = useState('')
    const [generatingType, setGeneratingType] = useState<PdfDocumentType | 'ALL' | null>(null)
    const [markingSent, setMarkingSent] = useState(false)
    const [lastGeneratedTypes, setLastGeneratedTypes] = useState<PdfDocumentType[]>([])
    const [confirmClearOpen, setConfirmClearOpen] = useState(false)

    useEffect(() => {
        if (!activeProspect) return
        setClinicName(activeProspect.clinic_name)
        setProgramFocus(activeProspect.program_focus || '')
        setContactName(activeProspect.contact_name || '')
        setSpecialties(
            activeProspect.specialties?.length
                ? [...activeProspect.specialties]
                : ['Fonoaudiologia', 'Terapia Ocupacional']
        )
        setEstimatedProfessionals(activeProspect.estimated_professionals || 8)
    }, [activeProspect])

    const recommendation = recommendOfficialPlan(estimatedProfessionals, needsTiss)

    const toggleSpecialty = (spec: string) => {
        setSpecialties((prev) => {
            if (prev.includes(spec)) {
                return prev.length > 1 ? prev.filter((s) => s !== spec) : prev
            }
            return [...prev, spec]
        })
    }

    const buildInput = () => ({
        clinicName: clinicName.trim() || 'Clínica Parceira',
        programFocus: programFocus.trim() || 'Atendimento Multidisciplinar',
        specialties,
        contactName: contactName.trim(),
        estimatedProfessionals,
        needsTiss,
        setupFeeBrl,
        setupFeeNote,
        proposalValidityDays: validityDays,
        customProposalNote: customNote.trim(),
    })

    const handleGenerate = async (type: PdfDocumentType) => {
        setGeneratingType(type)
        try {
            const payload = buildInput()
            let fileName = ''
            if (type === 'CONTINUIDADE') {
                fileName = await generateContinuityReportPdf(payload)
            } else if (type === 'EXECUTIVA') {
                fileName = await generateExecutivePresentationPdf(payload)
            } else {
                fileName = await generateCommercialProposalPdf(payload)
            }
            setLastGeneratedTypes((prev) => (prev.includes(type) ? prev : [...prev, type]))
            toast.success(`PDF gerado e baixado: ${fileName}`)
        } catch (err) {
            console.error('[PDF_GENERATOR] Erro:', err)
            toast.error('Não foi possível gerar o PDF. Tente novamente.')
        } finally {
            setGeneratingType(null)
        }
    }

    const handleGenerateAll = async () => {
        setGeneratingType('ALL')
        try {
            const payload = buildInput()
            await generateContinuityReportPdf(payload)
            await new Promise((r) => setTimeout(r, 450))
            await generateExecutivePresentationPdf(payload)
            await new Promise((r) => setTimeout(r, 450))
            await generateCommercialProposalPdf(payload)
            setLastGeneratedTypes(['CONTINUIDADE', 'EXECUTIVA', 'PROPOSTA'])
            toast.success('Os 3 PDFs personalizados foram gerados e baixados na pasta Downloads.')
        } catch {
            toast.error('Erro ao gerar o pacote completo de PDFs.')
        } finally {
            setGeneratingType(null)
        }
    }

    const handleMarkMaterialSent = async () => {
        if (!activeProspect) {
            toast.error('Selecione uma clínica do CRM acima para registrar o envio.')
            return
        }
        setMarkingSent(true)
        try {
            const existing = activeProspect.pdf_sent_types || []
            const toMerge: PdfDocumentType[] =
                lastGeneratedTypes.length > 0 ? lastGeneratedTypes : ['CONTINUIDADE']
            const merged = Array.from(new Set([...existing, ...toMerge]))

            const res = await fetch(`/api/super-admin/prospeccao/prospects/${activeProspect.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    funnel_status:
                        activeProspect.funnel_status === 'FECHADO' ||
                        activeProspect.funnel_status === 'DEMO_AGENDADA'
                            ? activeProspect.funnel_status
                            : 'MATERIAL_ENVIADO',
                    pdf_sent_types: merged,
                    next_followup_at: addDaysIsoDate(3),
                    last_contact_at: new Date().toISOString(),
                }),
            })

            if (!res.ok) throw new Error('Falha ao atualizar CRM')
            toast.success(
                `${activeProspect.clinic_name} atualizada para "Material Enviado" com follow-up agendado para daqui a 3 dias.`
            )
            await onProspectUpdated()
        } catch {
            toast.error('Não foi possível atualizar o status no CRM.')
        } finally {
            setMarkingSent(false)
        }
    }

    const handleClearFields = () => {
        setClinicName('')
        setProgramFocus('')
        setContactName('')
        setSpecialties(['Fonoaudiologia', 'Terapia Ocupacional'])
        setEstimatedProfessionals(5)
        setSetupFeeBrl(0)
        setSetupFeeNote('Isenta na condição comercial desta apresentação')
        setValidityDays(15)
        setCustomNote('')
        setConfirmClearOpen(false)
        toast.success('Campos de personalização limpos.')
    }

    return (
        <div className="space-y-5">
            {/* Painel de Personalização do Cabeçalho */}
            <div className="bg-white border border-[#E6E8E5] rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF1EF]">
                    <div>
                        <h2 className="text-base font-semibold text-[#0F1F1B]">
                            Personalização Instantânea dos PDFs
                        </h2>
                        <p className="text-xs text-[#4B5B56] mt-0.5">
                            Escolha uma clínica do CRM ou edite livremente os campos abaixo. Os PDFs são gerados no navegador em segundos.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmClearOpen(true)}
                            className="min-h-[40px] text-xs border-[#D6DDD9] text-[#4B5B56]"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Limpar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleGenerateAll}
                            disabled={generatingType !== null}
                            className="min-h-[40px] bg-[#1B365D] hover:bg-[#142947] text-white text-xs font-semibold"
                        >
                            {generatingType === 'ALL' ? (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-1.5" />
                            )}
                            Baixar Pacote Completo (3 PDFs)
                        </Button>
                    </div>
                </div>

                {/* Seletor rápido de Clínica do CRM */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="space-y-1.5">
                        <Label htmlFor="pdf-select-crm">Carregar do CRM</Label>
                        <select
                            id="pdf-select-crm"
                            value={activeProspect?.id || ''}
                            onChange={(e) => {
                                const found = prospects.find((p) => p.id === e.target.value)
                                if (found) onSelectProspect(found)
                            }}
                            className="w-full min-h-[44px] rounded-md border border-[#D6DDD9] bg-white px-3 text-sm text-[#0F1F1B]"
                        >
                            <option value="">Preenchimento manual</option>
                            {prospects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.clinic_name} {p.program_focus ? `— ${p.program_focus}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="pdf-clinic-name">Nome da Clínica no Cabeçalho</Label>
                        <Input
                            id="pdf-clinic-name"
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            placeholder="Ex.: Clínica Você"
                            className="min-h-[44px]"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="pdf-program">Programa / Foco</Label>
                        <Input
                            id="pdf-program"
                            value={programFocus}
                            onChange={(e) => setProgramFocus(e.target.value)}
                            placeholder="Ex.: Você TEA"
                            className="min-h-[44px]"
                        />
                    </div>
                </div>

                {/* Especialidades */}
                <div className="space-y-2">
                    <Label>Especialidades destacadas no Relatório de Continuidade</Label>
                    <div className="flex flex-wrap gap-1.5">
                        {COMMON_SPECIALTIES.map((spec) => {
                            const active = specialties.includes(spec)
                            return (
                                <button
                                    key={spec}
                                    type="button"
                                    onClick={() => toggleSpecialty(spec)}
                                    className={`min-h-[34px] px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                                        active
                                            ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                            : 'bg-white text-[#4B5B56] border-[#D6DDD9] hover:bg-[#F2F5F3]'
                                    }`}
                                >
                                    {spec}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Parâmetros Comerciais da Proposta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2 border-t border-[#F0F2F0]">
                    <div className="space-y-1.5">
                        <Label htmlFor="pdf-contact">A/C (Responsável)</Label>
                        <Input
                            id="pdf-contact"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="Coordenação / Diretoria"
                            className="min-h-[42px]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pdf-profs">Nº Profissionais</Label>
                        <Input
                            id="pdf-profs"
                            type="number"
                            min={1}
                            max={500}
                            value={estimatedProfessionals}
                            onChange={(e) => setEstimatedProfessionals(Math.max(1, Number(e.target.value) || 1))}
                            className="min-h-[42px]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pdf-setup-fee">Taxa Implantação (R$)</Label>
                        <Input
                            id="pdf-setup-fee"
                            type="number"
                            min={0}
                            step={50}
                            value={setupFeeBrl}
                            onChange={(e) => setSetupFeeBrl(Math.max(0, Number(e.target.value) || 0))}
                            className="min-h-[42px]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pdf-validity">Validade (dias)</Label>
                        <Input
                            id="pdf-validity"
                            type="number"
                            min={1}
                            max={90}
                            value={validityDays}
                            onChange={(e) => setValidityDays(Math.max(1, Number(e.target.value) || 15))}
                            className="min-h-[42px]"
                        />
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="flex items-center gap-2 min-h-[42px] px-3 rounded-md border border-[#D6DDD9] bg-[#F8FAF9] cursor-pointer text-xs font-medium text-[#0F1F1B]">
                            <input
                                type="checkbox"
                                checked={needsTiss}
                                onChange={(e) => setNeedsTiss(e.target.checked)}
                                className="h-4 w-4 accent-[#155E4B]"
                            />
                            Atende Convênios (TISS)
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                        <Label htmlFor="pdf-setup-note">Texto da Condição de Implantação</Label>
                        <Input
                            id="pdf-setup-note"
                            value={setupFeeNote}
                            onChange={(e) => setSetupFeeNote(e.target.value)}
                            placeholder="Ex.: Isenta na condição comercial desta apresentação"
                            className="min-h-[42px]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pdf-custom-note">Observação Comercial Opcional (na Proposta)</Label>
                        <Textarea
                            id="pdf-custom-note"
                            rows={1}
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            placeholder="Ex.: Condição válida para início dos 7 dias de teste nesta semana."
                            className="min-h-[42px] resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Cards dos 3 PDFs Prontos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* PDF 1: Relatório de Continuidade */}
                <div className="bg-white border-2 border-[#155E4B] rounded-xl p-5 flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-[#E6F2EE] text-[#114D3E]">
                                Modelo 1 · 2 Páginas
                            </span>
                            <FileCheck2 className="w-5 h-5 text-[#155E4B]" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-[#0F1F1B]">
                                Relatório de Continuidade Multidisciplinar
                            </h3>
                            <p className="text-xs text-[#4B5B56] mt-1 leading-relaxed">
                                Exemplo prático white-label com o nome de <strong>{clinicName || 'sua clínica'}</strong>{' '}
                                no topo, extrato de frequência validada por biometria/QR, metas PEI/ABA e evoluções assinadas por{' '}
                                {specialties.join(', ')}.
                            </p>
                        </div>
                        <div className="rounded-lg bg-[#F6F8F7] border border-[#E6E8E5] p-3 text-[11px] text-[#4B5B56] space-y-1">
                            <p className="font-semibold text-[#0F1F1B] flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#155E4B]" />
                                100% Conforme LGPD
                            </p>
                            <p>Selo explícito de dados fictícios de paciente e profissionais para envio seguro por e-mail.</p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={() => handleGenerate('CONTINUIDADE')}
                        disabled={generatingType !== null}
                        className="mt-5 w-full min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold text-xs"
                    >
                        {generatingType === 'CONTINUIDADE' ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-1.5" />
                        )}
                        Gerar e Baixar Relatório de Continuidade
                    </Button>
                </div>

                {/* PDF 2: Apresentação Executiva (1 página) */}
                <div className="bg-white border border-[#E6E8E5] rounded-xl p-5 flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-[#F2F5F3] text-[#1B365D]">
                                Modelo 2 · 1 Página
                            </span>
                            <FileText className="w-5 h-5 text-[#1B365D]" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-[#0F1F1B]">
                                Apresentação Executiva CliniGO (One-Pager)
                            </h3>
                            <p className="text-xs text-[#4B5B56] mt-1 leading-relaxed">
                                Folha única de alto impacto personalizada para a diretoria da{' '}
                                <strong>{clinicName || 'clínica'}</strong>: 6 pilares reais em produção (Agenda, Biometria,
                                PEI/ABA, TISS/Glosas, Repasse e Adoção Autônoma) + resumo dos 3 planos.
                            </p>
                        </div>
                        <div className="rounded-lg bg-[#F6F8F7] border border-[#E6E8E5] p-3 text-[11px] text-[#4B5B56]">
                            Ideal para anexar junto com o Relatório de Continuidade para que a coordenação encaminhe à diretoria.
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={() => handleGenerate('EXECUTIVA')}
                        disabled={generatingType !== null}
                        className="mt-5 w-full min-h-[44px] bg-[#0F1F1B] hover:bg-[#155E4B] text-white font-semibold text-xs"
                    >
                        {generatingType === 'EXECUTIVA' ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-1.5" />
                        )}
                        Gerar e Baixar Apresentação (1 página)
                    </Button>
                </div>

                {/* PDF 3: Proposta Comercial / Tabela de Planos */}
                <div className="bg-white border border-[#E6E8E5] rounded-xl p-5 flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-[#F2F5F3] text-[#155E4B]">
                                Modelo 3 · Comercial
                            </span>
                            <FileSpreadsheet className="w-5 h-5 text-[#155E4B]" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-[#0F1F1B]">
                                Proposta Comercial e Tabela de Planos
                            </h3>
                            <p className="text-xs text-[#4B5B56] mt-1 leading-relaxed">
                                Recomendação automática para <strong>{estimatedProfessionals} profissionais</strong>:{' '}
                                <span className="font-semibold text-[#155E4B]">
                                    {recommendation.plan.name} ({recommendation.monthlyTotalFormatted}/mês)
                                </span>{' '}
                                + tabela oficial dos {OFFICIAL_COMMERCIAL_PLANS.length} planos vigentes.
                            </p>
                        </div>
                        <div className="rounded-lg bg-[#F6F8F7] border border-[#E6E8E5] p-3 text-[11px] text-[#4B5B56]">
                            Básico R$ 149 (1 lic.) · Avançado R$ 249 (até 5 lic.) · Professional R$ 449 (até 30 lic.) · Extra R$ 49,90/mês · 7 dias grátis.
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={() => handleGenerate('PROPOSTA')}
                        disabled={generatingType !== null}
                        className="mt-5 w-full min-h-[44px] bg-[#0F1F1B] hover:bg-[#155E4B] text-white font-semibold text-xs"
                    >
                        {generatingType === 'PROPOSTA' ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-1.5" />
                        )}
                        Gerar e Baixar Proposta Comercial
                    </Button>
                </div>
            </div>

            {/* Ação Pós-Geração integrada ao CRM */}
            {activeProspect && (
                <div className="bg-[#E6F2EE] border border-[#BBDCD0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-[#0F1F1B]">
                            Já enviou os PDFs para {activeProspect.clinic_name}?
                        </p>
                        <p className="text-xs text-[#114D3E]">
                            Atualize o funil para &ldquo;Material Enviado&rdquo;, registre os PDFs enviados e agende o follow-up automático para +3 dias.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={handleMarkMaterialSent}
                        disabled={markingSent}
                        className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold shrink-0"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        {markingSent ? 'Registrando...' : 'Marcar Material Enviado + Follow-up D+3'}
                    </Button>
                </div>
            )}

            {/* Confirmação Limpar Campos (Regra dos Botões Seção 12) */}
            <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#0F1F1B]">Limpar campos de personalização</DialogTitle>
                        <DialogDescription className="text-[#4B5B56]">
                            Deseja limpar todos os campos do gerador de PDF? Os dados salvos no CRM não serão alterados.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setConfirmClearOpen(false)} className="min-h-[44px]">
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleClearFields} className="min-h-[44px] bg-[#0F1F1B] text-white">
                            Limpar Campos
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

