'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    ClipboardPen,
    Plus,
    Link as LinkIcon,
    Send,
    Copy,
    Check,
    Clock,
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
    User,
    Phone,
    Calendar,
    CreditCard,
    FileText,
    Heart,
    ExternalLink,
    Loader2,
    X,
    Save,
    Image as ImageIcon,
    ShieldCheck,
    Building2,
    Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso
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
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return iso
    }
}

function statusBadge(status: string): { label: string; className: string } {
    const map: Record<string, { label: string; className: string }> = {
        pending: { label: 'Pendente', className: 'bg-amber-50 text-amber-800 border-amber-200' },
        needs_correction: { label: 'Correção solicitada', className: 'bg-orange-50 text-orange-800 border-orange-200' },
        approved: { label: 'Aprovada', className: 'bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7]' },
        cancelled: { label: 'Cancelada', className: 'bg-red-50 text-red-700 border-red-200' },
        created: { label: 'Criado', className: 'bg-muted text-muted-foreground border-border' },
        sent: { label: 'Enviado', className: 'bg-sky-50 text-sky-800 border-sky-200' },
        opened: { label: 'Aberto', className: 'bg-sky-50 text-sky-800 border-sky-200' },
        submitted: { label: 'Preenchido', className: 'bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7]' },
        expired: { label: 'Expirado', className: 'bg-red-50 text-red-700 border-red-200' },
    }
    return map[status] || { label: status, className: 'bg-muted text-muted-foreground border-border' }
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
    const [linkSearchText, setLinkSearchText] = useState('')
    const [whatsappConnected, setWhatsappConnected] = useState(false)

    // Static link (carregado apenas por ação explícita para nunca invalidar QR Code impresso sem confirmação)
    const [staticLink, setStaticLink] = useState<IntakeLink | null>(null)
    const [staticLoading, setStaticLoading] = useState(false)
    const [showStaticRegenerateConfirm, setShowStaticRegenerateConfirm] = useState(false)

    // Modal
    const [selectedSubmission, setSelectedSubmission] = useState<IntakeSubmission | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    // Create link modal
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newLinkName, setNewLinkName] = useState('')
    const [newLinkPhone, setNewLinkPhone] = useState('')
    const [creatingLink, setCreatingLink] = useState(false)

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

    // Generated link inside modal
    const [generatedLinkData, setGeneratedLinkData] = useState<{
        url: string
        name: string
        phone: string
        whatsappSent: boolean
        whatsappStatus: string
    } | null>(null)
    const [showInstantQr, setShowInstantQr] = useState(false)

    // ============================================
    // Data Loading
    // ============================================

    const loadSubmissions = useCallback(async () => {
        setSubmissionsLoading(true)
        try {
            const params = statusFilter ? `?status=${statusFilter}` : ''
            const res = await fetch(`/api/intake/submissions${params}`)
            if (!res.ok) throw new Error('Erro ao carregar fichas')
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
            if (!res.ok) throw new Error('Erro ao carregar links')
            const data = await res.json()
            setLinks(data.links || [])
            setWhatsappConnected(data.whatsappConnected || false)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLinksLoading(false)
        }
    }, [])

    const generateOrRegenerateStaticLink = useCallback(async () => {
        setStaticLoading(true)
        try {
            const res = await fetch('/api/intake/static-link')
            if (!res.ok) throw new Error('Erro ao gerar link fixo')
            const data = await res.json()
            setStaticLink(data.link || null)
            setShowStaticRegenerateConfirm(false)
            toast.success('Link fixo e QR Code gerados com sucesso')
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
    }, [activeTab, loadLinks])

    // ============================================
    // Actions
    // ============================================

    const handleOpenCreateModal = () => {
        setNewLinkName('')
        setNewLinkPhone('')
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
            toast.success('Mensagem completa com link copiada')
        } catch {
            toast.error('Erro ao copiar mensagem')
        }
    }

    const handlePrintStaticQr = () => {
        if (!staticLink?.url) return
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(staticLink.url)}`
        const win = window.open('', '_blank', 'width=680,height=780')
        if (!win) {
            toast.error('Permita pop-ups para imprimir o cartaz com QR Code')
            return
        }
        win.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>QR Code de Pré-cadastro</title>
<style>
  body { font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; color: #0F1F1B; background: #FFFFFF; margin: 0; padding: 48px 32px; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
  .card { max-width: 440px; width: 100%; border: 1px solid #E6E8E5; border-radius: 16px; padding: 36px 28px; text-align: center; }
  h1 { font-size: 22px; margin: 0 0 8px; color: #155E4B; }
  p { font-size: 14px; color: #4B5B56; margin: 0 0 24px; line-height: 1.5; }
  img { width: 260px; height: 260px; border: 1px solid #E6E8E5; border-radius: 12px; padding: 12px; background: #fff; }
  .url { margin-top: 20px; font-size: 11px; color: #64748B; word-break: break-all; font-family: monospace; }
</style>
</head>
<body>
  <div class="card">
    <h1>Pré-cadastro Digital</h1>
    <p>Aponte a câmera do seu celular para o QR Code abaixo e preencha sua ficha com rapidez e segurança.</p>
    <img src="${qrSrc}" alt="QR Code de pré-cadastro" onload="window.print()" />
    <div class="url">${staticLink.url}</div>
  </div>
</body>
</html>`)
        win.document.close()
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
                    toast.success('Link enviado pelo WhatsApp oficial da clínica')
                } else {
                    await navigator.clipboard.writeText(linkUrl)
                    toast.info('WhatsApp do sistema desconectado. Link copiado e WhatsApp Web aberto.')
                    if (rawPhone) {
                        const webUrl = buildWhatsAppWebUrl(rawPhone, newLinkName, linkUrl)
                        window.open(webUrl, '_blank')
                    }
                }
            } else if (action === 'copy') {
                await navigator.clipboard.writeText(linkUrl)
                toast.success('Link copiado para a área de transferência')
            } else if (action === 'qr') {
                setShowInstantQr(true)
                toast.success('Link gerado. Aponte a câmera do celular para o QR Code.')
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
            if (!res.ok) throw new Error('Erro ao carregar ficha')
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
            setSelectedSubmission(prev => (prev ? { ...prev, edited_data: updatedData } : null))
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
        const phone = data?.phone || ''
        return name.includes(searchText.toLowerCase()) || phone.includes(searchText)
    })

    const filteredLinks = links.filter(link => {
        if (!linkSearchText) return true
        const q = linkSearchText.toLowerCase()
        const name = (link.lead_name || '').toLowerCase()
        const phone = link.lead_phone || ''
        return name.includes(q) || phone.includes(q)
    })

    const pendingCount = submissions.filter(s => s.status === 'pending').length

    const inputClass =
        'w-full px-3 py-2 text-sm bg-card border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary'

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="space-y-6">
            {/* Page Header Editorial 2027 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent border border-primary/15 flex items-center justify-center text-primary shrink-0">
                        <ClipboardPen className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                            Pré-cadastros
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Fichas de cadastro enviadas por pacientes via link seguro ou QR Code
                        </p>
                    </div>
                </div>
                <Button onClick={handleOpenCreateModal} className="min-h-[44px] px-4 text-sm">
                    <Plus className="w-4 h-4" />
                    Novo link
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border overflow-x-auto">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTab('submissions')}
                    className={`min-h-[44px] px-4 rounded-b-none border-b-2 transition-colors text-sm ${
                        activeTab === 'submissions'
                            ? 'border-primary text-primary bg-accent/40 font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Fichas recebidas
                    {pendingCount > 0 && (
                        <Badge variant="outline" className="ml-1.5 bg-amber-50 text-amber-800 border-amber-200 text-[11px] tabular-nums">
                            {pendingCount}
                        </Badge>
                    )}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTab('links')}
                    className={`min-h-[44px] px-4 rounded-b-none border-b-2 transition-colors text-sm ${
                        activeTab === 'links'
                            ? 'border-primary text-primary bg-accent/40 font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Links enviados
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTab('static')}
                    className={`min-h-[44px] px-4 rounded-b-none border-b-2 transition-colors text-sm ${
                        activeTab === 'static'
                            ? 'border-primary text-primary bg-accent/40 font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Link fixo / QR
                </Button>
            </div>

            {/* =========================================
                TAB: Submissions
            ========================================= */}
            {activeTab === 'submissions' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                placeholder="Buscar por nome ou telefone"
                                className="w-full min-h-[44px] pl-9 pr-3 py-2 border border-input rounded-md text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="min-h-[44px] px-3 py-2 border border-input rounded-md text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                            style={{ fontSize: '16px' }}
                        >
                            <option value="">Todos os status</option>
                            <option value="pending">Pendentes</option>
                            <option value="needs_correction">Correção solicitada</option>
                            <option value="approved">Aprovadas</option>
                            <option value="cancelled">Canceladas</option>
                        </select>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={loadSubmissions}
                            className="min-h-[44px] px-3.5 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Atualizar</span>
                        </Button>
                    </div>

                    {/* List */}
                    {submissionsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                            <ClipboardPen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                            <p className="font-medium text-foreground">Nenhuma ficha encontrada</p>
                            <p className="text-sm mt-1">Gere um link e envie ao paciente para receber fichas preenchidas.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredSubmissions.map(sub => {
                                const data = sub.edited_data || sub.original_data
                                const badge = statusBadge(sub.status)
                                return (
                                    <div
                                        key={sub.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => loadSubmissionDetail(sub.id)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                loadSubmissionDetail(sub.id)
                                            }
                                        }}
                                        className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border cursor-pointer hover:border-primary/40 hover:bg-accent/20 transition-colors min-h-[64px]"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-accent border border-primary/15 text-primary flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                                            {getInitials(data?.full_name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {data?.full_name || 'Sem nome'}
                                            </p>
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                {formatPhone(data?.phone)} · {formatDateTime(sub.created_at)}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className={`text-xs font-medium shrink-0 ${badge.className}`}>
                                            {badge.label}
                                        </Badge>
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
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={linkSearchText}
                                onChange={e => setLinkSearchText(e.target.value)}
                                placeholder="Buscar link por nome ou telefone"
                                className="w-full min-h-[44px] pl-9 pr-3 py-2 border border-input rounded-md text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={loadLinks}
                            className="min-h-[44px] px-3.5 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Atualizar</span>
                        </Button>
                    </div>

                    {linksLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    ) : filteredLinks.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                            <LinkIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                            <p className="font-medium text-foreground">Nenhum link encontrado</p>
                            <p className="text-sm mt-1">Clique em Novo link para gerar um endereço individual com validade de 72h.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {filteredLinks.map(link => {
                                const badge = statusBadge(link.status)
                                return (
                                    <div key={link.id} className="p-4 bg-card rounded-xl border border-border">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">
                                                    {link.lead_name || 'Link sem nome'}
                                                </p>
                                                <p className="text-xs text-muted-foreground tabular-nums">
                                                    {link.lead_phone ? formatPhone(link.lead_phone) : 'Sem telefone'}
                                                    {' · '}
                                                    {formatDateTime(link.created_at)}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className={`text-xs font-medium shrink-0 ${badge.className}`}>
                                                {badge.label}
                                            </Badge>
                                        </div>
                                        {link.expires_at && (
                                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 tabular-nums">
                                                <Clock className="w-3.5 h-3.5" />
                                                Expira em: {formatDateTime(link.expires_at)}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* =========================================
                TAB: Static Link / QR
            ========================================= */}
            {activeTab === 'static' && (
                <div className="space-y-4">
                    <div className="p-5 sm:p-6 bg-card rounded-xl border border-border space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent border border-primary/15 text-primary flex items-center justify-center shrink-0">
                                <QrCode className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-foreground">Link fixo e QR Code da recepção</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    Reutilizável para cartaz na recepção. Por segurança, um novo token só é gerado quando você confirma abaixo — assim um QR Code já impresso nunca é invalidado por acidente.
                                </p>
                            </div>
                        </div>

                        {staticLoading ? (
                            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                Gerando link fixo e QR Code...
                            </div>
                        ) : staticLink?.url ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-2">
                                <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-muted/30">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(staticLink.url)}`}
                                        alt="QR Code fixo de pré-cadastro"
                                        className="w-44 h-44 rounded-lg border border-border bg-white p-2"
                                    />
                                    <span className="text-[11px] text-muted-foreground mt-2 text-center">
                                        Aponte a câmera do celular para testar
                                    </span>
                                </div>

                                <div className="md:col-span-8 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={staticLink.url}
                                            className="flex-1 min-h-[44px] px-3 py-2 bg-muted/40 border border-input rounded-md text-xs text-foreground font-mono"
                                            style={{ fontSize: '16px' }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => copyToClipboard(staticLink.url!, 'static')}
                                            className="min-h-[44px] px-3.5"
                                            title="Copiar link"
                                        >
                                            {copiedId === 'static' ? (
                                                <>
                                                    <Check className="w-4 h-4 text-primary" />
                                                    Copiado
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4" />
                                                    Copiar
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            onClick={handlePrintStaticQr}
                                            className="min-h-[44px]"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Imprimir cartaz com QR Code
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            asChild
                                            className="min-h-[44px]"
                                        >
                                            <a href={staticLink.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4" />
                                                Abrir formulário
                                            </a>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setShowStaticRegenerateConfirm(true)}
                                            className="min-h-[44px] text-muted-foreground hover:text-destructive"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Regenerar link (invalida o anterior)
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5 text-amber-900">
                                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                    <p className="text-xs sm:text-sm leading-relaxed">
                                        Gerar um novo link fixo substitui e invalida qualquer QR Code anterior já impresso na recepção. Clique somente quando quiser emitir ou trocar o cartaz.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => setShowStaticRegenerateConfirm(true)}
                                    className="min-h-[44px] shrink-0"
                                >
                                    <QrCode className="w-4 h-4" />
                                    Gerar link fixo e QR Code
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Confirm Static Link Generation
            ========================================= */}
            {showStaticRegenerateConfirm && (
                <div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4"
                    onClick={() => setShowStaticRegenerateConfirm(false)}
                >
                    <div
                        className="w-full sm:max-w-md bg-card rounded-xl border border-border p-6 space-y-4 shadow-xl"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-foreground">
                                    Emitir novo link fixo e QR Code?
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Se sua recepção já possui um QR Code impresso anteriormente, ele deixará de funcionar e precisará ser substituído pelo novo.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2.5 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowStaticRegenerateConfirm(false)}
                                disabled={staticLoading}
                                className="flex-1 min-h-[44px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={generateOrRegenerateStaticLink}
                                disabled={staticLoading}
                                className="flex-1 min-h-[44px]"
                            >
                                {staticLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                                Confirmar e gerar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Create Link
            ========================================= */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div
                        className="w-full sm:max-w-md bg-card rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xl border border-border max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-accent border border-primary/15 text-primary flex items-center justify-center">
                                    <LinkIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-foreground">
                                        Novo link de pré-cadastro
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Envio direto, WhatsApp Web, cópia ou QR Code
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowCreateModal(false)}
                                className="min-w-[40px] min-h-[40px]"
                                title="Fechar"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Status WhatsApp */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs">
                            <span className="text-muted-foreground font-medium">WhatsApp integrado:</span>
                            {whatsappConnected ? (
                                <span className="inline-flex items-center gap-1.5 text-primary font-semibold">
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                    Conectado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    Desconectado (abre WhatsApp Web)
                                </span>
                            )}
                        </div>

                        {/* Campos */}
                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-xs font-medium text-foreground mb-1">
                                    Nome do paciente (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={newLinkName}
                                    onChange={e => {
                                        setNewLinkName(e.target.value)
                                        setGeneratedLinkData(null)
                                    }}
                                    placeholder="Ex: Maria Clara Souza"
                                    className={inputClass}
                                    style={{ fontSize: '16px' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-foreground mb-1">
                                    Telefone / WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    value={newLinkPhone}
                                    onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                                        let fmt = digits
                                        if (digits.length > 10) fmt = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
                                        else if (digits.length > 6) fmt = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
                                        else if (digits.length > 2) fmt = `(${digits.slice(0, 2)}) ${digits.slice(2)}`
                                        setNewLinkPhone(fmt)
                                        setGeneratedLinkData(null)
                                    }}
                                    placeholder="(00) 00000-0000"
                                    maxLength={15}
                                    className={`${inputClass} font-mono`}
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                        </div>

                        {/* Bloco de Link Gerado */}
                        {generatedLinkData ? (
                            <div className="space-y-2.5 p-3 rounded-lg bg-muted/40 border border-border text-xs">
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        readOnly
                                        value={generatedLinkData.url}
                                        className="flex-1 px-2.5 py-2 bg-card border border-input rounded-md text-xs font-mono text-foreground truncate"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedLinkData.url)
                                            toast.success('Link copiado')
                                        }}
                                        title="Copiar link"
                                    >
                                        Copiar
                                    </Button>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyCompleteMessage(generatedLinkData.name, generatedLinkData.phone, generatedLinkData.url)}
                                        className="flex-1"
                                    >
                                        Copiar mensagem pronta
                                    </Button>

                                    {generatedLinkData.phone && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            asChild
                                            className="flex-1 text-primary"
                                        >
                                            <a
                                                href={buildWhatsAppWebUrl(generatedLinkData.phone, generatedLinkData.name, generatedLinkData.url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                WhatsApp Web
                                            </a>
                                        </Button>
                                    )}
                                </div>

                                {showInstantQr && (
                                    <div className="pt-2 flex flex-col items-center justify-center text-center">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(generatedLinkData.url)}`}
                                            alt="QR Code"
                                            className="w-32 h-32 border border-border rounded-lg p-1.5 bg-white"
                                        />
                                        <p className="text-[11px] text-muted-foreground mt-1.5">
                                            Aponte a câmera para preencher no balcão
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Botões de Ação */}
                        <div className="space-y-2 pt-2 border-t border-border">
                            <Button
                                type="button"
                                onClick={() => handleGenerateAndSend('whatsapp')}
                                disabled={creatingLink}
                                className="w-full min-h-[44px] text-sm"
                            >
                                {creatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                                Enviar por WhatsApp
                            </Button>

                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleGenerateAndSend('copy')}
                                    disabled={creatingLink}
                                    className="min-h-[40px]"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copiar link
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleGenerateAndSend('qr')}
                                    disabled={creatingLink}
                                    className="min-h-[40px]"
                                >
                                    <QrCode className="w-3.5 h-3.5" />
                                    QR Code
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={creatingLink}
                                    className="min-h-[40px]"
                                >
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Submission Detail
            ========================================= */}
            {selectedSubmission && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
                    onClick={() => {
                        setSelectedSubmission(null)
                        setIsEditing(false)
                    }}
                >
                    <div
                        className="w-full sm:max-w-lg bg-card sm:rounded-xl rounded-t-xl overflow-hidden max-h-[90dvh] flex flex-col border border-border shadow-xl"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        {/* Detail Header */}
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/30">
                            {(() => {
                                const data = selectedSubmission.edited_data || selectedSubmission.original_data
                                return (
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-xl bg-accent border border-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                            {getInitials(data?.full_name)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                                                    {isEditing ? 'Editar cadastro' : data?.full_name || 'Ficha cadastral'}
                                                </h3>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs font-medium ${statusBadge(selectedSubmission.status).className}`}
                                                >
                                                    {statusBadge(selectedSubmission.status).label}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate tabular-nums">
                                                Protocolo #{selectedSubmission.id.slice(0, 8)} · Recebida em {formatDateTime(selectedSubmission.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })()}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setSelectedSubmission(null)
                                    setIsEditing(false)
                                }}
                                className="min-w-[44px] min-h-[44px] shrink-0"
                                title="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Banners de status/alerta */}
                        {(() => {
                            const data = selectedSubmission.edited_data || selectedSubmission.original_data
                            const isDobInvalid = data?.date_of_birth && formatDate(data.date_of_birth) === 'Necessita ajuste'
                            if (isEditing) {
                                return (
                                    <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-accent/60 border border-primary/20 flex items-center gap-2.5 text-primary">
                                        <Pencil className="w-4 h-4 shrink-0" />
                                        <p className="text-xs font-medium">
                                            Modo de edição: corrija qualquer dado antes de aprovar e cadastrar o paciente.
                                        </p>
                                    </div>
                                )
                            }
                            if (selectedSubmission.status === 'needs_correction' && selectedSubmission.correction_note) {
                                return (
                                    <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2.5 text-orange-900">
                                        <AlertCircle className="w-4 h-4 text-orange-700 shrink-0 mt-0.5" />
                                        <div className="text-xs">
                                            <p className="font-semibold">Correção solicitada ao paciente:</p>
                                            <p className="mt-0.5">{selectedSubmission.correction_note}</p>
                                        </div>
                                    </div>
                                )
                            }
                            if (isDobInvalid && (selectedSubmission.status === 'pending' || selectedSubmission.status === 'needs_correction')) {
                                return (
                                    <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                                            <p className="text-xs font-medium">Data de nascimento precisa de ajuste antes da aprovação.</p>
                                        </div>
                                        <Button type="button" size="sm" onClick={handleStartEdit}>
                                            Corrigir agora
                                        </Button>
                                    </div>
                                )
                            }
                            return null
                        })()}

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                            {detailLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            ) : isEditing ? (
                                /* FORMULÁRIO DE EDIÇÃO INLINE */
                                <div className="space-y-4">
                                    <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Identificação do Paciente
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-foreground mb-1">Nome Completo *</label>
                                                <input
                                                    type="text"
                                                    value={editData.full_name || ''}
                                                    onChange={e => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                                                    className={inputClass}
                                                    placeholder="Nome completo do paciente"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">Data de Nascimento (DD/MM/AAAA)</label>
                                                <input
                                                    type="text"
                                                    value={editData.date_of_birth || ''}
                                                    onChange={e => handleDobInput(e.target.value)}
                                                    maxLength={10}
                                                    className={`${inputClass} font-mono`}
                                                    placeholder="Ex: 15/05/1990"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">CPF</label>
                                                <input
                                                    type="text"
                                                    value={editData.cpf || ''}
                                                    onChange={e => handleCpfInput(e.target.value)}
                                                    maxLength={14}
                                                    className={`${inputClass} font-mono`}
                                                    placeholder="000.000.000-00"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">Telefone / WhatsApp</label>
                                                <input
                                                    type="text"
                                                    value={editData.phone || ''}
                                                    onChange={e => handlePhoneInput(e.target.value)}
                                                    maxLength={15}
                                                    className={`${inputClass} font-mono`}
                                                    placeholder="(00) 00000-0000"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">E-mail</label>
                                                <input
                                                    type="email"
                                                    value={editData.email || ''}
                                                    onChange={e => setEditData(prev => ({ ...prev, email: e.target.value }))}
                                                    className={inputClass}
                                                    placeholder="paciente@email.com"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-foreground mb-1.5">Modalidade de Atendimento</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={editData.billing_type === 'particular' ? 'default' : 'outline'}
                                                        onClick={() => setEditData(prev => ({ ...prev, billing_type: 'particular' }))}
                                                        className="min-h-[40px]"
                                                    >
                                                        Particular
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={editData.billing_type === 'convenio' ? 'default' : 'outline'}
                                                        onClick={() => setEditData(prev => ({ ...prev, billing_type: 'convenio' }))}
                                                        className="min-h-[40px]"
                                                    >
                                                        Convênio / Plano
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {editData.billing_type === 'convenio' && (
                                        <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Convênio</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-foreground mb-1">Operadora / Plano</label>
                                                    <input
                                                        type="text"
                                                        value={editData.insurance_plan_name || ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, insurance_plan_name: e.target.value }))}
                                                        className={inputClass}
                                                        placeholder="Ex: Unimed, Bradesco Saúde"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-foreground mb-1">Número da Carteirinha</label>
                                                    <input
                                                        type="text"
                                                        value={editData.insurance_card_number || ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, insurance_card_number: e.target.value }))}
                                                        className={`${inputClass} font-mono`}
                                                        placeholder="Número na carteirinha"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-foreground mb-1">Validade</label>
                                                    <input
                                                        type="text"
                                                        value={editData.insurance_validity || ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, insurance_validity: e.target.value }))}
                                                        className={inputClass}
                                                        placeholder="Ex: 12/2027"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Responsável Legal (se aplicável)</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-foreground mb-1">Nome do Responsável</label>
                                                <input
                                                    type="text"
                                                    value={editData.guardian_name || ''}
                                                    onChange={e => setEditData(prev => ({ ...prev, guardian_name: e.target.value }))}
                                                    className={inputClass}
                                                    placeholder="Nome do responsável pelo paciente"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">CPF do Responsável</label>
                                                <input
                                                    type="text"
                                                    value={editData.guardian_cpf || ''}
                                                    onChange={e => {
                                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                                                        let fmt = digits
                                                        if (digits.length > 9) fmt = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
                                                        else if (digits.length > 6) fmt = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
                                                        else if (digits.length > 3) fmt = `${digits.slice(0, 3)}.${digits.slice(3)}`
                                                        setEditData(prev => ({ ...prev, guardian_cpf: fmt }))
                                                    }}
                                                    maxLength={14}
                                                    className={`${inputClass} font-mono`}
                                                    placeholder="000.000.000-00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">Parentesco</label>
                                                <input
                                                    type="text"
                                                    value={editData.guardian_relationship || ''}
                                                    onChange={e => setEditData(prev => ({ ...prev, guardian_relationship: e.target.value }))}
                                                    className={inputClass}
                                                    placeholder="Ex: Mãe, Pai, Cônjuge"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-foreground mb-1">Telefone do Responsável</label>
                                                <input
                                                    type="text"
                                                    value={editData.guardian_phone || ''}
                                                    onChange={e => {
                                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                                                        let fmt = digits
                                                        if (digits.length > 10) fmt = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
                                                        else if (digits.length > 6) fmt = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
                                                        else if (digits.length > 2) fmt = `(${digits.slice(0, 2)}) ${digits.slice(2)}`
                                                        setEditData(prev => ({ ...prev, guardian_phone: fmt }))
                                                    }}
                                                    maxLength={15}
                                                    className={`${inputClass} font-mono`}
                                                    placeholder="(00) 00000-0000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-2">
                                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Queixa Principal / Motivo
                                        </label>
                                        <textarea
                                            value={editData.complaint || ''}
                                            onChange={e => setEditData(prev => ({ ...prev, complaint: e.target.value }))}
                                            rows={2}
                                            className={inputClass}
                                            placeholder="Informações fornecidas pelo paciente"
                                        />
                                    </div>
                                </div>
                            ) : (() => {
                                /* MODO LEITURA EDITORIAL */
                                const data = selectedSubmission.edited_data || selectedSubmission.original_data
                                const dobFormatted = data?.date_of_birth ? formatDate(data.date_of_birth) : undefined
                                const isDobInvalid = dobFormatted === 'Necessita ajuste'

                                return (
                                    <>
                                        {/* Card 1: Dados do Paciente */}
                                        <div className="border border-border rounded-xl p-4 bg-card space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                    Dados Pessoais e Contato
                                                </p>
                                                {selectedSubmission.edited_data && (
                                                    <Badge variant="outline" className="text-[11px] bg-accent text-primary border-primary/20">
                                                        Editado pela recepção
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                <div className="flex items-start gap-2.5">
                                                    <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">Nome completo</p>
                                                        <p className="text-sm font-medium text-foreground break-words">{data?.full_name || '---'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">Nascimento</p>
                                                        {isDobInvalid ? (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200 gap-1">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Necessita ajuste
                                                                </Badge>
                                                                <Button
                                                                    type="button"
                                                                    variant="link"
                                                                    size="sm"
                                                                    onClick={handleStartEdit}
                                                                    className="h-auto p-0 text-xs"
                                                                >
                                                                    Editar
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm font-medium text-foreground">{dobFormatted || 'Não informada'}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <CreditCard className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">CPF</p>
                                                        <p className="text-sm font-medium text-foreground font-mono">
                                                            {data?.cpf ? data.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Não informado'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <Phone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">Telefone</p>
                                                        <p className="text-sm font-medium text-foreground font-mono">
                                                            {data?.phone ? formatPhone(data.phone) : 'Não informado'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">E-mail</p>
                                                        <p className="text-sm font-medium text-foreground break-words">{data?.email || 'Não informado'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2.5">
                                                    <Heart className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">Modalidade</p>
                                                        <Badge
                                                            variant="outline"
                                                            className={`mt-0.5 text-xs ${
                                                                data?.billing_type === 'convenio'
                                                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                                                    : 'bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7]'
                                                            }`}
                                                        >
                                                            {data?.billing_type === 'convenio' ? 'Convênio' : 'Particular'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: Convênio & Documentos */}
                                        {data?.billing_type === 'convenio' && data?.insurance && (
                                            <div className="border border-border rounded-xl p-4 bg-card space-y-3">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Convênio Médico</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                    <DataRow icon={<Building2 className="w-4 h-4" />} label="Operadora / Plano" value={data.insurance.insurance_plan_name || 'Não informado'} />
                                                    <DataRow icon={<CreditCard className="w-4 h-4" />} label="Carteirinha" value={data.insurance.insurance_card_number || 'Não informado'} />
                                                    <DataRow icon={<Calendar className="w-4 h-4" />} label="Validade" value={data.insurance.insurance_validity || 'Não informada'} />
                                                </div>

                                                {selectedSubmission.patient_intake_files && selectedSubmission.patient_intake_files.length > 0 && (
                                                    <div className="pt-2 border-t border-border">
                                                        <p className="text-xs font-medium text-muted-foreground mb-2">Comprovante / Carteirinha</p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {selectedSubmission.patient_intake_files.map(file => (
                                                                <div key={file.id} className="group relative border border-border rounded-xl overflow-hidden bg-muted/30">
                                                                    {file.signed_url && file.mime.startsWith('image/') ? (
                                                                        <a href={file.signed_url} target="_blank" rel="noopener noreferrer" className="block">
                                                                            <img
                                                                                src={file.signed_url}
                                                                                alt={file.kind}
                                                                                className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-200"
                                                                            />
                                                                        </a>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center aspect-[4/3] bg-muted">
                                                                            <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                                                                        </div>
                                                                    )}
                                                                    <div className="px-3 py-1.5 bg-card border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                                                                        <span className="font-medium text-foreground">
                                                                            {file.kind === 'carteirinha_frente' ? 'Frente' : 'Verso'}
                                                                        </span>
                                                                        {file.signed_url && (
                                                                            <a
                                                                                href={file.signed_url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                                                                            >
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
                                            <div className="border border-border rounded-xl p-4 bg-card space-y-3">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Responsável Legal</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                    <DataRow icon={<User className="w-4 h-4" />} label="Nome" value={data.guardian.guardian_name} />
                                                    <DataRow icon={<CreditCard className="w-4 h-4" />} label="CPF" value={data.guardian.guardian_cpf} />
                                                    <DataRow icon={<FileText className="w-4 h-4" />} label="Parentesco" value={data.guardian.guardian_relationship} />
                                                    <DataRow
                                                        icon={<Phone className="w-4 h-4" />}
                                                        label="Telefone"
                                                        value={data.guardian.guardian_phone ? formatPhone(data.guardian.guardian_phone) : undefined}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Card 4: Queixa */}
                                        {data?.complaint && (
                                            <div className="border border-border rounded-xl p-4 bg-card space-y-1">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Queixa Principal / Motivo</p>
                                                <p className="text-sm text-foreground pt-1">{data.complaint}</p>
                                            </div>
                                        )}

                                        {/* Card 5: LGPD */}
                                        {selectedSubmission.consent?.accepted && (
                                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center gap-3">
                                                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-foreground">Consentimento LGPD aceito pelo titular</p>
                                                    <p className="text-[11px] text-muted-foreground tabular-nums">
                                                        Registrado em {formatDateTime(selectedSubmission.consent.accepted_at)} · Termo v{selectedSubmission.consent.consent_version}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>

                        {/* BARRA DE AÇÕES (FOOTER) */}
                        {isEditing ? (
                            <div
                                className="p-4 sm:p-5 border-t border-border bg-muted/30 flex gap-3"
                                style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
                            >
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditing(false)}
                                    disabled={actionLoading}
                                    className="flex-1 min-h-[44px] text-sm"
                                >
                                    <X className="w-4 h-4" />
                                    Cancelar edição
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    disabled={actionLoading}
                                    className="flex-1 min-h-[44px] text-sm"
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salvar alterações
                                </Button>
                            </div>
                        ) : selectedSubmission.status === 'pending' || selectedSubmission.status === 'needs_correction' ? (
                            <div
                                className="p-4 sm:p-5 border-t border-border bg-muted/30 space-y-3"
                                style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
                            >
                                <div className="flex flex-col sm:flex-row gap-2.5">
                                    <Button
                                        type="button"
                                        onClick={() => handleApprove(selectedSubmission.id)}
                                        disabled={actionLoading}
                                        className="flex-1 min-h-[44px] text-sm"
                                    >
                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Aprovar e cadastrar paciente
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleStartEdit}
                                        className="min-h-[44px] text-sm"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Editar cadastro
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setActionSubmissionId(selectedSubmission.id)
                                            setShowCorrectionModal(true)
                                        }}
                                        className="min-h-[40px] text-muted-foreground hover:text-foreground"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        Solicitar correção via WhatsApp
                                    </Button>

                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setActionSubmissionId(selectedSubmission.id)
                                                setShowCancelModal(true)
                                            }}
                                            className="min-h-[40px] text-muted-foreground hover:text-foreground"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Cancelar ficha
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setActionSubmissionId(selectedSubmission.id)
                                                setShowDeleteConfirm(true)
                                            }}
                                            className="min-h-[40px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Excluir
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : selectedSubmission.status === 'cancelled' ? (
                            <div
                                className="p-4 sm:p-5 border-t border-border bg-muted/30 flex gap-2.5"
                                style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
                            >
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleReopen(selectedSubmission.id)}
                                    disabled={actionLoading}
                                    className="flex-1 min-h-[44px] text-sm"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reabrir ficha
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => {
                                        setActionSubmissionId(selectedSubmission.id)
                                        setShowDeleteConfirm(true)
                                    }}
                                    className="min-h-[44px] px-4"
                                    title="Excluir permanentemente"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : selectedSubmission.status === 'approved' && selectedSubmission.approved_patient_id ? (
                            <div
                                className="p-4 sm:p-5 border-t border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
                            >
                                <div className="flex items-center gap-2 text-primary text-xs font-medium">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    Ficha aprovada e paciente cadastrado no sistema
                                </div>
                                <Button type="button" size="sm" asChild className="min-h-[40px]">
                                    <Link href={`/dashboard/pacientes/${selectedSubmission.approved_patient_id}`}>
                                        Abrir ficha do paciente
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Correction Request
            ========================================= */}
            {showCorrectionModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4"
                    onClick={() => setShowCorrectionModal(false)}
                >
                    <div
                        className="w-full sm:max-w-md bg-card rounded-xl border border-border p-6 space-y-4 shadow-xl"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <h3 className="text-lg font-semibold text-foreground">Solicitar correção</h3>
                        <textarea
                            value={correctionNote}
                            onChange={e => setCorrectionNote(e.target.value)}
                            placeholder="Descreva o que precisa ser corrigido..."
                            className={`${inputClass} min-h-[6rem]`}
                            style={{ fontSize: '16px' }}
                            rows={4}
                        />
                        {whatsappConnected && (
                            <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
                                <input
                                    type="checkbox"
                                    checked={correctionSendWA}
                                    onChange={e => setCorrectionSendWA(e.target.checked)}
                                    className="w-4 h-4 accent-[#155E4B]"
                                />
                                <span className="text-sm text-foreground">Notificar paciente via WhatsApp</span>
                            </label>
                        )}
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCorrectionModal(false)}
                                className="flex-1 min-h-[44px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={handleCorrection}
                                disabled={!correctionNote.trim() || actionLoading}
                                className="flex-1 min-h-[44px]"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Enviar solicitação
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Cancel Reason
            ========================================= */}
            {showCancelModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4"
                    onClick={() => setShowCancelModal(false)}
                >
                    <div
                        className="w-full sm:max-w-md bg-card rounded-xl border border-border p-6 space-y-4 shadow-xl"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <h3 className="text-lg font-semibold text-foreground">Cancelar ficha</h3>
                        <p className="text-sm text-muted-foreground">
                            Informe o motivo do cancelamento. A ficha poderá ser reaberta posteriormente.
                        </p>
                        <textarea
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            placeholder="Motivo do cancelamento..."
                            className={`${inputClass} min-h-[4rem]`}
                            style={{ fontSize: '16px' }}
                            rows={3}
                        />
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 min-h-[44px]"
                            >
                                Voltar
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleCancel}
                                disabled={!cancelReason.trim() || actionLoading}
                                className="flex-1 min-h-[44px]"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Confirmar cancelamento
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: Delete Confirm
            ========================================= */}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <div
                        className="w-full sm:max-w-sm bg-card rounded-xl border border-border p-6 space-y-4 shadow-xl"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <div className="text-center">
                            <Trash2 className="w-10 h-10 text-destructive mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-foreground">Excluir ficha permanentemente?</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Esta ação não pode ser desfeita. Todos os arquivos anexados também serão removidos.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 min-h-[44px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="flex-1 min-h-[44px]"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Excluir
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                MODAL: CPF Duplicate
            ========================================= */}
            {showDuplicateModal && duplicatePatient && (
                <div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4"
                    onClick={() => setShowDuplicateModal(false)}
                >
                    <div
                        className="w-full sm:max-w-md bg-card rounded-xl border border-border p-6 space-y-4 shadow-xl"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">CPF já cadastrado</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Já existe um paciente com este CPF. Deseja atualizar o cadastro existente?
                            </p>
                        </div>
                        <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-1">
                            <p className="text-sm font-medium text-foreground">{duplicatePatient.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                                CPF: {duplicatePatient.cpf} · Tel: {formatPhone(duplicatePatient.phone)}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowDuplicateModal(false)}
                                className="flex-1 min-h-[44px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={handleApproveUpdate}
                                disabled={actionLoading}
                                className="flex-1 min-h-[44px]"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Atualizar cadastro
                            </Button>
                        </div>
                    </div>
                </div>
            )}
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
            <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm text-foreground break-words">{value}</p>
            </div>
        </div>
    )
}
