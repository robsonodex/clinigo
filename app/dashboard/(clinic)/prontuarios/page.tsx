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

export default function ProntuariosPage() {
    const { toast } = useToast()
    const router = useRouter()
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

    // Initialize doctorId from profile
    useEffect(() => {
        if (profile?.role === 'DOCTOR' && user) {
            fetchDoctorId()
        }
    }, [profile, user])

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
                // If we implemented 'ManualAppointmentModal' we'd use that.
                // But here we are in 'QuickPatientForm'.
                // Let's check permissions.
                toast({
                    title: "Selecione um médico",
                    description: "Funcionalidade restrita a médicos (ou selecione um médico).",
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

            // Redirect to the new appointment/consultation
            router.push(`/dashboard/atendimentos/${data.appointment.id}`)

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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Prontuários</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie prontuários e históricos de pacientes.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowNewRecordModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Prontuário
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Prontuários Recentes</CardTitle>
                    <CardDescription>
                        Lista de atendimentos e registros médicos.
                    </CardDescription>
                    <div className="mt-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por paciente..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') fetchRecords()
                                }}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : records.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum prontuário encontrado.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Médico</TableHead>
                                    <TableHead>Queixa</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((record) => (
                                    <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/prontuarios/${record.appointment_id || record.id}`)}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{record.patient_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                <span>
                                                    {format(new Date(record.date || record.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{record.doctor_name}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {record.chief_complaint || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/dashboard/prontuarios/${record.appointment_id || record.id}`)
                                            }}>
                                                <FileText className="h-4 w-4 mr-2" />
                                                Abrir
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
