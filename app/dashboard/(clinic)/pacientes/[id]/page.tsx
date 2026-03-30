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
    MapPin,
    CreditCard,
    Camera,
    Shield,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Edit2
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
    address: z.string().optional(),
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

    // Edit state
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const form = useForm<PatientFormData>({
        resolver: zodResolver(PatientFormSchema),
        defaultValues: { full_name: '', cpf: '', email: '', phone: '', date_of_birth: '', address: '', insurance_holder_name: '', insurance_holder_cpf: '' },
    });

    const clinicId = user?.clinic_id;

    useEffect(() => {
        if (patientId) {
            loadPatient();
            loadBiometricStatus();
        }
    }, [patientId]);

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
            form.reset({
                full_name: d.full_name || '',
                cpf: d.cpf || '',
                email: d.email || '',
                phone: d.phone || '',
                date_of_birth: d.birth_date || d.date_of_birth || '',
                gender: d.gender || 'M',
                address: typeof d.address === 'object' ? (JSON.stringify(d.address) === '{}' ? '' : JSON.stringify(d.address)) : (d.address || ''),
                insurance_holder_name: d.insurance_holder_name || '',
                insurance_holder_cpf: d.insurance_holder_cpf || '',
            });
        }
        setIsLoading(false);
    };

    const handleEditSubmit = async (data: PatientFormData) => {
        setIsSaving(true);
        try {
            const mappedData: any = { ...data };

            if (!mappedData.date_of_birth) mappedData.date_of_birth = null;
            if (!mappedData.email) mappedData.email = null;
            if (!mappedData.address) mappedData.address = null;
            if (mappedData.cpf) {
                mappedData.cpf = mappedData.cpf.replace(/\D/g, '');
            } else {
                mappedData.cpf = null;
            }

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

                </TabsList>

                {/* Tab: Informações */}
                <TabsContent value="info">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados Pessoais</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            {patient.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span>{patient.email}</span>
                                </div>
                            )}
                            {patient.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span>{patient.phone}</span>
                                </div>
                            )}
                            {patient.cpf && (
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
                            {patient.address && typeof patient.address !== 'object' && (
                                <div className="flex items-center gap-2 md:col-span-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <span>{String(patient.address)}</span>
                                </div>
                            )}
                            {(patient as any).insurance_holder_name && (
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span><strong>Titular:</strong> {(patient as any).insurance_holder_name}</span>
                                </div>
                            )}
                            {(patient as any).insurance_holder_cpf && (
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    <span><strong>CPF Titular:</strong> {(patient as any).insurance_holder_cpf}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
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

                            <div className="space-y-2">
                                <Label htmlFor="address">Endereço</Label>
                                <Input id="address" type="text" {...form.register('address')} />
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
