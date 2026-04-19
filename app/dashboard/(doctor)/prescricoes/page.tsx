'use client'

/**
 * Página Principal de Prescrições Digitais
 * 
 * Feature: prescricao_digital (PROFESSIONAL+)
 * RBAC: DOCTOR, CLINIC_ADMIN, SUPER_ADMIN
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { FeatureGate } from '@/components/common/feature-gate'
import { PrescriptionForm, type PrescriptionItem } from '@/components/prescriptions/PrescriptionForm'
import { PrescriptionSignDialog } from '@/components/prescriptions/PrescriptionSignDialog'
import { PrescriptionSendDialog } from '@/components/prescriptions/PrescriptionSendDialog'
import { PrescriptionViewDialog, type PrescriptionData } from '@/components/prescriptions/PrescriptionViewDialog'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Clipboard,
    Plus,
    Search,
    Download,
    FileText,
    Pill,
    Calendar,
    User,
    CheckCircle2,
    Send,
    Eye,
    Loader2,
    ShieldCheck,
    MoreHorizontal,
    Trash2,
    Edit,
    Clock,
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

// ── Types ──
interface Patient {
    id: string
    full_name: string
    cpf?: string
    email?: string
    phone?: string
}

interface Prescription extends PrescriptionData {
    appointment_id?: string
}

// ── Status Config ──
const STATUS_CONFIG = {
    DRAFT: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-800' },
    SIGNED: { label: 'Assinada', color: 'bg-green-100 text-green-800' },
    SENT: { label: 'Enviada', color: 'bg-blue-100 text-blue-800' },
} as const

export default function PrescricoesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // ── State ──
    const [showNewDialog, setShowNewDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showViewDialog, setShowViewDialog] = useState(false)
    const [showSignDialog, setShowSignDialog] = useState(false)
    const [showSendDialog, setShowSendDialog] = useState(false)
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedPatientId, setSelectedPatientId] = useState<string>('')

    // ── Buscar pacientes ──
    const { data: patients = [] } = useQuery<Patient[]>({
        queryKey: ['patients-for-prescription'],
        queryFn: async () => {
            const res = await fetch('/api/patients?limit=200')
            if (!res.ok) return []
            const json = await res.json()
            return json.patients || json.data || (Array.isArray(json) ? json : [])
        },
    })

    // ── Buscar prescrições ──
    const { data: prescriptionsData, isLoading } = useQuery<{ data: Prescription[]; total: number }>({
        queryKey: ['prescriptions', statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
            const res = await fetch(`/api/prescriptions?${params}`)
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
        },
    })

    const prescriptions = prescriptionsData?.data || []

    // ── Filtrar por busca ──
    const filteredPrescriptions = prescriptions.filter((p) => {
        if (!search) return true
        const term = search.toLowerCase()
        return (
            p.patient?.full_name?.toLowerCase().includes(term) ||
            p.items?.some(i => i.medication_name.toLowerCase().includes(term))
        )
    })

    // ── Mutations ──
    const createMutation = useMutation({
        mutationFn: async (data: { patient_id: string; items: PrescriptionItem[]; notes: string }) => {
            const res = await fetch('/api/prescriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao criar')
            }
            return res.json()
        },
        onSuccess: () => {
            toast({ title: '✅ Prescrição criada com sucesso!' })
            setShowNewDialog(false)
            setSelectedPatientId('')
            queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
        },
        onError: (err: Error) => {
            toast({ title: 'Erro', description: err.message, variant: 'destructive' })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/prescriptions/${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao excluir')
            }
        },
        onSuccess: () => {
            toast({ title: 'Prescrição excluída' })
            queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
        },
        onError: (err: Error) => {
            toast({ title: 'Erro', description: err.message, variant: 'destructive' })
        },
    })

    const updateMutation = useMutation({
        mutationFn: async (data: { id: string; items: PrescriptionItem[]; notes: string }) => {
            const res = await fetch(`/api/prescriptions/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: data.items, notes: data.notes }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao atualizar')
            }
            return res.json()
        },
        onSuccess: () => {
            toast({ title: '✅ Prescrição atualizada!' })
            setShowEditDialog(false)
            setSelectedPrescription(null)
            queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
        },
        onError: (err: Error) => {
            toast({ title: 'Erro', description: err.message, variant: 'destructive' })
        },
    })

    // ── Stats ──
    const totalCount = prescriptions.length
    const signedCount = prescriptions.filter(p => p.status === 'SIGNED' || p.status === 'SENT').length
    const sentCount = prescriptions.filter(p => p.status === 'SENT').length
    const draftCount = prescriptions.filter(p => p.status === 'DRAFT').length

    // ── Handlers ──
    const handleView = useCallback((p: Prescription) => {
        setSelectedPrescription(p)
        setShowViewDialog(true)
    }, [])

    const handleSign = useCallback((p: Prescription) => {
        setSelectedPrescription(p)
        setShowSignDialog(true)
    }, [])

    const handleSend = useCallback((p: Prescription) => {
        setSelectedPrescription(p)
        setShowSendDialog(true)
    }, [])

    const handleEdit = useCallback((p: Prescription) => {
        setSelectedPrescription(p)
        setShowEditDialog(true)
    }, [])

    const handleDelete = useCallback((id: string) => {
        if (confirm('Excluir esta prescrição?')) {
            deleteMutation.mutate(id)
        }
    }, [deleteMutation])

    const refreshData = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
    }, [queryClient])

    return (
        <FeatureGate feature="prescricao_digital" featureName="Prescrição Digital">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Clipboard className="w-7 h-7" />
                            Prescrições Digitais
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                PRO
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground">
                            Crie, assine e envie prescrições médicas digitais
                        </p>
                    </div>
                    <Button onClick={() => setShowNewDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Prescrição
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Clipboard className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{totalCount}</div>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Clock className="w-5 h-5 text-yellow-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-yellow-600">{draftCount}</div>
                                    <p className="text-xs text-muted-foreground">Rascunhos</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <ShieldCheck className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{signedCount}</div>
                                    <p className="text-xs text-muted-foreground">Assinadas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Send className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">{sentCount}</div>
                                    <p className="text-xs text-muted-foreground">Enviadas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por paciente ou medicamento..."
                                    className="pl-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="DRAFT">Rascunhos</SelectItem>
                                    <SelectItem value="SIGNED">Assinadas</SelectItem>
                                    <SelectItem value="SENT">Enviadas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading */}
                {isLoading && (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                )}

                {/* List */}
                {!isLoading && (
                    <div className="space-y-4">
                        {filteredPrescriptions.length > 0 ? (
                            filteredPrescriptions.map((prescription) => {
                                const status = STATUS_CONFIG[prescription.status]
                                return (
                                    <Card key={prescription.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="pt-6">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-primary/10 rounded-full">
                                                            <User className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold">
                                                                {prescription.patient?.full_name || 'Paciente'}
                                                            </h3>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Calendar className="w-3 h-3" />
                                                                {formatDate(prescription.created_at)}
                                                                <span>•</span>
                                                                <span>Dr(a). {prescription.doctor?.full_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Medications summary */}
                                                    <div className="pl-11 space-y-1.5 mt-2">
                                                        {prescription.items?.slice(0, 3).map((med, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded"
                                                            >
                                                                <Pill className="w-4 h-4 text-primary shrink-0" />
                                                                <span className="font-medium">{med.medication_name}</span>
                                                                <span className="text-muted-foreground">•</span>
                                                                <span className="text-muted-foreground">
                                                                    {med.dosage} - {med.frequency}
                                                                    {med.duration ? ` - ${med.duration}` : ''}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {(prescription.items?.length || 0) > 3 && (
                                                            <div className="text-xs text-muted-foreground pl-6">
                                                                +{prescription.items.length - 3} medicamento(s)
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Signature info */}
                                                    {prescription.signed_at && (
                                                        <div className="pl-11 flex items-center gap-1.5 text-xs text-green-700">
                                                            <ShieldCheck className="w-3 h-3" />
                                                            Assinada em {new Date(prescription.signed_at).toLocaleString('pt-BR')}
                                                        </div>
                                                    )}

                                                    {prescription.sent_at && (
                                                        <div className="pl-11 flex items-center gap-1.5 text-xs text-blue-700">
                                                            <Send className="w-3 h-3" />
                                                            Enviada por {prescription.sent_via === 'whatsapp' ? 'WhatsApp' : 'E-mail'} em{' '}
                                                            {new Date(prescription.sent_at).toLocaleString('pt-BR')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                                    <Badge className={cn('text-xs', status.color)}>
                                                        {status.label}
                                                    </Badge>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleView(prescription)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Ver
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(`/api/prescriptions/${prescription.id}/pdf`, '_blank')}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>

                                                    {prescription.status === 'DRAFT' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleSign(prescription)}
                                                        >
                                                            <ShieldCheck className="w-4 h-4 mr-1" />
                                                            Assinar
                                                        </Button>
                                                    )}

                                                    {prescription.status === 'SIGNED' && (
                                                        <Button size="sm" onClick={() => handleSend(prescription)}>
                                                            <Send className="w-4 h-4 mr-1" />
                                                            Enviar
                                                        </Button>
                                                    )}

                                                    {prescription.status === 'SENT' && (
                                                        <Button variant="outline" size="sm" onClick={() => handleSend(prescription)}>
                                                            <Send className="w-4 h-4 mr-1" />
                                                            Reenviar
                                                        </Button>
                                                    )}

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {prescription.status === 'DRAFT' && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => handleEdit(prescription)}>
                                                                        <Edit className="w-4 h-4 mr-2" />
                                                                        Editar
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="text-destructive"
                                                                        onClick={() => handleDelete(prescription.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                                        Excluir
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        ) : (
                            <Card>
                                <CardContent className="pt-12 pb-12 text-center">
                                    <Clipboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                    <p className="font-medium">Nenhuma prescrição encontrada</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Clique em &quot;Nova Prescrição&quot; para criar
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* ── New Prescription Dialog ── */}
                <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nova Prescrição</DialogTitle>
                            <DialogDescription>
                                Crie uma nova prescrição médica digital
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Patient Select */}
                            <div className="space-y-2">
                                <Label>Paciente *</Label>
                                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o paciente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.full_name} {p.cpf ? `(${p.cpf})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedPatientId && (
                                <PrescriptionForm
                                    onSubmit={(data) => {
                                        createMutation.mutate({
                                            patient_id: selectedPatientId,
                                            items: data.items,
                                            notes: data.notes,
                                        })
                                    }}
                                    onCancel={() => setShowNewDialog(false)}
                                    isSubmitting={createMutation.isPending}
                                    submitLabel="Criar Prescrição"
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ── Edit Prescription Dialog ── */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Editar Prescrição</DialogTitle>
                            <DialogDescription>
                                Edite os medicamentos da prescrição (somente rascunhos)
                            </DialogDescription>
                        </DialogHeader>

                        {selectedPrescription && (
                            <PrescriptionForm
                                initialItems={selectedPrescription.items?.map(i => ({
                                    medication_name: i.medication_name,
                                    dosage: i.dosage,
                                    frequency: i.frequency,
                                    duration: i.duration || '',
                                    instructions: i.instructions || '',
                                }))}
                                initialNotes={selectedPrescription.notes || ''}
                                onSubmit={(data) => {
                                    updateMutation.mutate({
                                        id: selectedPrescription.id,
                                        items: data.items,
                                        notes: data.notes,
                                    })
                                }}
                                onCancel={() => setShowEditDialog(false)}
                                isSubmitting={updateMutation.isPending}
                                submitLabel="Salvar Alterações"
                            />
                        )}
                    </DialogContent>
                </Dialog>

                {/* ── View Dialog ── */}
                <PrescriptionViewDialog
                    open={showViewDialog}
                    onOpenChange={setShowViewDialog}
                    prescription={selectedPrescription}
                    onSign={() => {
                        setShowViewDialog(false)
                        if (selectedPrescription) handleSign(selectedPrescription)
                    }}
                    onSend={() => {
                        setShowViewDialog(false)
                        if (selectedPrescription) handleSend(selectedPrescription)
                    }}
                />

                {/* ── Sign Dialog ── */}
                {selectedPrescription && (
                    <PrescriptionSignDialog
                        open={showSignDialog}
                        onOpenChange={setShowSignDialog}
                        prescriptionId={selectedPrescription.id}
                        onSuccess={refreshData}
                    />
                )}

                {/* ── Send Dialog ── */}
                {selectedPrescription && (
                    <PrescriptionSendDialog
                        open={showSendDialog}
                        onOpenChange={setShowSendDialog}
                        prescriptionId={selectedPrescription.id}
                        patientName={selectedPrescription.patient?.full_name || 'Paciente'}
                        patientPhone={selectedPrescription.patient?.phone}
                        patientEmail={selectedPrescription.patient?.email}
                        onSuccess={refreshData}
                    />
                )}
            </div>
        </FeatureGate>
    )
}
