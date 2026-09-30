'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    ClipboardPen,
    Plus,
    Link as LinkIcon,
    Send,
    Copy,
    Check,
    Clock,
    Eye,
    AlertCircle,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Trash2,
    Pencil,
    MessageCircle,

    QrCode,
    RefreshCw,
    Search,
    ChevronDown,
    User,
    Phone,
    Calendar,
    CreditCard,
    FileText,
    Heart,
    ExternalLink,
    Loader2,
    X,
    ArrowLeft,
    Save,
    Image,
    ShieldCheck,
    Building2,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface IntakeLink {
    id: string
    token?: string
    url?: string
    lead_name: string | null
    lead_phone: string | null
    status: string
    is_static: boolean
    expires_at: string | null
    created_at: string
    patient_intake_submissions?: Array<{ id: string; status: string }>
}

interface IntakeSubmission {
    id: string
    clinic_id: string
    link_id: string
    status: 'pending' | 'needs_correction' | 'approved' | 'cancelled'
    original_data: Record<string, any>
    edited_data: Record<string, any> | null
    cancel_reason: string | null
    correction_note: string | null
    approved_patient_id: string | null
    reviewed_by: string | null
    reviewed_at: string | null
    consent: Record<string, any>
    created_at: string
    updated_at: string
    patient_intake_links?: {
        lead_name: string | null
        lead_phone: string | null
        is_static: boolean
    }
    patient_intake_files?: Array<{
        id: string
        storage_path: string
        mime: string
        kind: string
        signed_url?: string | null
    }>
}

// ============================================
// Utility Helpers
// ============================================

function formatPhone(digits: string): string {
    if (!digits) return '---'
    const clean = digits.replace(/\D/g, '').replace(/^55/, '')
    if (clean.length <= 2) return `(${clean}`
    if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
}

function formatDate(iso: string): string {
    if (!iso) return 'Não informada'
    try {
        // Se já estiver no formato DD/MM/AAAA
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso
        // Se estiver em YYYY-MM-DD
        const parts = iso.split('-')
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10)
            const m = parseInt(parts[1], 10)
            const d = parseInt(parts[2], 10)
            if (y >= 1900 && y <= new Date().getFullYear() + 1 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
            }
        }
        const parsed = new Date(iso)
        if (isNaN(parsed.getTime())) return 'Necessita ajuste'
        return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
    } catch {
        return 'Necessita ajuste'
    }
}

function getInitials(name?: string): string {
    if (!name) return 'PC'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}


function formatDateTime(iso: string): string {
    if (!iso) return '---'
    try {
        return new Date(iso).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    } catch { return iso }
}

function statusBadge(status: string): { label: string; className: string } {
    const map: Record<string, { label: string; className: string }> = {
        pending: { label: 'Pendente', className: 'intake-badge-yellow' },
        needs_correction: { label: 'Correção solicitada', className: 'intake-badge-orange' },
        approved: { label: 'Aprovada', className: 'intake-badge-green' },
        cancelled: { label: 'Cancelada', className: 'intake-badge-red' },
        created: { label: 'Criado', className: 'intake-badge-slate' },
        sent: { label: 'Enviado', className: 'intake-badge-blue' },
        opened: { label: 'Aberto', className: 'intake-badge-blue' },
        submitted: { label: 'Preenchido', className: 'intake-badge-green' },
        expired: { label: 'Expirado', className: 'intake-badge-red' },
    }
    return map[status] || { label: status, className: 'intake-badge-slate' }
}

// ============================================
// Main Page Component
// ============================================

export default function PreCadastrosPage() {
    const [activeTab, setActiveTab] = useState<'submissions' | 'links' | 'static'>('submissions')

    // Submissions
    const [submissions, setSubmissions] = useState<IntakeSubmission[]>([])
    const [submissionsLoading, setSubmissionsLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [searchText, setSearchText] = useState('')

    // Links
    const [links, setLinks] = useState<IntakeLink[]>([])
    const [linksLoading, setLinksLoading] = useState(false)
    const [whatsappConnected, setWhatsappConnected] = useState(false)

    // Static link
    const [staticLink, setStaticLink] = useState<IntakeLink | null>(null)
    const [staticLoading, setStaticLoading] = useState(false)

    // Modal
    const [selectedSubmission, setSelectedSubmission] = useState<IntakeSubmission | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    // Create link modal
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newLinkName, setNewLinkName] = useState('')
    const [newLinkPhone, setNewLinkPhone] = useState('')
    const [sendWhatsapp, setSendWhatsapp] = useState(true)
    const [creatingLink, setCreatingLink] = useState(false)
    const [createdLink, setCreatedLink] = useState<IntakeLink | null>(null)
    const [createdLinkWhatsappStatus, setCreatedLinkWhatsappStatus] = useState<string | null>(null)
    const [createdLinkPhone, setCreatedLinkPhone] = useState<string>('')
    const [createdLinkPatientName, setCreatedLinkPatientName] = useState<string>('')

    // Action modals
    const [showCorrectionModal, setShowCorrectionModal] = useState(false)
    const [correctionNote, setCorrectionNote] = useState('')
    const [correctionSendWA, setCorrectionSendWA] = useState(false)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [actionSubmissionId, setActionSubmissionId] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    // Editing
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState<Record<string, any>>({})

    // Duplicate modal
    const [showDuplicateModal, setShowDuplicateModal] = useState(false)
    const [duplicatePatient, setDuplicatePatient] = useState<any>(null)

    // Copied
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // ============================================
    // Data Loading
    // ============================================

    const loadSubmissions = useCallback(async () => {
        setSubmissionsLoading(true)
        try {
            const params = statusFilter ? `?status=${statusFilter}` : ''
            const res = await fetch(`/api/intake/submissions${params}`)
            if (!res.ok) throw new Error('Erro ao carregar')
            const data = await res.json()
            setSubmissions(data.submissions || [])
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSubmissionsLoading(false)
        }
    }, [statusFilter])

    const loadLinks = useCallback(async () => {
        setLinksLoading(true)
        try {
            const res = await fetch('/api/intake/links')
            if (!res.ok) throw new Error('Erro ao carregar')
            const data = await res.json()
            setLinks(data.links || [])
            setWhatsappConnected(data.whatsappConnected || false)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLinksLoading(false)
        }
    }, [])

    const loadStaticLink = useCallback(async () => {
        setStaticLoading(true)
        try {
            const res = await fetch('/api/intake/static-link')
            if (!res.ok) throw new Error('Erro ao carregar')
            const data = await res.json()
            setStaticLink(data.link || null)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setStaticLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSubmissions()
        loadLinks()
    }, [loadSubmissions, loadLinks])

    useEffect(() => {
        if (activeTab === 'links') loadLinks()
        if (activeTab === 'static') loadStaticLink()
    }, [activeTab, loadLinks, loadStaticLink])

    // ============================================
    // Actions
    // ============================================

    const [generatedLinkData, setGeneratedLinkData] = useState<{
        url: string
        name: string
        phone: string
        whatsappSent: boolean
        whatsappStatus: string
    } | null>(null)
    const [showInstantQr, setShowInstantQr] = useState(false)

    const handleOpenCreateModal = () => {
        setNewLinkName('')
        setNewLinkPhone('')
        setCreatedLink(null)
        setGeneratedLinkData(null)
        setShowInstantQr(false)
        setShowCreateModal(true)
        loadLinks()
    }

    const buildWhatsAppMessageText = (phone: string, name: string, url: string) => {
        const greeting = name ? `Olá, ${name}!` : 'Olá!'
        return `${greeting} Segue o link para preenchimento da sua ficha de pré-cadastro em nossa clínica:\n\n${url}\n\nO preenchimento é rápido e seguro. Obrigado!`
    }

    const buildWhatsAppWebUrl = (phone: string, name: string, url: string) => {
        const text = buildWhatsAppMessageText(phone, name, url)
        const cleanPhone = phone.replace(/\D/g, '')
        const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`
    }

    const copyCompleteMessage = async (name: string, phone: string, url: string) => {
        const text = buildWhatsAppMessageText(phone, name, url)
        try {
            await navigator.clipboard.writeText(text)
            toast.success('Mensagem completa com link copiada!')
        } catch {
            toast.error('Erro ao copiar mensagem')
        }
    }

    const handleGenerateAndSend = async (action: 'whatsapp' | 'copy' | 'qr') => {
        const rawPhone = newLinkPhone ? newLinkPhone.replace(/\D/g, '') : ''
        if (action === 'whatsapp' && !rawPhone) {
            toast.error('Informe o telefone para enviar por WhatsApp')
            return
        }

        setCreatingLink(true)
        try {
            const res = await fetch('/api/intake/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_name: newLinkName ? newLinkName.trim() : undefined,
                    lead_phone: rawPhone || undefined,
                    send_whatsapp: action === 'whatsapp',
                }),
            })
            if (!res.ok) throw new Error('Erro ao gerar link')
            const data = await res.json()
            const linkUrl = data.link?.url

            if (!linkUrl) {
                throw new Error('Link não gerado pelo servidor')
            }

            setGeneratedLinkData({
                url: linkUrl,
                name: newLinkName.trim(),
                phone: rawPhone,
                whatsappSent: !!data.whatsappSent,
                whatsappStatus: data.whatsappStatus || 'not_requested',
            })

            if (action === 'whatsapp') {
                if (data.whatsappSent) {
                    toast.success('Link enviado com sucesso pelo WhatsApp oficial da clínica!')
                } else {
                    // WhatsApp não está conectado no sistema: copia o link automaticamente e abre o WhatsApp Web
                    await navigator.clipboard.writeText(linkUrl)
                    toast.info('WhatsApp do sistema desconectado. Link copiado! Abrindo WhatsApp Web...')
                    if (rawPhone) {
                        const webUrl = buildWhatsAppWebUrl(rawPhone, newLinkName, linkUrl)
                        window.open(webUrl, '_blank')
                    }
                }
            } else if (action === 'copy') {
                await navigator.clipboard.writeText(linkUrl)
                toast.success('Link copiado para a área de transferência!')
            } else if (action === 'qr') {
                setShowInstantQr(true)
                toast.success('Link gerado! Aponte a câmera do celular para o QR Code.')
            }

            loadLinks()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao gerar link')
        } finally {
            setCreatingLink(false)
        }
    }

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedId(id)
            toast.success('Link copiado')
            setTimeout(() => setCopiedId(null), 2000)
        } catch {
            toast.error('Erro ao copiar')
        }
    }

    const loadSubmissionDetail = async (id: string) => {
        setDetailLoading(true)
        try {
            const res = await fetch(`/api/intake/submissions/${id}`)
            if (!res.ok) throw new Error('Erro ao carregar')
            const data = await res.json()
            setSelectedSubmission(data.submission)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setDetailLoading(false)
        }
    }

    const handleApprove = async (submissionId: string) => {
        setActionLoading(true)
        try {
            const res = await fetch(`/api/intake/submissions/${submissionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' }),
            })
            const data = await res.json()

            if (res.status === 409 && data.error === 'CPF_DUPLICADO') {
                setDuplicatePatient(data.existing_patient)
                setActionSubmissionId(submissionId)
                setShowDuplicateModal(true)
                return
            }

            if (!res.ok) throw new Error(data.error || 'Erro ao aprovar')

            toast.success('Paciente criado com sucesso')
            setSelectedSubmission(null)
            loadSubmissions()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleApproveUpdate = async () => {
        if (!actionSubmissionId || !duplicatePatient) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/intake/submissions/${actionSubmissionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve_update',
                    existing_patient_id: duplicatePatient.id,
                }),
            })
            if (!res.ok) throw new Error('Erro ao atualizar paciente')
            toast.success('Paciente atualizado com sucesso')
            setShowDuplicateModal(false)
            setSelectedSubmission(null)
            loadSubmissions()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleDobInput = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 8)
        let formatted = digits
        if (digits.length > 4) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
        } else if (digits.length > 2) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
        }
        setEditData(prev => ({ ...prev, date_of_birth: formatted }))
    }

    const handleCpfInput = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 11)
        let formatted = digits
        if (digits.length > 9) {
            formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
        } else if (digits.length > 6) {
            formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
        } else if (digits.length > 3) {
            formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`
        }
        setEditData(prev => ({ ...prev, cpf: formatted }))
    }

    const handlePhoneInput = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 11)
        let formatted = digits
        if (digits.length > 10) {
            formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
        } else if (digits.length > 6) {
            formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
        } else if (digits.length > 2) {
            formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`
        }
        setEditData(prev => ({ ...prev, phone: formatted }))
    }

    const handleStartEdit = () => {
        if (!selectedSubmission) return
        const curData = selectedSubmission.edited_data || selectedSubmission.original_data || {}
        
        let formattedDob = curData.date_of_birth || ''
        if (formattedDob.includes('-')) {
            const parts = formattedDob.split('-')
            if (parts.length === 3) {
                formattedDob = `${parts[2]}/${parts[1]}/${parts[0]}`
            }
        }

        setEditData({
            full_name: curData.full_name || '',
            date_of_birth: formattedDob,
            cpf: curData.cpf || '',
            phone: curData.phone ? formatPhone(curData.phone) : '',
            email: curData.email || '',
            billing_type: curData.billing_type || 'particular',
            complaint: curData.complaint || '',
            guardian_name: curData.guardian?.guardian_name || '',
            guardian_cpf: curData.guardian?.guardian_cpf || '',
            guardian_relationship: curData.guardian?.guardian_relationship || '',
            guardian_phone: curData.guardian?.guardian_phone ? formatPhone(curData.guardian.guardian_phone) : '',
            insurance_plan_name: curData.insurance?.insurance_plan_name || '',
            insurance_card_number: curData.insurance?.insurance_card_number || '',
            insurance_validity: curData.insurance?.insurance_validity || '',
        })
        setIsEditing(true)
    }

    const handleSaveEdit = async () => {
        if (!selectedSubmission) return
        setActionLoading(true)
        try {
            const curData = selectedSubmission.edited_data || selectedSubmission.original_data || {}

            let isoDob = editData.date_of_birth ? editData.date_of_birth.trim() : null
            if (isoDob && isoDob.includes('/')) {
                const parts = isoDob.split('/')
                if (parts.length === 3 && parts[2].length === 4) {
                    isoDob = `${parts[2]}-${parts[1]}-${parts[0]}`
                }
            }

            const updatedData: Record<string, any> = {
                ...curData,
                full_name: editData.full_name.trim(),
                date_of_birth: isoDob || null,
                cpf: editData.cpf ? editData.cpf.replace(/\D/g, '') : null,
                phone: editData.phone ? editData.phone.replace(/\D/g, '') : null,
                email: editData.email ? editData.email.trim() : null,
                billing_type: editData.billing_type,
                complaint: editData.complaint ? editData.complaint.trim() : null,
            }

            if (curData.patient_type === 'other' || editData.guardian_name) {
                updatedData.guardian = {
                    guardian_name: editData.guardian_name ? editData.guardian_name.trim() : '',
                    guardian_cpf: editData.guardian_cpf ? editData.guardian_cpf.replace(/\D/g, '') : '',
                    guardian_relationship: editData.guardian_relationship ? editData.guardian_relationship.trim() : '',
                    guardian_phone: editData.guardian_phone ? editData.guardian_phone.replace(/\D/g, '') : '',
                }
            }

            if (editData.billing_type === 'convenio') {
                updatedData.insurance = {
                    ...(curData.insurance || {}),
                    insurance_plan_name: editData.insurance_plan_name ? editData.insurance_plan_name.trim() : undefined,
                    insurance_card_number: editData.insurance_card_number ? editData.insurance_card_number.trim() : undefined,
                    insurance_validity: editData.insurance_validity || undefined,
                }
            }

            const res = await fetch(`/api/intake/submissions/${selectedSubmission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'edit',
                    edited_data: updatedData,
                }),
            })

            const resData = await res.json()
            if (!res.ok) throw new Error(resData.error || 'Erro ao salvar alterações')

            toast.success('Ficha cadastral atualizada com sucesso')
            setSelectedSubmission(prev => prev ? { ...prev, edited_data: updatedData } : null)
            setIsEditing(false)
            loadSubmissions()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setActionLoading(false)
        }
    }


    const handleCorrection = async () => {
        if (!actionSubmissionId || !correctionNote.trim()) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/intake/submissions/${actionSubmissionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'correction',
                    correction_note: correctionNote.trim(),
                    send_whatsapp: correctionSendWA,
                }),
            })
            if (!res.ok) throw new Error('Erro ao solicitar correção')
            toast.success('Correção solicitada')
            setShowCorrectionModal(false)
            setCorrectionNote('')
            setSelectedSubmission(null)
            loadSubmissions()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleCancel = async () => {
        if (!actionSubmissionId || !cancelReason.trim()) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/intake/submissions/${actionSubmissionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'cancel',
                    cancel_reason: cancelReason.trim(),
                }),
            })
            if (!res.ok) throw new Error('Erro ao cancelar')
            toast.success('Ficha cancelada')
            setShowCancelModal(false)
            setCancelReason('')
            setSelectedSubmission(null)
            loadSubmissions()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleReopen = async (submissionId: string) => {
        setActionLoading(true)
        try {
            const res = await fetch(`/api/intake/submissions/${submissionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reopen' }),
            })
            if (!res.ok) throw new Error('Erro ao reabrir')
            toast.success('Ficha reaberta')
            setSelectedSubmission(null)
            loadSubmissions()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!actionSubmissionId) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/intake/submissions/${actionSubmissionId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Erro ao excluir')
            toast.success('Ficha excluída permanentemente')
            setShowDeleteConfirm(false)
            setSelectedSubmission(null)
            loadSubmissions()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setActionLoading(false)
        }
    }

    // ============================================
    // Filter logic
    // ============================================
    const filteredSubmissions = submissions.filter(s => {
        if (!searchText) return true
        const data = s.edited_data || s.original_data
        const name = (data?.full_name || '').toLowerCase()
        const phone = (data?.phone || '')
        return name.includes(searchText.toLowerCase()) || phone.includes(searchText)
    })

    const pendingCount = submissions.filter(s => s.status === 'pending').length

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <ClipboardPen className="w-5 h-5 text-emerald-600" />
                        Pre-cadastros
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Fichas de cadastro enviadas por pacientes via link
                    </p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                    style={{ minHeight: '44px' }}
                >
                    <Plus className="w-4 h-4" />
                    Novo link
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('submissions')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'submissions'
                            ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                    style={{ minHeight: '44px' }}
                >
                    Fichas recebidas
                    {pendingCount > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                            {pendingCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('links')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'links'
                            ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                    style={{ minHeight: '44px' }}
                >
                    Links enviados
                </button>
                <button
                    onClick={() => setActiveTab('static')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'static'
                            ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                    style={{ minHeight: '44px' }}
                >
                    Link fixo / QR
                </button>
            </div>

            {/* =========================================
                TAB: Submissions
            ========================================= */}
            {activeTab === 'submissions' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                placeholder="Buscar por nome ou telefone"
                                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            style={{ minHeight: '44px', fontSize: '16px' }}
                        >
                            <option value="">Todos os status</option>
                            <option value="pending">Pendentes</option>
                            <option value="needs_correction">Correção</option>
                            <option value="approved">Aprovadas</option>
                            <option value="cancelled">Canceladas</option>
                        </select>
                        <button
                            onClick={loadSubmissions}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            style={{ minHeight: '44px' }}
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="hidden sm:inline">Atualizar</span>
                        </button>
                    </div>

                    {/* List */}
                    {submissionsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <ClipboardPen className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="font-medium">Nenhuma ficha encontrada</p>
                            <p className="text-sm mt-1">Gere um link e envie ao paciente para receber fichas.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredSubmissions.map(sub => {
                                const data = sub.edited_data || sub.original_data
                                const badge = statusBadge(sub.status)
                                return (
                                    <div
                                        key={sub.id}
                                        onClick={() => loadSubmissionDetail(sub.id)}
                                        className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                                        style={{ minHeight: '64px' }}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                            <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                {data?.full_name || 'Sem nome'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {formatPhone(data?.phone)} — {formatDateTime(sub.created_at)}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* =========================================
                TAB: Links
            ========================================= */}
            {activeTab === 'links' && (
                <div className="space-y-3">
                    {linksLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                    ) : links.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <LinkIcon className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="font-medium">Nenhum link criado</p>
                        </div>
                    ) : (
                        links.map(link => {
                            const badge = statusBadge(link.status)
                            return (
                                <div key={link.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {link.lead_name || 'Link sem nome'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {link.lead_phone ? formatPhone(link.lead_phone) : 'Sem telefone'}
                                                {' — '}
                                                {formatDateTime(link.created_at)}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                    {link.expires_at && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            Expira: {formatDateTime(link.expires_at)}
                                        </p>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* =========================================
                TAB: Static Link / QR
            ========================================= */}
            {activeTab === 'static' && (
                <div className="space-y-4">
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Link fixo (reutilizável)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Ideal para imprimir como QR Code na recepção. Pode ser usado por múltiplos pacientes.
                        </p>

                        {staticLoading ? (
                            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                        ) : staticLink?.url ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={staticLink.url}
                                        className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 font-mono"
                                        style={{ fontSize: '16px' }}
                                    />
                                    <button
                                        onClick={() => copyToClipboard(staticLink.url!, 'static')}
                                        className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        style={{ minWidth: '44px', minHeight: '44px' }}
                                    >
                                        {copiedId === 'static' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                                    </button>
                                </div>

                                <button
                                    onClick={loadStaticLink}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors"
                                    style={{ minHeight: '44px' }}
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Regenerar link (invalida o anterior)
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={loadStaticLink}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                                style={{ minHeight: '44px' }}
                            >
                                <QrCode className="w-4 h-4" />
                                Gerar link fixo
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Create Link (Design Ultracompacto Sem Rolagem)
            ========================================= */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
                    <div
                        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header Compacto */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                                    <LinkIcon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">Novo link de pré-cadastro</h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Envio direto, WhatsApp Web, cópia ou QR Code</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                style={{ minWidth: '36px', minHeight: '36px' }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Status Compacto do WhatsApp */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
                            <span className="text-slate-600 dark:text-slate-300 font-medium">WhatsApp integrado:</span>
                            {whatsappConnected ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Conectado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Desconectado (contingência ativa)
                                </span>
                            )}
                        </div>

                        {/* Campos de Entrada Compactos */}
                        <div className="space-y-2 pt-0.5">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Nome do paciente (opcional)</label>
                                <input
                                    type="text"
                                    value={newLinkName}
                                    onChange={e => {
                                        setNewLinkName(e.target.value)
                                        setGeneratedLinkData(null)
                                    }}
                                    placeholder="Ex: Carlos Eduardo Silva"
                                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Telefone / WhatsApp</label>
                                <input
                                    type="tel"
                                    value={newLinkPhone}
                                    onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                                        let fmt = digits
                                        if (digits.length > 10) fmt = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
                                        else if (digits.length > 6) fmt = `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
                                        else if (digits.length > 2) fmt = `(${digits.slice(0,2)}) ${digits.slice(2)}`
                                        setNewLinkPhone(fmt)
                                        setGeneratedLinkData(null)
                                    }}
                                    placeholder="(00) 00000-0000"
                                    maxLength={15}
                                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Bloco de Link Gerado Compacto */}
                        {generatedLinkData ? (
                            <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        readOnly
                                        value={generatedLinkData.url}
                                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedLinkData.url)
                                            toast.success('Link copiado!')
                                        }}
                                        className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                                        title="Copiar link"
                                    >
                                        Copiar
                                    </button>
                                </div>

                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => copyCompleteMessage(generatedLinkData.name, generatedLinkData.phone, generatedLinkData.url)}
                                        className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded text-[11px] font-medium text-center"
                                    >
                                        Copiar mensagem pronta
                                    </button>

                                    {generatedLinkData.phone && (
                                        <a
                                            href={buildWhatsAppWebUrl(generatedLinkData.phone, generatedLinkData.name, generatedLinkData.url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 rounded text-[11px] font-medium text-center inline-flex items-center justify-center gap-1"
                                        >
                                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                                            WhatsApp Web
                                        </a>
                                    )}
                                </div>

                                {showInstantQr && (
                                    <div className="pt-2 flex flex-col items-center justify-center text-center">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(generatedLinkData.url)}`}
                                            alt="QR Code"
                                            className="w-28 h-28 border border-slate-200 dark:border-slate-700 rounded p-1 bg-white"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">Aponte a câmera para preencher no balcão</p>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Botões de Ação Principais em Bloco Único Compacto */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => handleGenerateAndSend('whatsapp')}
                                disabled={creatingLink}
                                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ minHeight: '40px' }}
                            >
                                {creatingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                                Enviar por WhatsApp
                            </button>

                            <div className="grid grid-cols-3 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleGenerateAndSend('copy')}
                                    disabled={creatingLink}
                                    className="py-2 px-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                    style={{ minHeight: '38px' }}
                                >
                                    <Copy className="w-3 h-3 text-slate-500" />
                                    Copiar link
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleGenerateAndSend('qr')}
                                    disabled={creatingLink}
                                    className="py-2 px-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                    style={{ minHeight: '38px' }}
                                >
                                    <QrCode className="w-3 h-3 text-slate-500" />
                                    QR Code
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={creatingLink}
                                    className="py-2 px-2 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                                    style={{ minHeight: '38px' }}
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Submission Detail
            ========================================= */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => { setSelectedSubmission(null); setIsEditing(false) }}>
                    <div
                        className="w-full sm:max-w-lg bg-white dark:bg-slate-800 sm:rounded-xl rounded-t-xl overflow-hidden max-h-[90dvh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        {/* Detail Header */}
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            {(() => {
                                const data = selectedSubmission.edited_data || selectedSubmission.original_data
                                return (
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                                            {getInitials(data?.full_name)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                    {isEditing ? 'Editar cadastro' : (data?.full_name || 'Ficha cadastral')}
                                                </h3>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(selectedSubmission.status).className}`}>
                                                    {statusBadge(selectedSubmission.status).label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                Protocolo #{selectedSubmission.id.slice(0, 8)} • Recebida em {formatDateTime(selectedSubmission.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })()}
                            <button
                                onClick={() => { setSelectedSubmission(null); setIsEditing(false) }}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                style={{ minWidth: '44px', minHeight: '44px' }}
                                title="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Banner status/alerta */}
                        {(() => {
                            const data = selectedSubmission.edited_data || selectedSubmission.original_data
                            const isDobInvalid = data?.date_of_birth && formatDate(data.date_of_birth) === 'Necessita ajuste'
                            if (isEditing) {
                                return (
                                    <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex items-center gap-2.5 text-blue-800 dark:text-blue-300">
                                        <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                        <p className="text-xs font-medium">Modo de edição: você pode corrigir qualquer dado antes de aprovar e cadastrar o paciente.</p>
                                    </div>
                                )
                            }
                            if (isDobInvalid && selectedSubmission.status === 'pending') {
                                return (
                                    <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <p className="text-xs font-medium">Data de nascimento precisa de ajuste antes da aprovação.</p>
                                        </div>
                                        <button
                                            onClick={handleStartEdit}
                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                                        >
                                            Corrigir agora
                                        </button>
                                    </div>
                                )
                            }
                            return null
                        })()}

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                            {detailLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                                </div>
                            ) : isEditing ? (
                                /* =========================================
                                   FORMULÁRIO DE EDIÇÃO INLINE
                                ========================================= */
                                <div className="space-y-4">
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Identificação do Paciente</p>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nome Completo *</label>
                                                <input
                                                    type="text"
                                                    value={editData.full_name || ''}
                                                    onChange={e => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="Nome completo do paciente"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Data de Nascimento (DD/MM/AAAA)</label>
                                                <input
                                                    type="text"
                                                    value={editData.date_of_birth || ''}
                                                    onChange={e => handleDobInput(e.target.value)}
                                                    maxLength={10}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                                    placeholder="Ex: 15/05/1990"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">CPF</label>
                                                <input
                                                    type="text"
                                                    value={editData.cpf || ''}
                                                    onChange={e => handleCpfInput(e.target.value)}
                                                    maxLength={14}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                                    placeholder="000.000.000-00"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                                                <input
                                                    type="text"
                                                    value={editData.phone || ''}
                                                    onChange={e => handlePhoneInput(e.target.value)}
                                                    maxLength={15}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                                    placeholder="(00) 00000-0000"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">E-mail</label>
                                                <input
                                                    type="email"
                                                    value={editData.email || ''}
                                                    onChange={e => setEditData(prev => ({ ...prev, email: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="paciente@email.com"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Modalidade de Atendimento</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditData(prev => ({ ...prev, billing_type: 'particular' }))}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                                                            editData.billing_type === 'particular'
                                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        Particular
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditData(prev => ({ ...prev, billing_type: 'convenio' }))}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                                                            editData.billing_type === 'convenio'
                                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        Convênio / Plano de Saúde
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Campos de Convênio */}
                                    {editData.billing_type === 'convenio' && (
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dados do Convênio</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Operadora / Plano</label>
                                                    <input
                                                        type="text"
                                                        value={editData.insurance_plan_name || ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, insurance_plan_name: e.target.value }))}
                                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                        placeholder="Ex: Unimed, Bradesco Saúde"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Número da Carteirinha</label>
                                                    <input
                                                        type="text"
                                                        value={editData.insurance_card_number || ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, insurance_card_number: e.target.value }))}
                                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                                        placeholder="Número na carteirinha"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Validade</label>
                                                    <input
                                                        type="text"
                                                        value={editData.insurance_validity || ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, insurance_validity: e.target.value }))}
                                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                        placeholder="Ex: 12/2027"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Responsável Legal */}
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Responsável Legal (se aplicável)</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nome do Responsável</label>
                                                <input
                                                    type="text"
                                                    value={editData.guardian_name || ''}
                                                    onChange={e => setEditData(prev => ({ ...prev, guardian_name: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="Nome do responsável pelo paciente"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">CPF do Responsável</label>
                                                <input
                                                    type="text"
                                                    value={editData.guardian_cpf || ''}
                                                    onChange={e => {
                                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                                                        let fmt = digits
                                                        if (digits.length > 9) fmt = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
                                                        else if (digits.length > 6) fmt = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`
                                                        else if (digits.length > 3) fmt = `${digits.slice(0,3)}.${digits.slice(3)}`
                                                        setEditData(prev => ({ ...prev, guardian_cpf: fmt }))
                                                    }}
                                                    maxLength={14}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                                    placeholder="000.000.000-00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Parentesco</label>
                                                <input
                                                    type="text"
                                                    value={editData.guardian_relationship || ''}
                                                    onChange={e => setEditData(prev => ({ ...prev, guardian_relationship: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="Ex: Mãe, Pai, Cônjuge"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Telefone do Responsável</label>
                                                <input
                                                    type="text"
                                                    value={editData.guardian_phone || ''}
                                                    onChange={e => {
                                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                                                        let fmt = digits
                                                        if (digits.length > 10) fmt = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
                                                        else if (digits.length > 6) fmt = `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
                                                        else if (digits.length > 2) fmt = `(${digits.slice(0,2)}) ${digits.slice(2)}`
                                                        setEditData(prev => ({ ...prev, guardian_phone: fmt }))
                                                    }}
                                                    maxLength={15}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                                    placeholder="(00) 00000-0000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Queixa */}
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-900/40 space-y-2">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Queixa Principal / Motivo</label>
                                        <textarea
                                            value={editData.complaint || ''}
                                            onChange={e => setEditData(prev => ({ ...prev, complaint: e.target.value }))}
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="Informações fornecidas pelo paciente"
                                        />
                                    </div>
                                </div>
                            ) : (() => {
                                /* =========================================
                                   MODO LEITURA SAAS PREMIUM
                                ========================================= */
                                const data = selectedSubmission.edited_data || selectedSubmission.original_data
                                const dobFormatted = data?.date_of_birth ? formatDate(data.date_of_birth) : undefined
                                const isDobInvalid = dobFormatted === 'Necessita ajuste'

                                return (
                                    <>
                                        {/* Card 1: Dados do Paciente */}
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-850 shadow-sm space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dados Pessoais e Contato</p>
                                                {selectedSubmission.edited_data && (
                                                    <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                                                        Editado pela recepção
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                <div className="flex items-start gap-2.5">
                                                    <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Nome completo</p>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">{data?.full_name || '---'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Nascimento</p>
                                                        {isDobInvalid ? (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700/60 inline-flex items-center gap-1">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Necessita ajuste
                                                                </span>
                                                                <button
                                                                    onClick={handleStartEdit}
                                                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline"
                                                                >
                                                                    Editar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{dobFormatted || 'Não informada'}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <CreditCard className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">CPF</p>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 font-mono">{data?.cpf ? data.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Não informado'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Telefone</p>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 font-mono">{data?.phone ? formatPhone(data.phone) : 'Não informado'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">E-mail</p>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">{data?.email || 'Não informado'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <Heart className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Modalidade</p>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mt-0.5 ${
                                                            data?.billing_type === 'convenio'
                                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                        }`}>
                                                            {data?.billing_type === 'convenio' ? 'Convênio' : 'Particular'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: Convênio & Documentos */}
                                        {data?.billing_type === 'convenio' && data?.insurance && (
                                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-850 shadow-sm space-y-3">
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Convênio Médico</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                    <DataRow icon={<Building2 className="w-4 h-4" />} label="Operadora / Plano" value={data.insurance.insurance_plan_name || 'Não informado'} />
                                                    <DataRow icon={<CreditCard className="w-4 h-4" />} label="Carteirinha" value={data.insurance.insurance_card_number || 'Não informado'} />
                                                    <DataRow icon={<Calendar className="w-4 h-4" />} label="Validade" value={data.insurance.insurance_validity || 'Não informada'} />
                                                </div>

                                                {/* Documentos Anexados */}
                                                {selectedSubmission.patient_intake_files && selectedSubmission.patient_intake_files.length > 0 && (
                                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Comprovante / Carteirinha</p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {selectedSubmission.patient_intake_files.map(file => (
                                                                <div key={file.id} className="group relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-sm">
                                                                    {file.signed_url && file.mime.startsWith('image/') ? (
                                                                        <a href={file.signed_url} target="_blank" rel="noopener noreferrer" className="block">
                                                                            <img src={file.signed_url} alt={file.kind} className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-200" />
                                                                        </a>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                                                                            <Image className="w-8 h-8 text-slate-300" />
                                                                        </div>
                                                                    )}
                                                                    <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                                                        <span className="font-medium">{file.kind === 'carteirinha_frente' ? 'Frente' : 'Verso'}</span>
                                                                        {file.signed_url && (
                                                                            <a href={file.signed_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1">
                                                                                Ampliar
                                                                                <ExternalLink className="w-3 h-3" />
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Card 3: Responsável Legal */}
                                        {data?.guardian && (data.guardian.guardian_name || data.guardian.guardian_cpf) && (
                                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-850 shadow-sm space-y-3">
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Responsável Legal</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                    <DataRow icon={<User className="w-4 h-4" />} label="Nome" value={data.guardian.guardian_name} />
                                                    <DataRow icon={<CreditCard className="w-4 h-4" />} label="CPF" value={data.guardian.guardian_cpf} />
                                                    <DataRow icon={<FileText className="w-4 h-4" />} label="Parentesco" value={data.guardian.guardian_relationship} />
                                                    <DataRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={data.guardian.guardian_phone ? formatPhone(data.guardian.guardian_phone) : undefined} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Card 4: Queixa / Observações */}
                                        {data?.complaint && (
                                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-850 shadow-sm space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Queixa Principal / Motivo</p>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 pt-1">{data.complaint}</p>
                                            </div>
                                        )}

                                        {/* Card 5: LGPD e Conformidade */}
                                        {selectedSubmission.consent?.accepted && (
                                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">Consentimento LGPD aceito pelo titular</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        Registrado em {formatDateTime(selectedSubmission.consent.accepted_at)} • Termo v{selectedSubmission.consent.consent_version}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>

                        {/* =========================================
                            BARRA DE AÇÕES (FOOTER)
                        ========================================= */}
                        {isEditing ? (
                            /* Footer em modo de edição */
                            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex gap-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    disabled={actionLoading}
                                    className="flex-1 py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
                                    style={{ minHeight: '44px' }}
                                >
                                    <X className="w-4 h-4" />
                                    Cancelar edição
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={actionLoading}
                                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                    style={{ minHeight: '44px' }}
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salvar alterações
                                </button>
                            </div>
                        ) : selectedSubmission.status === 'pending' ? (
                            /* Footer em modo pendente */
                            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                                {/* Linha Principal: Aprovar e Editar */}
                                <div className="flex flex-col sm:flex-row gap-2.5">
                                    <button
                                        onClick={() => handleApprove(selectedSubmission.id)}
                                        disabled={actionLoading}
                                        className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50"
                                        style={{ minHeight: '44px' }}
                                    >
                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Aprovar e cadastrar paciente
                                    </button>
                                    
                                    <button
                                        onClick={handleStartEdit}
                                        className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-semibold transition-all"
                                        style={{ minHeight: '44px' }}
                                    >
                                        <Pencil className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                        Editar cadastro
                                    </button>
                                </div>

                                {/* Linha Secundária: Solicitar correção ao paciente, Cancelar e Excluir */}
                                <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                                    <button
                                        onClick={() => { setActionSubmissionId(selectedSubmission.id); setShowCorrectionModal(true) }}
                                        className="inline-flex items-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                        style={{ minHeight: '44px' }}
                                    >
                                        <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                                        Solicitar correção via WhatsApp
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => { setActionSubmissionId(selectedSubmission.id); setShowCancelModal(true) }}
                                            className="inline-flex items-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                            style={{ minHeight: '44px' }}
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Cancelar ficha
                                        </button>
                                        <button
                                            onClick={() => { setActionSubmissionId(selectedSubmission.id); setShowDeleteConfirm(true) }}
                                            className="inline-flex items-center gap-1.5 py-2 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                            style={{ minHeight: '44px' }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : selectedSubmission.status === 'cancelled' ? (
                            /* Footer em modo cancelado */
                            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex gap-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                                <button
                                    onClick={() => handleReopen(selectedSubmission.id)}
                                    disabled={actionLoading}
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    style={{ minHeight: '44px' }}
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reabrir ficha
                                </button>
                                <button
                                    onClick={() => { setActionSubmissionId(selectedSubmission.id); setShowDeleteConfirm(true) }}
                                    className="inline-flex items-center justify-center gap-2 py-3 px-4 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    style={{ minHeight: '44px' }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ) : selectedSubmission.status === 'approved' && selectedSubmission.approved_patient_id ? (
                            /* Footer em modo aprovado */
                            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Ficha aprovada e paciente integrado ao sistema
                                </div>
                                <a
                                    href={`/dashboard/pacientes/${selectedSubmission.approved_patient_id}`}
                                    className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                                    style={{ minHeight: '44px' }}
                                >
                                    Ver prontuário do paciente
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Correction Request
            ========================================= */}
            {showCorrectionModal && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowCorrectionModal(false)}>
                    <div
                        className="w-full sm:max-w-md bg-white dark:bg-slate-800 sm:rounded-xl rounded-t-xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Solicitar correção</h3>
                        <textarea
                            value={correctionNote}
                            onChange={e => setCorrectionNote(e.target.value)}
                            placeholder="Descreva o que precisa ser corrigido..."
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[6rem] resize-vertical"
                            style={{ fontSize: '16px' }}
                            rows={4}
                        />
                        {whatsappConnected && (
                            <label className="flex items-center gap-2.5 cursor-pointer" style={{ minHeight: '44px' }}>
                                <input
                                    type="checkbox"
                                    checked={correctionSendWA}
                                    onChange={e => setCorrectionSendWA(e.target.checked)}
                                    className="w-4 h-4 accent-emerald-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Notificar paciente via WhatsApp</span>
                            </label>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setShowCorrectionModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium" style={{ minHeight: '44px' }}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleCorrection}
                                disabled={!correctionNote.trim() || actionLoading}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                                style={{ minHeight: '44px' }}
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Cancel Reason
            ========================================= */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowCancelModal(false)}>
                    <div
                        className="w-full sm:max-w-md bg-white dark:bg-slate-800 sm:rounded-xl rounded-t-xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cancelar ficha</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Informe o motivo do cancelamento. A ficha poderá ser reaberta posteriormente.</p>
                        <textarea
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            placeholder="Motivo do cancelamento..."
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[4rem] resize-vertical"
                            style={{ fontSize: '16px' }}
                            rows={3}
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowCancelModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium" style={{ minHeight: '44px' }}>
                                Voltar
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={!cancelReason.trim() || actionLoading}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                style={{ minHeight: '44px' }}
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Confirmar cancelamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Delete Confirm
            ========================================= */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
                    <div
                        className="w-full sm:max-w-sm bg-white dark:bg-slate-800 sm:rounded-xl rounded-t-xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <div className="text-center">
                            <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Excluir ficha permanentemente?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Esta ação não pode ser desfeita. Todos os arquivos anexados também serão removidos.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium" style={{ minHeight: '44px' }}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                style={{ minHeight: '44px' }}
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: CPF Duplicate
            ========================================= */}
            {showDuplicateModal && duplicatePatient && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowDuplicateModal(false)}>
                    <div
                        className="w-full sm:max-w-md bg-white dark:bg-slate-800 sm:rounded-xl rounded-t-xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">CPF já cadastrado</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Já existe um paciente com este CPF. Deseja atualizar o cadastro existente?
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-1">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{duplicatePatient.full_name}</p>
                            <p className="text-xs text-slate-500">CPF: {duplicatePatient.cpf} — Tel: {formatPhone(duplicatePatient.phone)}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDuplicateModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium" style={{ minHeight: '44px' }}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleApproveUpdate}
                                disabled={actionLoading}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                style={{ minHeight: '44px' }}
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Atualizar cadastro
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Badge Styles (inline since Tailwind doesn't have these custom combos) */}
            <style>{`
                .intake-badge-yellow { background: #fef3c7; color: #92400e; }
                .intake-badge-orange { background: #ffedd5; color: #c2410c; }
                .intake-badge-green { background: #d1fae5; color: #065f46; }
                .intake-badge-red { background: #fee2e2; color: #991b1b; }
                .intake-badge-blue { background: #dbeafe; color: #1e40af; }
                .intake-badge-slate { background: #f1f5f9; color: #475569; }
                .dark .intake-badge-yellow { background: rgba(253, 230, 138, 0.15); color: #fbbf24; }
                .dark .intake-badge-orange { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
                .dark .intake-badge-green { background: rgba(52, 211, 153, 0.15); color: #34d399; }
                .dark .intake-badge-red { background: rgba(248, 113, 113, 0.15); color: #f87171; }
                .dark .intake-badge-blue { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
                .dark .intake-badge-slate { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }
            `}</style>
        </div>
    )
}

// ============================================
// Helper Component: DataRow
// ============================================

function DataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
    if (!value) return null
    return (
        <div className="flex items-start gap-2.5 py-1">
            <span className="text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0">{icon}</span>
            <div className="min-w-0">
                <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
                <p className="text-sm text-slate-800 dark:text-slate-200 break-words">{value}</p>
            </div>
        </div>
    )
}
