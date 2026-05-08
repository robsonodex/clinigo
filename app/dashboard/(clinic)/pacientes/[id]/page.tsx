// app/dashboard/(clinic)/pacientes/[id]/page.tsx
// CliniGo - Página de detalhes do paciente com cadastro biométrico

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    Calendar,
    CalendarDays,
    MapPin,
    CreditCard,
    Camera,
    Shield,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Edit2,
    XCircle,
    Clock,
    CheckSquare,
    Square,
    FileText,
    History,
    Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FaceEnrollment } from '@/components/face-recognition';
import { useUser } from '@/hooks/use-user';
import { PatientDocuments } from '@/components/patients/PatientDocuments';
import { PatientEvolutions } from '@/components/patients/PatientEvolutions';
import { PatientReimbursement } from '@/components/patients/PatientReimbursement';

interface Patient {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    cpf?: string;
    birth_date?: string;
    address?: string;
    created_at: string;
}

interface BiometricStatus {
    hasBiometrics: boolean;
    biometrics?: {
        id: string;
        consent_given: boolean;
        consent_date: string;
        detection_score: number;
        created_at: string;
        reference_image_url?: string;
    };
}

const PatientFormSchema = z.object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
    date_of_birth: z.string().optional(),
    gender: z.enum(['M', 'F', 'O']).optional(),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_complement: z.string().optional(),
    address_neighborhood: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().max(2).optional(),
    address_zip_code: z.string().optional(),
    insurance_holder_name: z.string().optional(),
    insurance_holder_cpf: z.string().optional(),
});
type PatientFormData = z.infer<typeof PatientFormSchema>;

export default function PatientDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const patientId = params.id as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEnrollment, setShowEnrollment] = useState(false);

    // Appointments state
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [cancellingBulk, setCancellingBulk] = useState(false);

    // Edit state
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const form = useForm<PatientFormData>({
        resolver: zodResolver(PatientFormSchema),
        defaultValues: { full_name: '', cpf: '', email: '', phone: '', date_of_birth: '', address_street: '', address_number: '', address_complement: '', address_neighborhood: '', address_city: '', address_state: '', address_zip_code: '', insurance_holder_name: '', insurance_holder_cpf: '' },
    });

    const clinicId = user?.clinic_id;

    useEffect(() => {
        if (patientId) {
            loadPatient();
            loadBiometricStatus();
            loadAppointments();
        }
    }, [patientId]);

    const loadAppointments = async () => {
        setLoadingAppointments(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('appointments')
                .select('*, doctors!inner(id, user_id, specialty, users:user_id(full_name))')
                .eq('patient_id', patientId)
                .order('appointment_date', { ascending: false })
                .order('appointment_time', { ascending: false });

            if (error) {
                console.error('[PatientDetail] Error loading appointments:', error);
                // Fallback without join
                const { data: fallbackData } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('patient_id', patientId)
                    .order('appointment_date', { ascending: false });
                setAppointments(fallbackData || []);
            } else {
                setAppointments(data || []);
            }
        } catch (err) {
            console.error('[PatientDetail] Unexpected error loading appointments:', err);
        } finally {
            setLoadingAppointments(false);
        }
    };

    const handleCancelAppointment = async (appointmentId: string) => {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
        setCancellingId(appointmentId);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'CANCELLED' })
                .eq('id', appointmentId);
            if (error) throw error;
            toast.success('Agendamento cancelado com sucesso!');
            loadAppointments();
        } catch (err: any) {
            toast.error('Erro ao cancelar agendamento: ' + err.message);
        } finally {
            setCancellingId(null);
        }
    };

    const cancellableAppointments = appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT');

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === cancellableAppointments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(cancellableAppointments.map(a => a.id)));
        }
    };

    const handleBulkCancel = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Tem certeza que deseja cancelar ${selectedIds.size} agendamento(s) selecionado(s)?`)) return;
        setCancellingBulk(true);
        try {
            const supabase = createClient();
            const ids = Array.from(selectedIds);
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'CANCELLED' })
                .in('id', ids);
            if (error) throw error;
            toast.success(`${ids.length} agendamento(s) cancelado(s) com sucesso!`);
            setSelectedIds(new Set());
            loadAppointments();
        } catch (err: any) {
            toast.error('Erro ao cancelar agendamentos: ' + err.message);
        } finally {
            setCancellingBulk(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
            'CONFIRMED': { label: 'Confirmado', variant: 'default' },
            'PENDING_PAYMENT': { label: 'Pendente', variant: 'secondary' },
            'COMPLETED': { label: 'Realizado', variant: 'outline' },
            'CANCELLED': { label: 'Cancelado', variant: 'destructive' },
            'NO_SHOW': { label: 'Não compareceu', variant: 'destructive' },
        };
        const s = map[status] || { label: status, variant: 'secondary' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
    };

    const loadPatient = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (error) {
            toast.error('Erro ao carregar paciente');
            console.error(error);
            return;
        }

        setPatient(data);
        if (data) {
            const d = data as any;
            
            // Helper to format the address object to a readable string
            const formatAddress = (addr: any) => {
                if (!addr) return '';
                if (typeof addr === 'string') return addr;
                if (typeof addr === 'object') {
                    const parts = [];
                    if (addr.street) {
                       const streetParts = [addr.street];
                       if (addr.number) streetParts.push(addr.number);
                       parts.push(streetParts.join(', '));
                    }
                    if (addr.complement && addr.complement !== 'N/A') parts.push(addr.complement);
                    if (addr.neighborhood) parts.push(addr.neighborhood);
                    if (addr.city) parts.push(`${addr.city} - ${addr.state}`);
                    if (addr.zip_code) {
                       const zip = addr.zip_code.replace(/\D/g, '');
                       if (zip.length === 8) {
                           parts.push(`CEP: ${zip.slice(0, 5)}-${zip.slice(5)}`);
                       } else {
                           parts.push(`CEP: ${zip}`);
                       }
                    }
                    return parts.join(', ');
                }
                return String(addr);
            };

            const formattedAddress = formatAddress(d.address);

            // Extract address fields from JSONB or separate columns
            const addr = d.address && typeof d.address === 'object' ? d.address : {};
            form.reset({
                full_name: d.full_name || '',
                cpf: d.cpf || '',
                email: d.email || '',
                phone: d.phone || '',
                date_of_birth: d.birth_date || d.date_of_birth || '',
                gender: d.gender || 'M',
                address_street: addr.street || '',
                address_number: addr.number || d.address_number || '',
                address_complement: (addr.complement && addr.complement !== 'N/A' ? addr.complement : '') || d.address_complement || '',
                address_neighborhood: addr.neighborhood || d.neighborhood || '',
                address_city: addr.city || d.city || '',
                address_state: addr.state || d.state || '',
                address_zip_code: addr.zip_code || d.zip_code || '',
                insurance_holder_name: d.insurance_holder_name || '',
                insurance_holder_cpf: d.insurance_holder_cpf || '',
            });
            // Update the display address so the tab also shows the formatted version
            if (d.address && typeof d.address === 'object') {
                d.addressText = formattedAddress;
            } else {
                d.addressText = d.address;
            }
        }
        setIsLoading(false);
    };

    const handleEditSubmit = async (data: PatientFormData) => {
        setIsSaving(true);
        try {
            // Build address JSONB object from separate fields
            const addressObj: any = {};
            if (data.address_street) addressObj.street = data.address_street;
            if (data.address_number) addressObj.number = data.address_number;
            if (data.address_complement) addressObj.complement = data.address_complement;
            if (data.address_neighborhood) addressObj.neighborhood = data.address_neighborhood;
            if (data.address_city) addressObj.city = data.address_city;
            if (data.address_state) addressObj.state = data.address_state;
            if (data.address_zip_code) addressObj.zip_code = data.address_zip_code.replace(/\D/g, '');

            const mappedData: any = {
                full_name: data.full_name,
                cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
                email: data.email || null,
                phone: data.phone,
                date_of_birth: data.date_of_birth || null,
                gender: data.gender,
                address: Object.keys(addressObj).length > 0 ? addressObj : null,
                insurance_holder_name: data.insurance_holder_name || null,
                insurance_holder_cpf: data.insurance_holder_cpf ? data.insurance_holder_cpf.replace(/\D/g, '') : null,
            };

            const response = await fetch(`/api/patients/${patientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mappedData),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro ao atualizar paciente');
            }
            toast.success('Paciente atualizado com sucesso!');
            setShowEditModal(false);
            loadPatient();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const loadBiometricStatus = async () => {
        const response = await fetch(`/api/patients/${patientId}/biometrics`);
        if (response.ok) {
            const data = await response.json();
            setBiometricStatus(data);
        }
    };

    const handleDeleteBiometrics = async () => {
        if (!confirm('Tem certeza que deseja excluir a biometria facial? Esta ação não pode ser desfeita.')) {
            return;
        }

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/patients/${patientId}/biometrics`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir biometria');
            }

            toast.success('Biometria excluída com sucesso');
            setBiometricStatus({ hasBiometrics: false });
        } catch (error) {
            toast.error('Erro ao excluir biometria');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEnrollmentComplete = () => {
        setShowEnrollment(false);
        loadBiometricStatus();
        toast.success('Biometria cadastrada com sucesso!');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="container py-8">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <h2 className="text-xl font-bold">Paciente não encontrado</h2>
                        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                            Voltar
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{typeof patient.full_name === 'object' ? '-' : patient.full_name}</h1>
                        <p className="text-muted-foreground">
                            Cadastrado em {patient.created_at && typeof patient.created_at !== 'object' ? new Date(patient.created_at).toLocaleDateString('pt-BR') : '-'}
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => setShowEditModal(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                </Button>
            </div>

            <Tabs defaultValue="info" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="info" className="gap-2">
                        <User className="w-4 h-4" />
                        Informações
                    </TabsTrigger>
                    <TabsTrigger value="appointments" className="gap-2">
                        <CalendarDays className="w-4 h-4" />
                        Agendamentos
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Documentos
                    </TabsTrigger>
                    <TabsTrigger value="evolutions" className="gap-2">
                        <History className="w-4 h-4" />
                        Evoluções
                    </TabsTrigger>
                    {user?.role !== 'DOCTOR' && (
                    <TabsTrigger value="reimbursement" className="gap-2">
                        <Receipt className="w-4 h-4" />
                        Reembolso
                    </TabsTrigger>
                    )}
                </TabsList>

                {/* Tab: Informações */}
                <TabsContent value="info">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados Pessoais</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            {/* Dados sensíveis ocultos para terapeutas (DOCTOR) */}
                            {user?.role !== 'DOCTOR' && patient.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span>{patient.email}</span>
                                </div>
                            )}
                            {user?.role !== 'DOCTOR' && patient.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span>{patient.phone}</span>
                                </div>
                            )}
                            {user?.role !== 'DOCTOR' && patient.cpf && (
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    <span>{patient.cpf}</span>
                                </div>
                            )}
                            {patient.birth_date && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{new Date(patient.birth_date).toLocaleDateString('pt-BR')}</span>
                                </div>
                            )}
                            {user?.role !== 'DOCTOR' && (patient as any).addressText && (
                                <div className="flex items-center gap-2 md:col-span-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <span>{(patient as any).addressText}</span>
                                </div>
                            )}
                            {(patient as any).insurance_holder_name && (
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span><strong>Titular:</strong> {(patient as any).insurance_holder_name}</span>
                                </div>
                            )}
                            {user?.role !== 'DOCTOR' && (patient as any).insurance_holder_cpf && (
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    <span><strong>CPF Titular:</strong> {(patient as any).insurance_holder_cpf}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Agendamentos */}
                <TabsContent value="appointments">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <CalendarDays className="w-5 h-5" />
                                        Agendamentos do Paciente
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {appointments.length} agendamento(s) encontrado(s)
                                        {selectedIds.size > 0 && (
                                            <span className="ml-2 font-medium text-destructive">
                                                • {selectedIds.size} selecionado(s)
                                            </span>
                                        )}
                                    </CardDescription>
                                </div>
                                {cancellableAppointments.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={toggleSelectAll}
                                            className="gap-1.5"
                                        >
                                            {selectedIds.size === cancellableAppointments.length ? (
                                                <CheckSquare className="w-4 h-4" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                            {selectedIds.size === cancellableAppointments.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                        </Button>
                                        {selectedIds.size > 0 && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={handleBulkCancel}
                                                disabled={cancellingBulk}
                                                className="gap-1.5"
                                            >
                                                {cancellingBulk ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <XCircle className="w-4 h-4" />
                                                )}
                                                Cancelar {selectedIds.size}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingAppointments ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : appointments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum agendamento encontrado para este paciente.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {appointments.map((apt) => {
                                        const doctorName = apt.doctors?.users?.full_name || apt.doctors?.specialty || 'Profissional';
                                        const canCancel = apt.status === 'CONFIRMED' || apt.status === 'PENDING_PAYMENT';
                                        return (
                                            <div
                                                key={apt.id}
                                                className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${selectedIds.has(apt.id) ? 'border-destructive/50 bg-destructive/5' : ''}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {canCancel && (
                                                        <button
                                                            onClick={() => toggleSelect(apt.id)}
                                                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                                        >
                                                            {selectedIds.has(apt.id) ? (
                                                                <CheckSquare className="w-5 h-5 text-destructive" />
                                                            ) : (
                                                                <Square className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    )}
                                                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-primary/10 rounded-lg">
                                                        <span className="text-xs font-medium text-primary">
                                                            {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', { year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{doctorName}</p>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{apt.appointment_time?.substring(0, 5) || '--:--'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(apt.status)}
                                                    {canCancel && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={cancellingId === apt.id}
                                                            onClick={() => handleCancelAppointment(apt.id)}
                                                        >
                                                            {cancellingId === apt.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <XCircle className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Documentos */}
                <TabsContent value="documents">
                    {clinicId && <PatientDocuments patientId={patientId} clinicId={clinicId} />}
                </TabsContent>

                {/* Tab: Evoluções */}
                <TabsContent value="evolutions">
                    <PatientEvolutions patientId={patientId} />
                </TabsContent>

                {/* Tab: Reembolso — oculto para terapeutas (DOCTOR) */}
                {user?.role !== 'DOCTOR' && (
                <TabsContent value="reimbursement">
                    {clinicId && (
                        <PatientReimbursement
                            patientId={patientId}
                            clinicId={clinicId}
                            patientName={typeof patient.full_name === 'object' ? '' : patient.full_name}
                            patientCpf={(patient as any).cpf}
                        />
                    )}
                </TabsContent>
                )}
            </Tabs>

            {/* Edit Patient Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="w-5 h-5" />
                            Editar Paciente
                        </DialogTitle>
                        <DialogDescription>
                            Atualize os dados do paciente.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nome Completo *</Label>
                                <Input id="full_name" placeholder="Ex: João da Silva" {...form.register('full_name')} />
                                {form.formState.errors.full_name && (
                                    <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input id="cpf" placeholder="000.000.000-00" {...form.register('cpf')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Sexo</Label>
                                    <Select 
                                        defaultValue={form.getValues('gender')} 
                                        onValueChange={(value) => form.setValue('gender', value as 'M' | 'F' | 'O')}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="M">Masculino</SelectItem>
                                            <SelectItem value="F">Feminino</SelectItem>
                                            <SelectItem value="O">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone *</Label>
                                <Input id="phone" placeholder="(11) 99999-9999" {...form.register('phone')} />
                                {form.formState.errors.phone && (
                                    <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" type="email" placeholder="paciente@email.com" {...form.register('email')} />
                                {form.formState.errors.email && (
                                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                                <Input id="date_of_birth" type="date" {...form.register('date_of_birth')} />
                            </div>

                            {/* Endereço - Campos separados */}
                            <div className="space-y-2">
                                <Label className="font-semibold">Endereço</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2 space-y-1">
                                        <Label htmlFor="address_street" className="text-xs text-muted-foreground">Rua</Label>
                                        <Input id="address_street" placeholder="Nome da rua" {...form.register('address_street')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_number" className="text-xs text-muted-foreground">Número</Label>
                                        <Input id="address_number" placeholder="Nº" {...form.register('address_number')} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="address_complement" className="text-xs text-muted-foreground">Complemento</Label>
                                        <Input id="address_complement" placeholder="Apto, Bloco..." {...form.register('address_complement')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_neighborhood" className="text-xs text-muted-foreground">Bairro</Label>
                                        <Input id="address_neighborhood" placeholder="Bairro" {...form.register('address_neighborhood')} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-2 space-y-1">
                                        <Label htmlFor="address_city" className="text-xs text-muted-foreground">Cidade</Label>
                                        <Input id="address_city" placeholder="Cidade" {...form.register('address_city')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_state" className="text-xs text-muted-foreground">UF</Label>
                                        <Input id="address_state" placeholder="SP" maxLength={2} {...form.register('address_state')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_zip_code" className="text-xs text-muted-foreground">CEP</Label>
                                        <Input id="address_zip_code" placeholder="00000-000" {...form.register('address_zip_code')} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="insurance_holder_name">Nome do Titular do Plano</Label>
                                    <Input
                                        id="insurance_holder_name"
                                        placeholder="Nome do titular"
                                        {...form.register('insurance_holder_name')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="insurance_holder_cpf">CPF do Titular</Label>
                                    <Input
                                        id="insurance_holder_cpf"
                                        placeholder="000.000.000-00"
                                        {...form.register('insurance_holder_cpf')}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
