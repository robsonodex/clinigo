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
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
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
        setIsLoading(false);
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
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{patient.full_name}</h1>
                    <p className="text-muted-foreground">
                        Cadastrado em {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="info" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="info" className="gap-2">
                        <User className="w-4 h-4" />
                        Informações
                    </TabsTrigger>
                    <TabsTrigger value="biometria" className="gap-2">
                        <Camera className="w-4 h-4" />
                        Biometria Facial
                        {biometricStatus?.hasBiometrics && (
                            <Badge variant="default" className="ml-1 h-5 px-1.5">
                                <CheckCircle2 className="w-3 h-3" />
                            </Badge>
                        )}
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
                            {patient.address && (
                                <div className="flex items-center gap-2 md:col-span-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <span>{patient.address}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Biometria Facial */}
                <TabsContent value="biometria">
                    {showEnrollment ? (
                        <FaceEnrollment
                            patientId={patientId}
                            clinicId={clinicId || ''}
                            patientName={patient.full_name}
                            onComplete={handleEnrollmentComplete}
                            onCancel={() => setShowEnrollment(false)}
                        />
                    ) : biometricStatus?.hasBiometrics ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    Biometria Cadastrada
                                </CardTitle>
                                <CardDescription>
                                    O paciente pode fazer check-in por reconhecimento facial
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Cadastrado em</p>
                                        <p className="font-medium">
                                            {new Date(biometricStatus.biometrics!.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Qualidade da detecção</p>
                                        <p className="font-medium">
                                            {((biometricStatus.biometrics?.detection_score || 0) * 100).toFixed(0)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Consentimento LGPD</p>
                                        <Badge variant="default">
                                            <Shield className="w-3 h-3 mr-1" />
                                            Concedido
                                        </Badge>
                                    </div>
                                </div>

                                {biometricStatus.biometrics?.reference_image_url && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">Referência</p>
                                        <img
                                            src={biometricStatus.biometrics.reference_image_url}
                                            alt="Foto de referência"
                                            className="w-32 h-32 object-cover rounded-lg border"
                                        />
                                    </div>
                                )}

                                <Separator />

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowEnrollment(true)}
                                    >
                                        <Camera className="w-4 h-4 mr-2" />
                                        Recadastrar
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteBiometrics}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 mr-2" />
                                        )}
                                        Excluir Biometria
                                    </Button>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Conforme LGPD, o paciente pode solicitar a exclusão de sua biometria a qualquer momento.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Cadastro Biométrico</CardTitle>
                                <CardDescription>
                                    Cadastre a biometria facial para check-in rápido
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                                    <Camera className="w-8 h-8 text-primary mt-1" />
                                    <div>
                                        <h3 className="font-medium">Check-in por Reconhecimento Facial</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Com a biometria cadastrada, o paciente poderá fazer check-in
                                            apenas olhando para a câmera na recepção. Rápido e seguro.
                                        </p>
                                    </div>
                                </div>

                                <Button onClick={() => setShowEnrollment(true)} className="w-full">
                                    <Camera className="w-4 h-4 mr-2" />
                                    Iniciar Cadastro Facial
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
