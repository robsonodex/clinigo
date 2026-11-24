'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Users, Clock, CheckCircle2, QrCode, User, UserX, Settings, FileText,
    Megaphone, Loader2, Tv, Monitor, Undo2, Plus, CheckCircle, Cake, Camera, ArrowLeftRight, AlertTriangle, ShieldCheck,
    Copy, Check, ExternalLink, RefreshCw, Search, X, SlidersHorizontal, LayoutGrid
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DEFAULT_RECEPTION_VISIBLE_MODULES,
    RECEPTION_MODULE_OPTIONS,
    type ReceptionModuleKey,
    type ReceptionVisibleModules,
    countVisibleReceptionModules,
    getReceptionModulesGridClass,
    getReceptionModulesStorageKey,
    normalizeReceptionModules,
} from '@/lib/utils/reception-modules'
import {
    getDefaultClinicalModulesForClinic,
    type ReceptionFlowMode,
} from '@/lib/utils/clinic-clinical-modules'
import PatientSelector from '@/components/prontuarios/patient-selector'
import { QuickPatientForm } from '@/components/appointments/QuickPatientForm'
import { QRCodeSVG } from 'qrcode.react'
import { QRScannerDialog } from '@/components/reception/qr-scanner-dialog'
import { CheckinDocumentsModal } from './components/checkin-documents-modal'
import { BirthdayWidget } from '@/components/dashboard/BirthdayWidget'
import { useUser } from '@/hooks/use-user'
import { TerminalEscalationAlert } from '@/components/reception/TerminalEscalationAlert'
import { hasFeature } from '@/lib/constants/plan-features'
import { type PlanType } from '@/lib/constants/plans'
import { createClient } from '@/lib/supabase/client'

interface QueueItem {
    id: string
    type: 'appointment' | 'walk-in'
    patient: {
        id: string
        full_name: string
        birth_date?: string
        gender?: string
    }
    doctor?: {
        id?: string
        user: {
            name?: string
            full_name?: string
        }
    }
    arrivalTime: string
    scheduledTime?: string
    isPriority: boolean
    status: string
    notes?: string
    checkedInAt?: string
    calledAt?: string
    consulting_room_id?: string
    payment_type?: string
    insurance_info?: {
        card_number?: string | null
        card_validity?: string | null
        card_expired?: boolean
        authorization_number?: string | null
        authorization_expires_at?: string | null
        authorization_expired?: boolean
        sessions_authorized?: number
        sessions_used?: number
        sessions_remaining?: number
        no_balance?: boolean
        insurance_name?: string | null
    } | null
}

interface ConsultingRoom {
    id: string
    name: string
    display_name: string | null
    room_number: number
    doctor_id: string | null
    doctor?: { id: string; user: { full_name: string }; specialty: string }
}

interface Stats {
    waiting_count: number
    in_service_count: number
    completed_count: number
    no_show_count: number
}

const getTimeWaiting = (arrivalTime: string | Date) => {
    const start = new Date(arrivalTime).getTime()
    const now = new Date().getTime()
    const diffInMinutes = Math.floor((now - start) / 60000)

    if (diffInMinutes < 60) {
        return `${diffInMinutes} min`
    }
    const hours = Math.floor(diffInMinutes / 60)
    const mins = diffInMinutes % 60
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
}

export default function RecepcaoPage() {
    const { toast } = useToast()
    const { user: currentUser } = useUser()
    const [queue, setQueue] = useState<QueueItem[]>([])
    const [stats, setStats] = useState<Stats>({
        waiting_count: 0,
        in_service_count: 0,
        completed_count: 0,
        no_show_count: 0
    })
    const [loading, setLoading] = useState(true)
    const [manualRefreshing, setManualRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [copiedLinkType, setCopiedLinkType] = useState<'tv' | 'totem' | null>(null)
    const [visibleModules, setVisibleModules] = useState<ReceptionVisibleModules>({
        ...DEFAULT_RECEPTION_VISIBLE_MODULES,
    })
    const [savingModules, setSavingModules] = useState(false)
    const [showWalkInDialog, setShowWalkInDialog] = useState(false)
    const [showBirthdaysModal, setShowBirthdaysModal] = useState(false)
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
    const [urgency, setUrgency] = useState<string>('normal')
    const [reason, setReason] = useState('')
    const [refreshInterval, setRefreshInterval] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('reception-refresh-interval')
            return saved ? Math.max(Number(saved), 120) : 300
        }
        return 300
    })

    const [isCreatingPatient, setIsCreatingPatient] = useState(false)
    const [isSubmittingPatient, setIsSubmittingPatient] = useState(false)
    const [createdWalkIn, setCreatedWalkIn] = useState<any>(null)
    const [documentsModalOpen, setDocumentsModalOpen] = useState(false)
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
    const [selectedPatientName, setSelectedPatientName] = useState<string>('')
    const [callingId, setCallingId] = useState<string | null>(null)
    const [actionId, setActionId] = useState<string | null>(null)
    const [consultingRooms, setConsultingRooms] = useState<ConsultingRoom[]>([])
    const consultingRoomsRef = useRef<ConsultingRoom[]>([])
    consultingRoomsRef.current = consultingRooms
    const roomsFetchedOnceRef = useRef(false)
    const [showNoShowList, setShowNoShowList] = useState(false)
    const [clinicPlanType, setClinicPlanType] = useState<PlanType>('BASICO')
    const [isPlanLoading, setIsPlanLoading] = useState(true)

    // Fluxo configurável da recepção: 'full_4_steps' (padrão com TV) ou 'fast_2_steps' (Check-in -> Concluído)
    const [receptionFlowMode, setReceptionFlowMode] = useState<ReceptionFlowMode>('full_4_steps')
    const isEspacoIncluir = receptionFlowMode === 'fast_2_steps'

    useEffect(() => {
        const clinicId = currentUser?.clinic_id
        if (!clinicId) return
        setReceptionFlowMode(getDefaultClinicalModulesForClinic(clinicId).receptionFlowMode)

        let cancelled = false
        async function fetchReceptionFlowMode() {
            try {
                const res = await fetch('/api/clinics/clinical-modules', { cache: 'no-store' })
                if (!res.ok || cancelled) return
                const data = await res.json()
                const mode = data?.modules?.receptionFlowMode
                if (mode === 'fast_2_steps' || mode === 'full_4_steps') {
                    setReceptionFlowMode(mode)
                }
            } catch { /* silent */ }
        }
        fetchReceptionFlowMode()
        return () => {
            cancelled = true
        }
    }, [currentUser?.clinic_id])

    // Configuração do Painel de TV (default true para todas as clínicas; exceções configuradas no banco)
    const [chamadaPainelTvHabilitada, setChamadaPainelTvHabilitada] = useState(true)
    const [tvRecallMinutes, setTvRecallMinutes] = useState<number>(5)
    const [checkInModal, setCheckInModal] = useState<{ open: boolean, appointmentId: string | null, notes: string }>({ open: false, appointmentId: null, notes: '' })
    const [noShowModal, setNoShowModal] = useState<{ open: boolean, appointmentId: string | null, patientName: string, notes: string }>({ open: false, appointmentId: null, patientName: '', notes: '' })

    const autoRecalledIdsRef = useRef<Set<string>>(new Set())
    const queueRef = useRef<QueueItem[]>(queue)
    queueRef.current = queue
    const handleCallPatientRef = useRef(handleCallPatient)
    handleCallPatientRef.current = handleCallPatient

    useEffect(() => {
        loadData()
        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) return
            loadData(true)
        }, Math.max(refreshInterval, 180) * 1000)
        return () => clearInterval(interval)
    }, [refreshInterval])

    useEffect(() => {
        async function fetchPlanType() {
            try {
                const res = await fetch('/api/setup/status')
                if (res.ok) {
                    const data = await res.json()
                    if (data.planType) setClinicPlanType(data.planType as PlanType)
                    if (data.chamadaPainelTvHabilitada !== undefined) {
                        setChamadaPainelTvHabilitada(Boolean(data.chamadaPainelTvHabilitada))
                    }
                }
            } catch { /* silent */ } finally {
                setIsPlanLoading(false)
            }

            try {
                const tvRes = await fetch('/api/clinics/tv-settings')
                if (tvRes.ok) {
                    const tvData = await tvRes.json()
                    if (tvData.tvRecallMinutes !== undefined) {
                        setTvRecallMinutes(Number(tvData.tvRecallMinutes))
                    }
                }
            } catch { /* silent */ }
        }
        fetchPlanType()
    }, [])

    // Escalonamento por ausência de check-in / início de atendimento (Prioridade 4)
    useEffect(() => {
        if (!tvRecallMinutes || tvRecallMinutes <= 0) return

        const checkEscalation = () => {
            const now = Date.now()
            const thresholdMs = tvRecallMinutes * 60 * 1000

            queueRef.current.forEach(item => {
                if (item.status === 'WAITING' && (item.calledAt || item.arrivalTime)) {
                    const callTimeStr = item.calledAt || item.arrivalTime
                    const calledTime = new Date(callTimeStr).getTime()
                    const elapsed = now - calledTime

                    // Se passou do tempo de tolerância e ainda não foi re-chamado automaticamente
                    if (elapsed >= thresholdMs && !autoRecalledIdsRef.current.has(item.id)) {
                        autoRecalledIdsRef.current.add(item.id)

                        // Repetir chamada automaticamente na TV/Voz
                        handleCallPatientRef.current(
                            item.id,
                            item.patient?.full_name || 'Paciente',
                            item.consulting_room_id,
                            undefined
                        )

                        toast({
                            title: 'Alerta de Escalonamento (Ausência)',
                            description: `Paciente ${item.patient?.full_name || 'Paciente'} chamado(a) há mais de ${tvRecallMinutes} min sem atendimento. Chamada repetida automaticamente no Painel de TV!`,
                        })
                    }
                }
            })
        }

        const escalationTimer = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) return
            checkEscalation()
        }, 60000)
        return () => clearInterval(escalationTimer)
    }, [tvRecallMinutes])

    useEffect(() => {
        if (!currentUser?.clinic_id) return
        const clinicId = currentUser.clinic_id
        const supabase = createClient()
        let debounceTimer: ReturnType<typeof setTimeout> | null = null
        const scheduleSilentRefresh = () => {
            if (typeof document !== 'undefined' && document.hidden) return
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
                loadData(true)
            }, 800)
        }

        const channel = supabase
            .channel(`reception_realtime_updates_${clinicId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'appointments',
                    filter: `clinic_id=eq.${clinicId}`,
                },
                scheduleSilentRefresh
            )
            .subscribe()

        // Listen for new pre-checkins (patients completing online check-in)
        const checkinChannel = supabase
            .channel(`reception_checkin_alerts_${clinicId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'appointment_checkins',
                },
                () => {
                    scheduleSilentRefresh()
                    toast({
                        title: 'Pré-check-in recebido',
                        description: 'Um paciente completou o pré-check-in online.',
                    })
                }
            )
            .subscribe()

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer)
            supabase.removeChannel(channel)
            supabase.removeChannel(checkinChannel)
        }
    }, [currentUser?.clinic_id])

    async function loadData(isSilent = false) {
        if (!isSilent) {
            setLoading(true)
        }
        try {
            const shouldFetchRooms = !roomsFetchedOnceRef.current
            const [queueRes, roomsRes] = await Promise.all([
                fetch('/api/reception/queue'),
                shouldFetchRooms ? fetch('/api/consulting-rooms') : Promise.resolve(null)
            ])
            if (shouldFetchRooms) roomsFetchedOnceRef.current = true

            if (queueRes.ok) {
                const data = await queueRes.json()
                const q: QueueItem[] = data.queue || []
                setQueue(q)
                if (data.chamadaPainelTvHabilitada !== undefined) {
                    setChamadaPainelTvHabilitada(Boolean(data.chamadaPainelTvHabilitada))
                }

                setStats({
                    waiting_count: q.filter(i => ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'PENDING_PAYMENT'].includes(i.status)).length,
                    in_service_count: q.filter(i => i.status === 'IN_PROGRESS').length,
                    completed_count: q.filter(i => i.status === 'COMPLETED').length,
                    no_show_count: q.filter(i => i.status === 'NO_SHOW').length
                })
            }
            if (roomsRes && roomsRes.ok) {
                const data = await roomsRes.json()
                setConsultingRooms(data.rooms || [])
            }
        } catch (error) {
            console.error('Error loading reception data:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleCallPatient(appointmentId: string, patientName: string, consultingRoomId?: string | null, roomName?: string) {
        setCallingId(appointmentId)
        try {
            const res = await fetch('/api/reception/call-patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, consultingRoomId })
            })

            if (res.ok) {
                toast({
                    title: 'Paciente Chamado',
                    description: `${patientName} chamado(a) ${roomName ? `para ${roomName}` : 'no Painel de TV'}.`,
                })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao chamar paciente')
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Não foi possível chamar o paciente',
            })
        } finally {
            setCallingId(null)
        }
    }

    async function handleStartService(appointmentId: string, patientName: string) {
        setActionId(appointmentId)
        try {
            const res = await fetch('/api/reception/start-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId })
            })
            if (res.ok) {
                toast({ title: 'Em Atendimento', description: `${patientName} está em atendimento.` })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao iniciar atendimento')
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro ao iniciar atendimento' })
        } finally {
            setActionId(null)
        }
    }

    async function handleCompleteService(appointmentId: string, patientName: string) {
        setActionId(appointmentId)
        try {
            const res = await fetch('/api/reception/complete-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId })
            })
            if (res.ok) {
                toast({ title: 'Atendimento Concluído', description: `Atendimento de ${patientName} concluído.` })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao concluir atendimento')
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro ao concluir atendimento' })
        } finally {
            setActionId(null)
        }
    }

    async function handleNoShow(appointmentId: string, patientName: string, notes: string = '') {
        setActionId(appointmentId)
        try {
            const res = await fetch('/api/reception/no-show', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, notes })
            })
            if (res.ok) {
                toast({ title: 'Não Compareceu', description: `${patientName} marcado como não compareceu.` })
                setNoShowModal({ open: false, appointmentId: null, patientName: '', notes: '' })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao marcar não comparecimento')
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro ao marcar não comparecimento' })
        } finally {
            setActionId(null)
        }
    }

    async function handleRevertStatus(appointmentId: string, patientName: string) {
        setActionId(appointmentId)
        try {
            const res = await fetch('/api/reception/revert-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId })
            })
            if (res.ok) {
                toast({ title: 'Desfeito', description: `Ação revertida para ${patientName}.` })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao desfazer')
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro ao desfazer ação' })
        } finally {
            setActionId(null)
        }
    }

    async function handleSwitchCategory(appointmentId: string, currentPaymentType: string | undefined, patientName: string) {
        const nextType = currentPaymentType === 'CONVENIO' ? 'PARTICULAR' : 'CONVENIO'
        setActionId(appointmentId)
        try {
            const res = await fetch(`/api/appointments/${appointmentId}/switch-category`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_type: nextType }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Falha ao alternar categoria')
            }
            const warningsMsg = Array.isArray(data.warnings) && data.warnings.length > 0
                ? ` Alertas: ${data.warnings.join('; ')}`
                : ''
            toast({
                title: `Categoria alterada para ${nextType === 'CONVENIO' ? 'Convênio' : 'Particular'}`,
                description: `${patientName} atualizado.${warningsMsg}`,
            })
            loadData()
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao alternar categoria',
                description: error instanceof Error ? error.message : 'Erro desconhecido',
            })
        } finally {
            setActionId(null)
        }
    }

    async function handleCheckIn(appointmentId: string, notes: string = '') {
        try {
            const res = await fetch(`/api/reception/checkin/${appointmentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            })

            if (res.ok) {
                toast({
                    title: 'Check-in realizado',
                    description: 'Paciente confirmado na fila de atendimento'
                })
                setCheckInModal({ open: false, appointmentId: null, notes: '' })
                loadData()
            } else {
                throw new Error('Falha no check-in')
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível realizar o check-in'
            })
        }
    }

    async function handleCreateWalkIn() {
        if (!selectedPatientId) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Selecione um paciente'
            })
            return
        }

        try {
            const res = await fetch('/api/reception/walk-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: selectedPatientId,
                    urgency_level: urgency,
                    reason
                })
            })

            if (res.ok) {
                const data = await res.json()
                setCreatedWalkIn(data)

                toast({
                    title: 'Atendimento criado',
                    description: 'Paciente adicionado à fila de espera'
                })
                setShowWalkInDialog(false)
                setSelectedPatientId(null)
                setReason('')
                loadData()
            } else {
                throw new Error('Falha ao criar walk-in')
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível adicionar o paciente'
            })
        }
    }

    async function handleCreatePatient(data: any) {
        setIsSubmittingPatient(true)
        try {
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao criar paciente')
            }

            const newPatient = await res.json()

            toast({
                title: 'Paciente criado',
                description: 'Paciente cadastrado com sucesso'
            })

            setSelectedPatientId(newPatient.id)
            setIsCreatingPatient(false)
        } catch (error) {
            toast({
                description: error instanceof Error ? error.message : 'Erro ao criar paciente'
            })
        } finally {
            setIsSubmittingPatient(false)
        }
    }

    useEffect(() => {
        const clinicId = currentUser?.clinic_id
        if (!clinicId) return

        const storageKey = getReceptionModulesStorageKey(clinicId)
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem(storageKey)
                if (cached) {
                    setVisibleModules(normalizeReceptionModules(JSON.parse(cached)))
                }
            } catch { /* ignore invalid cache */ }
        }

        let cancelled = false
        async function fetchReceptionPreferences() {
            try {
                const res = await fetch('/api/reception/preferences')
                if (!res.ok || cancelled) return
                const data = await res.json()
                const normalized = normalizeReceptionModules(data.modules)
                setVisibleModules(normalized)
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(normalized))
                    } catch { /* silent */ }
                }
            } catch { /* silent */ }
        }
        fetchReceptionPreferences()

        return () => {
            cancelled = true
        }
    }, [currentUser?.clinic_id])

    const handleUpdateVisibleModules = async (nextModules: ReceptionVisibleModules) => {
        const previousModules = visibleModules
        setVisibleModules(nextModules)

        const clinicId = currentUser?.clinic_id
        const storageKey = clinicId ? getReceptionModulesStorageKey(clinicId) : null
        if (storageKey && typeof window !== 'undefined') {
            try {
                localStorage.setItem(storageKey, JSON.stringify(nextModules))
            } catch { /* silent */ }
        }

        setSavingModules(true)
        try {
            const res = await fetch('/api/reception/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modules: nextModules }),
            })
            if (!res.ok) {
                throw new Error('Não foi possível salvar a visualização da recepção')
            }
            const data = await res.json()
            if (data.modules) {
                const confirmed = normalizeReceptionModules(data.modules)
                setVisibleModules(confirmed)
                if (storageKey && typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(confirmed))
                    } catch { /* silent */ }
                }
            }
        } catch {
            setVisibleModules(previousModules)
            if (storageKey && typeof window !== 'undefined') {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(previousModules))
                } catch { /* silent */ }
            }
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar visualização',
                description: 'Não foi possível salvar suas preferências. Tente novamente.',
            })
        } finally {
            setSavingModules(false)
        }
    }

    const handleToggleModule = (key: ReceptionModuleKey, checked: boolean) => {
        handleUpdateVisibleModules({
            ...visibleModules,
            [key]: checked,
        })
    }

    const handleManualRefresh = async () => {
        setManualRefreshing(true)
        await loadData(true)
        setManualRefreshing(false)
    }

    const handleCopyStationLink = async (type: 'tv' | 'totem') => {
        if (!currentUser?.clinic_id || typeof window === 'undefined') return
        const path = type === 'tv' ? `/painel-tv/${currentUser.clinic_id}` : `/totem/${currentUser.clinic_id}`
        const url = `${window.location.origin}${path}`
        try {
            await navigator.clipboard.writeText(url)
            setCopiedLinkType(type)
            toast({
                title: type === 'tv' ? 'Link do Painel de TV copiado' : 'Link do Totem copiado',
                description: url,
            })
            setTimeout(() => setCopiedLinkType(null), 2500)
        } catch {
            toast({
                variant: 'destructive',
                title: 'Erro ao copiar',
                description: 'Não foi possível copiar o link automaticamente.',
            })
        }
    }

    const normalizedSearch = searchQuery.trim().toLowerCase()
    const matchesSearch = (item: QueueItem) => {
        if (!normalizedSearch) return true
        const patientName = (item.patient?.full_name || '').toLowerCase()
        const doctorName = (item.doctor?.user?.full_name || item.doctor?.user?.name || '').toLowerCase()
        return patientName.includes(normalizedSearch) || doctorName.includes(normalizedSearch)
    }

    const canConfigureTv = ['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role || '')
    const visibleModulesCount = countVisibleReceptionModules(visibleModules)
    const waitingItems = queue.filter(
        i => ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'PENDING_PAYMENT'].includes(i.status) && matchesSearch(i)
    )
    const inProgressItems = queue.filter(i => i.status === 'IN_PROGRESS' && matchesSearch(i))
    const completedItems = queue.filter(i => i.status === 'COMPLETED' && matchesSearch(i))

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto px-2 sm:px-4 py-4">
            {/* Cabeçalho Editorial Padrão CliniGo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                            Recepção
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Central de atendimento, check-in biométrico, totem e chamadas no Painel de TV
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Botão de Ação: escolher quais módulos rápidos ficam visíveis na Recepção */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-[44px] px-3.5 text-xs font-medium gap-2"
                                aria-label="Escolher funções visíveis na recepção"
                            >
                                <LayoutGrid className="w-4 h-4 text-primary" />
                                <span>Exibir Funções</span>
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary/10 text-primary tabular-nums">
                                    {visibleModulesCount}/4
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 p-3 space-y-3">
                            <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        Funções na Recepção
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                        Ative ou oculte os cartões exibidos no topo desta tela.
                                    </p>
                                </div>
                                {savingModules && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0 mt-0.5" />
                                )}
                            </div>

                            <div className="space-y-1.5">
                                {RECEPTION_MODULE_OPTIONS.map((option) => {
                                    const Icon =
                                        option.key === 'tvPanel'
                                            ? Tv
                                            : option.key === 'totem'
                                                ? Monitor
                                                : option.key === 'faceCheckin'
                                                    ? Camera
                                                    : QrCode
                                    const checked = visibleModules[option.key]

                                    return (
                                        <div
                                            key={option.key}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2 min-h-[48px]"
                                        >
                                            <label
                                                htmlFor={`reception-module-${option.key}`}
                                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                                            >
                                                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${checked
                                                    ? 'bg-primary/10 border-primary/25 text-primary'
                                                    : 'bg-muted border-border text-muted-foreground'
                                                    }`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-xs font-semibold text-foreground block leading-tight">
                                                        {option.label}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
                                                        {option.description}
                                                    </span>
                                                </div>
                                            </label>
                                            <Switch
                                                id={`reception-module-${option.key}`}
                                                checked={checked}
                                                disabled={savingModules}
                                                onCheckedChange={(value) => handleToggleModule(option.key, value)}
                                                aria-label={`Exibir ${option.label} na recepção`}
                                            />
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={savingModules || visibleModulesCount === 4}
                                    onClick={() => handleUpdateVisibleModules({
                                        tvPanel: true,
                                        totem: true,
                                        faceCheckin: true,
                                        qrScanner: true,
                                    })}
                                    className="h-8 px-2.5 text-[11px] font-medium text-primary hover:text-primary"
                                >
                                    Ativar todos
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={savingModules || visibleModulesCount === 0}
                                    onClick={() => handleUpdateVisibleModules({
                                        tvPanel: false,
                                        totem: false,
                                        faceCheckin: false,
                                        qrScanner: false,
                                    })}
                                    className="h-8 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                >
                                    Ocultar todos
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleManualRefresh}
                        disabled={manualRefreshing}
                        className="min-h-[44px] px-3.5 text-xs font-medium gap-1.5"
                    >
                        <RefreshCw className={`w-4 h-4 ${manualRefreshing ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                    </Button>

                    {/* Sem Agendamento (Atendimento avulso) */}
                    <Dialog open={showWalkInDialog} onOpenChange={(open) => {
                        setShowWalkInDialog(open)
                        if (!open) setIsCreatingPatient(false)
                    }}>
                        <DialogTrigger asChild>
                            <Button
                                className="min-h-[44px] px-4 text-xs sm:text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Sem Agendamento</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-lg">
                            <DialogHeader>
                                <DialogTitle>
                                    {isCreatingPatient ? 'Novo Paciente' : 'Novo Atendimento (Walk-in)'}
                                </DialogTitle>
                            </DialogHeader>

                            {isCreatingPatient ? (
                                <QuickPatientForm
                                    onSubmit={handleCreatePatient}
                                    onBack={() => setIsCreatingPatient(false)}
                                    isSubmitting={isSubmittingPatient}
                                />
                            ) : (
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Paciente</Label>
                                        <PatientSelector
                                            value={selectedPatientId}
                                            onChange={setSelectedPatientId}
                                            onNewPatient={() => setIsCreatingPatient(true)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Urgência</Label>
                                        <Select value={urgency} onValueChange={setUrgency}>
                                            <SelectTrigger className="min-h-[44px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="priority">Prioridade</SelectItem>
                                                <SelectItem value="urgent">Urgente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Motivo</Label>
                                        <Input
                                            className="min-h-[44px]"
                                            placeholder="Motivo do atendimento..."
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        />
                                    </div>
                                    <Button className="w-full min-h-[44px] text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleCreateWalkIn}>
                                        Adicionar à Fila
                                    </Button>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Configurações de Atualização */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="min-h-[44px] gap-1.5 px-3.5 text-xs font-medium">
                                <Settings className="w-4 h-4" />
                                <span>Configurações</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-lg">
                            <DialogHeader>
                                <DialogTitle>Configurações da Recepção</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Intervalo de Verificação de Segurança</Label>
                                    <Select
                                        value={refreshInterval.toString()}
                                        onValueChange={(value) => {
                                            const interval = Number(value)
                                            setRefreshInterval(interval)
                                            localStorage.setItem('reception-refresh-interval', interval.toString())
                                        }}
                                    >
                                        <SelectTrigger className="min-h-[44px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="120">2 minutos</SelectItem>
                                            <SelectItem value="180">3 minutos</SelectItem>
                                            <SelectItem value="300">5 minutos (recomendado)</SelectItem>
                                            <SelectItem value="600">10 minutos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        As atualizações ocorrem em tempo real via conexão direta. Este intervalo é apenas uma verificação complementar a cada {refreshInterval >= 60
                                            ? `${Math.floor(refreshInterval / 60)} minuto${Math.floor(refreshInterval / 60) > 1 ? 's' : ''}${refreshInterval % 60 ? ` e ${refreshInterval % 60} segundos` : ''}`
                                            : `${refreshInterval} segundos`}.
                                    </p>
                                </div>
                                {canConfigureTv && (
                                    <div className="pt-3 border-t border-border">
                                        <Button asChild variant="outline" className="w-full min-h-[44px] gap-2">
                                            <Link href="/dashboard/configuracoes?tab=consultorios">
                                                <Tv className="w-4 h-4 text-primary" />
                                                Personalizar Aparência, Voz e Salas da TV
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Central de Comando da Recepção — Módulos Rápidos Configuráveis pela Própria Recepção */}
            {visibleModulesCount > 0 && (
                <div className={getReceptionModulesGridClass(visibleModulesCount)}>
                    {/* 1. Painel de TV */}
                    {visibleModules.tvPanel && (
                        <div className="rounded-lg border border-primary/25 bg-card p-3.5 shadow-sm flex flex-col justify-between gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                        <Tv className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-semibold text-foreground leading-tight">Painel de TV</h2>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">Chamadas na sala de espera</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-primary/5 text-primary border-primary/25 shrink-0">
                                    Ao Vivo
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={!currentUser?.clinic_id}
                                    onClick={() => {
                                        if (!currentUser?.clinic_id) return
                                        window.open(`${window.location.origin}/painel-tv/${currentUser.clinic_id}`, '_blank', 'noopener,noreferrer')
                                    }}
                                    className="flex-1 min-h-[40px] bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium gap-1.5"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Abrir TV
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    disabled={!currentUser?.clinic_id}
                                    onClick={() => handleCopyStationLink('tv')}
                                    title="Copiar link do Painel de TV"
                                    aria-label="Copiar link do Painel de TV"
                                    className="min-h-[40px] min-w-[40px] shrink-0"
                                >
                                    {copiedLinkType === 'tv' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                                </Button>
                                {canConfigureTv && (
                                    <Button
                                        asChild
                                        size="icon"
                                        variant="outline"
                                        title="Configurar aparência, logotipo, voz e salas da TV"
                                        aria-label="Configurar Painel de TV"
                                        className="min-h-[40px] min-w-[40px] shrink-0"
                                    >
                                        <Link href="/dashboard/configuracoes?tab=consultorios">
                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 2. Auto Atendimento (Totem) */}
                    {visibleModules.totem && (
                        <div className="rounded-lg border border-border bg-card p-3.5 shadow-sm flex flex-col justify-between gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                        <Monitor className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-semibold text-foreground leading-tight">Auto Atendimento</h2>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">Check-in facial e QR Code</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!currentUser?.clinic_id}
                                    onClick={() => {
                                        if (!currentUser?.clinic_id) return
                                        window.open(`${window.location.origin}/totem/${currentUser.clinic_id}`, '_blank', 'noopener,noreferrer')
                                    }}
                                    className="flex-1 min-h-[40px] text-xs font-medium gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Abrir Totem
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    disabled={!currentUser?.clinic_id}
                                    onClick={() => handleCopyStationLink('totem')}
                                    title="Copiar link do Totem"
                                    aria-label="Copiar link do Totem"
                                    className="min-h-[40px] min-w-[40px] shrink-0"
                                >
                                    {copiedLinkType === 'totem' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 3. Check-in Facial (Biometria) */}
                    {visibleModules.faceCheckin && (
                        <div className="rounded-lg border border-border bg-card p-3.5 shadow-sm flex flex-col justify-between gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                        <Camera className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-semibold text-foreground leading-tight">Check-in Facial</h2>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">Biometria pela câmera</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground shrink-0">
                                    Biometria
                                </Badge>
                            </div>
                            <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="w-full min-h-[40px] text-xs font-medium gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                            >
                                <Link href="/dashboard/recepcao/face-checkin">
                                    <Camera className="w-3.5 h-3.5" />
                                    Iniciar Check-in Facial
                                </Link>
                            </Button>
                        </div>
                    )}

                    {/* 4. Escanear QR Code */}
                    {visibleModules.qrScanner && (
                        <div className="rounded-lg border border-border bg-card p-3.5 shadow-sm flex flex-col justify-between gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                        <QrCode className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-semibold text-foreground leading-tight">Escanear QR Code</h2>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">Confirmar chegada pelo celular</p>
                                    </div>
                                </div>
                            </div>
                            <QRScannerDialog onCheckIn={loadData}>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full min-h-[40px] text-xs font-medium gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                                >
                                    <QrCode className="w-3.5 h-3.5" />
                                    Ler QR Code
                                </Button>
                            </QRScannerDialog>
                        </div>
                    )}
                </div>
            )}

            {/* Alertas em Tempo Real de Apoio nos Tablets de Consultório */}
            {currentUser?.clinic_id && (
                <TerminalEscalationAlert clinicId={currentUser.clinic_id} />
            )}

            {/* Barra de KPIs + Busca Rápida na Fila */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 flex-1">
                    {/* 1. Aguardando */}
                    <div className="flex items-center justify-between min-h-[40px] px-3.5 bg-card text-card-foreground rounded-lg border border-border shadow-sm select-none">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs font-medium text-muted-foreground">Aguardando</span>
                        </div>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200 tabular-nums">
                            {stats.waiting_count}
                        </span>
                    </div>

                    {/* 2. Em Atendimento */}
                    <div className="flex items-center justify-between min-h-[40px] px-3.5 bg-card text-card-foreground rounded-lg border border-border shadow-sm select-none">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-xs font-medium text-muted-foreground">Em Atendimento</span>
                        </div>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-md bg-primary/10 text-primary border border-primary/20 tabular-nums">
                            {stats.in_service_count}
                        </span>
                    </div>

                    {/* 3. Atendidos Hoje */}
                    <div className="flex items-center justify-between min-h-[40px] px-3.5 bg-card text-card-foreground rounded-lg border border-border shadow-sm select-none">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span className="text-xs font-medium text-muted-foreground">Atendidos</span>
                        </div>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
                            {stats.completed_count}
                        </span>
                    </div>

                    {/* 4. Ausentes */}
                    <button
                        type="button"
                        onClick={() => setShowNoShowList(true)}
                        className="flex items-center justify-between min-h-[40px] px-3.5 bg-card hover:bg-muted/40 text-card-foreground rounded-lg border border-border shadow-sm transition-colors cursor-pointer"
                        title="Clique para ver lista de ausentes"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-destructive" />
                            <span className="text-xs font-medium text-muted-foreground">Ausentes</span>
                        </div>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-md bg-destructive/10 text-destructive border border-destructive/20 tabular-nums">
                            {stats.no_show_count}
                        </span>
                    </button>

                    {/* 5. Aniversários */}
                    <button
                        type="button"
                        onClick={() => setShowBirthdaysModal(true)}
                        className="flex items-center justify-between min-h-[40px] px-3.5 bg-card hover:bg-muted/40 text-card-foreground rounded-lg border border-border shadow-sm transition-colors cursor-pointer"
                        title="Clique para ver aniversariantes"
                    >
                        <div className="flex items-center gap-2">
                            <Cake className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs font-medium text-muted-foreground">Aniversários</span>
                        </div>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            Ver
                        </span>
                    </button>
                </div>

                {/* Busca Rápida na Fila */}
                <div className="relative w-full lg:w-72 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filtrar paciente ou terapeuta..."
                        className="pl-9 pr-9 min-h-[40px] bg-card"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                            aria-label="Limpar busca"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Modals & Dialogs */}
            <Dialog open={showBirthdaysModal} onOpenChange={setShowBirthdaysModal}>
                <DialogContent className="max-w-xl p-0 overflow-hidden border border-border/80">
                    <BirthdayWidget />
                </DialogContent>
            </Dialog>

            <Dialog open={checkInModal.open} onOpenChange={(open) => setCheckInModal({ ...checkInModal, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Check-in</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Observação (Falta justificada/Cobrada ou notas)</Label>
                            <Input
                                placeholder="Adicione uma observação (opcional)..."
                                value={checkInModal.notes}
                                onChange={(e) => setCheckInModal({ ...checkInModal, notes: e.target.value })}
                            />
                        </div>
                        <Button className="w-full" onClick={() => checkInModal.appointmentId && handleCheckIn(checkInModal.appointmentId, checkInModal.notes)}>
                            Confirmar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={noShowModal.open} onOpenChange={(open) => setNoShowModal({ ...noShowModal, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelar Atendimento / Ausência</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">Paciente: <span className="font-medium text-foreground">{noShowModal.patientName}</span></p>
                        <div className="space-y-2">
                            <Label>Motivo do cancelamento / Observação</Label>
                            <Input
                                placeholder="Informe o motivo do cancelamento ou falta..."
                                value={noShowModal.notes}
                                onChange={(e) => setNoShowModal({ ...noShowModal, notes: e.target.value })}
                            />
                        </div>
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => noShowModal.appointmentId && handleNoShow(noShowModal.appointmentId, noShowModal.patientName, noShowModal.notes)}>
                            Confirmar Cancelamento
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showNoShowList} onOpenChange={setShowNoShowList}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pacientes que não compareceram</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pt-2">
                        {stats.no_show_count === 0 ? (
                            <p className="text-center text-muted-foreground py-4 text-sm">Nenhum paciente nesta lista.</p>
                        ) : (
                            <div className="space-y-2">
                                {queue.filter(i => i.status === 'NO_SHOW').map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/30">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.patient.full_name}</p>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                Chegada original: {item.arrivalTime ? new Date(item.arrivalTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Sem registro'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-md" onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Desfazer">
                                                <Undo2 className="w-4 h-4" />
                                            </Button>
                                            <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 font-semibold text-[10px]">Ausente</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* 3-Panel Kanban Queue Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Column 1: Aguardando */}
                <div className="bg-muted/30 rounded-lg p-3.5 border border-border shadow-sm flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border/60">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                                Aguardando
                            </h3>
                            <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border shrink-0 tabular-nums">
                                {waitingItems.length}
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground text-xs">
                            <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
                            Carregando fila...
                        </div>
                    ) : waitingItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground text-center">
                            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700 mb-2.5 border border-amber-200">
                                <Clock className="w-5 h-5" />
                            </div>
                            <p className="font-medium text-xs text-foreground">
                                {normalizedSearch ? 'Nenhum paciente encontrado na busca' : 'Nenhum paciente aguardando'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 px-4">
                                {normalizedSearch ? 'Tente outro nome de paciente ou profissional.' : 'Os pacientes que chegarem na clínica serão listados aqui.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                            {waitingItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="p-3.5 rounded-md border border-border/70 bg-card hover:border-border/90 hover:shadow-sm transition-all duration-150 relative group"
                                >
                                    {/* Card Header: Ordem, Nome, Badges e Ações Secundárias */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {/* Order Number */}
                                            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-muted text-muted-foreground font-semibold text-[11px] shrink-0 border border-border/50">
                                                {index + 1}
                                            </div>

                                            <h4 className="font-semibold text-foreground text-sm truncate" title={item.patient?.full_name}>
                                                {item.patient?.full_name || 'Paciente'}
                                            </h4>

                                            {item.isPriority && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 rounded-md shrink-0">
                                                    Prioridade
                                                </Badge>
                                            )}
                                            {item.type === 'walk-in' && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-md shrink-0">
                                                    Encaixe
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Ações de Suporte (Documentos, Desfazer, Ausente) no topo direito */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                                                onClick={() => { setSelectedAppointmentId(item.id); setSelectedPatientName(item.patient?.full_name || ''); setDocumentsModalOpen(true) }}
                                                title="Documentos"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                            </Button>

                                            {(item.checkedInAt || item.status === 'WAITING') && (
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md" onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Desfazer">
                                                    <Undo2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md"
                                                onClick={() => setNoShowModal({ open: true, appointmentId: item.id, patientName: item.patient?.full_name || '', notes: '' })}
                                                disabled={actionId === item.id}
                                                title="Cancelar Atendimento / Não Compareceu"
                                            >
                                                <UserX className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Informações do Paciente */}
                                    {/* Informações do Paciente */}
                                    {(() => {
                                        const itemRoom = consultingRooms.find(r =>
                                            (item.consulting_room_id && r.id === item.consulting_room_id) ||
                                            (item.doctor?.id && (r.doctor_id === item.doctor.id || r.doctor?.id === item.doctor.id)) ||
                                            (item.doctor?.user?.full_name && r.doctor?.user?.full_name &&
                                                r.doctor.user.full_name.toLowerCase().trim() === item.doctor.user.full_name.toLowerCase().trim())
                                        )
                                        const roomDisplayName = itemRoom ? itemRoom.display_name || itemRoom.name || `Sala ${itemRoom.room_number}` : null

                                        return (
                                            <>
                                                <div className="mt-1 pl-7">
                                                    {item.doctor && (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <User className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                                <span className="truncate">
                                                                    {item.doctor?.user?.name || item.doctor?.user?.full_name || (item.doctor as any)?.full_name || 'Profissional'}
                                                                </span>
                                                            </p>
                                                            {roomDisplayName && (
                                                                <Badge variant="outline" className="text-[10px] font-medium bg-muted/60 text-foreground border-border/60 px-1.5 py-0 rounded-md shrink-0">
                                                                    {roomDisplayName}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                            {item.arrivalTime
                                                                ? `Espera: ${getTimeWaiting(item.arrivalTime)}`
                                                                : item.scheduledTime
                                                                    ? `Agendado para ${new Date(item.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                                                    : 'Sem horário'
                                                            }
                                                        </span>
                                                        {item.status === 'WAITING' && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0 font-medium rounded-md">Chamado</Badge>
                                                                {(() => {
                                                                    const callTimeStr = item.calledAt || item.arrivalTime
                                                                    if (tvRecallMinutes > 0 && callTimeStr) {
                                                                        const elapsedMin = Math.floor((Date.now() - new Date(callTimeStr).getTime()) / 60000)
                                                                        if (elapsedMin >= tvRecallMinutes) {
                                                                            return (
                                                                                <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0 font-bold animate-pulse rounded-md">
                                                                                    Não compareceu (+{elapsedMin}m)
                                                                                </Badge>
                                                                            )
                                                                        }
                                                                    }
                                                                    return null
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {item.notes && (
                                                        <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 p-1.5 rounded-md border border-border/50 italic leading-relaxed">
                                                            <span className="font-semibold not-italic text-foreground">Obs:</span> {item.notes}
                                                        </p>
                                                    )}
                                                </div>

                                                {item.type === 'appointment' && (
                                                    <div className="mt-2.5 pl-7 space-y-1.5">
                                                        {item.payment_type === 'CONVENIO' ? (
                                                            <div className="rounded-md border border-border bg-muted/40 p-2 space-y-1">
                                                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                                                        <ShieldCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                                                        Convênio{item.insurance_info?.insurance_name ? `: ${item.insurance_info.insurance_name}` : ''}
                                                                    </span>
                                                                    <span className="text-[10px] font-medium text-muted-foreground">
                                                                        Guia/Senha: {item.insurance_info?.authorization_number || 'Pendente'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                                    <Badge variant="outline" className="rounded-md text-[10px] font-medium bg-background">
                                                                        Autorizadas: {item.insurance_info?.sessions_authorized ?? 0} | Utilizadas: {item.insurance_info?.sessions_used ?? 0} | Saldo: {item.insurance_info?.sessions_remaining ?? 0}
                                                                    </Badge>
                                                                    {item.insurance_info?.authorization_expires_at && (
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            Val. Senha: {new Date(item.insurance_info.authorization_expires_at).toLocaleDateString('pt-BR')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {(item.insurance_info?.card_expired || item.insurance_info?.authorization_expired || item.insurance_info?.no_balance) && (
                                                                    <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-medium pt-0.5">
                                                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                                        <span>
                                                                            {[
                                                                                item.insurance_info?.card_expired ? 'Carteirinha expirada' : '',
                                                                                item.insurance_info?.authorization_expired ? 'Senha vencida' : '',
                                                                                item.insurance_info?.no_balance ? 'Sem saldo na autorização' : '',
                                                                            ].filter(Boolean).join(' | ')}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                <Badge variant="outline" className="rounded-md text-[10px] font-medium">Particular</Badge>
                                                            </div>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="min-h-[44px] h-11 w-full justify-center gap-1.5 text-xs font-medium rounded-md"
                                                            onClick={() => handleSwitchCategory(item.id, item.payment_type, item.patient?.full_name || 'Paciente')}
                                                            disabled={actionId === item.id}
                                                        >
                                                            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                                                            <span>Alternar Categoria (Particular / Convênio)</span>
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Action Footbar: Botões amplos e sem quebra de texto */}
                                                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/50">
                                                    {/* Chamar / Re-chamar Paciente no Painel de TV (apenas para clínicas com fluxo de chamada e fora do Espaço Incluir) */}
                                                    {!isEspacoIncluir && chamadaPainelTvHabilitada && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className={`h-8 flex-1 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 whitespace-nowrap ${item.status === 'WAITING'
                                                                ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                                                                : 'text-blue-600 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/10'
                                                                }`}
                                                            onClick={() => handleCallPatient(item.id, item.patient?.full_name || '', itemRoom?.id, roomDisplayName || undefined)}
                                                            disabled={callingId === item.id}
                                                            title={item.status === 'WAITING' ? "Re-chamar paciente no Painel de TV" : "Chamar paciente no Painel de TV"}
                                                        >
                                                            {callingId === item.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Megaphone className={`w-3.5 h-3.5 ${item.status === 'WAITING' ? 'text-amber-500' : ''}`} />
                                                                    <span>{item.status === 'WAITING' ? 'Re-chamar' : 'Chamar'}</span>
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}

                                                    {/* FLUXO EXCLUSIVO ESPAÇO INCLUIR (2 ETAPAS: Check-in -> Concluído) */}
                                                    {isEspacoIncluir ? (
                                                        <>
                                                            {!item.checkedInAt && item.status !== 'WAITING' ? (
                                                                <button
                                                                    className="h-8 flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 flex items-center justify-center gap-1.5 whitespace-nowrap transition-all shadow-sm"
                                                                    onClick={() => handleCheckIn(item.id)}
                                                                    disabled={actionId === item.id}
                                                                    title="Realizar Check-in do paciente"
                                                                >
                                                                    {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" /><span>Check-in</span></>}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="h-8 flex-1 text-xs font-medium bg-primary hover:bg-primary/90 text-white rounded-md px-3 flex items-center justify-center gap-1.5 whitespace-nowrap transition-all shadow-sm"
                                                                    onClick={() => handleCompleteService(item.id, item.patient?.full_name || '')}
                                                                    disabled={actionId === item.id}
                                                                    title="Concluir Atendimento"
                                                                >
                                                                    {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-100" /><span>Concluir</span></>}
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        /* FLUXO COMPLETO PADRÃO PARA DEMAIS CLÍNICAS (4 ETAPAS) */
                                                        <>
                                                            {item.type === 'appointment' && item.status === 'CONFIRMED' && !item.checkedInAt && (
                                                                <button
                                                                    className="h-8 flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 flex items-center justify-center gap-1.5 whitespace-nowrap transition-all shadow-sm"
                                                                    onClick={() => !chamadaPainelTvHabilitada ? handleStartService(item.id, item.patient?.full_name || '') : handleCheckIn(item.id)}
                                                                    disabled={actionId === item.id}
                                                                >
                                                                    {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" /><span>{!chamadaPainelTvHabilitada ? 'Em Atendimento' : 'Check-in'}</span></>}
                                                                </button>
                                                            )}
                                                            {item.status === 'WAITING' && (
                                                                <button
                                                                    className="h-8 flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 flex items-center justify-center gap-1.5 whitespace-nowrap transition-all shadow-sm"
                                                                    onClick={() => handleStartService(item.id, item.patient?.full_name || '')}
                                                                    disabled={actionId === item.id}
                                                                >
                                                                    {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" /><span>Em Atendimento</span></>}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 2: Em Atendimento */}
                <div className="bg-muted/30 rounded-lg p-3.5 border border-border shadow-sm flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border/60">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                                Em Atendimento
                            </h3>
                            <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border shrink-0 tabular-nums">
                                {inProgressItems.length}
                            </span>
                        </div>
                    </div>

                    {inProgressItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground text-center">
                            <div className="p-2.5 bg-primary/10 rounded-lg text-primary mb-2.5 border border-primary/20">
                                <Users className="w-5 h-5" />
                            </div>
                            <p className="font-medium text-xs text-foreground">
                                {normalizedSearch ? 'Nenhum paciente em atendimento na busca' : 'Nenhum paciente em atendimento'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 px-4">Os pacientes em atendimento aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                            {inProgressItems.map((item) => (
                                <div key={item.id} className="p-3.5 rounded-md border border-border/70 bg-card hover:border-border/90 hover:shadow-sm transition-all duration-150">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <h4 className="font-semibold text-foreground text-sm truncate max-w-[200px]" title={item.patient?.full_name}>
                                                    {item.patient?.full_name || 'Paciente'}
                                                </h4>
                                                {item.type === 'walk-in' && (
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-md">
                                                        Encaixe
                                                    </Badge>
                                                )}
                                            </div>
                                            {item.doctor && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                    <User className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                    <span className="truncate">
                                                        {item.doctor?.user?.name || item.doctor?.user?.full_name || (item.doctor as any)?.full_name || 'Profissional'}
                                                    </span>
                                                </p>
                                            )}

                                            {item.notes && (
                                                <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 p-1.5 rounded-md border border-border/50 italic leading-relaxed">
                                                    <span className="font-semibold not-italic text-foreground">Obs:</span> {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border-border/60 rounded-md px-2.5 flex items-center gap-1 shrink-0"
                                            onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')}
                                            disabled={actionId === item.id}
                                            title="Voltar para Aguardando"
                                        >
                                            {actionId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Undo2 className="w-3 h-3" /> Voltar</>}
                                        </Button>

                                        <button
                                            className="h-7 flex-1 text-xs font-medium bg-primary hover:bg-primary/90 text-white rounded-md px-3 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                            onClick={() => handleCompleteService(item.id, item.patient?.full_name || '')}
                                            disabled={actionId === item.id}
                                        >
                                            {actionId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 text-emerald-100" />Concluir</>}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 3: Concluídos */}
                <div className="bg-muted/30 rounded-lg p-3.5 border border-border shadow-sm flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border/60">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-600" />
                            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                                Concluídos
                            </h3>
                            <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border shrink-0 tabular-nums">
                                {completedItems.length}
                            </span>
                        </div>
                    </div>

                    {completedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground text-center">
                            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700 mb-2.5 border border-emerald-200">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <p className="font-medium text-xs text-foreground">
                                {normalizedSearch ? 'Nenhum atendimento concluído na busca' : 'Nenhum atendimento concluído'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 px-4">Os atendimentos concluídos aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                            {completedItems.map((item) => (
                                <div key={item.id} className="p-3.5 rounded-md border border-border/70 bg-card hover:border-border/90 hover:shadow-sm transition-all duration-150">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <h4 className="font-semibold text-foreground text-sm truncate max-w-[200px]" title={item.patient?.full_name}>
                                                    {item.patient?.full_name || 'Paciente'}
                                                </h4>
                                                {item.type === 'walk-in' && (
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-md">
                                                        Encaixe
                                                    </Badge>
                                                )}
                                            </div>
                                            {item.doctor && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                    <User className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                    <span className="truncate">
                                                        {item.doctor?.user?.name || item.doctor?.user?.full_name || (item.doctor as any)?.full_name || 'Profissional'}
                                                    </span>
                                                </p>
                                            )}

                                            {item.notes && (
                                                <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 p-1.5 rounded-md border border-border/50 italic leading-relaxed">
                                                    <span className="font-semibold not-italic text-foreground">Obs:</span> {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border-border/60 rounded-md px-2.5 flex items-center gap-1 shrink-0"
                                            onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')}
                                            disabled={actionId === item.id}
                                            title="Voltar para Em Atendimento"
                                        >
                                            {actionId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Undo2 className="w-3 h-3" /> Voltar</>}
                                        </Button>

                                        <div className="h-7 flex-1 text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-md px-3 flex items-center justify-center gap-1.5 transition-all select-none">
                                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                            <span>Atendido</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Success Dialog */}
            <Dialog open={!!createdWalkIn} onOpenChange={(open) => !open && setCreatedWalkIn(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Atendimento Criado!</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <QRCodeSVG value={createdWalkIn?.qrCode?.checkinUrl || ''} size={200} />
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                            Peça para o paciente escanear para fazer check-in ou envie pelo WhatsApp.
                        </p>
                        <div className="flex gap-2 w-full">
                            <Button className="flex-1" variant="outline" onClick={() => window.open(createdWalkIn?.qrCode?.whatsappLink, '_blank')}>
                                Enviar WhatsApp
                            </Button>
                            <Button className="flex-1" onClick={() => setCreatedWalkIn(null)}>
                                Concluir
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Documents Modal */}
            {selectedAppointmentId && (
                <CheckinDocumentsModal
                    isOpen={documentsModalOpen}
                    onClose={() => {
                        setDocumentsModalOpen(false)
                        setSelectedAppointmentId(null)
                    }}
                    appointmentId={selectedAppointmentId}
                    patientName={selectedPatientName}
                />
            )}
        </div>
    )
}
