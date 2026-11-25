'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
    Check,
    CheckCircle2,
    Copy,
    Download,
    ExternalLink,
    Eye,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    Loader2,
    Mail,
    MessageCircle,
    Plus,
    SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    COMMON_SPECIALTIES,
    FUNNEL_STATUS_META,
    addDaysIsoDate,
    buildMailtoUrl,
    buildWhatsappUrl,
    type PdfDocumentType,
    type SalesProspect,
    type SalesScriptTemplate,
    type ScriptStage,
} from '@/lib/sales/prospect-types'
import {
    interpolateSalesTemplate,
    recommendOfficialPlan,
} from '@/lib/sales/prospect-templates'
import {
    buildCommercialProposalHtml,
    buildContinuityReportHtml,
    buildExecutivePresentationHtml,
    type PdfPersonalizationInput,
    type RenderedPdfAssets,
} from '@/lib/sales/prospect-pdf-templates'
import {
    generateCommercialProposalPdf,
    generateContinuityReportPdf,
    generateExecutivePresentationPdf,
    resolvePdfAssets,
} from '@/lib/sales/prospect-pdf-generator'

type OutreachScenarioId = 'PRIMEIRO_CONTATO' | 'RESPONDEU_PODE_ENVIAR' | 'PEDIU_PROPOSTA' | 'FOLLOWUP'

interface ScenarioConfig {
    id: OutreachScenarioId
    badge: string
    title: string
    subtitle: string
    scriptStages: ScriptStage[]
    recommendedPdfs: PdfDocumentType[]
    attachmentsSummary: string
    nextStatusOnSent: SalesProspect['funnel_status']
}

const SCENARIOS: ScenarioConfig[] = [
    {
        id: 'PRIMEIRO_CONTATO',
        badge: 'Etapa 1',
        title: 'Primeiro Contato',
        subtitle: 'Abordagem inicial sem anexo (gera curiosidade)',
        scriptStages: ['PRIMEIRO_CONTATO'],
        recommendedPdfs: [],
        attachmentsSummary: 'Não anexe PDF ainda. Pergunte primeiro se pode enviar o exemplo.',
        nextStatusOnSent: 'ABORDADO',
    },
    {
        id: 'RESPONDEU_PODE_ENVIAR',
        badge: 'Etapa 2 · Mais usado',
        title: 'Ela Respondeu "Pode Enviar"',
        subtitle: 'Enviar modelo de Relatório e Apresentação 1p',
        scriptStages: ['ENVIO_MATERIAL'],
        recommendedPdfs: ['CONTINUIDADE', 'EXECUTIVA'],
        attachmentsSummary: 'Anexe os 2 PDFs abaixo: Relatório de Continuidade e Apresentação de 1 Página.',
        nextStatusOnSent: 'MATERIAL_ENVIADO',
    },
    {
        id: 'PEDIU_PROPOSTA',
        badge: 'Etapa 3',
        title: 'Pediu Preço ou Proposta',
        subtitle: 'Enviar Proposta Comercial com os 3 planos',
        scriptStages: ['CONVITE_DEMO', 'OBJECOES'],
        recommendedPdfs: ['PROPOSTA'],
        attachmentsSummary: 'Anexe 1 PDF: Proposta Comercial personalizada com plano recomendado.',
        nextStatusOnSent: 'MATERIAL_ENVIADO',
    },
    {
        id: 'FOLLOWUP',
        badge: 'Retomada',
        title: 'Sem Resposta (Follow-up)',
        subtitle: 'Lembrete curto por E-mail ou WhatsApp',
        scriptStages: ['FOLLOWUP_3D', 'FOLLOWUP_7D', 'WHATSAPP'],
        recommendedPdfs: [],
        attachmentsSummary: 'Follow-up leve sem anexo obrigatório (se quiser, pode reenviar o Relatório).',
        nextStatusOnSent: 'MATERIAL_ENVIADO',
    },
]

function detectScenarioFromStatus(status?: SalesProspect['funnel_status']): OutreachScenarioId {
    if (status === 'RESPONDEU') return 'RESPONDEU_PODE_ENVIAR'
    if (status === 'MATERIAL_ENVIADO') return 'FOLLOWUP'
    if (status === 'DEMO_AGENDADA') return 'PEDIU_PROPOSTA'
    return 'PRIMEIRO_CONTATO'
}

interface DailySendWorkspaceProps {
    prospects: SalesProspect[]
    scripts: SalesScriptTemplate[]
    activeProspect: SalesProspect | null
    onSelectProspect: (prospect: SalesProspect) => void
    onOpenNewClinicTab: () => void
    onProspectUpdated: () => Promise<void>
}

export function DailySendWorkspace({
    prospects,
    scripts,
    activeProspect,
    onSelectProspect,
    onOpenNewClinicTab,
    onProspectUpdated,
}: DailySendWorkspaceProps) {
    const [scenarioId, setScenarioId] = useState<OutreachScenarioId>(
        detectScenarioFromStatus(activeProspect?.funnel_status)
    )
    const [selectedScriptId, setSelectedScriptId] = useState<string>('')
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')
    const [copiedField, setCopiedField] = useState<'subject' | 'body' | 'email' | null>(null)

    // Personalização dos PDFs (espelha a clínica selecionada, mas permite ajustar na hora)
    const [clinicName, setClinicName] = useState(activeProspect?.clinic_name || 'Clínica Você')
    const [programFocus, setProgramFocus] = useState(activeProspect?.program_focus || 'Você TEA')
    const [contactName, setContactName] = useState(activeProspect?.contact_name || '')
    const [specialties, setSpecialties] = useState<string[]>(
        activeProspect?.specialties?.length
            ? activeProspect.specialties
            : ['Fonoaudiologia', 'Terapia Ocupacional']
    )
    const [estimatedProfessionals, setEstimatedProfessionals] = useState(
        activeProspect?.estimated_professionals || 8
    )
    const [setupFeeBrl, setSetupFeeBrl] = useState(0)
    const [setupFeeNote, setSetupFeeNote] = useState('Isenta na condição comercial desta proposta')
    const [showExtraPdfConfig, setShowExtraPdfConfig] = useState(false)

    // Preview ao vivo + downloads
    const [previewDocType, setPreviewDocType] = useState<PdfDocumentType>('CONTINUIDADE')
    const [previewAssets, setPreviewAssets] = useState<RenderedPdfAssets>({
        logoSrc: '/logo-clinigo-round.jpg',
        qrDataUrl: null,
    })
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
    const [markingSent, setMarkingSent] = useState(false)

    useEffect(() => {
        resolvePdfAssets().then(setPreviewAssets).catch(() => {})
    }, [])

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
        const nextScenario = detectScenarioFromStatus(activeProspect.funnel_status)
        setScenarioId(nextScenario)
    }, [activeProspect?.id])

    const currentScenario = useMemo(
        () => SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[1],
        [scenarioId]
    )

    const matchingScripts = useMemo(() => {
        const filtered = scripts.filter((s) => currentScenario.scriptStages.includes(s.stage))
        return filtered.length > 0 ? filtered : scripts
    }, [scripts, currentScenario])

    useEffect(() => {
        const first = matchingScripts[0]
        if (first) {
            setSelectedScriptId(first.id)
        }
        if (currentScenario.recommendedPdfs.length > 0) {
            setPreviewDocType(currentScenario.recommendedPdfs[0])
        }
    }, [scenarioId, matchingScripts.length])

    const activeScript = useMemo(
        () => scripts.find((s) => s.id === selectedScriptId) || matchingScripts[0] || null,
        [scripts, selectedScriptId, matchingScripts]
    )

    useEffect(() => {
        if (!activeScript) return
        const ctx = {
            clinicName,
            programFocus,
            specialties,
            contactName,
            estimatedProfessionals,
        }
        setEmailSubject(interpolateSalesTemplate(activeScript.subject_template || '', ctx))
        setEmailBody(interpolateSalesTemplate(activeScript.body_template, ctx))
    }, [activeScript, clinicName, programFocus, specialties, contactName, estimatedProfessionals])

    const pdfInput: PdfPersonalizationInput = useMemo(
        () => ({
            clinicName: clinicName.trim() || 'Clínica Parceira',
            programFocus: programFocus.trim() || 'Atendimento Multidisciplinar',
            specialties,
            contactName: contactName.trim(),
            estimatedProfessionals,
            setupFeeBrl,
            setupFeeNote,
            needsTiss: true,
            proposalValidityDays: 15,
        }),
        [clinicName, programFocus, specialties, contactName, estimatedProfessionals, setupFeeBrl, setupFeeNote]
    )

    const livePreviewHtml = useMemo(() => {
        if (previewDocType === 'CONTINUIDADE') {
            return buildContinuityReportHtml(pdfInput, previewAssets)
        }
        if (previewDocType === 'EXECUTIVA') {
            return buildExecutivePresentationHtml(pdfInput, previewAssets)
        }
        return buildCommercialProposalHtml(pdfInput, previewAssets)
    }, [previewDocType, pdfInput, previewAssets])

    const recommendation = recommendOfficialPlan(estimatedProfessionals, true)

    const toggleSpecialty = (spec: string) => {
        setSpecialties((prev) => {
            if (prev.includes(spec)) {
                return prev.length > 1 ? prev.filter((s) => s !== spec) : prev
            }
            return [...prev, spec]
        })
    }

    const handleCopy = async (text: string, field: 'subject' | 'body' | 'email', label: string) => {
        await navigator.clipboard.writeText(text)
        setCopiedField(field)
        toast.success(`${label} copiado.`)
        setTimeout(() => setCopiedField(null), 1800)
    }

    const handleDownloadSinglePdf = async (type: PdfDocumentType) => {
        setDownloadingKey(type)
        try {
            let fileName = ''
            if (type === 'CONTINUIDADE') {
                fileName = await generateContinuityReportPdf(pdfInput)
            } else if (type === 'EXECUTIVA') {
                fileName = await generateExecutivePresentationPdf(pdfInput)
            } else {
                fileName = await generateCommercialProposalPdf(pdfInput)
            }
            toast.success(`PDF baixado em Downloads: ${fileName}`)
        } catch (err) {
            console.error('[SALES_HQ] Erro ao gerar PDF:', err)
            toast.error('Erro ao gerar o PDF. Tente novamente.')
        } finally {
            setDownloadingKey(null)
        }
    }

    const handleDownloadRecommendedPack = async () => {
        const list = currentScenario.recommendedPdfs
        if (list.length === 0) return
        setDownloadingKey('PACK')
        try {
            for (let i = 0; i < list.length; i++) {
                const type = list[i]
                if (type === 'CONTINUIDADE') {
                    const f = await generateContinuityReportPdf(pdfInput)
                    toast.success(`Anexo ${i + 1}/${list.length} baixado: ${f}`)
                } else if (type === 'EXECUTIVA') {
                    const f = await generateExecutivePresentationPdf(pdfInput)
                    toast.success(`Anexo ${i + 1}/${list.length} baixado: ${f}`)
                } else {
                    const f = await generateCommercialProposalPdf(pdfInput)
                    toast.success(`Anexo ${i + 1}/${list.length} baixado: ${f}`)
                }
                if (i < list.length - 1) {
                    await new Promise((r) => setTimeout(r, 500))
                }
            }
        } catch (err) {
            console.error('[SALES_HQ] Erro ao baixar pacote:', err)
            toast.error('Falha ao baixar os anexos em PDF.')
        } finally {
            setDownloadingKey(null)
        }
    }

    const handleMarkAsSent = async () => {
        if (!activeProspect) {
            toast.error('Selecione uma clínica cadastrada para registrar no CRM.')
            return
        }
        setMarkingSent(true)
        try {
            const mergedPdfs = Array.from(
                new Set([...(activeProspect.pdf_sent_types || []), ...currentScenario.recommendedPdfs])
            )
            const res = await fetch(`/api/super-admin/prospeccao/prospects/${activeProspect.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    funnel_status:
                        activeProspect.funnel_status === 'FECHADO'
                            ? 'FECHADO'
                            : currentScenario.nextStatusOnSent,
                    pdf_sent_types: mergedPdfs,
                    next_followup_at: addDaysIsoDate(3),
                    last_contact_at: new Date().toISOString(),
                }),
            })
            if (!res.ok) throw new Error('Falha ao atualizar CRM')
            toast.success(
                `Envio registrado para ${activeProspect.clinic_name}. Follow-up agendado para daqui a 3 dias.`
            )
            await onProspectUpdated()
        } catch {
            toast.error('Não foi possível salvar no CRM.')
        } finally {
            setMarkingSent(false)
        }
    }

    const mailtoHref = activeProspect?.email
        ? buildMailtoUrl(activeProspect.email, emailSubject, emailBody)
        : null
    const whatsappHref = activeProspect?.whatsapp
        ? buildWhatsappUrl(activeProspect.whatsapp, emailBody)
        : null

    return (
        <div className="space-y-5">
            {/* BLOCO 0 — Seleção da Clínica + Situação */}
            <section className="bg-white border border-[#DCE5E1] rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                        <Label htmlFor="active-clinic-select" className="text-xs font-semibold uppercase tracking-wider text-[#155E4B]">
                            1. Escolha a clínica que você vai atender agora
                        </Label>
                        <select
                            id="active-clinic-select"
                            value={activeProspect?.id || ''}
                            onChange={(e) => {
                                const found = prospects.find((p) => p.id === e.target.value)
                                if (found) onSelectProspect(found)
                            }}
                            className="w-full min-h-[46px] rounded-lg border-2 border-[#155E4B] bg-white px-3.5 text-sm font-semibold text-[#0F1F1B]"
                        >
                            {prospects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.clinic_name}
                                    {p.program_focus ? ` — ${p.program_focus}` : ''} (
                                    {FUNNEL_STATUS_META[p.funnel_status].label})
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onOpenNewClinicTab}
                        className="min-h-[46px] border-[#D6DDD9] text-[#0F1F1B] hover:bg-[#F2F5F3] text-xs font-semibold"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Cadastrar Outra Clínica
                    </Button>
                </div>

                {/* 4 Situações Claras */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                        2. Qual é o momento dessa clínica? (o sistema mostra exatamente o texto e os anexos certos)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {SCENARIOS.map((sc) => {
                            const selected = sc.id === scenarioId
                            return (
                                <button
                                    key={sc.id}
                                    type="button"
                                    onClick={() => setScenarioId(sc.id)}
                                    className={`text-left rounded-xl p-3.5 border-2 transition-colors cursor-pointer ${
                                        selected
                                            ? 'border-[#155E4B] bg-[#EBF6F1]'
                                            : 'border-[#E6ECE9] bg-white hover:border-[#BBDCD0]'
                                    }`}
                                >
                                    <span
                                        className={`inline-block text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded mb-1.5 ${
                                            selected
                                                ? 'bg-[#155E4B] text-white'
                                                : 'bg-[#F2F5F3] text-[#4B5B56]'
                                        }`}
                                    >
                                        {sc.badge}
                                    </span>
                                    <p className="text-sm font-semibold text-[#0F1F1B] leading-snug">
                                        {sc.title}
                                    </p>
                                    <p className="text-xs text-[#4B5B56] mt-1 leading-snug">{sc.subtitle}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* BLOCO PRINCIPAL EM 2 COLUNAS: PASSO A (E-MAIL) + PASSO B (ANEXOS EXATOS) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* PASSO A — E-MAIL EXATO PARA COPIAR */}
                <div className="bg-white border border-[#DCE5E1] rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#EEF2F0]">
                        <div>
                            <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#155E4B] text-white mb-1.5">
                                Passo A · Texto Pronto
                            </span>
                            <h2 className="text-base font-semibold text-[#0F1F1B]">
                                Copie este e-mail e responda para a clínica
                            </h2>
                            {activeProspect?.email && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-[#4B5B56]">
                                        Para: <strong className="font-mono text-[#0F1F1B]">{activeProspect.email}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(activeProspect.email, 'email', 'E-mail destinatário')}
                                        className="text-[11px] font-semibold text-[#155E4B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        {copiedField === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        Copiar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {matchingScripts.length > 1 && (
                        <div className="space-y-1">
                            <Label htmlFor="script-variant" className="text-xs text-[#4B5B56]">
                                Variação de mensagem
                            </Label>
                            <select
                                id="script-variant"
                                value={selectedScriptId}
                                onChange={(e) => setSelectedScriptId(e.target.value)}
                                className="w-full min-h-[40px] rounded-lg border border-[#D6DDD9] bg-white px-3 text-xs font-medium text-[#0F1F1B]"
                            >
                                {matchingScripts.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {emailSubject && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="ready-email-subject" className="text-xs text-[#4B5B56]">
                                    Assunto (use se abrir e-mail novo; se for Responder, mantenha a conversa)
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(emailSubject, 'subject', 'Assunto')}
                                    className="text-xs font-semibold text-[#155E4B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                    {copiedField === 'subject' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    Copiar Assunto
                                </button>
                            </div>
                            <Input
                                id="ready-email-subject"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="min-h-[42px] bg-[#FAFBF9] text-xs font-medium"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="ready-email-body" className="text-xs text-[#4B5B56]">
                            Corpo do e-mail (pode editar qualquer detalhe antes de copiar)
                        </Label>
                        <Textarea
                            id="ready-email-body"
                            rows={13}
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            className="text-xs leading-relaxed bg-[#FAFBF9] border-[#DCE5E1] text-[#0F1F1B]"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                            type="button"
                            onClick={() => handleCopy(emailBody, 'body', 'Texto do e-mail')}
                            className="min-h-[46px] flex-1 bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-semibold"
                        >
                            {copiedField === 'body' ? (
                                <Check className="w-4 h-4 mr-2" />
                            ) : (
                                <Copy className="w-4 h-4 mr-2" />
                            )}
                            COPIAR TEXTO DO E-MAIL
                        </Button>

                        {mailtoHref && (
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="min-h-[46px] border-[#D6DDD9] text-xs font-semibold"
                            >
                                <a href={mailtoHref}>
                                    <Mail className="w-4 h-4 mr-1.5" />
                                    Abrir E-mail
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                            </Button>
                        )}

                        {whatsappHref && (
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="min-h-[46px] border-[#BBDCD0] text-[#155E4B] hover:bg-[#E6F2EE] text-xs font-semibold"
                            >
                                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="w-4 h-4 mr-1.5" />
                                    WhatsApp
                                </a>
                            </Button>
                        )}
                    </div>
                </div>

                {/* PASSO B — EXATAMENTE OS ANEXOS DESTE E-MAIL */}
                <div className="bg-white border border-[#DCE5E1] rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#EEF2F0]">
                        <div>
                            <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#1B365D] text-white mb-1.5">
                                Passo B · Anexos em PDF
                            </span>
                            <h2 className="text-base font-semibold text-[#0F1F1B]">
                                Quais arquivos anexar neste e-mail
                            </h2>
                            <p className="text-xs text-[#155E4B] font-medium mt-1">
                                {currentScenario.attachmentsSummary}
                            </p>
                        </div>

                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowExtraPdfConfig((v) => !v)}
                            className="min-h-[36px] text-xs border-[#D6DDD9] shrink-0"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                            Ajustar Dados
                        </Button>
                    </div>

                    {/* Botão principal de baixar os anexos recomendados */}
                    {currentScenario.recommendedPdfs.length > 0 && (
                        <Button
                            type="button"
                            onClick={handleDownloadRecommendedPack}
                            disabled={downloadingKey !== null}
                            className="w-full min-h-[48px] bg-[#1B365D] hover:bg-[#132846] text-white text-sm font-semibold"
                        >
                            {downloadingKey === 'PACK' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            {currentScenario.recommendedPdfs.length === 2
                                ? 'BAIXAR OS 2 ANEXOS DESTE E-MAIL (PDF)'
                                : 'BAIXAR A PROPOSTA COMERCIAL (PDF)'}
                        </Button>
                    )}

                    {/* Lista clara dos 3 modelos com selo "Anexar agora" vs "Opcional" */}
                    <div className="space-y-2.5">
                        {(
                            [
                                {
                                    type: 'CONTINUIDADE' as PdfDocumentType,
                                    title: 'Relatório de Continuidade Multidisciplinar (2 páginas)',
                                    desc: 'Curva PEI/ABA, barras de ganho, frequência biométrica e parecer com QR Code.',
                                    icon: FileCheck2,
                                },
                                {
                                    type: 'EXECUTIVA' as PdfDocumentType,
                                    title: 'Apresentação Executiva CliniGO (1 página)',
                                    desc: 'Resumo visual de impacto, fluxo em 5 passos e comparativo Antes e Depois.',
                                    icon: FileText,
                                },
                                {
                                    type: 'PROPOSTA' as PdfDocumentType,
                                    title: `Proposta Comercial (${recommendation.plan.name} — ${recommendation.monthlyTotalFormatted})`,
                                    desc: 'Simulador visual de ROI, timeline de 7 dias e tabela oficial dos 3 planos.',
                                    icon: FileSpreadsheet,
                                },
                            ] as const
                        ).map((item) => {
                            const Icon = item.icon
                            const isRecommended = currentScenario.recommendedPdfs.includes(item.type)
                            const isPreviewing = previewDocType === item.type
                            return (
                                <div
                                    key={item.type}
                                    className={`rounded-xl p-3.5 border transition-colors ${
                                        isRecommended
                                            ? 'border-[#155E4B] bg-[#F2F8F5]'
                                            : 'border-[#E6ECE9] bg-[#FAFBF9]'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <Icon className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-semibold text-[#0F1F1B]">
                                                        {item.title}
                                                    </span>
                                                    {isRecommended && (
                                                        <Badge className="bg-[#155E4B] text-white text-[10px] hover:bg-[#155E4B]">
                                                            ANEXAR AGORA
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-[#4B5B56] mt-0.5">{item.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={isPreviewing ? 'default' : 'outline'}
                                            onClick={() => setPreviewDocType(item.type)}
                                            className={`min-h-[36px] text-xs ${
                                                isPreviewing
                                                    ? 'bg-[#0F1F1B] text-white hover:bg-[#0F1F1B]'
                                                    : 'border-[#D6DDD9] text-[#0F1F1B]'
                                            }`}
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                                            {isPreviewing ? 'Vendo Preview Abaixo' : 'Ver Preview'}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleDownloadSinglePdf(item.type)}
                                            disabled={downloadingKey !== null}
                                            className="min-h-[36px] text-xs bg-[#155E4B] hover:bg-[#0F493A] text-white"
                                        >
                                            {downloadingKey === item.type ? (
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            ) : (
                                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            Baixar PDF
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Especialidades rápidas */}
                    <div className="space-y-1.5 pt-2 border-t border-[#EEF2F0]">
                        <p className="text-xs font-semibold text-[#0F1F1B]">
                            Especialidades que aparecem no PDF (atualiza o preview na hora):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {COMMON_SPECIALTIES.map((spec) => {
                                const active = specialties.includes(spec)
                                return (
                                    <button
                                        key={spec}
                                        type="button"
                                        onClick={() => toggleSpecialty(spec)}
                                        className={`min-h-[32px] px-2.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
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

                    {/* Ajustes avançados retráteis */}
                    {showExtraPdfConfig && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#EEF2F0]">
                            <div className="space-y-1">
                                <Label className="text-xs">Nome da Clínica no PDF</Label>
                                <Input
                                    value={clinicName}
                                    onChange={(e) => setClinicName(e.target.value)}
                                    className="min-h-[40px] text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Programa Foco</Label>
                                <Input
                                    value={programFocus}
                                    onChange={(e) => setProgramFocus(e.target.value)}
                                    className="min-h-[40px] text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Nº Estimado de Profissionais</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={estimatedProfessionals}
                                    onChange={(e) =>
                                        setEstimatedProfessionals(Math.max(1, Number(e.target.value) || 1))
                                    }
                                    className="min-h-[40px] text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Taxa Única de Implantação (R$)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step={50}
                                    value={setupFeeBrl}
                                    onChange={(e) => setSetupFeeBrl(Math.max(0, Number(e.target.value) || 0))}
                                    className="min-h-[40px] text-xs"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                                <Label className="text-xs">Texto da Taxa de Implantação</Label>
                                <Input
                                    value={setupFeeNote}
                                    onChange={(e) => setSetupFeeNote(e.target.value)}
                                    className="min-h-[40px] text-xs"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* PASSO C — CONFIRMAR ENVIO */}
            {activeProspect && (
                <section className="bg-[#EBF6F1] border-2 border-[#155E4B] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#155E4B] text-white mb-1">
                            Passo C · Fechar Envio
                        </span>
                        <p className="text-sm font-semibold text-[#0F1F1B]">
                            Depois que enviar o e-mail para {activeProspect.clinic_name}, clique ao lado:
                        </p>
                        <p className="text-xs text-[#114D3E]">
                            Atualiza automaticamente o status no CRM e cria lembrete de follow-up para daqui a 3 dias.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={handleMarkAsSent}
                        disabled={markingSent}
                        className="min-h-[46px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold px-5 shrink-0"
                    >
                        {markingSent ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        JÁ ENVIEI O E-MAIL (+3 DIAS)
                    </Button>
                </section>
            )}

            {/* PREVIEW REAL DO PDF A4 NA TELA (EXATAMENTE IGUAL AO ARQUIVO BAIXADO) */}
            <section className="bg-white border border-[#DCE5E1] rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF2F0]">
                    <div>
                        <h3 className="text-sm font-semibold text-[#0F1F1B]">
                            Preview Real do PDF (exatamente como o cliente vai ver)
                        </h3>
                        <p className="text-xs text-[#4B5B56]">
                            Confira o visual na tela antes de baixar. Qualquer alteração de clínica ou especialidade aparece aqui na hora.
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {(
                            [
                                { id: 'CONTINUIDADE', label: 'Relatório (2p)' },
                                { id: 'EXECUTIVA', label: 'Apresentação (1p)' },
                                { id: 'PROPOSTA', label: 'Proposta (1p)' },
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setPreviewDocType(tab.id)}
                                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                                    previewDocType === tab.id
                                        ? 'bg-[#155E4B] text-white'
                                        : 'bg-[#F2F5F3] text-[#4B5B56] hover:bg-[#E6ECE9]'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDownloadSinglePdf(previewDocType)}
                            disabled={downloadingKey !== null}
                            className="min-h-[36px] bg-[#1B365D] hover:bg-[#132846] text-white text-xs font-semibold"
                        >
                            {downloadingKey === previewDocType ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Baixar Este PDF
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto bg-[#E9EEEC] rounded-xl p-4 sm:p-6 flex justify-center">
                    <div
                        className="flex flex-col gap-6 items-center"
                        dangerouslySetInnerHTML={{ __html: livePreviewHtml }}
                    />
                </div>
            </section>
        </div>
    )
}

