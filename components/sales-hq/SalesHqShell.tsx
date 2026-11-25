'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarCheck2,
    Check,
    CheckCircle2,
    Copy,
    Download,
    FileText,
    FolderLock,
    Loader2,
    Lock,
    Mail,
    MessageSquareText,
    Send,
    Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    FUNNEL_STATUS_META,
    addDaysIsoDate,
    getFollowupUrgency,
    type SalesProspect,
    type SalesScriptTemplate,
    type SalesVaultDocument,
} from '@/lib/sales/prospect-types'
import { interpolateSalesTemplate } from '@/lib/sales/prospect-templates'
import {
    generateContinuityReportPdf,
    generateExecutivePresentationPdf,
} from '@/lib/sales/prospect-pdf-generator'
import { ProspectCrmTab } from './ProspectCrmTab'
import { PdfGeneratorTab } from './PdfGeneratorTab'
import { ScriptsLibraryTab } from './ScriptsLibraryTab'
import { DocumentVaultTab } from './DocumentVaultTab'

export function SalesHqShell() {
    const [activeTab, setActiveTab] = useState<'crm' | 'pdfs' | 'scripts' | 'vault'>('crm')
    const [prospects, setProspects] = useState<SalesProspect[]>([])
    const [scripts, setScripts] = useState<SalesScriptTemplate[]>([])
    const [documents, setDocuments] = useState<SalesVaultDocument[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [onlyUrgentFollowups, setOnlyUrgentFollowups] = useState(false)
    const [downloadingKit, setDownloadingKit] = useState(false)
    const [copiedQuickEmail, setCopiedQuickEmail] = useState(false)
    const [markingQuickSent, setMarkingQuickSent] = useState(false)

    const loadProspects = useCallback(async () => {
        const res = await fetch('/api/super-admin/prospeccao/prospects', { cache: 'no-store' })
        if (!res.ok) throw new Error('Falha ao carregar CRM')
        const json = await res.json()
        const rows = (json.data || []) as SalesProspect[]
        setProspects(rows)
        setSelectedProspectId((prev) => {
            if (prev && rows.some((r) => r.id === prev)) return prev
            return rows[0]?.id || null
        })
    }, [])

    const loadScripts = useCallback(async () => {
        const res = await fetch('/api/super-admin/prospeccao/scripts', { cache: 'no-store' })
        if (!res.ok) throw new Error('Falha ao carregar scripts')
        const json = await res.json()
        setScripts((json.data || []) as SalesScriptTemplate[])
    }, [])

    const loadDocuments = useCallback(async () => {
        const res = await fetch('/api/super-admin/prospeccao/vault', { cache: 'no-store' })
        if (!res.ok) throw new Error('Falha ao carregar cofre')
        const json = await res.json()
        setDocuments((json.data || []) as SalesVaultDocument[])
    }, [])

    const loadAll = useCallback(async () => {
        setIsLoading(true)
        try {
            await Promise.all([loadProspects(), loadScripts(), loadDocuments()])
        } catch (err) {
            console.error('[SALES_HQ] Erro ao carregar dados:', err)
            toast.error('Erro ao carregar dados do HQ de Prospecção.')
        } finally {
            setIsLoading(false)
        }
    }, [loadProspects, loadScripts, loadDocuments])

    useEffect(() => {
        loadAll()
    }, [loadAll])

    const activeProspect = useMemo(
        () => prospects.find((p) => p.id === selectedProspectId) || prospects[0] || null,
        [prospects, selectedProspectId]
    )

    const metrics = useMemo(() => {
        const total = prospects.length
        const responded = prospects.filter((p) => p.funnel_status === 'RESPONDEU').length
        const sent = prospects.filter((p) => p.funnel_status === 'MATERIAL_ENVIADO').length
        const demos = prospects.filter((p) => p.funnel_status === 'DEMO_AGENDADA').length
        const closed = prospects.filter((p) => p.funnel_status === 'FECHADO').length
        const urgentFollowups = prospects.filter((p) => {
            const u = getFollowupUrgency(p)
            return u === 'overdue' || u === 'today'
        }).length
        return { total, responded, sent, demos, closed, urgentFollowups }
    }, [prospects])

    const handleOpenPdfForProspect = (prospect: SalesProspect) => {
        setSelectedProspectId(prospect.id)
        setActiveTab('pdfs')
    }

    const handleOpenScriptsForProspect = (prospect: SalesProspect) => {
        setSelectedProspectId(prospect.id)
        setActiveTab('scripts')
    }

    const handleDownloadReplyAttachments = async () => {
        if (!activeProspect) return
        setDownloadingKit(true)
        try {
            const input = {
                clinicName: activeProspect.clinic_name,
                programFocus: activeProspect.program_focus || 'Atendimento Multidisciplinar',
                specialties:
                    activeProspect.specialties?.length > 0
                        ? activeProspect.specialties
                        : ['Fonoaudiologia', 'Terapia Ocupacional'],
                contactName: activeProspect.contact_name || '',
                estimatedProfessionals: activeProspect.estimated_professionals || 8,
            }
            const file1 = await generateContinuityReportPdf(input)
            toast.success(`Anexo 1/2 baixado: ${file1}`)
            await new Promise((r) => setTimeout(r, 450))
            const file2 = await generateExecutivePresentationPdf(input)
            toast.success(`Anexo 2/2 baixado: ${file2}. Agora anexe os 2 PDFs da pasta Downloads no e-mail.`)
        } catch (err) {
            console.error('[SALES_HQ] Erro ao baixar anexos:', err)
            toast.error('Erro ao gerar os 2 PDFs anexos.')
        } finally {
            setDownloadingKit(false)
        }
    }

    const handleCopyQuickReplyEmail = async () => {
        if (!activeProspect) return
        const targetScript =
            scripts.find((s) => s.stage === 'ENVIO_MATERIAL') ||
            scripts.find((s) => s.channel === 'EMAIL') ||
            scripts[0]

        if (!targetScript) {
            toast.error('Nenhum script de e-mail disponível.')
            return
        }

        const rendered = interpolateSalesTemplate(targetScript.body_template, {
            clinicName: activeProspect.clinic_name,
            programFocus: activeProspect.program_focus,
            specialties: activeProspect.specialties,
            contactName: activeProspect.contact_name,
            estimatedProfessionals: activeProspect.estimated_professionals,
        })
        await navigator.clipboard.writeText(rendered)
        setCopiedQuickEmail(true)
        toast.success(`E-mail pronto para ${activeProspect.clinic_name} copiado. Cole na resposta do e-mail.`)
        setTimeout(() => setCopiedQuickEmail(false), 2000)
    }

    const handleQuickMarkSent = async () => {
        if (!activeProspect) return
        setMarkingQuickSent(true)
        try {
            const merged = Array.from(
                new Set([...(activeProspect.pdf_sent_types || []), 'CONTINUIDADE', 'EXECUTIVA'])
            )
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
            toast.success(`${activeProspect.clinic_name} marcada como "Material Enviado" + follow-up agendado (+3 dias).`)
            await loadProspects()
        } catch {
            toast.error('Erro ao atualizar status no CRM.')
        } finally {
            setMarkingQuickSent(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F6F8F7] text-[#0F1F1B]">
            {/* Cabeçalho Editorial Privado com Logo Oficial Redondo */}
            <header className="bg-white border-b border-[#E6E8E5] sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                        <img
                            src="/logo-clinigo-round.jpg"
                            alt="Logo oficial CliniGO"
                            className="w-11 h-11 rounded-full object-cover border border-[#D6DDD9] shrink-0"
                        />
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-semibold text-[#0F1F1B] tracking-tight">
                                    HQ de Prospecção B2B
                                </h1>
                                <Badge
                                    variant="outline"
                                    className="text-[10px] font-mono uppercase bg-[#E6F2EE] text-[#114D3E] border-[#BBDCD0] inline-flex items-center gap-1"
                                >
                                    <Lock className="w-3 h-3" />
                                    Privado · NoIndex
                                </Badge>
                            </div>
                            <p className="text-xs text-[#4B5B56]">
                                Operação comercial diária CliniGO — CRM, PDFs personalizados, scripts 1-clique e cofre de arquivos
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="min-h-[42px] text-xs border-[#D6DDD9] text-[#0F1F1B] hover:bg-[#F2F5F3]"
                        >
                            <Link href="/system-master-hub">
                                <ArrowLeft className="w-4 h-4 mr-1.5" />
                                Voltar ao Master Hub
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                {/* Strip de KPIs clicáveis */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('ALL')
                            setOnlyUrgentFollowups(false)
                            setActiveTab('crm')
                        }}
                        className="bg-white border border-[#E6E8E5] hover:border-[#155E4B] rounded-xl p-3.5 text-left transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between text-[#4B5B56] mb-1">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Abordadas</span>
                            <Building2 className="w-4 h-4 text-[#155E4B]" />
                        </div>
                        <p className="text-2xl font-mono font-semibold text-[#0F1F1B]">{metrics.total}</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('RESPONDEU')
                            setOnlyUrgentFollowups(false)
                            setActiveTab('crm')
                        }}
                        className="bg-white border border-[#E6E8E5] hover:border-amber-500 rounded-xl p-3.5 text-left transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between text-[#4B5B56] mb-1">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Responderam</span>
                            <Mail className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-2xl font-mono font-semibold text-amber-700">{metrics.responded}</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('MATERIAL_ENVIADO')
                            setOnlyUrgentFollowups(false)
                            setActiveTab('crm')
                        }}
                        className="bg-white border border-[#E6E8E5] hover:border-sky-600 rounded-xl p-3.5 text-left transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between text-[#4B5B56] mb-1">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Material Env.</span>
                            <Send className="w-4 h-4 text-sky-600" />
                        </div>
                        <p className="text-2xl font-mono font-semibold text-sky-700">{metrics.sent}</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('DEMO_AGENDADA')
                            setOnlyUrgentFollowups(false)
                            setActiveTab('crm')
                        }}
                        className="bg-white border border-[#E6E8E5] hover:border-indigo-600 rounded-xl p-3.5 text-left transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between text-[#4B5B56] mb-1">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Demos</span>
                            <CalendarCheck2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <p className="text-2xl font-mono font-semibold text-indigo-700">{metrics.demos}</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('FECHADO')
                            setOnlyUrgentFollowups(false)
                            setActiveTab('crm')
                        }}
                        className="bg-white border border-[#E6E8E5] hover:border-emerald-600 rounded-xl p-3.5 text-left transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between text-[#4B5B56] mb-1">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Fechadas</span>
                            <Users className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-mono font-semibold text-emerald-700">{metrics.closed}</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('ALL')
                            setOnlyUrgentFollowups(true)
                            setActiveTab('crm')
                        }}
                        className={`rounded-xl p-3.5 text-left transition-colors cursor-pointer border ${
                            metrics.urgentFollowups > 0
                                ? 'bg-amber-50 border-amber-300 hover:border-amber-500'
                                : 'bg-white border-[#E6E8E5] hover:border-[#155E4B]'
                        }`}
                    >
                        <div className="flex items-center justify-between text-[#4B5B56] mb-1">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Follow-ups</span>
                            <AlertTriangle
                                className={`w-4 h-4 ${
                                    metrics.urgentFollowups > 0 ? 'text-amber-600' : 'text-[#4B5B56]'
                                }`}
                            />
                        </div>
                        <p
                            className={`text-2xl font-mono font-semibold ${
                                metrics.urgentFollowups > 0 ? 'text-amber-800' : 'text-[#0F1F1B]'
                            }`}
                        >
                            {metrics.urgentFollowups}
                        </p>
                    </button>
                </section>

                {/* Barra de Ação Rápida 1-2-3 para a Clínica em Foco */}
                {activeProspect && (
                    <section className="bg-white border-2 border-[#155E4B] rounded-xl p-4 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold px-2.5 py-1 rounded bg-[#155E4B] text-white">
                                    Clínica em Foco
                                </span>
                                <span className="text-base font-semibold text-[#0F1F1B]">
                                    {activeProspect.clinic_name}
                                </span>
                                {activeProspect.program_focus && (
                                    <span className="text-xs text-[#155E4B] font-medium">
                                        · {activeProspect.program_focus}
                                    </span>
                                )}
                                <Badge
                                    variant="outline"
                                    className={`text-[11px] ${FUNNEL_STATUS_META[activeProspect.funnel_status].badgeClass}`}
                                >
                                    {FUNNEL_STATUS_META[activeProspect.funnel_status].label}
                                </Badge>
                                {activeProspect.email && (
                                    <span className="text-xs text-[#4B5B56] font-mono">{activeProspect.email}</span>
                                )}
                            </div>
                            <p className="text-[11px] text-[#4B5B56]">
                                Fluxo rápido para responder agora em 3 cliques:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-[#E6E8E5]">
                            <Button
                                type="button"
                                onClick={handleDownloadReplyAttachments}
                                disabled={downloadingKit}
                                className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold justify-start px-3.5"
                            >
                                {downloadingKit ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2 shrink-0" />
                                )}
                                <span className="truncate">1. Baixar 2 Anexos (Relatório + Apresentação)</span>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCopyQuickReplyEmail}
                                className="min-h-[44px] border-[#155E4B] text-[#114D3E] hover:bg-[#E6F2EE] text-xs font-semibold justify-start px-3.5"
                            >
                                {copiedQuickEmail ? (
                                    <Check className="w-4 h-4 mr-2 shrink-0" />
                                ) : (
                                    <Copy className="w-4 h-4 mr-2 shrink-0" />
                                )}
                                <span className="truncate">2. Copiar E-mail de Resposta Pronto</span>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleQuickMarkSent}
                                disabled={markingQuickSent}
                                className="min-h-[44px] border-[#D6DDD9] text-[#0F1F1B] hover:bg-[#F2F5F3] text-xs font-semibold justify-start px-3.5"
                            >
                                {markingQuickSent ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-[#155E4B] shrink-0" />
                                )}
                                <span className="truncate">3. Já Enviei (Agendar Follow-up +3d)</span>
                            </Button>
                        </div>
                    </section>
                )}

                {/* 4 Módulos Principais */}
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as 'crm' | 'pdfs' | 'scripts' | 'vault')}
                    className="space-y-4"
                >
                    <TabsList className="bg-white border border-[#E6E8E5] h-auto flex-wrap gap-1.5 p-1.5 rounded-xl w-full sm:w-auto">
                        <TabsTrigger
                            value="crm"
                            className="min-h-[42px] px-4 rounded-lg text-xs font-semibold data-[state=active]:bg-[#155E4B] data-[state=active]:text-white text-[#4B5B56] flex items-center gap-2"
                        >
                            <Building2 className="w-4 h-4" />
                            CRM de Prospecção ({prospects.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="pdfs"
                            className="min-h-[42px] px-4 rounded-lg text-xs font-semibold data-[state=active]:bg-[#155E4B] data-[state=active]:text-white text-[#4B5B56] flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Gerador de PDFs (3 Modelos)
                        </TabsTrigger>
                        <TabsTrigger
                            value="scripts"
                            className="min-h-[42px] px-4 rounded-lg text-xs font-semibold data-[state=active]:bg-[#155E4B] data-[state=active]:text-white text-[#4B5B56] flex items-center gap-2"
                        >
                            <MessageSquareText className="w-4 h-4" />
                            Biblioteca de Scripts ({scripts.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="vault"
                            className="min-h-[42px] px-4 rounded-lg text-xs font-semibold data-[state=active]:bg-[#155E4B] data-[state=active]:text-white text-[#4B5B56] flex items-center gap-2"
                        >
                            <FolderLock className="w-4 h-4" />
                            Cofre de Arquivos ({documents.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="crm" className="mt-0">
                        <ProspectCrmTab
                            prospects={prospects}
                            selectedProspectId={activeProspect?.id || null}
                            statusFilter={statusFilter}
                            onlyUrgentFollowups={onlyUrgentFollowups}
                            isLoading={isLoading}
                            onStatusFilterChange={setStatusFilter}
                            onToggleUrgentFollowups={setOnlyUrgentFollowups}
                            onSelectProspect={(p) => setSelectedProspectId(p.id)}
                            onOpenPdfForProspect={handleOpenPdfForProspect}
                            onOpenScriptsForProspect={handleOpenScriptsForProspect}
                            onRefresh={loadProspects}
                        />
                    </TabsContent>

                    <TabsContent value="pdfs" className="mt-0">
                        <PdfGeneratorTab
                            prospects={prospects}
                            activeProspect={activeProspect}
                            onSelectProspect={(p) => setSelectedProspectId(p.id)}
                            onProspectUpdated={loadProspects}
                        />
                    </TabsContent>

                    <TabsContent value="scripts" className="mt-0">
                        <ScriptsLibraryTab
                            scripts={scripts}
                            activeProspect={activeProspect}
                            onRefresh={loadScripts}
                        />
                    </TabsContent>

                    <TabsContent value="vault" className="mt-0">
                        <DocumentVaultTab documents={documents} onRefresh={loadDocuments} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}

