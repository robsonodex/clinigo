'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Plus, User, Stethoscope, Search, FileText, Calendar, Activity, FileSpreadsheet, RotateCw, Shield, X } from "lucide-react"
import PatientSelector from "@/components/prontuarios/patient-selector"
import PatientHistory from "@/components/prontuarios/patient-history"
import { MedicalRecord } from "@/lib/types/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { QuickPatientForm } from '@/components/appointments/QuickPatientForm'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SessionPlansDropdown } from '@/components/session-plans/SessionPlansDropdown'

interface MonthOption {
    value: string
    label: string
}

function buildRecentMonthOptions(count = 12): MonthOption[] {
    const options: MonthOption[] = []
    const now = new Date()
    for (let i = 0; i < count; i++) {
        const ref = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = ref.getFullYear()
        const month = String(ref.getMonth() + 1).padStart(2, '0')
        const formatted = format(ref, "MMMM 'de' yyyy", { locale: ptBR })
        const label = formatted.charAt(0).toUpperCase() + formatted.slice(1)
        options.push({ value: `${year}-${month}`, label })
    }
    return options
}

function getMonthDateRange(monthValue: string): { start: string; end: string } | null {
    if (!/^\d{4}-\d{2}$/.test(monthValue)) return null
    const [yearStr, monthStr] = monthValue.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const lastDay = new Date(year, month, 0).getDate()
    return {
        start: `${yearStr}-${monthStr}-01`,
        end: `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
    }
}

export default function ProntuariosPage() {
    const { toast } = useToast()
    const router = useRouter()
    const profLabel = useProfessionalLabel()
    const [search, setSearch] = useState('')
    const [selectedMonth, setSelectedMonth] = useState<string>('recent')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [filterDoctorId, setFilterDoctorId] = useState<string>('all')
    const [isLoading, setIsLoading] = useState(true)
    const [records, setRecords] = useState<any[]>([]) // Using any for transformed records
    const [totalRecords, setTotalRecords] = useState<number>(0)
    const [showNewRecordModal, setShowNewRecordModal] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
    const [quickPatientData, setQuickPatientData] = useState<any>(null)
    const [isRegisteringPatient, setIsRegisteringPatient] = useState(false)
    const { user, profile, supabase } = useAuth()
    const [doctorId, setDoctorId] = useState<string | null>(null)
    const [hasPsicomotricidade, setHasPsicomotricidade] = useState(false)
    const [showPsicoModal, setShowPsicoModal] = useState(false)
    const [psicoPatientId, setPsicoPatientId] = useState<string | null>(null)
    const [clinicDoctors, setClinicDoctors] = useState<any[]>([])

    // Exportação Excel (exclusivo CLINIC_ADMIN / SUPER_ADMIN)
    const [showExportModal, setShowExportModal] = useState(false)
    const [exportMonth, setExportMonth] = useState<string>('all')
    const [exportStartDate, setExportStartDate] = useState<string>('')
    const [exportEndDate, setExportEndDate] = useState<string>('')
    const [exportDoctorId, setExportDoctorId] = useState<string>('all')
    const [exportPatientId, setExportPatientId] = useState<string | null>(null)
    const [isExporting, setIsExporting] = useState(false)

    const monthOptions = useMemo(() => buildRecentMonthOptions(12), [])
    const canExportExcel = profile?.role === 'CLINIC_ADMIN' || profile?.role === 'SUPER_ADMIN'
    const hasActiveFilters = Boolean(
        search.trim() || startDate || endDate || (filterDoctorId && filterDoctorId !== 'all')
    )
    
    const loadedDoctorsKeyRef = useRef<string | null>(null)
    const loadedPsicoClinicRef = useRef<string | null>(null)
    const userId = user?.id || null
    const profileRole = profile?.role || null
    const profileClinicId = profile?.clinic_id || null
    const effectiveClinicId = profileClinicId || (user?.user_metadata?.clinic_id as string | undefined) || null

    // Initialize doctorId from profile (apenas quando identidade/clínica mudam de fato)
    useEffect(() => {
        if (!userId || !profileRole) return
        if (profileRole === 'DOCTOR') {
            const key = `doctor:${userId}`
            if (loadedDoctorsKeyRef.current === key) return
            loadedDoctorsKeyRef.current = key
            fetchDoctorId()
        } else if (profileClinicId) {
            const key = `clinic:${profileClinicId}`
            if (loadedDoctorsKeyRef.current === key) return
            loadedDoctorsKeyRef.current = key
            fetchClinicDoctors()
        }
    }, [profileRole, profileClinicId, userId])

    // Verifica módulo de Psicomotricidade da clínica (uma única vez por clinicId)
    useEffect(() => {
        if (!effectiveClinicId || loadedPsicoClinicRef.current === effectiveClinicId) return
        loadedPsicoClinicRef.current = effectiveClinicId

        async function checkPsico(clinicId: string) {
            try {
                const { data } = await supabase
                    .from('clinica_modulos')
                    .select('ativo')
                    .eq('clinica_id', clinicId)
                    .eq('modulo_id', 'psicomotricidade_sensory')
                    .maybeSingle()
                if (data?.ativo) {
                    setHasPsicomotricidade(true)
                }
            } catch (e) {
                console.error('Error checking psicomotricidade module:', e)
            }
        }
        checkPsico(effectiveClinicId)
    }, [effectiveClinicId, supabase])

    async function fetchClinicDoctors() {
        if (!profile?.clinic_id) return
        try {
            const { data } = await supabase
                .from('doctors')
                .select('id, user:users(full_name)')
                .eq('clinic_id', profile.clinic_id)
            if (data) setClinicDoctors(data)
        } catch (e) {
            console.error('Error fetching clinic doctors:', e)
        }
    }

    async function fetchDoctorId() {
        if (!user) return
        try {
            const { data } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data) {
                setDoctorId(data.id)
            }
        } catch (e) {
            console.error('Error fetching doctor ID:', e)
        }
    }

    // Load Records com debounce ao buscar por paciente ou alteração de período
    const fetchRecords = useCallback(async (
        searchTerm: string = search,
        opts?: { start?: string; end?: string; docId?: string }
    ) => {
        const effectiveStart = opts?.start !== undefined ? opts.start : startDate
        const effectiveEnd = opts?.end !== undefined ? opts.end : endDate
        const effectiveDoctor = opts?.docId !== undefined ? opts.docId : filterDoctorId

        if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
            toast({
                title: "Período inválido",
                description: "A data inicial não pode ser maior que a data final.",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            const trimmed = searchTerm.trim()
            if (trimmed) params.append('search', trimmed)
            if (effectiveStart) params.append('start_date', effectiveStart)
            if (effectiveEnd) params.append('end_date', effectiveEnd)
            if (effectiveDoctor && effectiveDoctor !== 'all') params.append('doctor_id', effectiveDoctor)

            const res = await fetch(`/api/medical-records?${params.toString()}`)
            if (res.ok) {
                const json = await res.json()
                const list = json?.data?.records || json?.records || []
                const total = json?.data?.total ?? list.length
                setRecords(list)
                setTotalRecords(total)
            } else {
                const err = await res.json().catch(() => null)
                toast({
                    title: "Erro ao carregar prontuários",
                    description: err?.error?.message || "Tente novamente.",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error fetching records:', error)
            toast({
                title: "Erro ao carregar prontuários",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }, [search, startDate, endDate, filterDoctorId, toast])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchRecords(search)
        }, search ? 350 : 0)
        return () => clearTimeout(timer)
    }, [search, startDate, endDate, filterDoctorId, fetchRecords])

    const handleMonthChange = (value: string) => {
        setSelectedMonth(value)
        if (value === 'recent') {
            setStartDate('')
            setEndDate('')
            return
        }
        if (value === 'custom') return
        const range = getMonthDateRange(value)
        if (range) {
            setStartDate(range.start)
            setEndDate(range.end)
        }
    }

    const handleResetFilters = () => {
        setSearch('')
        setSelectedMonth('recent')
        setStartDate('')
        setEndDate('')
        setFilterDoctorId('all')
    }

    const handleOpenExportModal = () => {
        setExportMonth(selectedMonth === 'recent' ? 'all' : selectedMonth)
        setExportStartDate(startDate)
        setExportEndDate(endDate)
        setExportDoctorId(filterDoctorId)
        setExportPatientId(null)
        setShowExportModal(true)
    }

    const handleExportMonthChange = (value: string) => {
        setExportMonth(value)
        if (value === 'all') {
            setExportStartDate('')
            setExportEndDate('')
            return
        }
        if (value === 'custom') return
        const range = getMonthDateRange(value)
        if (range) {
            setExportStartDate(range.start)
            setExportEndDate(range.end)
        }
    }

    const handleDownloadExcel = async () => {
        if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
            toast({
                title: "Período inválido",
                description: "A data inicial deve ser anterior ou igual à data final.",
                variant: "destructive"
            })
            return
        }

        setIsExporting(true)
        try {
            const params = new URLSearchParams()
            if (exportStartDate) params.append('start_date', exportStartDate)
            if (exportEndDate) params.append('end_date', exportEndDate)
            if (exportDoctorId && exportDoctorId !== 'all') params.append('doctor_id', exportDoctorId)
            if (exportPatientId) params.append('patient_id', exportPatientId)
            else if (search.trim()) params.append('search', search.trim())

            const res = await fetch(`/api/medical-records/export?${params.toString()}`, {
                method: 'GET',
                credentials: 'include',
            })

            if (!res.ok) {
                const err = await res.json().catch(() => null)
                const msg = err?.error?.message || err?.error || 'Não foi possível gerar a planilha.'
                toast({
                    title: "Exportação não concluída",
                    description: msg,
                    variant: "destructive"
                })
                return
            }

            const totalExported = res.headers.get('X-Total-Exported') || ''
            const contentDisp = res.headers.get('Content-Disposition') || ''
            const fileMatch = contentDisp.match(/filename="([^"]+)"/)
            const filename = fileMatch?.[1] || 'evolucoes_clinicas.xlsx'

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(url)

            setShowExportModal(false)
            toast({
                title: "Planilha gerada com sucesso",
                description: totalExported
                    ? `${totalExported} evoluções exportadas para Excel.`
                    : "Download do arquivo Excel iniciado.",
            })
        } catch (error) {
            console.error('Error exporting evolutions:', error)
            toast({
                title: "Erro ao exportar evoluções",
                description: "Falha de conexão ao gerar o arquivo Excel.",
                variant: "destructive"
            })
        } finally {
            setIsExporting(false)
        }
    }

    // Create new walk-in appointment and redirect to consultation
    const handleCreateRecord = async () => {
        if (!selectedPatientId && !quickPatientData) return

        setIsCreating(true)
        try {
            // If user is not a doctor, they might be a receptionist creating for a doctor.
            // But for now, let's assume current user is the doctor or we need to select one.
            // Simplification: If user is Doctor, use their ID.
            // If Receptionist, they might need to select a doctor.
            // For this fix, let's assume logged in doctor.
            // If doctorId is null, we might fail.
            const targetDoctorId = doctorId

            if (!targetDoctorId && profile?.role === 'DOCTOR') {
                // Try to fetch again or wait?
            }

            // Quick fix: if doctorId is missing and user is DOCTOR, we need it.
            // If user is RECEPTIONIST, they can't start "Atendimento" directly usually?
            // "Iniciar Atendimento" usually implies the doctor is doing it.
            // But if it's "Novo Prontuário" (New Record) -> implies creating an appointment.

            // Let's rely on the previously implemented logic.
            // If no doctorId (e.g. receptionist), we might need to prompt for doctor.
            // But let's restore the logic I wrote before.

            // 1. Create walk-in appointment (using manual API for direct creation)
            const payload: any = {
                clinic_id: profile?.clinic_id,
                doctor_id: targetDoctorId, // This might be null if not loaded!
                patient_id: selectedPatientId,
                quick_registration: quickPatientData,
                appointment_date: new Date().toISOString().split('T')[0],
                appointment_time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                duration_minutes: 30,
                type: 'presencial',
                notes: 'Atendimento Prontuário Rápido (Avulso)',
                status: 'CONFIRMED',
                payment: {
                    type: 'courtesy',
                    notes: 'Atendimento via Prontuário'
                }
            }

            // If we don't have a doctor ID (e.g. reception), we can't create a 'presencial' appointment without a doctor.
            // This button "Iniciar Atendimento" suggests immediate action.
            // If doctorId is missing, we should probably throw or ask.
            // For now, if no doctorId, we can't proceed.
            if (!targetDoctorId) {
                toast({
                    title: "Selecione um profissional",
                    description: `Selecione um ${profLabel.singular.toLowerCase()} para iniciar o atendimento.`,
                    variant: "destructive"
                })
                setIsCreating(false)
                return
            }

            const response = await fetch('/api/appointments/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar agendamento')
            }

            toast({
                title: "Atendimento iniciado",
                description: "Redirecionando para o prontuário...",
            })

            // Redirect to the new appointment/consultation via new Prontuario UI
            router.push(`/dashboard/prontuarios/${data.appointment.id}`)

        } catch (error: any) {
            console.error('Error creating record:', error)
            toast({
                title: "Erro ao iniciar atendimento",
                description: error.message || "Tente novamente",
                variant: "destructive"
            })
            setIsCreating(false)
        }
    }

    // New handler for quick registration submit
    const handleQuickRegister = (data: any) => {
        setQuickPatientData(data)
        setIsRegisteringPatient(false)
    }

    // Reset states when modal closes
    const handleCloseModal = () => {
        setShowNewRecordModal(false)
        setSelectedPatientId(null)
        setQuickPatientData(null)
        setIsRegisteringPatient(false)
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Corporativo Enterprise */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">Prontuários</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Gerencie prontuários e históricos de pacientes</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <SessionPlansDropdown />
                    {canExportExcel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleOpenExportModal}
                            className="flex items-center gap-1.5 min-h-[44px] h-10 sm:h-9 text-xs font-medium rounded-lg sm:rounded-xs px-3.5 border-border"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Exportar Excel</span>
                        </Button>
                    )}
                    <Button onClick={() => setShowNewRecordModal(true)} className="flex items-center gap-1.5 min-h-[44px] h-10 sm:h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-none rounded-lg sm:rounded-xs px-3.5 font-medium border-0">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo Prontuário</span>
                    </Button>
                </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                    <div className={clinicDoctors.length > 0 ? 'lg:col-span-3 space-y-1.5' : 'lg:col-span-5 space-y-1.5'}>
                        <Label className="text-xs font-medium text-muted-foreground">Paciente</Label>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por nome do paciente..."
                                className="pl-10 pr-3 min-h-[44px] h-11 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xs focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80"
                                style={{ fontSize: '16px' }}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') fetchRecords(search)
                                }}
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-3 space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Mês de Referência</Label>
                        <Select value={selectedMonth} onValueChange={handleMonthChange}>
                            <SelectTrigger className="min-h-[44px] h-11 rounded-xs">
                                <SelectValue placeholder="Mais recentes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recent">Mais recentes (padrão)</SelectItem>
                                {monthOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                                <SelectItem value="custom">Período personalizado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="lg:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Data Inicial</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value)
                                setSelectedMonth(e.target.value || endDate ? 'custom' : 'recent')
                            }}
                            className="min-h-[44px] h-11 rounded-xs"
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    <div className="lg:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Data Final</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value)
                                setSelectedMonth(startDate || e.target.value ? 'custom' : 'recent')
                            }}
                            className="min-h-[44px] h-11 rounded-xs"
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    {clinicDoctors.length > 0 && (
                        <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">{profLabel.singular}</Label>
                            <Select value={filterDoctorId} onValueChange={setFilterDoctorId}>
                                <SelectTrigger className="min-h-[44px] h-11 rounded-xs">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os profissionais</SelectItem>
                                    {clinicDoctors.map((doc: any) => (
                                        <SelectItem key={doc.id} value={doc.id}>
                                            {doc.user?.full_name || 'Profissional'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-12 pt-1 justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fetchRecords(search)}
                                disabled={isLoading}
                                className="min-h-[44px] h-10 px-4 rounded-xs text-xs font-medium"
                            >
                                <Search className="w-4 h-4 mr-1.5" />
                                Buscar
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => fetchRecords(search)}
                                disabled={isLoading}
                                title="Atualizar lista"
                                className="min-h-[44px] h-10 px-3 rounded-xs text-xs text-muted-foreground"
                            >
                                <RotateCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                                Atualizar
                            </Button>
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleResetFilters}
                                    disabled={isLoading}
                                    className="min-h-[44px] h-10 px-3 rounded-xs text-xs text-muted-foreground"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Limpar filtros
                                </Button>
                            )}
                        </div>
                        {!isLoading && records.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {totalRecords > records.length
                                    ? `Exibindo ${records.length} de ${totalRecords} evoluções encontradas${canExportExcel ? ' (use Exportar Excel para baixar todas)' : ''}.`
                                    : `${records.length} ${records.length === 1 ? 'registro exibido' : 'registros exibidos'}.`}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabela Premium */}
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden bg-white dark:bg-slate-900/40">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <FileText className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhum prontuário encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Inicie um atendimento para criar um prontuário</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-850">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paciente</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{profLabel.singular || 'Profissional'}</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Queixa</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100/60 dark:divide-slate-850/60">
                                {records.map((record) => {
                                    const gradients = [
                                        { from: '#4F46E5', to: '#06B6D4' },
                                        { from: '#0EA5E9', to: '#2563EB' },
                                        { from: '#10B981', to: '#059669' },
                                        { from: '#8B5CF6', to: '#D946EF' },
                                        { from: '#F59E0B', to: '#EF4444' }
                                    ]
                                    const pName = record.patient_name || ''
                                    const charSum = pName.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
                                    const theme = gradients[charSum % gradients.length]
                                    const initials = pName.split(' ').filter(Boolean).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'PA'
                                    return (
                                    <TableRow key={record.id} className="group cursor-pointer hover:bg-slate-50/40 dark:hover:bg-slate-850/30 border-none transition-all duration-200" onClick={() => router.push(`/dashboard/prontuarios/${record.appointment_id || record.id}`)}>
                                        <TableCell className="py-3 px-6 font-medium">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105"
                                                >
                                                    {initials}
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-500 transition-colors">{record.patient_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-6">
                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                <Calendar className="h-3 w-3" />
                                                <span>
                                                    {format(new Date(record.date || record.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 px-6 text-sm text-slate-600 dark:text-slate-300">{record.doctor_name}</TableCell>
                                        <TableCell className="py-3 px-6 max-w-[200px] truncate text-sm text-slate-500">
                                            {record.chief_complaint || '-'}
                                        </TableCell>
                                        <TableCell className="py-3 px-6 text-right">
                                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                {hasPsicomotricidade && record.patient_id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                        title="Abrir Ficha de Psicomotricidade deste paciente"
                                                        onClick={() => router.push(`/dashboard/pacientes/${record.patient_id}/psicomotricidade`)}
                                                    >
                                                        <Activity className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                                        Psicomotricidade
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" className="rounded-xs text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" onClick={() => router.push(`/dashboard/prontuarios/${record.appointment_id || record.id}`)}>
                                                    <FileText className="h-4 w-4 mr-1.5" />
                                                    Abrir
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Psicomotricidade Rápido */}
            <Dialog open={showPsicoModal} onOpenChange={setShowPsicoModal}>
                <DialogContent className="max-w-md w-[95vw] sm:w-full p-6">
                    <DialogHeader>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                            <Activity className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                            Prontuário de Psicomotricidade
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Selecione o paciente para abrir diretamente a Ficha de Avaliação e Evolução Psicomotora.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                            Buscar Paciente
                        </label>
                        <PatientSelector
                            value={psicoPatientId || ''}
                            onChange={(id) => setPsicoPatientId(id)}
                        />
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto h-10 min-h-[44px]"
                            onClick={() => {
                                setShowPsicoModal(false)
                                setPsicoPatientId(null)
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            disabled={!psicoPatientId}
                            className="w-full sm:w-auto h-10 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            onClick={() => {
                                if (psicoPatientId) {
                                    setShowPsicoModal(false)
                                    router.push(`/dashboard/pacientes/${psicoPatientId}/psicomotricidade`)
                                }
                            }}
                        >
                            <Activity className="w-4 h-4 mr-1.5" />
                            Acessar Psicomotricidade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showNewRecordModal} onOpenChange={(open) => {
                if (!open) handleCloseModal()
                else setShowNewRecordModal(true)
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Novo Prontuário</DialogTitle>
                        <DialogDescription>
                            Para criar um prontuário, selecione um paciente para iniciar um atendimento imediato.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {isRegisteringPatient ? (
                            <QuickPatientForm
                                onSubmit={handleQuickRegister}
                                onBack={() => setIsRegisteringPatient(false)}
                            />
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex gap-3">
                                    <Stethoscope className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-blue-900">Novo Atendimento</h4>
                                        <p className="text-sm text-blue-800 mt-1">
                                            Isso criará um agendamento do tipo "Avulso" para <strong>agora</strong> e abrirá o prontuário para preenchimento imediato.
                                        </p>
                                    </div>
                                </div>

                                {/* Select Doctor Option if user is not a Doctor */}
                                {profile?.role !== 'DOCTOR' && (
                                    <div className="space-y-2">
                                        <Label>{profLabel.singular}</Label>
                                        <Select
                                            value={doctorId || ''}
                                            onValueChange={(val) => setDoctorId(val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={`Selecione o ${profLabel.singular.toLowerCase()}`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clinicDoctors.map((doc: any) => (
                                                    <SelectItem key={doc.id} value={doc.id}>
                                                        {doc.user?.full_name || 'Profissional'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Show selected patient (either from search or quick reg) */}
                                {(selectedPatientId || quickPatientData) ? (
                                    <div className="p-4 border rounded-lg bg-muted/50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <User className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {quickPatientData ? quickPatientData.full_name : "Paciente Selecionado"}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {quickPatientData ? (quickPatientData.cpf || quickPatientData.phone) : "ID: " + selectedPatientId}
                                                </p>
                                                {quickPatientData && (
                                                    <Badge variant="secondary" className="mt-1 text-xs">Novo Cadastro</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setSelectedPatientId(null)
                                            setQuickPatientData(null)
                                        }}>
                                            Trocar
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Buscar Paciente</Label>
                                        <PatientSelector
                                            value={selectedPatientId}
                                            onChange={setSelectedPatientId}
                                            onNewPatient={() => setIsRegisteringPatient(true)}
                                        />
                                    </div>
                                )}

                                {selectedPatientId && (
                                    <PatientHistory patientId={selectedPatientId} />
                                )}
                            </div>
                        )}
                    </div>

                    {!isRegisteringPatient && (
                        <DialogFooter>
                            <Button variant="outline" onClick={handleCloseModal}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateRecord}
                                disabled={(!selectedPatientId && !quickPatientData) || isCreating}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Criando Atendimento...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Iniciar Atendimento
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Exportação de Evoluções em Excel (CLINIC_ADMIN / SUPER_ADMIN) */}
            {canExportExcel && (
                <Dialog
                    open={showExportModal}
                    onOpenChange={(open) => {
                        if (!isExporting) setShowExportModal(open)
                    }}
                >
                    <DialogContent className="max-w-lg w-[95vw] sm:w-full">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                                <span>Exportar Evoluções para Excel (.xlsx)</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Selecione o mês ou período desejado para baixar todas as evoluções e campos clínicos organizados em planilha.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Mês de Referência</Label>
                                <Select value={exportMonth} onValueChange={handleExportMonthChange}>
                                    <SelectTrigger className="min-h-[44px] h-11">
                                        <SelectValue placeholder="Selecione o mês" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todo o histórico disponível</SelectItem>
                                        {monthOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="custom">Período personalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Data Inicial</Label>
                                    <Input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => {
                                            setExportStartDate(e.target.value)
                                            setExportMonth(e.target.value || exportEndDate ? 'custom' : 'all')
                                        }}
                                        className="min-h-[44px] h-11"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Data Final</Label>
                                    <Input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => {
                                            setExportEndDate(e.target.value)
                                            setExportMonth(exportStartDate || e.target.value ? 'custom' : 'all')
                                        }}
                                        className="min-h-[44px] h-11"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>
                            </div>

                            {clinicDoctors.length > 0 && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">{profLabel.singular} (Opcional)</Label>
                                    <Select value={exportDoctorId} onValueChange={setExportDoctorId}>
                                        <SelectTrigger className="min-h-[44px] h-11">
                                            <SelectValue placeholder="Todos os profissionais" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os profissionais</SelectItem>
                                            {clinicDoctors.map((doc: any) => (
                                                <SelectItem key={doc.id} value={doc.id}>
                                                    {doc.user?.full_name || 'Profissional'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium">Paciente Específico (Opcional)</Label>
                                    {exportPatientId && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setExportPatientId(null)}
                                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            Limpar paciente
                                        </Button>
                                    )}
                                </div>
                                <PatientSelector
                                    value={exportPatientId}
                                    onChange={(id) => setExportPatientId(id)}
                                />
                            </div>

                            <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
                                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>
                                    Acesso restrito a administradores. Este arquivo contém dados clínicos protegidos pela LGPD e o download é registrado na auditoria da clínica.
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowExportModal(false)}
                                disabled={isExporting}
                                className="w-full sm:w-auto min-h-[44px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={handleDownloadExcel}
                                disabled={isExporting}
                                className="w-full sm:w-auto min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Gerando planilha...
                                    </>
                                ) : (
                                    <>
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        Baixar Planilha (.xlsx)
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
