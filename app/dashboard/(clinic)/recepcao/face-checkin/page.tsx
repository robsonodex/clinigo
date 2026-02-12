'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, QrCode, CheckCircle, UserCheck, Clock,
    RefreshCw, Loader2, User, Calendar
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

interface PreCheckinPatient {
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    doctor_name: string | null;
    appointment_time: string | null;
    checked_in_at: string;
    already_checked_in: boolean;
}

export default function EasyCheckInPage() {
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();
    const [patients, setPatients] = useState<PreCheckinPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    const clinicId = user?.clinic_id;

    const loadPreCheckinPatients = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        try {
            const supabase = createClient();
            const today = new Date().toISOString().split('T')[0];

            // Fetch today's appointments
            const { data: appointments, error: aptError } = await (supabase as any)
                .from('appointments')
                .select(`
                    id,
                    patient_id,
                    status,
                    checked_in_at,
                    appointment_date,
                    start_time,
                    patients(full_name),
                    doctors(user:users(full_name))
                `)
                .eq('clinic_id', clinicId)
                .eq('appointment_date', today)
                .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING']);

            if (aptError || !appointments || appointments.length === 0) {
                setPatients([]);
                setLoading(false);
                return;
            }

            const appointmentIds = appointments.map((a: any) => a.id);

            // Fetch pre-checkin submissions for today's appointments
            const { data: submissions } = await (supabase as any)
                .from('pre_checkin_submissions')
                .select('appointment_id, checked_in_at, status')
                .in('appointment_id', appointmentIds)
                .eq('status', 'completed');

            if (!submissions || submissions.length === 0) {
                setPatients([]);
                setLoading(false);
                return;
            }

            // Map submissions to patients
            const preCheckinPatients: PreCheckinPatient[] = [];
            for (const sub of submissions) {
                const apt = appointments.find((a: any) => a.id === sub.appointment_id);
                if (!apt) continue;

                preCheckinPatients.push({
                    appointment_id: apt.id,
                    patient_id: apt.patient_id,
                    patient_name: apt.patients?.full_name || 'Paciente',
                    doctor_name: apt.doctors?.user?.full_name || null,
                    appointment_time: apt.start_time || null,
                    checked_in_at: sub.checked_in_at,
                    already_checked_in: !!apt.checked_in_at,
                });
            }

            setPatients(preCheckinPatients);
        } catch (error) {
            console.error('Error loading pre-checkin patients:', error);
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => {
        loadPreCheckinPatients();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadPreCheckinPatients, 30000);
        return () => clearInterval(interval);
    }, [loadPreCheckinPatients]);

    const handleConfirmCheckIn = async (appointmentId: string, patientName: string) => {
        setConfirmingId(appointmentId);
        try {
            const res = await fetch(`/api/reception/checkin/${appointmentId}`, {
                method: 'POST',
            });

            if (res.ok) {
                toast({
                    title: 'Check-in confirmado!',
                    description: `${patientName} foi adicionado(a) à fila de atendimento.`,
                });
                // Refresh list
                await loadPreCheckinPatients();
            } else {
                throw new Error('Falha no check-in');
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível confirmar o check-in.',
            });
        } finally {
            setConfirmingId(null);
        }
    };

    if (!clinicId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p>Carregando informações da clínica...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const pendingPatients = patients.filter(p => !p.already_checked_in);
    const confirmedPatients = patients.filter(p => p.already_checked_in);

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <h1 className="text-xl font-bold">Check-in Fácil</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={loadPreCheckinPatients}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Atualizar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/recepcao')}>
                            <QrCode className="w-4 h-4 mr-2" />
                            QR Code
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container py-8 px-4 max-w-4xl mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-muted-foreground">Carregando pacientes...</p>
                    </div>
                ) : patients.length === 0 ? (
                    <Card className="max-w-md mx-auto">
                        <CardContent className="pt-6 text-center space-y-4">
                            <User className="w-16 h-16 text-muted-foreground mx-auto" />
                            <h2 className="text-xl font-bold">Nenhum Pré-Check-in</h2>
                            <p className="text-muted-foreground">
                                Não há pacientes que realizaram pré-check-in online agendados para hoje.
                            </p>
                            <Button variant="outline" onClick={() => router.push('/dashboard/recepcao')}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar para Recepção
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Pending check-ins */}
                        {pendingPatients.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                    Aguardando Confirmação ({pendingPatients.length})
                                </h2>
                                <div className="grid gap-3">
                                    {pendingPatients.map((patient) => (
                                        <Card
                                            key={patient.appointment_id}
                                            className="border-2 border-amber-200 hover:border-emerald-400 transition-colors"
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                                            <UserCheck className="w-6 h-6 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-lg">{patient.patient_name}</h3>
                                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                                {patient.doctor_name && (
                                                                    <span className="flex items-center gap-1">
                                                                        <User className="w-3 h-3" />
                                                                        Dr(a). {patient.doctor_name}
                                                                    </span>
                                                                )}
                                                                {patient.appointment_time && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="w-3 h-3" />
                                                                        {patient.appointment_time}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <Badge variant="outline" className="mt-1 text-xs text-amber-600 border-amber-300">
                                                                Pré-check-in realizado
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleConfirmCheckIn(patient.appointment_id, patient.patient_name)}
                                                        disabled={confirmingId === patient.appointment_id}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-5 text-base"
                                                    >
                                                        {confirmingId === patient.appointment_id ? (
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <CheckCircle className="w-5 h-5 mr-2" />
                                                                Confirmar
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Already confirmed */}
                        {confirmedPatients.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    Já Confirmados ({confirmedPatients.length})
                                </h2>
                                <div className="grid gap-2">
                                    {confirmedPatients.map((patient) => (
                                        <Card
                                            key={patient.appointment_id}
                                            className="border border-green-200 bg-green-50/50 opacity-75"
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                        <span className="font-medium">{patient.patient_name}</span>
                                                        {patient.doctor_name && (
                                                            <span className="text-sm text-muted-foreground">
                                                                — Dr(a). {patient.doctor_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Badge className="bg-green-600 text-white text-xs">
                                                        Check-in realizado
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
