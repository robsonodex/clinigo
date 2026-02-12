'use client';

/**
 * CLINIGO PREMIUM - Face Check-In Component
 * Reconhecimento facial para check-in rápido de pacientes
 * 
 * IMPORTANTE: Este componente é ADITIVO - não modifica check-in QR existente
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
    Camera,
    CheckCircle2,
    XCircle,
    User,
    QrCode,
    RefreshCw,
    Loader2
} from 'lucide-react';

interface PatientMatch {
    patient_id: string;
    full_name: string;
    reference_image_url?: string | null;
    confidence: number;
    appointment_id?: string;
}

interface FaceCheckInProps {
    clinicId: string;
    onCheckInSuccess?: (patientId: string, patientName: string) => void;
    onFallbackToQR?: () => void;
}

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const MATCH_THRESHOLD = 0.6; // < 0.6 = mesma pessoa

export function FaceCheckIn({ clinicId, onCheckInSuccess, onFallbackToQR }: FaceCheckInProps) {
    const webcamRef = useRef<Webcam>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [detectedPatient, setDetectedPatient] = useState<PatientMatch | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [checkInCompleted, setCheckInCompleted] = useState<{ name: string } | null>(null);
    const [scanAttempts, setScanAttempts] = useState(0);
    const [biometricsLoaded, setBiometricsLoaded] = useState(false);
    const [patientsWithPhotos, setPatientsWithPhotos] = useState<Array<{ patientId: string; name: string; photoUrl: string; appointmentId?: string }>>([]);
    const descriptorsRef = useRef<Array<{ patientId: string; name: string; descriptor: Float32Array; imageUrl?: string; appointmentId?: string; doctorId?: string }>>([])
    const autoConfirmingRef = useRef(false);;
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Carrega modelos e biometrias
    useEffect(() => {
        const init = async () => {
            try {
                // Carrega modelos face-api
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                // Busca biometrias da clínica
                await loadBiometrics();

                setIsLoading(false);
            } catch (error) {
                console.error('Init error:', error);
                toast.error('Erro ao inicializar sistema facial');
            }
        };

        init();

        return () => {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
            }
        };
    }, [clinicId]);

    const loadBiometrics = async () => {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];

        // Buscar agendamentos do dia com pacientes
        const { data: appointmentsRaw, error: aptError } = await supabase
            .from('appointments')
            .select('id, patient_id, doctor_id, patients(full_name)')
            .eq('clinic_id', clinicId)
            .eq('appointment_date', today)
            .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING'])
            .limit(50);

        const appointments = (appointmentsRaw || []) as Array<{ id: string; patient_id: string; doctor_id: string; patients: { full_name: string } | null }>;

        if (aptError || appointments.length === 0) {
            setBiometricsLoaded(true);
            return;
        }

        const patientIds = appointments.map(a => (a as any).patient_id).filter(Boolean);

        // Buscar fotos do pré-checkin
        const { data: biometricsData } = await supabase
            .from('patient_face_biometrics')
            .select('patient_id, reference_image_url')
            .in('patient_id', patientIds);

        const biometrics = (biometricsData || []) as Array<{ patient_id: string; reference_image_url: string | null }>;

        // Gerar descriptors a partir das fotos usando face-api.js
        const newDescriptors: typeof descriptorsRef.current = [];

        for (const apt of appointments) {
            const bio = biometrics.find(b => b.patient_id === apt.patient_id);
            if (bio?.reference_image_url) {
                try {
                    const img = await faceapi.fetchImage(bio.reference_image_url);
                    const detection = await faceapi
                        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (detection) {
                        newDescriptors.push({
                            patientId: apt.patient_id,
                            name: (apt.patients as any)?.full_name || 'Paciente',
                            descriptor: detection.descriptor,
                            imageUrl: bio.reference_image_url,
                            appointmentId: apt.id,
                            doctorId: apt.doctor_id,
                        });
                    }
                } catch (e) {
                    console.warn('Could not process face from photo for patient:', apt.patient_id, e);
                }
            }
        }

        descriptorsRef.current = newDescriptors;

        // Also load patients with photos for the visual fallback grid
        if (newDescriptors.length === 0) {
            const photoPatients: typeof patientsWithPhotos = [];
            for (const apt of appointments) {
                const bio = biometrics.find(b => b.patient_id === apt.patient_id);
                if (bio?.reference_image_url) {
                    photoPatients.push({
                        patientId: apt.patient_id,
                        name: (apt.patients as any)?.full_name || 'Paciente',
                        photoUrl: bio.reference_image_url,
                        appointmentId: apt.id
                    });
                }
            }
            setPatientsWithPhotos(photoPatients);
        }

        setBiometricsLoaded(true);
    };

    // Fallback: carregar pacientes com agendamento hoje que fizeram pré-checkin com foto
    const loadPatientsWithPhotos = async () => {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];

        // Buscar agendamentos do dia com seus pacientes
        const { data: appointments } = await supabase
            .from('appointments')
            .select(`
                id,
                patient_id,
                patients(id, full_name)
            `)
            .eq('clinic_id', clinicId)
            .eq('appointment_date', today)
            .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING'])
            .limit(50);

        if (!appointments || appointments.length === 0) {
            setPatientsWithPhotos([]);
            return;
        }

        // Buscar biometrias com foto para esses pacientes
        const patientIds = appointments.map(a => (a as any).patient_id).filter(Boolean);

        const { data: biometricsRaw } = await supabase
            .from('patient_face_biometrics')
            .select('patient_id, reference_image_url')
            .in('patient_id', patientIds);

        const biometrics = (biometricsRaw || []) as Array<{ patient_id: string; reference_image_url: string | null }>;

        // Mapear pacientes com fotos
        const photoPatients: typeof patientsWithPhotos = [];
        for (const apt of appointments) {
            const bio = biometrics?.find(b => b.patient_id === (apt as any).patient_id);
            if (bio?.reference_image_url) {
                photoPatients.push({
                    patientId: (apt as any).patient_id,
                    name: ((apt as any).patients as any)?.full_name || 'Paciente',
                    photoUrl: bio.reference_image_url,
                    appointmentId: apt.id
                });
            }
        }

        setPatientsWithPhotos(photoPatients);
    };

    // Loop de detecção contínua
    useEffect(() => {
        if (isLoading || detectedPatient || !biometricsLoaded) return;

        if (descriptorsRef.current.length === 0) {
            // Nenhum descriptor biométrico - tenta carregar pacientes com foto
            loadPatientsWithPhotos();
            return;
        }

        scanIntervalRef.current = setInterval(async () => {
            if (!webcamRef.current || isScanning) return;

            setIsScanning(true);
            setScanAttempts(prev => prev + 1);

            try {
                const imageSrc = webcamRef.current.getScreenshot();
                if (!imageSrc) {
                    setIsScanning(false);
                    return;
                }

                const img = await faceapi.fetchImage(imageSrc);
                const detection = await faceapi
                    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection || detection.detection.score < 0.6) {
                    setIsScanning(false);
                    return;
                }

                // Compara com todas as biometrias
                let bestMatch: { patient: typeof descriptorsRef.current[0]; distance: number } | null = null;

                for (const bio of descriptorsRef.current) {
                    const distance = faceapi.euclideanDistance(detection.descriptor, bio.descriptor);

                    if (distance < MATCH_THRESHOLD && (!bestMatch || distance < bestMatch.distance)) {
                        bestMatch = { patient: bio, distance };
                    }
                }

                if (bestMatch) {
                    // Match encontrado!
                    const matchedPatient: PatientMatch = {
                        patient_id: bestMatch.patient.patientId,
                        full_name: bestMatch.patient.name,
                        reference_image_url: bestMatch.patient.imageUrl,
                        confidence: Math.round((1 - bestMatch.distance) * 100),
                        appointment_id: bestMatch.patient.appointmentId,
                    };
                    setDetectedPatient(matchedPatient);

                    // Som de sucesso
                    try {
                        new Audio('/sounds/success.mp3').play();
                    } catch { }

                    // Para o scan
                    if (scanIntervalRef.current) {
                        clearInterval(scanIntervalRef.current);
                    }

                    // Auto-confirm check-in
                    if (!autoConfirmingRef.current) {
                        autoConfirmingRef.current = true;
                        try {
                            const res = await fetch('/api/checkin/face-confirm', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    appointment_id: bestMatch.patient.appointmentId,
                                    clinic_id: clinicId,
                                    patient_id: bestMatch.patient.patientId,
                                })
                            });
                            const result = await res.json();
                            if (result.success || result.data?.already_in_queue) {
                                toast.success(`Check-in confirmado: ${bestMatch.patient.name}`);
                                setCheckInCompleted({ name: bestMatch.patient.name });
                                onCheckInSuccess?.(bestMatch.patient.patientId, bestMatch.patient.name);
                            } else if (result.error) {
                                toast.error(result.error?.message || result.error);
                                setDetectedPatient(null);
                            }
                        } catch (err) {
                            console.error('Auto-confirm error:', err);
                        } finally {
                            autoConfirmingRef.current = false;
                        }
                    }
                }
            } catch (error) {
                console.error('Scan error:', error);
            } finally {
                setIsScanning(false);
            }
        }, 1000); // Scan a cada 1s

        return () => {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
            }
        };
    }, [isLoading, detectedPatient, biometricsLoaded, isScanning]);

    const confirmCheckIn = async () => {
        if (!detectedPatient) return;

        try {
            // Use the appointment_id from the detected patient, or find it
            let appointmentId = detectedPatient.appointment_id;

            if (!appointmentId) {
                const supabase = createClient();
                const today = new Date().toISOString().split('T')[0];

                const { data: aptData } = await supabase
                    .from('appointments')
                    .select('id')
                    .eq('patient_id', detectedPatient.patient_id)
                    .eq('appointment_date', today)
                    .in('status', ['SCHEDULED', 'CONFIRMED'])
                    .limit(1);

                appointmentId = (aptData as any)?.[0]?.id;
            }

            if (appointmentId) {
                // Add to queue via API
                const res = await fetch('/api/checkin/face-confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appointment_id: appointmentId,
                        clinic_id: clinicId,
                        patient_id: detectedPatient.patient_id,
                    })
                });

                const result = await res.json();
                if (!res.ok && !result.data?.already_in_queue) {
                    const errorMsg = result.error?.message || result.error || 'Erro ao confirmar';
                    toast.error(errorMsg);
                    setDetectedPatient(null);
                    return;
                }
            }

            toast.success(`Check-in confirmado: ${detectedPatient.full_name}`);
            setCheckInCompleted({ name: detectedPatient.full_name });
            onCheckInSuccess?.(detectedPatient.patient_id, detectedPatient.full_name);

        } catch (error) {
            toast.error('Erro ao confirmar check-in');
            console.error('Check-in error:', error);
        }
    };

    const resetDetection = () => {
        setDetectedPatient(null);
        setCheckInCompleted(null);
        setScanAttempts(0);
    };

    // Auto-reset after successful check-in (5 seconds)
    useEffect(() => {
        if (checkInCompleted) {
            const timer = setTimeout(() => {
                setCheckInCompleted(null);
                setDetectedPatient(null);
                setScanAttempts(0);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [checkInCompleted]);

    // Check-in completed - show success screen (camera closed)
    if (checkInCompleted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-14 h-14 text-green-600" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-green-700 mb-2">Check-in Realizado com Sucesso!</h2>
                    <p className="text-lg text-muted-foreground">{checkInCompleted.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">Paciente adicionado à fila de atendimento</p>
                </div>
                <Button variant="outline" onClick={resetDetection} className="mt-4">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Próximo Check-in
                </Button>
            </div>
        );
    }

    // Loading
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg">Inicializando reconhecimento facial...</p>
            </div>
        );
    }

    // Nenhuma biometria cadastrada - mostra pacientes com foto para seleção manual
    if (biometricsLoaded && descriptorsRef.current.length === 0) {
        // Se há pacientes com foto, mostrar grid para seleção
        if (patientsWithPhotos.length > 0) {
            return (
                <div className="space-y-6 p-4">
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">Check-in Visual</h2>
                        <p className="text-muted-foreground">Toque na foto do paciente para confirmar</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {patientsWithPhotos.map((patient) => (
                            <Card
                                key={patient.patientId}
                                className="cursor-pointer hover:border-primary transition-colors"
                                onClick={() => setDetectedPatient({
                                    patient_id: patient.patientId,
                                    full_name: patient.name,
                                    reference_image_url: patient.photoUrl,
                                    confidence: 100
                                })}
                            >
                                <CardContent className="p-3 text-center">
                                    <img
                                        src={patient.photoUrl}
                                        alt={patient.name}
                                        className="w-24 h-24 rounded-full mx-auto object-cover mb-2"
                                    />
                                    <p className="font-medium text-sm truncate">{patient.name}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={() => loadPatientsWithPhotos()}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Atualizar
                        </Button>
                        <Button variant="outline" onClick={onFallbackToQR}>
                            <QrCode className="w-4 h-4 mr-2" />
                            QR Code
                        </Button>
                    </div>

                    {/* Modal de confirmação */}
                    {detectedPatient && (
                        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                            <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                                <img
                                    src={detectedPatient.reference_image_url || ''}
                                    alt={detectedPatient.full_name}
                                    className="w-32 h-32 rounded-full mx-auto object-cover mb-4 border-4 border-primary"
                                />
                                <h2 className="text-2xl font-bold mb-2">{detectedPatient.full_name}</h2>
                                <p className="text-muted-foreground mb-6">Confirma o check-in?</p>
                                <div className="flex gap-4 justify-center">
                                    <Button onClick={confirmCheckIn} className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Confirmar
                                    </Button>
                                    <Button variant="outline" onClick={resetDetection}>
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Nenhum paciente com foto - fallback original
        return (
            <Card className="max-w-md mx-auto">
                <CardContent className="pt-6 text-center space-y-4">
                    <User className="w-16 h-16 text-muted-foreground mx-auto" />
                    <h2 className="text-xl font-bold">Nenhum Paciente com Foto</h2>
                    <p className="text-muted-foreground">
                        Não há pacientes com foto do pré-check-in agendados para hoje.
                    </p>
                    <Button variant="outline" onClick={onFallbackToQR}>
                        <QrCode className="w-4 h-4 mr-2" />
                        Usar Check-in por QR Code
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 p-4">
            {/* Câmera */}
            <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    mirrored
                    videoConstraints={{
                        facingMode: 'user',
                        width: 1280,
                        height: 720
                    }}
                />

                {/* Overlay de scan */}
                {!detectedPatient && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`
                            w-64 h-80 border-4 rounded-[50%] transition-colors duration-300
                            ${isScanning ? 'border-primary animate-pulse' : 'border-white/30'}
                        `} />
                    </div>
                )}

                {/* Status badge */}
                <div className="absolute top-4 right-4">
                    <Badge variant={isScanning ? 'default' : 'secondary'}>
                        {isScanning ? 'Analisando...' : `${descriptorsRef.current.length} pacientes`}
                    </Badge>
                </div>

                {/* Match encontrado */}
                {detectedPatient && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white animate-in fade-in zoom-in duration-300">
                        <div className="text-6xl mb-4">👋</div>
                        <h2 className="text-3xl font-bold mb-2">Olá, {detectedPatient.full_name}!</h2>
                        <p className="text-lg mb-2 text-white/80">
                            Confiança: {detectedPatient.confidence}%
                        </p>
                        <p className="text-lg mb-6">Confirma seu check-in?</p>

                        <div className="flex gap-4">
                            <Button
                                size="lg"
                                onClick={confirmCheckIn}
                                className="bg-green-600 hover:bg-green-700 text-lg px-8"
                            >
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                Sim, confirmar
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={resetDetection}
                                className="text-white border-white/50 hover:bg-white/10"
                            >
                                <XCircle className="w-5 h-5 mr-2" />
                                Não sou eu
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Instruções e fallback */}
            <div className="text-center space-y-3">
                <p className="text-muted-foreground">
                    Posicione seu rosto no círculo para check-in automático
                </p>

                <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => loadBiometrics()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar Lista
                    </Button>
                    <Button variant="outline" onClick={onFallbackToQR}>
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Code
                    </Button>
                </div>

                {scanAttempts > 10 && !detectedPatient && (
                    <p className="text-sm text-amber-600">
                        Dificuldade em reconhecer? Tente melhorar a iluminação ou use QR Code.
                    </p>
                )}
            </div>
        </div>
    );
}
