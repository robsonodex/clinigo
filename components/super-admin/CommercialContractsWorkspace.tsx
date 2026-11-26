'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    CopyPlus,
    Download,
    Eraser,
    FileText,
    Loader2,
    Lock,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    ShieldCheck,
    Trash2,
} from 'lucide-react'
import {
    COMMERCIAL_PLAN_PRESETS,
    type CommercialContractFormData,
    type CommercialPlanKey,
    calculateFidelityEndDate,
    createDefaultContractFormData,
    formatBrl,
    formatCnpjDisplay,
    formatPhoneDisplay,
    generateCommercialContractText,
} from '@/lib/contracts/commercial-contract-template'
import {
    downloadCommercialContractPdf,
    downloadCommercialContractWord,
} from '@/lib/contracts/commercial-contract-export'

interface ClinicOption {
    id: string
    name: string
    slug: string | null
    cnpj: string | null
    email: string | null
    phone: string | null
    address: string | null
    responsible_name: string | null
    responsible_phone: string | null
    plan_type: string | null
    is_active: boolean | null
    block_type: string | null
    manual_unlock_only: boolean | null
}

type ContractStatus = 'draft' | 'ready' | 'sent' | 'signed' | 'cancelled'

interface SavedContractRecord {
    id: string
    clinic_id: string | null
    contract_number: string
    title: string
    status: ContractStatus
    plan_type: CommercialPlanKey
    fidelity_months: number
    early_termination_penalty_pct: number
    monthly_value_cents: number
    setup_fee_cents: number
    included_licenses: number
    extra_license_price_cents: number
    due_day: number
    start_date: string
    form_data: Partial<CommercialContractFormData> | null
    contract_body: string
    created_at: string
    updated_at: string
}

const STATUS_LABELS: Record<ContractStatus, string> = {
    draft: 'Rascunho',
    ready: 'Pronto para envio',
    sent: 'Enviado',
    signed: 'Assinado',
    cancelled: 'Cancelado',
}

const STATUS_STYLES: Record<ContractStatus, string> = {
    draft: 'bg-[#F3F4F2] text-[#4B5B56] border-[#D8DFDC]',
    ready: 'bg-[#EEF5F2] text-[#155E4B] border-[#C5DDD3]',
    sent: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
    signed: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
    cancelled: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
}

function normalizePlanKey(raw: string | null | undefined): CommercialPlanKey {
    const upper = String(raw || '').toUpperCase()
    if (upper === 'BASICO' || upper === 'BASIC') return 'BASICO'
    if (upper === 'AVANCADO' || upper === 'ADVANCED') return 'AVANCADO'
    return 'PROFESSIONAL'
}

function buildSafeFileName(contractNumber: string, clientName: string): string {
    const slugClient = (clientName || 'clinica')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 42)
    const slugNumber = (contractNumber || 'contrato')
        .replace(/[^a-zA-Z0-9-]+/g, '-')
        .toLowerCase()
    return `contrato-clinigo-${slugNumber}-${slugClient || 'cliente'}`
}

function formatDateTimeBr(iso: string): string {
    try {
        return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    } catch {
        return iso
    }
}

export function CommercialContractsWorkspace() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [exportingPdf, setExportingPdf] = useState(false)

    const [clinics, setClinics] = useState<ClinicOption[]>([])
    const [contracts, setContracts] = useState<SavedContractRecord[]>([])

    const [activeContractId, setActiveContractId] = useState<string | null>(null)
    const [contractTitle, setContractTitle] = useState('Contrato Comercial SaaS — Fidelidade 12 Meses')
    const [contractStatus, setContractStatus] = useState<ContractStatus>('draft')
    const [formData, setFormData] = useState<CommercialContractFormData>(() => createDefaultContractFormData())
    const [contractBody, setContractBody] = useState<string>(() =>
        generateCommercialContractText(createDefaultContractFormData())
    )
    const [hasManualTextEdits, setHasManualTextEdits] = useState(false)

    const [copiedText, setCopiedText] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    // Saved contracts drawer/section controls
    const [historyExpanded, setHistoryExpanded] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')

    // Confirmation modals (Regra dos Botões Seção 12)
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
    const [confirmClearOpen, setConfirmClearOpen] = useState(false)
    const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false)

    const applyClinicToForm = useCallback((clinic: ClinicOption, base?: CommercialContractFormData) => {
        const planKey = normalizePlanKey(clinic.plan_type)
        const preset = COMMERCIAL_PLAN_PRESETS[planKey]
        const current = base || createDefaultContractFormData()
        const nextForm: CommercialContractFormData = {
            ...current,
            clinicId: clinic.id,
            clientName: clinic.name || '',
            clientCnpj: formatCnpjDisplay(clinic.cnpj || ''),
            clientAddress: clinic.address || '',
            clientRepresentative: clinic.responsible_name || '',
            clientEmail: clinic.email || '',
            clientPhone: formatPhoneDisplay(clinic.phone || clinic.responsible_phone || ''),
            planType: planKey,
            monthlyValueReais: preset.monthlyPriceReais,
            includedLicenses: preset.includedLicenses,
            fidelityMonths: current.fidelityMonths || 12,
            earlyTerminationPenaltyPct: current.earlyTerminationPenaltyPct ?? 30,
            isReactivationNewContract: !clinic.is_active || Boolean(clinic.manual_unlock_only),
        }
        setFormData(nextForm)
        setContractTitle(`Contrato Comercial — ${clinic.name} (Fidelidade ${nextForm.fidelityMonths}m)`)
        setContractBody(generateCommercialContractText(nextForm))
        setHasManualTextEdits(false)
    }, [])

    const loadData = useCallback(async (autoSelectWorldSensory = false) => {
        setLoading(true)
        try {
            const res = await fetch('/api/super-admin/commercial-contracts', { cache: 'no-store' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao carregar contratos comerciais')

            const loadedClinics: ClinicOption[] = data.clinics || []
            const loadedContracts: SavedContractRecord[] = data.contracts || []
            setClinics(loadedClinics)
            setContracts(loadedContracts)

            if (autoSelectWorldSensory && loadedContracts.length === 0) {
                const ws = loadedClinics.find(
                    (c) =>
                        c.slug?.toLowerCase().includes('worldsensory') ||
                        c.name.toLowerCase().includes('worldsensory')
                )
                if (ws) {
                    applyClinicToForm(ws)
                }
            }
        } catch (err: any) {
            setFeedback({ type: 'err', text: err?.message || 'Erro ao carregar dados.' })
        } finally {
            setLoading(false)
        }
    }, [applyClinicToForm])

    useEffect(() => {
        loadData(true)
    }, [loadData])

    const selectedClinic = useMemo(
        () => clinics.find((c) => c.id === formData.clinicId) || null,
        [clinics, formData.clinicId]
    )

    const worldSensoryClinic = useMemo(
        () =>
            clinics.find(
                (c) =>
                    c.slug?.toLowerCase().includes('worldsensory') ||
                    c.name.toLowerCase().includes('worldsensory')
            ) || null,
        [clinics]
    )

    const filteredContracts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return contracts.filter((item) => {
            if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
            if (!q) return true
            const clientName = String(item.form_data?.clientName || '').toLowerCase()
            return (
                item.title.toLowerCase().includes(q) ||
                item.contract_number.toLowerCase().includes(q) ||
                clientName.includes(q)
            )
        })
    }, [contracts, searchQuery, statusFilter])

    const updateFormField = <K extends keyof CommercialContractFormData>(
        field: K,
        value: CommercialContractFormData[K]
    ) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value }
            if (!hasManualTextEdits) {
                setContractBody(generateCommercialContractText(next))
            }
            return next
        })
    }

    const handlePlanChange = (planKey: CommercialPlanKey) => {
        const preset = COMMERCIAL_PLAN_PRESETS[planKey]
        setFormData((prev) => {
            const next: CommercialContractFormData = {
                ...prev,
                planType: planKey,
                monthlyValueReais: preset.monthlyPriceReais,
                includedLicenses: preset.includedLicenses,
            }
            if (!hasManualTextEdits) {
                setContractBody(generateCommercialContractText(next))
            }
            return next
        })
    }

    const handleSelectClinic = (clinicId: string) => {
        if (!clinicId) {
            updateFormField('clinicId', null)
            return
        }
        const clinic = clinics.find((c) => c.id === clinicId)
        if (!clinic) return
        setActiveContractId(null)
        setContractStatus('draft')
        applyClinicToForm(clinic, {
            ...formData,
            contractNumber: createDefaultContractFormData().contractNumber,
        })
        setFeedback({
            type: 'ok',
            text: `Dados da clínica "${clinic.name}" carregados no contrato. Revise, edite livremente e salve ou baixe.`,
        })
    }

    const handleNewContract = () => {
        const fresh = createDefaultContractFormData()
        setActiveContractId(null)
        setContractTitle('Contrato Comercial SaaS — Fidelidade 12 Meses')
        setContractStatus('draft')
        setFormData(fresh)
        setContractBody(generateCommercialContractText(fresh))
        setHasManualTextEdits(false)
        setFeedback(null)
    }

    const handleLoadSavedContract = (record: SavedContractRecord) => {
        const defaults = createDefaultContractFormData()
        const merged: CommercialContractFormData = {
            ...defaults,
            ...(record.form_data || {}),
            clinicId: record.clinic_id,
            contractNumber: record.contract_number,
            planType: normalizePlanKey(record.plan_type),
            fidelityMonths: record.fidelity_months,
            earlyTerminationPenaltyPct: Number(record.early_termination_penalty_pct),
            monthlyValueReais: record.monthly_value_cents / 100,
            setupFeeReais: record.setup_fee_cents / 100,
            includedLicenses: record.included_licenses,
            extraLicensePriceReais: record.extra_license_price_cents / 100,
            dueDay: record.due_day,
            startDate: record.start_date,
        }
        setActiveContractId(record.id)
        setContractTitle(record.title)
        setContractStatus(record.status)
        setFormData(merged)
        setContractBody(record.contract_body)
        setHasManualTextEdits(true)
        setFeedback({ type: 'ok', text: `Contrato ${record.contract_number} carregado para edição.` })
    }

    const handleDuplicateContract = () => {
        const newNum = createDefaultContractFormData().contractNumber
        const duplicatedForm: CommercialContractFormData = {
            ...formData,
            contractNumber: newNum,
        }
        setActiveContractId(null)
        setContractStatus('draft')
        setContractTitle(`${contractTitle} (Cópia)`)
        setFormData(duplicatedForm)
        setContractBody((prev) => prev.replace(formData.contractNumber, newNum))
        setFeedback({
            type: 'ok',
            text: `Cópia preparada com novo número ${newNum}. Clique em "Salvar Contrato" para gravar.`,
        })
    }

    const handleRegenerateText = () => {
        if (hasManualTextEdits) {
            setConfirmRegenerateOpen(true)
            return
        }
        setContractBody(generateCommercialContractText(formData))
        setFeedback({ type: 'ok', text: 'Texto do contrato atualizado conforme os campos configurados.' })
    }

    const confirmRegenerateText = () => {
        setContractBody(generateCommercialContractText(formData))
        setHasManualTextEdits(false)
        setConfirmRegenerateOpen(false)
        setFeedback({ type: 'ok', text: 'Texto do contrato regenerado pelas cláusulas do formulário.' })
    }

    const confirmClearClientFields = () => {
        const next: CommercialContractFormData = {
            ...formData,
            clinicId: null,
            clientName: '',
            clientCnpj: '',
            clientAddress: '',
            clientRepresentative: '',
            clientRepresentativeCpf: '',
            clientEmail: '',
            clientPhone: '',
            customNotes: '',
        }
        setFormData(next)
        setContractBody(generateCommercialContractText(next))
        setHasManualTextEdits(false)
        setConfirmClearOpen(false)
        setFeedback({ type: 'ok', text: 'Campos do contratante limpos.' })
    }

    const handleSave = async () => {
        setSaving(true)
        setFeedback(null)
        try {
            const payload = {
                clinic_id: formData.clinicId || null,
                contract_number: formData.contractNumber.trim(),
                title: contractTitle.trim() || `Contrato ${formData.contractNumber}`,
                status: contractStatus,
                plan_type: formData.planType,
                fidelity_months: Number(formData.fidelityMonths),
                early_termination_penalty_pct: Number(formData.earlyTerminationPenaltyPct),
                monthly_value_cents: Math.round(Number(formData.monthlyValueReais || 0) * 100),
                setup_fee_cents: Math.round(Number(formData.setupFeeReais || 0) * 100),
                included_licenses: Number(formData.includedLicenses || 1),
                extra_license_price_cents: Math.round(Number(formData.extraLicensePriceReais || 49.9) * 100),
                due_day: Number(formData.dueDay || 7),
                start_date: formData.startDate,
                form_data: formData,
                contract_body: contractBody,
            }

            const isUpdate = Boolean(activeContractId)
            const endpoint = isUpdate
                ? `/api/super-admin/commercial-contracts/${activeContractId}`
                : '/api/super-admin/commercial-contracts'
            const res = await fetch(endpoint, {
                method: isUpdate ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar contrato')

            setActiveContractId(data.contract.id)
            setFeedback({
                type: 'ok',
                text: isUpdate
                    ? `Contrato ${data.contract.contract_number} atualizado no banco com sucesso.`
                    : `Contrato ${data.contract.contract_number} salvo no histórico privado.`,
            })
            await loadData(false)
        } catch (err: any) {
            setFeedback({ type: 'err', text: err?.message || 'Erro ao salvar contrato.' })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteConfirmed = async () => {
        if (!activeContractId) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/super-admin/commercial-contracts/${activeContractId}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao excluir contrato')
            setConfirmDeleteOpen(false)
            handleNewContract()
            setFeedback({ type: 'ok', text: 'Contrato excluído permanentemente do histórico.' })
            await loadData(false)
        } catch (err: any) {
            setFeedback({ type: 'err', text: err?.message || 'Erro ao excluir contrato.' })
        } finally {
            setDeleting(false)
        }
    }

    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(contractBody)
            setCopiedText(true)
            setTimeout(() => setCopiedText(false), 2000)
        } catch {
            setFeedback({ type: 'err', text: 'Não foi possível copiar automaticamente. Selecione o texto no editor.' })
        }
    }

    const handleDownloadWord = () => {
        const base = buildSafeFileName(formData.contractNumber, formData.clientName)
        downloadCommercialContractWord(base, contractTitle, formData.contractNumber, contractBody)
        setFeedback({
            type: 'ok',
            text: `Arquivo editável "${base}.doc" baixado. Abra no Microsoft Word, Google Docs ou LibreOffice.`,
        })
    }

    const handleDownloadPdf = async () => {
        setExportingPdf(true)
        try {
            const base = buildSafeFileName(formData.contractNumber, formData.clientName)
            await downloadCommercialContractPdf(base, formData.contractNumber, contractBody)
            setFeedback({
                type: 'ok',
                text: `PDF oficial timbrado "${base}.pdf" gerado com sucesso.`,
            })
        } catch (err: any) {
            setFeedback({ type: 'err', text: err?.message || 'Erro ao gerar PDF.' })
        } finally {
            setExportingPdf(false)
        }
    }

    const fidelityEndPt = calculateFidelityEndDate(formData.startDate, formData.fidelityMonths)
    const totalCycleValue = (Number(formData.monthlyValueReais) || 0) * Math.max(1, Number(formData.fidelityMonths) || 12)

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-[#0F1F1B] overflow-x-hidden pb-[max(2rem,env(safe-area-inset-bottom))]">
            {/* Top Bar */}
            <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#E4E7E4]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <Link
                            href="/system-master-hub"
                            className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-md border border-[#D8DFDC] bg-white hover:bg-[#F3F5F4] text-[#0F1F1B] transition-colors shrink-0"
                            title="Voltar para o System Master Hub"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#0F1F1B] truncate">
                                    Central Privada de Contratos Comerciais
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#EEF5F2] text-[#155E4B] border border-[#C5DDD3]">
                                    <ShieldCheck className="w-3 h-3" />
                                    Restrito Super Admin
                                </span>
                            </div>
                            <p className="text-xs text-[#4B5B56] mt-0.5">
                                Crie, edite livremente cada cláusula, salve no histórico e baixe em Word editável (.doc) ou PDF oficial A4.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => loadData(false)}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-xs font-medium rounded-md border border-[#D8DFDC] bg-white hover:bg-[#F3F5F4] text-[#0F1F1B] transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </button>
                        <button
                            type="button"
                            onClick={handleNewContract}
                            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-xs font-medium rounded-md border border-[#D8DFDC] bg-white hover:bg-[#F3F5F4] text-[#0F1F1B] transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Novo Contrato
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {activeContractId ? 'Salvar Alterações' : 'Salvar Contrato'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
                {/* Feedback Banner */}
                {feedback && (
                    <div
                        className={`rounded-lg px-4 py-3 text-sm border flex items-center justify-between gap-3 ${
                            feedback.type === 'ok'
                                ? 'bg-[#EEF5F2] border-[#C5DDD3] text-[#155E4B]'
                                : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                        }`}
                    >
                        <span>{feedback.text}</span>
                        <button
                            type="button"
                            onClick={() => setFeedback(null)}
                            className="text-xs font-medium underline shrink-0 cursor-pointer"
                        >
                            Fechar
                        </button>
                    </div>
                )}

                {/* Quick Clinic Loader + WorldSensory 1-Click */}
                <section className="bg-white border border-[#E4E7E4] rounded-xl p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5B56] mb-1.5">
                                Carregar dados cadastrados de uma clínica
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2.5">
                                <select
                                    value={formData.clinicId || ''}
                                    onChange={(e) => handleSelectClinic(e.target.value)}
                                    className="flex-1 min-h-[42px] px-3 py-2 text-base sm:text-sm bg-white border border-[#D8DFDC] rounded-md text-[#0F1F1B] focus:outline-none focus:border-[#155E4B]"
                                >
                                    <option value="">Preenchimento manual (contrato avulso)</option>
                                    {clinics.map((clinic) => (
                                        <option key={clinic.id} value={clinic.id}>
                                            {clinic.name}
                                            {clinic.cnpj ? ` — CNPJ ${formatCnpjDisplay(clinic.cnpj)}` : ''}
                                            {!clinic.is_active ? ' [BLOQUEADA]' : ''}
                                        </option>
                                    ))}
                                </select>

                                {worldSensoryClinic && (
                                    <button
                                        type="button"
                                        onClick={() => handleSelectClinic(worldSensoryClinic.id)}
                                        className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 text-xs font-semibold rounded-md border border-[#155E4B] text-[#155E4B] bg-[#EEF5F2] hover:bg-[#E0EFE8] transition-colors shrink-0 cursor-pointer"
                                    >
                                        <Building2 className="w-4 h-4" />
                                        Carregar WorldSensory (1 ano)
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="w-full lg:w-56">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B5B56] mb-1.5">
                                Status do Contrato
                            </label>
                            <select
                                value={contractStatus}
                                onChange={(e) => setContractStatus(e.target.value as ContractStatus)}
                                className="w-full min-h-[42px] px-3 py-2 text-base sm:text-sm bg-white border border-[#D8DFDC] rounded-md text-[#0F1F1B] focus:outline-none focus:border-[#155E4B]"
                            >
                                {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((st) => (
                                    <option key={st} value={st}>
                                        {STATUS_LABELS[st]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedClinic && (!selectedClinic.is_active || selectedClinic.manual_unlock_only) && (
                        <div className="mt-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] px-4 py-3 text-xs text-[#92400E] flex items-start gap-2.5">
                            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" />
                            <div>
                                <p className="font-semibold">
                                    Clínica bloqueada com liberação exclusivamente manual ({selectedClinic.name})
                                </p>
                                <p className="mt-0.5">
                                    Gerar, salvar ou baixar este novo contrato com fidelidade não desbloqueia o acesso automaticamente. Somente após a assinatura e confirmação financeira você realiza a liberação manual no System Master Hub.
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Live Financial & Fidelity Strip */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white border border-[#E4E7E4] rounded-xl p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4B5B56]">Plano e Licenças</p>
                        <p className="text-base font-semibold text-[#0F1F1B] mt-1">
                            {COMMERCIAL_PLAN_PRESETS[formData.planType].label} · até {formData.includedLicenses}
                        </p>
                        <p className="text-xs text-[#4B5B56] mt-0.5">1 unidade operacional</p>
                    </div>
                    <div className="bg-white border border-[#E4E7E4] rounded-xl p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4B5B56]">Mensalidade</p>
                        <p className="text-base font-semibold text-[#0F1F1B] mt-1">
                            {formatBrl(formData.monthlyValueReais)}
                        </p>
                        <p className="text-xs text-[#4B5B56] mt-0.5">
                            Vencimento dia {String(formData.dueDay).padStart(2, '0')} · Extra {formatBrl(formData.extraLicensePriceReais)}
                        </p>
                    </div>
                    <div className="bg-white border border-[#E4E7E4] rounded-xl p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4B5B56]">
                            Ciclo de Fidelidade ({formData.fidelityMonths}m)
                        </p>
                        <p className="text-base font-semibold text-[#155E4B] mt-1">
                            {formatBrl(totalCycleValue)}
                        </p>
                        <p className="text-xs text-[#4B5B56] mt-0.5">
                            Multa rescisória: {formData.earlyTerminationPenaltyPct}% vincendas
                        </p>
                    </div>
                    <div className="bg-white border border-[#E4E7E4] rounded-xl p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4B5B56]">Vigência da Fidelidade</p>
                        <p className="text-base font-semibold text-[#0F1F1B] mt-1">{fidelityEndPt}</p>
                        <p className="text-xs text-[#4B5B56] mt-0.5">Reajuste anual: {formData.readjustmentIndex}</p>
                    </div>
                </section>

                {/* Main Split Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left Column: Structured Clause Parameters */}
                    <div className="lg:col-span-5 space-y-5">
                        {/* Identificação e Condições Comerciais */}
                        <div className="bg-white border border-[#E4E7E4] rounded-xl p-5 space-y-4">
                            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E4E7E4]">
                                <h2 className="text-sm font-semibold text-[#0F1F1B]">
                                    1. Cláusulas Comerciais e Fidelidade
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setConfirmClearOpen(true)}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-[#4B5B56] hover:text-[#B91C1C] transition-colors cursor-pointer"
                                >
                                    <Eraser className="w-3.5 h-3.5" />
                                    Limpar cliente
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Número do Contrato</label>
                                    <input
                                        type="text"
                                        value={formData.contractNumber}
                                        onChange={(e) => updateFormField('contractNumber', e.target.value)}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Título Interno</label>
                                    <input
                                        type="text"
                                        value={contractTitle}
                                        onChange={(e) => setContractTitle(e.target.value)}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                            </div>

                            {/* Plan Selector (3 official plans only) */}
                            <div>
                                <label className="block text-xs font-medium text-[#4B5B56] mb-1.5">Plano Oficial CliniGo</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['BASICO', 'AVANCADO', 'PROFESSIONAL'] as CommercialPlanKey[]).map((key) => {
                                        const preset = COMMERCIAL_PLAN_PRESETS[key]
                                        const active = formData.planType === key
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => handlePlanChange(key)}
                                                className={`min-h-[54px] px-2.5 py-2 rounded-md border text-left transition-colors cursor-pointer ${
                                                    active
                                                        ? 'border-[#155E4B] bg-[#EEF5F2] text-[#0F1F1B]'
                                                        : 'border-[#D8DFDC] bg-white hover:bg-[#F7F8F7] text-[#4B5B56]'
                                                }`}
                                            >
                                                <div className="text-xs font-semibold">{preset.label}</div>
                                                <div className="text-[11px] mt-0.5">
                                                    R$ {preset.monthlyPriceReais} · {preset.includedLicenses} lic.
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Mensalidade (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={formData.monthlyValueReais}
                                        onChange={(e) => updateFormField('monthlyValueReais', Number(e.target.value))}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Taxa de Implantação (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={formData.setupFeeReais}
                                        onChange={(e) => updateFormField('setupFeeReais', Number(e.target.value))}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Licenças Incluídas</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.includedLicenses}
                                        onChange={(e) => updateFormField('includedLicenses', Number(e.target.value))}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Licença Extra (R$/mês)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={formData.extraLicensePriceReais}
                                        onChange={(e) => updateFormField('extraLicensePriceReais', Number(e.target.value))}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Fidelidade (meses)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={60}
                                        value={formData.fidelityMonths}
                                        onChange={(e) => updateFormField('fidelityMonths', Number(e.target.value))}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Multa Rescisória (%)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={formData.earlyTerminationPenaltyPct}
                                        onChange={(e) => updateFormField('earlyTerminationPenaltyPct', Number(e.target.value))}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Início da Vigência</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => updateFormField('startDate', e.target.value)}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Dia de Vencimento</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={28}
                                        value={formData.dueDay}
                                        onChange={(e) => updateFormField('dueDay', Number(e.target.value))}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Aviso Prévio Pós-Fidelidade (dias)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={90}
                                        value={formData.noticeDaysAfterFidelity}
                                        onChange={(e) => updateFormField('noticeDaysAfterFidelity', Number(e.target.value))}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Foro de Eleição</label>
                                    <input
                                        type="text"
                                        value={formData.forumCity}
                                        onChange={(e) => updateFormField('forumCity', e.target.value)}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                            </div>

                            <label className="flex items-start gap-2.5 text-xs text-[#0F1F1B] cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={formData.isReactivationNewContract}
                                    onChange={(e) => updateFormField('isReactivationNewContract', e.target.checked)}
                                    className="mt-0.5 rounded border-[#D8DFDC] text-[#155E4B]"
                                />
                                <span>
                                    Incluir Cláusula 1.4 de <strong>Nova Contratação Independente</strong> (revoga acordos anteriores e condiciona reativação à assinatura e pagamento inicial)
                                </span>
                            </label>
                        </div>

                        {/* Dados da Contratante */}
                        <div className="bg-white border border-[#E4E7E4] rounded-xl p-5 space-y-3">
                            <h2 className="text-sm font-semibold text-[#0F1F1B] pb-3 border-b border-[#E4E7E4]">
                                2. Dados da Contratante (Clínica)
                            </h2>
                            <div>
                                <label className="block text-xs font-medium text-[#4B5B56] mb-1">Razão Social / Nome da Clínica</label>
                                <input
                                    type="text"
                                    value={formData.clientName}
                                    onChange={(e) => updateFormField('clientName', e.target.value)}
                                    placeholder="Ex.: WorldSensory Terapias Multidisciplinares"
                                    className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">CNPJ</label>
                                    <input
                                        type="text"
                                        value={formData.clientCnpj}
                                        onChange={(e) => updateFormField('clientCnpj', e.target.value)}
                                        placeholder="00.000.000/0001-00"
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        value={formData.clientPhone}
                                        onChange={(e) => updateFormField('clientPhone', e.target.value)}
                                        placeholder="(15) 99999-9999"
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#4B5B56] mb-1">Endereço Completo</label>
                                <input
                                    type="text"
                                    value={formData.clientAddress}
                                    onChange={(e) => updateFormField('clientAddress', e.target.value)}
                                    placeholder="Rua, número, bairro, cidade, estado, CEP"
                                    className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Representante Legal</label>
                                    <input
                                        type="text"
                                        value={formData.clientRepresentative}
                                        onChange={(e) => updateFormField('clientRepresentative', e.target.value)}
                                        placeholder="Nome completo do responsável"
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">CPF do Representante</label>
                                    <input
                                        type="text"
                                        value={formData.clientRepresentativeCpf}
                                        onChange={(e) => updateFormField('clientRepresentativeCpf', e.target.value)}
                                        placeholder="000.000.000-00"
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#4B5B56] mb-1">E-mail Administrativo</label>
                                <input
                                    type="email"
                                    value={formData.clientEmail}
                                    onChange={(e) => updateFormField('clientEmail', e.target.value)}
                                    placeholder="contato@clinica.com.br"
                                    className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                />
                            </div>
                        </div>

                        {/* Dados da Contratada + Observações Específicas */}
                        <div className="bg-white border border-[#E4E7E4] rounded-xl p-5 space-y-3">
                            <h2 className="text-sm font-semibold text-[#0F1F1B] pb-3 border-b border-[#E4E7E4]">
                                3. Dados da Contratada (CliniGo) e Observações
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Razão Social da Contratada</label>
                                    <input
                                        type="text"
                                        value={formData.providerName}
                                        onChange={(e) => updateFormField('providerName', e.target.value)}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">CNPJ da Contratada</label>
                                    <input
                                        type="text"
                                        value={formData.providerCnpj}
                                        onChange={(e) => updateFormField('providerCnpj', e.target.value)}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Representante da Contratada</label>
                                    <input
                                        type="text"
                                        value={formData.providerRepresentative}
                                        onChange={(e) => updateFormField('providerRepresentative', e.target.value)}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#4B5B56] mb-1">Sede da Contratada</label>
                                    <input
                                        type="text"
                                        value={formData.providerAddress}
                                        onChange={(e) => updateFormField('providerAddress', e.target.value)}
                                        className="w-full min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#4B5B56] mb-1">
                                    Cláusula Adicional / Condições Específicas (opcional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.customNotes}
                                    onChange={(e) => updateFormField('customNotes', e.target.value)}
                                    placeholder="Ex.: Condição promocional, data combinada de migração ou acordo específico..."
                                    className="w-full px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Full Live Editable Legal Document */}
                    <div className="lg:col-span-7 space-y-5">
                        <div className="bg-white border border-[#E4E7E4] rounded-xl overflow-hidden">
                            {/* Document Action Toolbar */}
                            <div className="px-4 sm:px-5 py-3.5 border-b border-[#E4E7E4] bg-[#F7F8F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-[#0F1F1B]">
                                        Minuta Editável do Contrato
                                    </h2>
                                    <p className="text-xs text-[#4B5B56] mt-0.5">
                                        {hasManualTextEdits
                                            ? 'Edição manual ativa — suas alterações serão preservadas no Word, PDF e banco.'
                                            : 'Sincronizada automaticamente com os campos ao lado. Você pode editar qualquer palavra direto abaixo.'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={handleRegenerateText}
                                        className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-md border border-[#D8DFDC] bg-white hover:bg-[#F3F5F4] text-[#0F1F1B] cursor-pointer"
                                        title="Reaplicar campos do formulário no texto do contrato"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Regenerar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDuplicateContract}
                                        className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-md border border-[#D8DFDC] bg-white hover:bg-[#F3F5F4] text-[#0F1F1B] cursor-pointer"
                                    >
                                        <CopyPlus className="w-3.5 h-3.5" />
                                        Duplicar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopyText}
                                        className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-md border border-[#D8DFDC] bg-white hover:bg-[#F3F5F4] text-[#0F1F1B] cursor-pointer"
                                    >
                                        {copiedText ? <Check className="w-3.5 h-3.5 text-[#155E4B]" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedText ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            {/* Download Bar */}
                            <div className="px-4 sm:px-5 py-3 border-b border-[#E4E7E4] bg-white flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={handleDownloadWord}
                                        className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 text-xs font-semibold rounded-md bg-[#0F1F1B] hover:bg-[#1E332D] text-white transition-colors cursor-pointer"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Baixar Word Editável (.doc)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadPdf}
                                        disabled={exportingPdf}
                                        className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 text-xs font-semibold rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                        {exportingPdf ? 'Gerando PDF...' : 'Baixar PDF Oficial A4'}
                                    </button>
                                </div>

                                {activeContractId && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDeleteOpen(true)}
                                        className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-md border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Excluir
                                    </button>
                                )}
                            </div>

                            {/* Full Editable Textarea */}
                            <div className="p-4 sm:p-5 bg-[#FAFAF8]">
                                <textarea
                                    value={contractBody}
                                    onChange={(e) => {
                                        setContractBody(e.target.value)
                                        setHasManualTextEdits(true)
                                    }}
                                    rows={32}
                                    spellCheck
                                    className="w-full p-5 sm:p-7 bg-white border border-[#D8DFDC] rounded-lg text-[#1F2937] text-base sm:text-[13.5px] leading-relaxed font-serif focus:outline-none focus:border-[#155E4B] shadow-xs"
                                />
                                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#4B5B56]">
                                    <span>{contractBody.length.toLocaleString('pt-BR')} caracteres</span>
                                    <span>Compatível com Microsoft Word, Google Docs, LibreOffice e assinatura eletrônica (Lei 14.063/2020)</span>
                                </div>
                            </div>
                        </div>

                        {/* Saved Contracts History */}
                        <section className="bg-white border border-[#E4E7E4] rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setHistoryExpanded((v) => !v)}
                                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                            >
                                <div>
                                    <h2 className="text-sm font-semibold text-[#0F1F1B]">
                                        Contratos Salvos no Histórico Privado ({contracts.length})
                                    </h2>
                                    <p className="text-xs text-[#4B5B56] mt-0.5">
                                        Clique em qualquer contrato salvo para reabrir, editar ou exportar novamente.
                                    </p>
                                </div>
                                {historyExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-[#4B5B56]" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-[#4B5B56]" />
                                )}
                            </button>

                            {historyExpanded && (
                                <div className="px-5 pb-5 border-t border-[#E4E7E4] pt-4 space-y-3">
                                    <div className="flex flex-col sm:flex-row gap-2.5">
                                        <div className="relative flex-1">
                                            <Search className="w-4 h-4 text-[#6B7B76] absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Buscar por clínica, título ou número do contrato..."
                                                className="w-full min-h-[40px] pl-9 pr-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                            />
                                        </div>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="min-h-[40px] px-3 py-2 text-base sm:text-sm border border-[#D8DFDC] rounded-md bg-white focus:outline-none focus:border-[#155E4B]"
                                        >
                                            <option value="ALL">Todos os status</option>
                                            {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((st) => (
                                                <option key={st} value={st}>
                                                    {STATUS_LABELS[st]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {filteredContracts.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-[#D8DFDC] p-6 text-center text-xs text-[#4B5B56]">
                                            Nenhum contrato salvo encontrado. Configure a minuta acima e clique em "Salvar Contrato".
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {filteredContracts.map((item) => {
                                                const isCurrent = item.id === activeContractId
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`rounded-lg border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                                            isCurrent
                                                                ? 'border-[#155E4B] bg-[#EEF5F2]/50'
                                                                : 'border-[#E4E7E4] bg-white hover:bg-[#FAFAF8]'
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs font-mono font-semibold text-[#155E4B]">
                                                                    {item.contract_number}
                                                                </span>
                                                                <span
                                                                    className={`text-[11px] font-medium px-2 py-0.5 rounded border ${STATUS_STYLES[item.status]}`}
                                                                >
                                                                    {STATUS_LABELS[item.status]}
                                                                </span>
                                                                <span className="text-[11px] text-[#4B5B56]">
                                                                    Fidelidade {item.fidelity_months}m · {formatBrl(item.monthly_value_cents / 100)}/mês
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-medium text-[#0F1F1B] truncate mt-1">
                                                                {item.title}
                                                            </p>
                                                            <p className="text-[11px] text-[#6B7B76] mt-0.5">
                                                                Atualizado em {formatDateTimeBr(item.updated_at)}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleLoadSavedContract(item)}
                                                                className="inline-flex items-center justify-center min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-md border border-[#155E4B] text-[#155E4B] hover:bg-[#155E4B] hover:text-white transition-colors cursor-pointer"
                                                            >
                                                                Abrir e Editar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>

            {/* Modal: Confirmar Exclusão */}
            {confirmDeleteOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white border border-[#E4E7E4] rounded-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-base font-semibold text-[#0F1F1B]">Excluir contrato salvo</h3>
                                <p className="text-sm text-[#4B5B56] mt-1">
                                    Tem certeza que deseja excluir o contrato <strong>{formData.contractNumber}</strong>? Esta ação não pode ser desfeita.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteOpen(false)}
                                className="min-h-[40px] px-4 py-2 text-xs font-medium rounded-md border border-[#D8DFDC] bg-white hover:bg-[#F3F5F4] text-[#0F1F1B] cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirmed}
                                disabled={deleting}
                                className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-md bg-[#B91C1C] hover:bg-[#991B1B] text-white cursor-pointer disabled:opacity-50"
                            >
                                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Excluir Permanentemente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Confirmar Limpar Campos */}
            {confirmClearOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white border border-[#E4E7E4] rounded-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-base font-semibold text-[#0F1F1B]">Limpar dados do contratante</h3>
                                <p className="text-sm text-[#4B5B56] mt-1">
                                    Deseja limpar todos os campos da clínica contratante e observações?
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmClearOpen(false)}
                                className="min-h-[40px] px-4 py-2 text-xs font-medium rounded-md border border-[#D8DFDC] bg-white hover:bg-[#F3F5F4] text-[#0F1F1B] cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmClearClientFields}
                                className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-md bg-[#0F1F1B] hover:bg-[#1E332D] text-white cursor-pointer"
                            >
                                Confirmar Limpeza
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Confirmar Regenerar Texto */}
            {confirmRegenerateOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white border border-[#E4E7E4] rounded-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-base font-semibold text-[#0F1F1B]">Regenerar minuta pelas cláusulas</h3>
                                <p className="text-sm text-[#4B5B56] mt-1">
                                    Você editou o texto manualmente. Regenerar irá substituir suas edições diretas pelo texto gerado a partir dos campos do formulário. Deseja continuar?
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmRegenerateOpen(false)}
                                className="min-h-[40px] px-4 py-2 text-xs font-medium rounded-md border border-[#D8DFDC] bg-white hover:bg-[#F3F5F4] text-[#0F1F1B] cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmRegenerateText}
                                className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white cursor-pointer"
                            >
                                Regenerar Texto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

