'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Plus, User, Stethoscope, Search, FileText, Calendar, Clock, ChevronRight } from "lucide-react"
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

export default function ProntuariosPage() {
    const { toast } = useToast()
    const router = useRouter()
    const profLabel = useProfessionalLabel()
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [records, setRecords] = useState<any[]>([]) // Using any for transformed records
    const [showNewRecordModal, setShowNewRecordModal] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
    const [quickPatientData, setQuickPatientData] = useState<any>(null)
    const [isRegisteringPatient, setIsRegisteringPatient] = useState(false)
    const { user, profile, supabase } = useAuth()
    const [doctorId, setDoctorId] = useState<string | null>(null)
    const [clinicDoctors, setClinicDoctors] = useState<any[]>([])
    
    // Initialize doctorId from profile
    useEffect(() => {
        if (profile?.role === 'DOCTOR' && user) {
            fetchDoctorId()
        } else if (profile?.role !== 'DOCTOR' && user) {
            fetchClinicDoctors()
        }
    }, [profile, user])

    async function fetchClinicDoctors() {
        try {
            const { data } = await supabase
                .from('doctors')
                .select('id, user:users(full_name)')
                .eq('clinic_id', profile?.clinic_id)
            if (data) setClinicDoctors(data)
        } catch (e) {
            console.error('Error fetching clinic doctors:', e)
        }
    }

    async function fetchDoctorId() {
        if (!user) return
        try {
            const { data, error } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (data) {
                setDoctorId(data.id)
            }
        } catch (e) {
            console.error('Error fetching doctor ID:', e)
        }
    }

    // Load Records
    useEffect(() => {
        fetchRecords()
    }, [])

    async function fetchRecords() {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append('search', search)

            const res = await fetch(`/api/medical-records?${params}`)
            if (res.ok) {
                const data = await res.json()
                setRecords(data.records || [])
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
            {/* Header Premium */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Prontuários</h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gerencie prontuários e históricos de pacientes</p>
                    </div>
                </div>
                <Button onClick={() => setShowNewRecordModal(true)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-10 px-5 text-sm font-semibold">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Prontuário
                </Button>
            </div>

            {/* Barra de Busca Premium */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <Input
                    placeholder="Buscar por paciente..."
                    className="pl-11 pr-4 h-11 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') fetchRecords()
                    }}
                />
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
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Médico</TableHead>
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
                                            <Button variant="ghost" size="sm" className="rounded-xl text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/dashboard/prontuarios/${record.appointment_id || record.id}`)
                                            }}>
                                                <FileText className="h-4 w-4 mr-1.5" />
                                                Abrir
                                            </Button>
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
        </div>
    )
}
