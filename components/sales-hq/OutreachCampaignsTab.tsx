'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    ClipboardPaste,
    Copy,
    Download,
    Edit3,
    ExternalLink,
    Eye,
    FileText,
    Flame,
    Loader2,
    Mail,
    MessageCircle,
    Pause,
    Play,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Send,
    ShieldCheck,
    Trash2,
    Upload,
    UserPlus,
    XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    buildWhatsappUrl,
    formatBytes,
    type SalesVaultDocument,
} from '@/lib/sales/prospect-types'
import {
    CAMPAIGN_STATUS_META,
    DEFAULT_DIRECTOR_SIGNATURE,
    DEFAULT_OUTREACH_TEMPLATES,
    DELIVERY_MODE_META,
    RECIPIENT_STATUS_META,
    buildOutreachWhatsappMessage,
    interpolateOutreachTemplate,
    type OutreachDeliveryMode,
    type ParsePreviewResult,
    type SalesOutreachCampaign,
    type SalesOutreachRecipient,
    type SalesOutreachSuppression,
} from '@/lib/sales/outreach-types'

interface SmtpStatusSummary {
    configured: boolean
    host?: string
    port?: number
    from_email?: string
    source?: string
}

interface OutreachCampaignsTabProps {
    vaultDocuments: SalesVaultDocument[]
    onRefreshVault: () => Promise<void>
    onRefreshProspects: () => Promise<void>
}

export function OutreachCampaignsTab({
    vaultDocuments,
    onRefreshVault,
    onRefreshProspects,
}: OutreachCampaignsTabProps) {
    const [campaigns, setCampaigns] = useState<SalesOutreachCampaign[]>([])
    const [suppressions, setSuppressions] = useState<SalesOutreachSuppression[]>([])
    const [smtpInfo, setSmtpInfo] = useState<SmtpStatusSummary>({ configured: false })
    const [loadingList, setLoadingList] = useState(true)

    // Campanha selecionada para gestão detalhada
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedCampaign, setSelectedCampaign] = useState<SalesOutreachCampaign | null>(null)
    const [recipients, setRecipients] = useState<SalesOutreachRecipient[]>([])
    const [loadingDetails, setLoadingDetails] = useState(false)

    // Filtros dos destinatários
    const [recipientSearch, setRecipientSearch] = useState('')
    const [recipientFilter, setRecipientFilter] = useState<'ALL' | 'HOT' | 'PENDING' | 'SENT' | 'REPLIED' | 'FAILED'>('ALL')

    // Estados de ação
    const [busyAction, setBusyAction] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Modal de criação / edição de campanha
    const [wizardOpen, setWizardOpen] = useState(false)
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [deliveryMode, setDeliveryMode] = useState<OutreachDeliveryMode>('BOTH')
    const [vaultDocId, setVaultDocId] = useState<string>('')
    const [uploadingPdf, setUploadingPdf] = useState(false)
    const pdfUploadRef = useRef<HTMLInputElement | null>(null)
    const listFileRef = useRef<HTMLInputElement | null>(null)

    // Textos da cadência (D+0, D+3, D+7)
    const [activeStepTab, setActiveStepTab] = useState<1 | 2 | 3>(1)
    const [subjectStep1, setSubjectStep1] = useState<string>(DEFAULT_OUTREACH_TEMPLATES.subject_step1)
    const [bodyStep1, setBodyStep1] = useState<string>(DEFAULT_OUTREACH_TEMPLATES.body_step1)
    const [enableCadence, setEnableCadence] = useState(true)
    const [subjectStep2, setSubjectStep2] = useState<string>(DEFAULT_OUTREACH_TEMPLATES.subject_step2)
    const [bodyStep2, setBodyStep2] = useState<string>(DEFAULT_OUTREACH_TEMPLATES.body_step2)
    const [step2DelayDays, setStep2DelayDays] = useState(3)
    const [subjectStep3, setSubjectStep3] = useState<string>(DEFAULT_OUTREACH_TEMPLATES.subject_step3)
    const [bodyStep3, setBodyStep3] = useState<string>(DEFAULT_OUTREACH_TEMPLATES.body_step3)
    const [step3DelayDays, setStep3DelayDays] = useState(7)

    // Configurações Hostinger / Assinatura
    const [dailyLimit, setDailyLimit] = useState(40)
    const [minInterval, setMinInterval] = useState(3)
    const [maxInterval, setMaxInterval] = useState(6)
    const [businessHoursOnly, setBusinessHoursOnly] = useState(true)
    const [sendStartHour, setSendStartHour] = useState(8)
    const [sendEndHour, setSendEndHour] = useState(18)
    const [senderName, setSenderName] = useState<string>(DEFAULT_DIRECTOR_SIGNATURE.name)
    const [senderRole, setSenderRole] = useState<string>(DEFAULT_DIRECTOR_SIGNATURE.role)
    const [senderPhone, setSenderPhone] = useState<string>(DEFAULT_DIRECTOR_SIGNATURE.phone)
    const [senderEmail, setSenderEmail] = useState<string>(DEFAULT_DIRECTOR_SIGNATURE.email)

    // Importação TXT / CSV
    const [rawListText, setRawListText] = useState('')
    const [validateMx, setValidateMx] = useState(true)
    const [syncToCrm, setSyncToCrm] = useState(true)
    const [parsingPreview, setParsingPreview] = useState(false)
    const [previewResult, setPreviewResult] = useState<ParsePreviewResult | null>(null)
    const [savingCampaign, setSavingCampaign] = useState(false)

    // Modais auxiliares (Teste, Preview HTML, Adicionar Contatos, Confirmações Destrutivas)
    const [testModalOpen, setTestModalOpen] = useState(false)
    const [testEmail, setTestEmail] = useState('contato@clinigo.app')
    const [testStep, setTestStep] = useState<1 | 2 | 3>(1)
    const [sendingTest, setSendingTest] = useState(false)

    const [previewEmailOpen, setPreviewEmailOpen] = useState(false)
    const [addContactsOpen, setAddContactsOpen] = useState(false)
    const [addContactsText, setAddContactsText] = useState('')
    const [addingContacts, setAddingContacts] = useState(false)

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean
        title: string
        description: string
        confirmLabel: string
        destructive?: boolean
        onConfirm: () => Promise<void>
    }>({
        open: false,
        title: '',
        description: '',
        confirmLabel: 'Confirmar',
        onConfirm: async () => {},
    })

    const loadCampaigns = useCallback(async () => {
        setLoadingList(true)
        try {
            const res = await fetch('/api/super-admin/prospeccao/campaigns', { cache: 'no-store' })
            if (!res.ok) throw new Error('Falha ao carregar campanhas')
            const json = await res.json()
            const list = (json.data || []) as SalesOutreachCampaign[]
            setCampaigns(list)
            setSuppressions((json.suppressions || []) as SalesOutreachSuppression[])
            setSmtpInfo(json.smtp || { configured: false })
            setSelectedId((prev) => {
                if (prev && list.some((c) => c.id === prev)) return prev
                return list[0]?.id || null
            })
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao carregar campanhas')
        } finally {
            setLoadingList(false)
        }
    }, [])

    const loadCampaignDetails = useCallback(async (id: string) => {
        setLoadingDetails(true)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/campaigns/${id}`, { cache: 'no-store' })
            if (!res.ok) throw new Error('Falha ao carregar detalhes da campanha')
            const json = await res.json()
            setSelectedCampaign(json.data || null)
            setRecipients((json.recipients || []) as SalesOutreachRecipient[])
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao abrir campanha')
        } finally {
            setLoadingDetails(false)
        }
    }, [])

    useEffect(() => {
        loadCampaigns()
    }, [loadCampaigns])

    useEffect(() => {
        if (selectedId) {
            loadCampaignDetails(selectedId)
        } else {
            setSelectedCampaign(null)
            setRecipients([])
        }
    }, [selectedId, loadCampaignDetails])

    const pdfVaultDocs = useMemo(
        () => vaultDocuments.filter((d) => d.mime_type === 'application/pdf' || d.file_name.toLowerCase().endsWith('.pdf')),
        [vaultDocuments]
    )

    const filteredRecipients = useMemo(() => {
        const q = recipientSearch.trim().toLowerCase()
        return recipients.filter((r) => {
            if (recipientFilter === 'HOT' && (r.view_count || 0) <= 0) return false
            if (recipientFilter === 'PENDING' && r.status !== 'PENDING') return false
            if (
                recipientFilter === 'SENT' &&
                !['SENT', 'FOLLOWUP_1_SENT', 'FOLLOWUP_2_SENT'].includes(r.status)
            ) {
                return false
            }
            if (recipientFilter === 'REPLIED' && r.status !== 'REPLIED') return false
            if (recipientFilter === 'FAILED' && r.status !== 'FAILED') return false

            if (!q) return true
            return (
                r.email.toLowerCase().includes(q) ||
                (r.contact_name || '').toLowerCase().includes(q) ||
                (r.clinic_name || '').toLowerCase().includes(q) ||
                (r.phone || '').toLowerCase().includes(q)
            )
        })
    }, [recipients, recipientSearch, recipientFilter])

    const hotLeadsCount = useMemo(
        () => recipients.filter((r) => (r.view_count || 0) > 0).length,
        [recipients]
    )

    const openNewCampaignWizard = () => {
        setEditingCampaignId(null)
        setName(`Prospecção Clínicas de Terapias — ${new Date().toLocaleDateString('pt-BR')}`)
        setDeliveryMode('BOTH')
        setVaultDocId(pdfVaultDocs[0]?.id || '')
        setSubjectStep1(DEFAULT_OUTREACH_TEMPLATES.subject_step1)
        setBodyStep1(DEFAULT_OUTREACH_TEMPLATES.body_step1)
        setEnableCadence(true)
        setSubjectStep2(DEFAULT_OUTREACH_TEMPLATES.subject_step2)
        setBodyStep2(DEFAULT_OUTREACH_TEMPLATES.body_step2)
        setStep2DelayDays(3)
        setSubjectStep3(DEFAULT_OUTREACH_TEMPLATES.subject_step3)
        setBodyStep3(DEFAULT_OUTREACH_TEMPLATES.body_step3)
        setStep3DelayDays(7)
        setDailyLimit(40)
        setMinInterval(3)
        setMaxInterval(6)
        setBusinessHoursOnly(true)
        setSendStartHour(8)
        setSendEndHour(18)
        setSenderName(DEFAULT_DIRECTOR_SIGNATURE.name)
        setSenderRole(DEFAULT_DIRECTOR_SIGNATURE.role)
        setSenderPhone(DEFAULT_DIRECTOR_SIGNATURE.phone)
        setSenderEmail(DEFAULT_DIRECTOR_SIGNATURE.email)
        setRawListText('')
        setPreviewResult(null)
        setActiveStepTab(1)
        setWizardOpen(true)
    }

    const openEditCampaignWizard = (camp: SalesOutreachCampaign) => {
        setEditingCampaignId(camp.id)
        setName(camp.name)
        setDeliveryMode(camp.delivery_mode)
        setVaultDocId(camp.vault_document_id || '')
        setSubjectStep1(camp.subject_step1)
        setBodyStep1(camp.body_step1)
        setEnableCadence(camp.enable_cadence)
        setSubjectStep2(camp.subject_step2 || '')
        setBodyStep2(camp.body_step2 || '')
        setStep2DelayDays(camp.step2_delay_days || 3)
        setSubjectStep3(camp.subject_step3 || '')
        setBodyStep3(camp.body_step3 || '')
        setStep3DelayDays(camp.step3_delay_days || 7)
        setDailyLimit(camp.daily_limit || 40)
        setMinInterval(camp.min_interval_minutes || 3)
        setMaxInterval(camp.max_interval_minutes || 6)
        setBusinessHoursOnly(camp.business_hours_only)
        setSendStartHour(camp.send_start_hour ?? 8)
        setSendEndHour(camp.send_end_hour ?? 18)
        setSenderName(camp.sender_name || DEFAULT_DIRECTOR_SIGNATURE.name)
        setSenderRole(camp.sender_role || DEFAULT_DIRECTOR_SIGNATURE.role)
        setSenderPhone(camp.sender_phone || DEFAULT_DIRECTOR_SIGNATURE.phone)
        setSenderEmail(camp.sender_email || DEFAULT_DIRECTOR_SIGNATURE.email)
        setRawListText('')
        setPreviewResult(null)
        setActiveStepTab(1)
        setWizardOpen(true)
    }

    const handleDirectPdfUpload = async (file: File | null) => {
        if (!file) return
        setUploadingPdf(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('title', file.name.replace(/\.[^.]+$/, ''))
            fd.append('category', 'Apresentação')
            fd.append('description', 'PDF comercial enviado diretamente pela aba de Campanhas')

            const res = await fetch('/api/super-admin/prospeccao/vault', {
                method: 'POST',
                body: fd,
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Falha ao subir PDF')

            await onRefreshVault()
            if (json.data?.id) {
                setVaultDocId(json.data.id)
            }
            toast.success('PDF salvo no Cofre e selecionado para esta campanha.')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao enviar PDF')
        } finally {
            setUploadingPdf(false)
            if (pdfUploadRef.current) pdfUploadRef.current.value = ''
        }
    }

    const handleListFilePick = async (file: File | null) => {
        if (!file) return
        try {
            const text = await file.text()
            setRawListText(text)
            setPreviewResult(null)
            toast.success(`Arquivo "${file.name}" carregado. Clique em "Validar Lista" para higienizar.`)
        } catch {
            toast.error('Não foi possível ler o arquivo selecionado.')
        } finally {
            if (listFileRef.current) listFileRef.current.value = ''
        }
    }

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (!text.trim()) {
                toast.info('A área de transferência está vazia.')
                return
            }
            setRawListText((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text))
            setPreviewResult(null)
            toast.success('Lista colada da área de transferência.')
        } catch {
            toast.error('Permissão negada para ler a área de transferência. Use Ctrl+V no campo.')
        }
    }

    const handleValidatePreview = async () => {
        if (!rawListText.trim()) {
            toast.error('Suba um arquivo TXT/CSV ou cole os contatos antes de validar.')
            return
        }
        setParsingPreview(true)
        try {
            const res = await fetch('/api/super-admin/prospeccao/campaigns/parse-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    raw_text: rawListText,
                    validate_mx: validateMx,
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Falha ao validar lista')
            setPreviewResult(json as ParsePreviewResult)
            toast.success(`${json.valid?.length || 0} contatos válidos prontos para disparo.`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao validar lista')
        } finally {
            setParsingPreview(false)
        }
    }

    const handleSaveCampaign = async (startImmediately: boolean) => {
        if (name.trim().length < 2) {
            toast.error('Informe um nome para a campanha.')
            return
        }

        if (!editingCampaignId && !rawListText.trim() && (!previewResult || previewResult.valid.length === 0)) {
            toast.error('Importe um arquivo TXT/CSV ou cole pelo menos 1 contato com e-mail.')
            return
        }

        setSavingCampaign(true)
        try {
            if (editingCampaignId) {
                const res = await fetch(`/api/super-admin/prospeccao/campaigns/${editingCampaignId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update',
                        name: name.trim(),
                        delivery_mode: deliveryMode,
                        vault_document_id: vaultDocId || null,
                        subject_step1: subjectStep1,
                        body_step1: bodyStep1,
                        enable_cadence: enableCadence,
                        subject_step2: subjectStep2,
                        body_step2: bodyStep2,
                        step2_delay_days: step2DelayDays,
                        subject_step3: subjectStep3,
                        body_step3: bodyStep3,
                        step3_delay_days: step3DelayDays,
                        daily_limit: dailyLimit,
                        min_interval_minutes: minInterval,
                        max_interval_minutes: maxInterval,
                        business_hours_only: businessHoursOnly,
                        send_start_hour: sendStartHour,
                        send_end_hour: sendEndHour,
                        sender_name: senderName,
                        sender_role: senderRole,
                        sender_phone: senderPhone,
                        sender_email: senderEmail,
                    }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Falha ao atualizar campanha')

                toast.success('Campanha atualizada com sucesso.')
                setWizardOpen(false)
                await loadCampaigns()
                await loadCampaignDetails(editingCampaignId)
            } else {
                const res = await fetch('/api/super-admin/prospeccao/campaigns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name.trim(),
                        delivery_mode: deliveryMode,
                        vault_document_id: vaultDocId || null,
                        subject_step1: subjectStep1,
                        body_step1: bodyStep1,
                        enable_cadence: enableCadence,
                        subject_step2: subjectStep2,
                        body_step2: bodyStep2,
                        step2_delay_days: step2DelayDays,
                        subject_step3: subjectStep3,
                        body_step3: bodyStep3,
                        step3_delay_days: step3DelayDays,
                        daily_limit: dailyLimit,
                        min_interval_minutes: minInterval,
                        max_interval_minutes: maxInterval,
                        business_hours_only: businessHoursOnly,
                        send_start_hour: sendStartHour,
                        send_end_hour: sendEndHour,
                        sender_name: senderName,
                        sender_role: senderRole,
                        sender_phone: senderPhone,
                        sender_email: senderEmail,
                        start_immediately: startImmediately,
                        validate_mx: validateMx,
                        sync_to_crm: syncToCrm,
                        contacts: previewResult?.valid?.length ? previewResult.valid : undefined,
                        raw_contacts_text: previewResult?.valid?.length ? undefined : rawListText,
                    }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Falha ao criar campanha')

                const imported = json.summary?.imported || 0
                toast.success(
                    startImmediately
                        ? `Campanha iniciada com ${imported} contatos na fila de gotejamento.`
                        : `Rascunho salvo com ${imported} contatos validados. Faça um envio teste antes de iniciar.`
                )
                setWizardOpen(false)
                await Promise.all([loadCampaigns(), onRefreshProspects()])
                if (json.data?.id) {
                    setSelectedId(json.data.id)
                }
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao salvar campanha')
        } finally {
            setSavingCampaign(false)
        }
    }

    const runCampaignAction = async (
        campaignId: string,
        action: string,
        extra?: Record<string, unknown>,
        successMessage?: string
    ) => {
        setBusyAction(`${action}-${campaignId}`)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/campaigns/${campaignId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...(extra || {}) }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Falha ao executar ação')
            if (successMessage) toast.success(successMessage)
            await loadCampaigns()
            if (action === 'duplicate' && json.data?.id) {
                setSelectedId(json.data.id)
            } else if (selectedId) {
                await loadCampaignDetails(selectedId)
            }
            if (action === 'mark_replied') {
                await onRefreshProspects()
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro na operação')
        } finally {
            setBusyAction(null)
        }
    }

    const handleProcessOneNow = async (campaignId: string) => {
        setBusyAction(`process-now-${campaignId}`)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/campaigns/${campaignId}/process-now`, {
                method: 'POST',
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Falha ao disparar próximo contato')
            if (json.sent > 0) {
                toast.success(`E-mail disparado agora para ${json.details?.[0]?.recipient_email || 'o próximo contato'}.`)
            } else if (json.failed > 0) {
                toast.error(`Falha no envio: ${json.details?.[0]?.outcome || 'verifique o log do contato'}`)
            } else {
                toast.info('Nenhum contato elegível na fila no momento (verifique limite diário ou status).')
            }
            await Promise.all([loadCampaigns(), loadCampaignDetails(campaignId), onRefreshProspects()])
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao processar envio')
        } finally {
            setBusyAction(null)
        }
    }

    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCampaign) return
        setSendingTest(true)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/campaigns/${selectedCampaign.id}/test-send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to_email: testEmail.trim(),
                    step: testStep,
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Falha no envio de teste')
            toast.success(
                json.attachedFile
                    ? `Teste enviado para ${testEmail} com anexo "${json.attachedFile}".`
                    : `Teste enviado para ${testEmail}.`
            )
            if (json.attachmentWarning) {
                toast.warning(json.attachmentWarning)
            }
            setTestModalOpen(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao enviar teste')
        } finally {
            setSendingTest(false)
        }
    }

    const handleAddMoreContacts = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCampaign || !addContactsText.trim()) return
        setAddingContacts(true)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/campaigns/${selectedCampaign.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_contacts',
                    raw_contacts_text: addContactsText,
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Falha ao adicionar contatos')
            toast.success(
                json.added > 0
                    ? `${json.added} novos contatos adicionados à fila.`
                    : json.message || 'Nenhum contato novo adicionado.'
            )
            setAddContactsText('')
            setAddContactsOpen(false)
            await Promise.all([loadCampaigns(), loadCampaignDetails(selectedCampaign.id)])
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao adicionar contatos')
        } finally {
            setAddingContacts(false)
        }
    }

    const handleDeleteCampaign = async (camp: SalesOutreachCampaign) => {
        setBusyAction(`delete-${camp.id}`)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/campaigns/${camp.id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Falha ao excluir campanha')
            toast.success(`Campanha "${camp.name}" excluída.`)
            await loadCampaigns()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
        } finally {
            setBusyAction(null)
        }
    }

    const handleExportCsv = () => {
        if (!selectedCampaign || recipients.length === 0) return
        const headers = ['Clinica', 'Responsavel', 'Email', 'Telefone', 'Status', 'Etapa', 'Visualizacoes_PDF', 'Cliques_CTA', 'Ultimo_Envio', 'Erro']
        const escapeCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const rows = recipients.map((r) => [
            r.clinic_name,
            r.contact_name,
            r.email,
            r.phone,
            RECIPIENT_STATUS_META[r.status]?.label || r.status,
            r.current_step,
            r.view_count,
            r.cta_clicks,
            r.last_sent_at || '',
            r.last_error || '',
        ])
        const csv = [headers.map(escapeCell).join(';'), ...rows.map((row) => row.map(escapeCell).join(';'))].join('\n')
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `campanha-${selectedCampaign.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        toast.success('Relatório CSV exportado.')
    }

    const handleCopyText = async (value: string, key: string, label: string) => {
        await navigator.clipboard.writeText(value)
        setCopiedId(key)
        toast.success(`${label} copiado.`)
        setTimeout(() => setCopiedId(null), 1600)
    }

    const sampleInterpolatedSubject = useMemo(
        () =>
            interpolateOutreachTemplate(
                selectedCampaign?.subject_step1 || subjectStep1,
                {
                    contact_name: 'Dra. Camila',
                    clinic_name: 'Clínica Espaço Terapêutico',
                    email: 'contato@espacoterapeutico.com.br',
                }
            ),
        [selectedCampaign?.subject_step1, subjectStep1]
    )

    const sampleInterpolatedBody = useMemo(
        () =>
            interpolateOutreachTemplate(
                selectedCampaign?.body_step1 || bodyStep1,
                {
                    contact_name: 'Dra. Camila',
                    clinic_name: 'Clínica Espaço Terapêutico',
                    email: 'contato@espacoterapeutico.com.br',
                }
            ),
        [selectedCampaign?.body_step1, bodyStep1]
    )

    return (
        <div className="space-y-5">
            {/* Barra Superior: Status Hostinger + Ações Principais */}
            <div className="bg-white border border-[#E6E8E5] rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-[#0F1F1B]">
                            Automação de Disparo Comercial (Hostinger)
                        </h2>
                        {smtpInfo.configured ? (
                            <Badge
                                variant="outline"
                                className="text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200 inline-flex items-center gap-1"
                            >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {smtpInfo.from_email} ({smtpInfo.host})
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="text-[11px] bg-rose-50 text-rose-700 border-rose-200 inline-flex items-center gap-1"
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                SMTP não configurado
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-[11px] bg-[#F2F5F3] text-[#4B5B56] border-[#D6DDD9]">
                            Lista de supressão LGPD: {suppressions.length}
                        </Badge>
                    </div>
                    <p className="text-xs text-[#4B5B56]">
                        Suba sua lista TXT ou CSV, anexe o PDF do Cofre e dispare automaticamente em gotejamento humanizado com cadência D+0, D+3 e D+7 e assinatura de Diretor.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            loadCampaigns()
                            if (selectedId) loadCampaignDetails(selectedId)
                        }}
                        className="min-h-[44px] text-xs border-[#D6DDD9]"
                    >
                        <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingList ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button
                        type="button"
                        onClick={openNewCampaignWizard}
                        className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold px-5"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Nova Campanha de Disparo
                    </Button>
                </div>
            </div>

            {/* Grid Principal: Lista de Campanhas + Painel Operacional da Campanha Selecionada */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Coluna Esquerda: Lista de Campanhas */}
                <div className="lg:col-span-4 space-y-3">
                    <div className="bg-white border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                                Campanhas ({campaigns.length})
                            </h3>
                        </div>

                        {loadingList ? (
                            <div className="py-10 flex items-center justify-center text-xs text-[#4B5B56]">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Carregando campanhas...
                            </div>
                        ) : campaigns.length === 0 ? (
                            <div className="py-8 text-center space-y-3 border border-dashed border-[#D6DDD9] rounded-lg px-4">
                                <Mail className="w-8 h-8 text-[#155E4B] mx-auto opacity-80" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-[#0F1F1B]">
                                        Nenhuma campanha criada ainda
                                    </p>
                                    <p className="text-xs text-[#4B5B56]">
                                        Clique em Nova Campanha para subir sua lista TXT ou CSV e vincular seu PDF.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={openNewCampaignWizard}
                                    className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Criar Primeira Campanha
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {campaigns.map((camp) => {
                                    const meta = CAMPAIGN_STATUS_META[camp.status]
                                    const active = camp.id === selectedId
                                    return (
                                        <button
                                            key={camp.id}
                                            type="button"
                                            onClick={() => setSelectedId(camp.id)}
                                            className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer space-y-2 ${
                                                active
                                                    ? 'bg-[#F2F7F5] border-[#155E4B]'
                                                    : 'bg-white border-[#E6E8E5] hover:border-[#BBDCD0]'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-[#0F1F1B] line-clamp-2">
                                                    {camp.name}
                                                </p>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] shrink-0 ${meta.badgeClass}`}
                                                >
                                                    {meta.label}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-4 gap-1.5 text-center pt-1">
                                                <div className="bg-white/80 rounded-md py-1 border border-[#E6E8E5]">
                                                    <p className="text-[10px] text-[#4B5B56]">Total</p>
                                                    <p className="text-xs font-mono font-bold text-[#0F1F1B]">
                                                        {camp.total_recipients}
                                                    </p>
                                                </div>
                                                <div className="bg-white/80 rounded-md py-1 border border-[#E6E8E5]">
                                                    <p className="text-[10px] text-[#4B5B56]">Env.</p>
                                                    <p className="text-xs font-mono font-bold text-emerald-700">
                                                        {camp.sent_count}
                                                    </p>
                                                </div>
                                                <div className="bg-white/80 rounded-md py-1 border border-[#E6E8E5]">
                                                    <p className="text-[10px] text-[#4B5B56]">Abriu</p>
                                                    <p className="text-xs font-mono font-bold text-amber-700">
                                                        {camp.opened_count}
                                                    </p>
                                                </div>
                                                <div className="bg-white/80 rounded-md py-1 border border-[#E6E8E5]">
                                                    <p className="text-[10px] text-[#4B5B56]">Resp.</p>
                                                    <p className="text-xs font-mono font-bold text-sky-700">
                                                        {camp.replied_count}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Coluna Direita: Painel de Controle e Contatos da Campanha */}
                <div className="lg:col-span-8 space-y-4">
                    {!selectedCampaign ? (
                        <div className="bg-white border border-[#E6E8E5] rounded-xl p-10 text-center text-sm text-[#4B5B56]">
                            Selecione uma campanha ao lado ou crie uma nova para começar.
                        </div>
                    ) : (
                        <>
                            {/* Cabeçalho e Controles Operacionais da Campanha */}
                            <div className="bg-white border border-[#E6E8E5] rounded-xl p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-semibold text-[#0F1F1B]">
                                                {selectedCampaign.name}
                                            </h3>
                                            <Badge
                                                variant="outline"
                                                className={`text-[11px] ${CAMPAIGN_STATUS_META[selectedCampaign.status].badgeClass}`}
                                            >
                                                {CAMPAIGN_STATUS_META[selectedCampaign.status].label}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-[#4B5B56]">
                                            Entrega: <strong>{DELIVERY_MODE_META[selectedCampaign.delivery_mode].label}</strong>
                                            {' · '}Ritmo Hostinger: até <strong>{selectedCampaign.daily_limit}/dia</strong> ({selectedCampaign.min_interval_minutes} a {selectedCampaign.max_interval_minutes} min entre e-mails)
                                            {selectedCampaign.enable_cadence
                                                ? ` · Cadência automática D+0, D+${selectedCampaign.step2_delay_days} e D+${selectedCampaign.step3_delay_days}`
                                                : ' · Envio único sem follow-up'}
                                        </p>
                                        <p className="text-xs text-[#4B5B56] flex items-center gap-1.5 flex-wrap">
                                            <FileText className="w-3.5 h-3.5 text-[#155E4B]" />
                                            Material PDF:{' '}
                                            {selectedCampaign.vault_document ? (
                                                <strong className="text-[#0F1F1B]">
                                                    {selectedCampaign.vault_document.title} ({formatBytes(selectedCampaign.vault_document.file_size_bytes)})
                                                </strong>
                                            ) : (
                                                <span className="text-amber-700 font-medium">
                                                    Nenhum PDF vinculado ainda (clique em Editar para escolher ou subir)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Barra completa de botões operacionais (Regra dos Botões) */}
                                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#EEF1EF]">
                                    {(selectedCampaign.status === 'DRAFT' || selectedCampaign.status === 'PAUSED') && (
                                        <Button
                                            type="button"
                                            disabled={busyAction !== null}
                                            onClick={() =>
                                                runCampaignAction(
                                                    selectedCampaign.id,
                                                    selectedCampaign.status === 'DRAFT' ? 'start' : 'resume',
                                                    undefined,
                                                    'Campanha ativada. O motor automático processará a fila em gotejamento.'
                                                )
                                            }
                                            className="min-h-[42px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                                        >
                                            <Play className="w-3.5 h-3.5 mr-1.5" />
                                            {selectedCampaign.status === 'DRAFT' ? 'Iniciar Disparo Automático' : 'Retomar Campanha'}
                                        </Button>
                                    )}

                                    {selectedCampaign.status === 'RUNNING' && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={busyAction !== null}
                                            onClick={() =>
                                                runCampaignAction(
                                                    selectedCampaign.id,
                                                    'pause',
                                                    undefined,
                                                    'Campanha pausada.'
                                                )
                                            }
                                            className="min-h-[42px] text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                                        >
                                            <Pause className="w-3.5 h-3.5 mr-1.5" />
                                            Pausar
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={busyAction !== null}
                                        onClick={() => handleProcessOneNow(selectedCampaign.id)}
                                        className="min-h-[42px] text-xs border-[#155E4B] text-[#155E4B] hover:bg-[#E6F2EE]"
                                    >
                                        {busyAction === `process-now-${selectedCampaign.id}` ? (
                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        ) : (
                                            <Send className="w-3.5 h-3.5 mr-1.5" />
                                        )}
                                        Disparar 1 Agora
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setTestModalOpen(true)}
                                        className="min-h-[42px] text-xs border-[#D6DDD9]"
                                    >
                                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                                        Enviar Teste p/ Mim
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setPreviewEmailOpen(true)}
                                        className="min-h-[42px] text-xs border-[#D6DDD9]"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                                        Preview Assinatura
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setAddContactsOpen(true)}
                                        className="min-h-[42px] text-xs border-[#D6DDD9]"
                                    >
                                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                                        Adicionar Contatos
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => openEditCampaignWizard(selectedCampaign)}
                                        className="min-h-[42px] text-xs border-[#D6DDD9]"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                                        Editar
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={busyAction !== null}
                                        onClick={() =>
                                            runCampaignAction(
                                                selectedCampaign.id,
                                                'duplicate',
                                                undefined,
                                                'Campanha duplicada como rascunho.'
                                            )
                                        }
                                        className="min-h-[42px] text-xs border-[#D6DDD9]"
                                    >
                                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                                        Duplicar
                                    </Button>

                                    {selectedCampaign.failed_count > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={busyAction !== null}
                                            onClick={() =>
                                                runCampaignAction(
                                                    selectedCampaign.id,
                                                    'retry_failed',
                                                    undefined,
                                                    'Contatos com falha recolocados na fila.'
                                                )
                                            }
                                            className="min-h-[42px] text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                            Reenviar Falhas ({selectedCampaign.failed_count})
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleExportCsv}
                                        disabled={recipients.length === 0}
                                        className="min-h-[42px] text-xs border-[#D6DDD9]"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Exportar CSV
                                    </Button>

                                    {selectedCampaign.status === 'RUNNING' && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setConfirmDialog({
                                                    open: true,
                                                    title: 'Cancelar campanha em andamento?',
                                                    description:
                                                        'Todos os envios futuros e follow-ups programados desta campanha serão cancelados permanentemente.',
                                                    confirmLabel: 'Cancelar Campanha',
                                                    destructive: true,
                                                    onConfirm: () =>
                                                        runCampaignAction(
                                                            selectedCampaign.id,
                                                            'cancel',
                                                            undefined,
                                                            'Campanha cancelada.'
                                                        ),
                                                })
                                            }
                                            className="min-h-[42px] text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                        >
                                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                            Cancelar
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setConfirmDialog({
                                                open: true,
                                                title: 'Excluir campanha permanentemente?',
                                                description: `Tem certeza que deseja excluir "${selectedCampaign.name}"? Esta ação não pode ser desfeita.`,
                                                confirmLabel: 'Excluir Campanha',
                                                destructive: true,
                                                onConfirm: () => handleDeleteCampaign(selectedCampaign),
                                            })
                                        }
                                        className="min-h-[42px] text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                        Excluir
                                    </Button>
                                </div>
                            </div>

                            {/* Lista de Destinatários + Leads Quentes + Ataque Duplo WhatsApp */}
                            <div className="bg-white border border-[#E6E8E5] rounded-xl p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="w-4 h-4 text-[#4B5B56] absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            value={recipientSearch}
                                            onChange={(e) => setRecipientSearch(e.target.value)}
                                            placeholder="Buscar clínica, nome, e-mail ou telefone..."
                                            className="pl-9 min-h-[44px]"
                                        />
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {(
                                            [
                                                ['ALL', `Todos (${recipients.length})`],
                                                ['HOT', `Leads Quentes (${hotLeadsCount})`],
                                                ['PENDING', 'Na Fila'],
                                                ['SENT', 'Enviados'],
                                                ['REPLIED', 'Responderam'],
                                                ['FAILED', 'Falhas'],
                                            ] as const
                                        ).map(([key, label]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setRecipientFilter(key)}
                                                className={`min-h-[36px] px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                                    recipientFilter === key
                                                        ? 'bg-[#0F1F1B] text-white'
                                                        : 'bg-[#F2F5F3] text-[#4B5B56] hover:bg-[#E6ECE9]'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {loadingDetails ? (
                                    <div className="py-10 flex items-center justify-center text-xs text-[#4B5B56]">
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Carregando contatos da fila...
                                    </div>
                                ) : filteredRecipients.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-[#4B5B56] border border-dashed border-[#D6DDD9] rounded-lg">
                                        Nenhum contato encontrado com este filtro.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {filteredRecipients.map((rec) => {
                                            const stMeta = RECIPIENT_STATUS_META[rec.status]
                                            const isHot = (rec.view_count || 0) > 0
                                            const waUrl = rec.phone
                                                ? buildWhatsappUrl(
                                                      rec.phone,
                                                      buildOutreachWhatsappMessage({
                                                          contact_name: rec.contact_name,
                                                          clinic_name: rec.clinic_name,
                                                          email: rec.email,
                                                      })
                                                  )
                                                : null

                                            return (
                                                <div
                                                    key={rec.id}
                                                    className={`rounded-xl border p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                                        isHot
                                                            ? 'bg-amber-50/50 border-amber-300'
                                                            : 'bg-white border-[#E6E8E5]'
                                                    }`}
                                                >
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-[#0F1F1B] truncate">
                                                                {rec.clinic_name || rec.contact_name || rec.email}
                                                            </p>
                                                            <Badge variant="outline" className={`text-[10px] ${stMeta.badgeClass}`}>
                                                                {stMeta.label}
                                                            </Badge>
                                                            {isHot && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[10px] bg-amber-100 text-amber-900 border-amber-300 inline-flex items-center gap-1"
                                                                >
                                                                    <Flame className="w-3 h-3" />
                                                                    Abriu PDF ({rec.view_count}x)
                                                                    {rec.cta_clicks > 0 ? ` · ${rec.cta_clicks} clique(s)` : ''}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <div className="text-xs text-[#4B5B56] flex items-center gap-2 flex-wrap">
                                                            <span>{rec.email}</span>
                                                            {rec.contact_name && <span>· {rec.contact_name}</span>}
                                                            {rec.phone && <span>· {rec.phone}</span>}
                                                        </div>

                                                        {rec.last_sent_at && (
                                                            <p className="text-[11px] text-[#5B6B65]">
                                                                Último envio: {new Date(rec.last_sent_at).toLocaleString('pt-BR')}
                                                                {rec.next_send_at
                                                                    ? ` · Próximo toque: ${new Date(rec.next_send_at).toLocaleString('pt-BR')}`
                                                                    : ''}
                                                            </p>
                                                        )}

                                                        {rec.last_error && (
                                                            <p className="text-[11px] text-rose-700 font-medium">
                                                                Motivo: {rec.last_error}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                                        {waUrl && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                asChild
                                                                className="min-h-[38px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs"
                                                            >
                                                                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                                                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                                                                    WhatsApp
                                                                </a>
                                                            </Button>
                                                        )}

                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleCopyText(rec.email, rec.id, 'E-mail')}
                                                            className="min-h-[38px] text-xs border-[#D6DDD9]"
                                                        >
                                                            {copiedId === rec.id ? (
                                                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>

                                                        {selectedCampaign.vault_document_id && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                asChild
                                                                title="Abrir página rastreável deste contato"
                                                                className="min-h-[38px] text-xs border-[#D6DDD9]"
                                                            >
                                                                <a
                                                                    href={`/apresentacao/${rec.tracking_token}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                </a>
                                                            </Button>
                                                        )}

                                                        {rec.status !== 'REPLIED' && rec.status !== 'UNSUBSCRIBED' && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    runCampaignAction(
                                                                        selectedCampaign.id,
                                                                        'mark_replied',
                                                                        { recipient_id: rec.id },
                                                                        'Contato marcado como Respondeu. Follow-ups pausados.'
                                                                    )
                                                                }
                                                                className="min-h-[38px] text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                                Respondeu
                                                            </Button>
                                                        )}

                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setConfirmDialog({
                                                                    open: true,
                                                                    title: 'Remover contato da campanha?',
                                                                    description: `Tem certeza que deseja excluir ${rec.email} desta campanha? Esta ação não pode ser desfeita.`,
                                                                    confirmLabel: 'Remover Contato',
                                                                    destructive: true,
                                                                    onConfirm: () =>
                                                                        runCampaignAction(
                                                                            selectedCampaign.id,
                                                                            'remove_recipient',
                                                                            { recipient_id: rec.id },
                                                                            'Contato removido da campanha.'
                                                                        ),
                                                                })
                                                            }
                                                            className="min-h-[38px] text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MODAL WIZARD: CRIAR / EDITAR CAMPANHA */}
            <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
                <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-[#0F1F1B]">
                            {editingCampaignId ? 'Editar Campanha Comercial' : 'Nova Campanha de Prospecção Automatizada'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#4B5B56]">
                            Configure o PDF comercial, suba sua lista TXT ou CSV e revise os 3 toques automáticos com sua assinatura de Diretor.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        {/* Bloco 1: Nome, PDF e Modo de Entrega */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="camp-name">Nome da Campanha *</Label>
                                <Input
                                    id="camp-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex.: Clínicas de Terapia RJ — Lote 1"
                                    className="min-h-[44px]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="camp-delivery">Como entregar o PDF</Label>
                                <select
                                    id="camp-delivery"
                                    value={deliveryMode}
                                    onChange={(e) => setDeliveryMode(e.target.value as OutreachDeliveryMode)}
                                    className="w-full min-h-[44px] rounded-md border border-input bg-white px-3 text-sm"
                                >
                                    {(['BOTH', 'ATTACHMENT', 'TRACKED_LINK'] as const).map((m) => (
                                        <option key={m} value={m}>
                                            {DELIVERY_MODE_META[m].label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Seleção ou Upload Direto do PDF */}
                        <div className="bg-[#F6F8F7] border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <Label htmlFor="camp-pdf" className="text-sm font-semibold text-[#0F1F1B]">
                                        PDF da Apresentação Executiva (Cofre)
                                    </Label>
                                    <p className="text-xs text-[#4B5B56]">
                                        Escolha um PDF já salvo no Cofre ou suba o novo arquivo agora (limite 10 MB para anexo SMTP).
                                    </p>
                                </div>

                                <div>
                                    <input
                                        ref={pdfUploadRef}
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={(e) => handleDirectPdfUpload(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={uploadingPdf}
                                        onClick={() => pdfUploadRef.current?.click()}
                                        className="min-h-[40px] text-xs bg-white border-[#155E4B] text-[#155E4B]"
                                    >
                                        {uploadingPdf ? (
                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        ) : (
                                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                                        )}
                                        {uploadingPdf ? 'Enviando PDF...' : 'Subir Novo PDF Agora'}
                                    </Button>
                                </div>
                            </div>

                            <select
                                id="camp-pdf"
                                value={vaultDocId}
                                onChange={(e) => setVaultDocId(e.target.value)}
                                className="w-full min-h-[44px] rounded-md border border-input bg-white px-3 text-sm"
                            >
                                <option value="">Sem anexo PDF (enviar apenas texto e assinatura)</option>
                                {pdfVaultDocs.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.title} — {doc.file_name} ({formatBytes(doc.file_size_bytes)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Bloco 2: Importação TXT / CSV (apenas na criação) */}
                        {!editingCampaignId && (
                            <div className="border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h4 className="text-sm font-semibold text-[#0F1F1B]">
                                            Lista de Contatos (TXT, CSV ou Colar)
                                        </h4>
                                        <p className="text-xs text-[#4B5B56]">
                                            Aceita CSV (nome, clinica, email, telefone), TXT solto ou 1 e-mail por linha. Extração e deduplicação automáticas.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <input
                                            ref={listFileRef}
                                            type="file"
                                            accept=".txt,.csv,text/plain,text/csv"
                                            onChange={(e) => handleListFilePick(e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => listFileRef.current?.click()}
                                            className="min-h-[40px] text-xs"
                                        >
                                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                                            Importar TXT ou CSV
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handlePasteFromClipboard}
                                            className="min-h-[40px] text-xs"
                                        >
                                            <ClipboardPaste className="w-3.5 h-3.5 mr-1.5" />
                                            Colar
                                        </Button>
                                        {rawListText.trim().length > 0 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setConfirmDialog({
                                                        open: true,
                                                        title: 'Limpar lista colada?',
                                                        description: 'Deseja limpar todos os contatos digitados neste campo?',
                                                        confirmLabel: 'Limpar',
                                                        onConfirm: async () => {
                                                            setRawListText('')
                                                            setPreviewResult(null)
                                                        },
                                                    })
                                                }
                                                className="min-h-[40px] text-xs text-rose-700 border-rose-200"
                                            >
                                                Limpar
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <Textarea
                                    rows={6}
                                    value={rawListText}
                                    onChange={(e) => {
                                        setRawListText(e.target.value)
                                        setPreviewResult(null)
                                    }}
                                    placeholder={'Exemplo:\nDra. Ana, Clínica Espaço Crescer, contato@espacocrescer.com.br, (21) 99999-1111\nrecepcao@nucleoterapeutico.com.br\nClínica Vida TEA - Marcos - marcos@vidatea.com.br - 11988887777'}
                                    className="font-mono text-xs"
                                />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-4 flex-wrap text-xs text-[#0F1F1B]">
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={validateMx}
                                                onChange={(e) => setValidateMx(e.target.checked)}
                                                className="w-4 h-4 accent-[#155E4B]"
                                            />
                                            Validar domínio DNS MX (anti-bounce)
                                        </label>
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={syncToCrm}
                                                onChange={(e) => setSyncToCrm(e.target.checked)}
                                                className="w-4 h-4 accent-[#155E4B]"
                                            />
                                            Cadastrar novos contatos no CRM
                                        </label>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={parsingPreview || !rawListText.trim()}
                                        onClick={handleValidatePreview}
                                        className="min-h-[40px] text-xs border-[#155E4B] text-[#155E4B]"
                                    >
                                        {parsingPreview ? (
                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        ) : (
                                            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                        )}
                                        {parsingPreview ? 'Validando MX...' : 'Validar Lista Antes de Salvar'}
                                    </Button>
                                </div>

                                {previewResult && (
                                    <div className="bg-[#F6F8F7] border border-[#D6DDD9] rounded-lg p-3 space-y-2 text-xs">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="font-semibold text-emerald-800">
                                                Prontos para envio: {previewResult.valid.length}
                                            </span>
                                            <span className="text-[#4B5B56]">
                                                Duplicados removidos: {previewResult.duplicates_removed}
                                            </span>
                                            <span className="text-[#4B5B56]">
                                                Suprimidos LGPD: {previewResult.suppressed_removed}
                                            </span>
                                            {previewResult.mx_invalid_emails.length > 0 && (
                                                <span className="text-rose-700 font-medium">
                                                    Domínio MX inválido: {previewResult.mx_invalid_emails.length}
                                                </span>
                                            )}
                                            {previewResult.invalid_lines.length > 0 && (
                                                <span className="text-amber-800">
                                                    Linhas sem e-mail: {previewResult.invalid_lines.length}
                                                </span>
                                            )}
                                        </div>

                                        {previewResult.valid.length > 0 && (
                                            <div className="max-h-36 overflow-y-auto bg-white rounded border border-[#E6E8E5] divide-y divide-[#EEF1EF]">
                                                {previewResult.valid.slice(0, 12).map((c) => (
                                                    <div key={c.email} className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                                                        <span className="font-medium text-[#0F1F1B] truncate">
                                                            {c.email}
                                                        </span>
                                                        <span className="text-[#4B5B56] truncate">
                                                            {[c.contact_name, c.clinic_name, c.phone].filter(Boolean).join(' · ') || 'Apenas e-mail'}
                                                        </span>
                                                    </div>
                                                ))}
                                                {previewResult.valid.length > 12 && (
                                                    <div className="px-2.5 py-1 text-[11px] text-[#4B5B56]">
                                                        ... e mais {previewResult.valid.length - 12} contatos válidos.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bloco 3: Editor dos 3 Toques (D+0, D+3, D+7) */}
                        <div className="border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h4 className="text-sm font-semibold text-[#0F1F1B]">
                                        Mensagens da Cadência Comercial
                                    </h4>
                                    <p className="text-xs text-[#4B5B56]">
                                        Variáveis automáticas: <code>{'{{saudacao}}'}</code>, <code>{'{{clinica}}'}</code>, <code>{'{{nome}}'}</code>
                                    </p>
                                </div>
                                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0F1F1B] cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={enableCadence}
                                        onChange={(e) => setEnableCadence(e.target.checked)}
                                        className="w-4 h-4 accent-[#155E4B]"
                                    />
                                    Ativar follow-ups automáticos (D+3 e D+7)
                                </label>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setActiveStepTab(1)}
                                    className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold cursor-pointer ${
                                        activeStepTab === 1
                                            ? 'bg-[#155E4B] text-white'
                                            : 'bg-[#F2F5F3] text-[#4B5B56]'
                                    }`}
                                >
                                    Toque 1 (Dia 0 · Com PDF)
                                </button>
                                <button
                                    type="button"
                                    disabled={!enableCadence}
                                    onClick={() => setActiveStepTab(2)}
                                    className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 ${
                                        activeStepTab === 2
                                            ? 'bg-[#155E4B] text-white'
                                            : 'bg-[#F2F5F3] text-[#4B5B56]'
                                    }`}
                                >
                                    Toque 2 (Follow-up D+{step2DelayDays})
                                </button>
                                <button
                                    type="button"
                                    disabled={!enableCadence}
                                    onClick={() => setActiveStepTab(3)}
                                    className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 ${
                                        activeStepTab === 3
                                            ? 'bg-[#155E4B] text-white'
                                            : 'bg-[#F2F5F3] text-[#4B5B56]'
                                    }`}
                                >
                                    Toque 3 (Encerramento D+{step3DelayDays})
                                </button>
                            </div>

                            {activeStepTab === 1 && (
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="subj-1">Assunto do Toque 1</Label>
                                        <Input
                                            id="subj-1"
                                            value={subjectStep1}
                                            onChange={(e) => setSubjectStep1(e.target.value)}
                                            className="min-h-[44px]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="body-1">Corpo do E-mail (Toque 1)</Label>
                                        <Textarea
                                            id="body-1"
                                            rows={8}
                                            value={bodyStep1}
                                            onChange={(e) => setBodyStep1(e.target.value)}
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeStepTab === 2 && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <div className="sm:col-span-3 space-y-1">
                                            <Label htmlFor="subj-2">Assunto do Follow-up 1</Label>
                                            <Input
                                                id="subj-2"
                                                value={subjectStep2}
                                                onChange={(e) => setSubjectStep2(e.target.value)}
                                                className="min-h-[44px]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="delay-2">Dias após D+0</Label>
                                            <Input
                                                id="delay-2"
                                                type="number"
                                                min={1}
                                                max={30}
                                                value={step2DelayDays}
                                                onChange={(e) => setStep2DelayDays(Number(e.target.value) || 3)}
                                                className="min-h-[44px]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="body-2">Corpo do Follow-up 1 (enviado apenas se não responder)</Label>
                                        <Textarea
                                            id="body-2"
                                            rows={6}
                                            value={bodyStep2}
                                            onChange={(e) => setBodyStep2(e.target.value)}
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeStepTab === 3 && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <div className="sm:col-span-3 space-y-1">
                                            <Label htmlFor="subj-3">Assunto do Encerramento</Label>
                                            <Input
                                                id="subj-3"
                                                value={subjectStep3}
                                                onChange={(e) => setSubjectStep3(e.target.value)}
                                                className="min-h-[44px]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="delay-3">Dias totais</Label>
                                            <Input
                                                id="delay-3"
                                                type="number"
                                                min={2}
                                                max={60}
                                                value={step3DelayDays}
                                                onChange={(e) => setStep3DelayDays(Number(e.target.value) || 7)}
                                                className="min-h-[44px]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="body-3">Corpo do Toque 3</Label>
                                        <Textarea
                                            id="body-3"
                                            rows={6}
                                            value={bodyStep3}
                                            onChange={(e) => setBodyStep3(e.target.value)}
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bloco 4: Proteção Hostinger e Assinatura Oficial */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                                    Ritmo Seguro Hostinger (Anti-Spam)
                                </h4>
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Teto/dia</Label>
                                        <Input
                                            type="number"
                                            min={5}
                                            max={200}
                                            value={dailyLimit}
                                            onChange={(e) => setDailyLimit(Number(e.target.value) || 40)}
                                            className="min-h-[42px]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Min (min)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={minInterval}
                                            onChange={(e) => setMinInterval(Number(e.target.value) || 3)}
                                            className="min-h-[42px]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Máx (min)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={120}
                                            value={maxInterval}
                                            onChange={(e) => setMaxInterval(Number(e.target.value) || 6)}
                                            className="min-h-[42px]"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <label className="inline-flex items-center gap-2 text-xs text-[#0F1F1B] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={businessHoursOnly}
                                            onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                                            className="w-4 h-4 accent-[#155E4B]"
                                        />
                                        Apenas horário comercial (seg–sex)
                                    </label>
                                    {businessHoursOnly && (
                                        <div className="flex items-center gap-1 text-xs">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={23}
                                                value={sendStartHour}
                                                onChange={(e) => setSendStartHour(Number(e.target.value) || 8)}
                                                className="w-14 h-8 text-center text-xs"
                                            />
                                            <span>às</span>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={24}
                                                value={sendEndHour}
                                                onChange={(e) => setSendEndHour(Number(e.target.value) || 18)}
                                                className="w-14 h-8 text-center text-xs"
                                            />
                                            <span>h</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                                    Assinatura de E-mail do Diretor
                                </h4>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Nome</Label>
                                        <Input
                                            value={senderName}
                                            onChange={(e) => setSenderName(e.target.value)}
                                            className="min-h-[42px] text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Cargo</Label>
                                        <Input
                                            value={senderRole}
                                            onChange={(e) => setSenderRole(e.target.value)}
                                            className="min-h-[42px] text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">WhatsApp</Label>
                                        <Input
                                            value={senderPhone}
                                            onChange={(e) => setSenderPhone(e.target.value)}
                                            className="min-h-[42px] text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">E-mail remetente</Label>
                                        <Input
                                            value={senderEmail}
                                            onChange={(e) => setSenderEmail(e.target.value)}
                                            className="min-h-[42px] text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setWizardOpen(false)}
                            className="min-h-[44px] text-xs"
                        >
                            Cancelar
                        </Button>
                        {editingCampaignId ? (
                            <Button
                                type="button"
                                disabled={savingCampaign}
                                onClick={() => handleSaveCampaign(false)}
                                className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                            >
                                {savingCampaign && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={savingCampaign}
                                    onClick={() => handleSaveCampaign(false)}
                                    className="min-h-[44px] text-xs border-[#155E4B] text-[#155E4B]"
                                >
                                    {savingCampaign && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                                    Salvar Rascunho (Para Testar Antes)
                                </Button>
                                <Button
                                    type="button"
                                    disabled={savingCampaign}
                                    onClick={() => handleSaveCampaign(true)}
                                    className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                                >
                                    {savingCampaign && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                                    Criar e Iniciar Disparo
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: ENVIAR TESTE REAL VIA HOSTINGER */}
            <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-[#0F1F1B]">
                            Enviar E-mail de Teste Real
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#4B5B56]">
                            Dispara uma cópia real pela sua conta Hostinger com a assinatura HTML do Diretor e o PDF vinculado.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSendTestEmail} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="test-dest">Seu e-mail de destino</Label>
                            <Input
                                id="test-dest"
                                type="email"
                                required
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder="seuemail@gmail.com"
                                className="min-h-[44px]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="test-step">Qual etapa testar</Label>
                            <select
                                id="test-step"
                                value={testStep}
                                onChange={(e) => setTestStep(Number(e.target.value) as 1 | 2 | 3)}
                                className="w-full min-h-[44px] rounded-md border border-input bg-white px-3 text-sm"
                            >
                                <option value={1}>Toque 1 (Primeiro contato com PDF)</option>
                                <option value={2}>Toque 2 (Follow-up D+3)</option>
                                <option value={3}>Toque 3 (Encerramento D+7)</option>
                            </select>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTestModalOpen(false)}
                                className="min-h-[42px] text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={sendingTest}
                                className="min-h-[42px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                            >
                                {sendingTest ? (
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 mr-1.5" />
                                )}
                                {sendingTest ? 'Enviando...' : 'Enviar Teste Agora'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: PREVIEW VISUAL DO E-MAIL E ASSINATURA DO DIRETOR */}
            <Dialog open={previewEmailOpen} onOpenChange={setPreviewEmailOpen}>
                <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-[#0F1F1B]">
                            Preview do E-mail e Assinatura Oficial
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#4B5B56]">
                            Visualização aproximada de como a clínica receberá sua mensagem enviada por {selectedCampaign?.sender_email || DEFAULT_DIRECTOR_SIGNATURE.email}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="border border-[#E6E8E5] rounded-xl p-5 bg-white space-y-4">
                        <div className="border-b border-[#EEF1EF] pb-3 space-y-1 text-xs">
                            <p>
                                <span className="text-[#4B5B56]">De:</span>{' '}
                                <strong>
                                    {selectedCampaign?.sender_name || DEFAULT_DIRECTOR_SIGNATURE.name} | CliniGO
                                </strong>{' '}
                                &lt;{selectedCampaign?.sender_email || DEFAULT_DIRECTOR_SIGNATURE.email}&gt;
                            </p>
                            <p>
                                <span className="text-[#4B5B56]">Assunto:</span>{' '}
                                <strong className="text-[#0F1F1B]">{sampleInterpolatedSubject}</strong>
                            </p>
                        </div>

                        <div className="text-sm text-[#1F2937] whitespace-pre-line leading-relaxed">
                            {sampleInterpolatedBody}
                        </div>

                        {selectedCampaign?.vault_document && (
                            <div className="bg-[#F4F8F6] border border-[#D6E4DE] rounded-xl p-4 space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#155E4B]">
                                    Material Executivo CliniGO
                                </p>
                                <p className="text-sm font-semibold text-[#0F1F1B]">
                                    {selectedCampaign.vault_document.title}
                                </p>
                                <span className="inline-block bg-[#155E4B] text-white text-xs font-semibold px-4 py-2 rounded-lg">
                                    Abrir Apresentação Executiva
                                </span>
                            </div>
                        )}

                        {/* Assinatura Oficial do Diretor */}
                        <div className="pt-4 border-t border-[#E5EAE7] flex items-start gap-3.5">
                            <img
                                src="/logo-clinigo-round.jpg"
                                alt="Logo CliniGO"
                                className="w-14 h-14 rounded-full border border-[#D6DDD9] object-cover shrink-0"
                            />
                            <div className="space-y-0.5 text-xs">
                                <p className="text-sm font-bold text-[#0F1F1B]">
                                    {selectedCampaign?.sender_name || DEFAULT_DIRECTOR_SIGNATURE.name}
                                </p>
                                <p className="font-semibold text-[#155E4B]">
                                    {selectedCampaign?.sender_role || DEFAULT_DIRECTOR_SIGNATURE.role} · CliniGO
                                </p>
                                <p className="text-[11px] text-[#5B6B65]">
                                    {DEFAULT_DIRECTOR_SIGNATURE.tagline}
                                </p>
                                <p className="pt-1 text-[#1F2937]">
                                    <span className="text-[#155E4B] font-semibold">
                                        WhatsApp: {selectedCampaign?.sender_phone || DEFAULT_DIRECTOR_SIGNATURE.phone}
                                    </span>{' '}
                                    | {selectedCampaign?.sender_email || DEFAULT_DIRECTOR_SIGNATURE.email} |{' '}
                                    <span className="text-[#155E4B] font-semibold">clinigo.app</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            onClick={() => setPreviewEmailOpen(false)}
                            className="min-h-[42px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs"
                        >
                            Fechar Preview
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: ADICIONAR MAIS CONTATOS À CAMPANHA */}
            <Dialog open={addContactsOpen} onOpenChange={setAddContactsOpen}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-[#0F1F1B]">
                            Adicionar Novos Contatos à Fila
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#4B5B56]">
                            Cole novos contatos (CSV ou TXT). Duplicados e endereços já presentes na campanha são ignorados automaticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddMoreContacts} className="space-y-4">
                        <Textarea
                            rows={6}
                            value={addContactsText}
                            onChange={(e) => setAddContactsText(e.target.value)}
                            placeholder="Cole aqui novos e-mails, nomes, clínicas e telefones..."
                            className="font-mono text-xs"
                        />
                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddContactsOpen(false)}
                                className="min-h-[42px] text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={addingContacts || !addContactsText.trim()}
                                className="min-h-[42px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                            >
                                {addingContacts && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                                Validar e Adicionar à Fila
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL GENÉRICO DE CONFIRMAÇÃO (ZERO window.confirm) */}
            <Dialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
            >
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-[#0F1F1B]">
                            {confirmDialog.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#4B5B56]">
                            {confirmDialog.description}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                            className="min-h-[42px] text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={async () => {
                                const fn = confirmDialog.onConfirm
                                setConfirmDialog((prev) => ({ ...prev, open: false }))
                                await fn()
                            }}
                            className={`min-h-[42px] text-xs font-semibold text-white ${
                                confirmDialog.destructive
                                    ? 'bg-rose-600 hover:bg-rose-700'
                                    : 'bg-[#155E4B] hover:bg-[#0F493A]'
                            }`}
                        >
                            {confirmDialog.confirmLabel}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

