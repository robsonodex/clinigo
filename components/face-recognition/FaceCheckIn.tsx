'use client';

/**
 * CLINIGO PREMIUM - Face Check-In Component
 * Reconhecimento facial para check-in rapido de pacientes
 * 
 * IMPORTANTE: Este componente e ADITIVO - nao modifica check-in QR existente
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
    Loader2,
    UserCheck
} from 'lucide-react';

interface PatientMatch {
    patient_id: string;
    full_name: string;
    reference_image_url?: string | null;
    confidence: number;
    appointment_id?: string;
    photoUrl?: string;
}

interface FaceCheckInProps {
    clinicId: string;
    onCheckInSuccess?: (patientId: string, patientName: string) => void;
    onFallbackToQR?: () => void;
}

const MODEL_URL = '/models/face-api';

// Canvas reutilizavel para downscale (evita criar canvas a cada frame)
let _downscaleCanvas: HTMLCanvasElement | null = null;
function getDownscaleCanvas(): HTMLCanvasElement {
    if (!_downscaleCanvas) {
        _downscaleCanvas = document.createElement('canvas');
        _downscaleCanvas.width = 480;
        _downscaleCanvas.height = 360;
    }
    return _downscaleCanvas;
}

export function FaceCheckIn({ clinicId, onCheckInSuccess, onFallbackToQR }: FaceCheckInProps) {
    const webcamRef = useRef<Webcam>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [detectedPatient, setDetectedPatient] = useState<PatientMatch | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [checkInCompleted, setCheckInCompleted] = useState<{ name: string } | null>(null);
    const [scanAttempts, setScanAttempts] = useState(0);
    const [patientsWithPhotos, setPatientsWithPhotos] = useState<Array<{ patientId: string; name: string; photoUrl: string; appointmentId?: string }>>([]);
    const [showVisualGrid, setShowVisualGrid] = useState(false);
    const autoConfirmingRef = useRef(false);
    const isScanningRef = useRef(false);
    const detectedPatientRef = useRef<PatientMatch | null>(null);
    const scanLoopRef = useRef<number | null>(null);
    const lastScanTimeRef = useRef(0);
    const scanCountRef = useRef(0);

    // Sync detectedPatient to ref for use in scan loop without causing re-renders
    useEffect(() => {
        detectedPatientRef.current = detectedPatient;
    }, [detectedPatient]);

    // Carrega modelos e fotos de fallback
    useEffect(() => {
        const init = async () => {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                console.log('[FaceCheckIn] Modelos carregados com sucesso');
                setIsLoading(false);

                // Carrega fotos em background (nao bloqueia o scan)
                try {
                    await loadPatientsWithPhotos();
                } catch (e) {
                    console.warn('[FaceCheckIn] Erro ao carregar fotos (nao critico):', e);
                }
            } catch (error) {
                console.error('[FaceCheckIn] Init error:', error);
                toast.error('Erro ao inicializar sistema facial');
            }
        };

        init();

        return () => {
            if (scanLoopRef.current) {
                cancelAnimationFrame(scanLoopRef.current);
            }
        };
    }, [clinicId]);

    const loadPatientsWithPhotos = async () => {
        try {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];

        // Buscar apenas IDs dos agendamentos do dia (sem join para evitar 400)
        const { data: appointments } = await supabase
            .from('appointments')
            .select('id, patient_id')
            .eq('clinic_id', clinicId)
            .eq('appointment_date', today)
            .in('status', ['SCHEDULED', 'CONFIRMED', 'WAITING', 'WAITING_ROOM', 'PENDING_PAYMENT', 'PAYMENT_PENDING'])
            .limit(50);

        if (!appointments || appointments.length === 0) {
            setPatientsWithPhotos([]);
            return;
        }

        const patientIds = [...new Set(appointments.map(a => (a as any).patient_id).filter(Boolean))];

        // Buscar nomes dos pacientes separadamente
        const { data: patientsData } = await supabase
            .from('patients')
            .select('id, full_name')
            .in('id', patientIds);

        const patientMap = new Map<string, string>();
        if (patientsData) {
            for (const p of patientsData) {
                patientMap.set((p as any).id, (p as any).full_name || 'Paciente');
            }
        }

        // Buscar biometrias com foto para esses pacientes
        const { data: biometricsRaw } = await supabase
            .from('patient_face_biometrics')
            .select('patient_id, reference_image_url')
            .in('patient_id', patientIds);

        const biometrics = (biometricsRaw || []) as Array<{ patient_id: string; reference_image_url: string | null }>;

        const photoPatients: typeof patientsWithPhotos = [];
        for (const apt of appointments) {
            const aptAny = apt as any;
            const bio = biometrics.find(b => b.patient_id === aptAny.patient_id);
            if (bio?.reference_image_url) {
                photoPatients.push({
                    patientId: aptAny.patient_id,
                    name: patientMap.get(aptAny.patient_id) || 'Paciente',
                    photoUrl: bio.reference_image_url,
                    appointmentId: aptAny.id
                });
            }
        }

        setPatientsWithPhotos(photoPatients);
        } catch (err) {
            console.warn('[FaceCheckIn] loadPatientsWithPhotos falhou:', err);
            setPatientsWithPhotos([]);
        }
    };

    // Funcao de escaneamento unico otimizado com downscale canvas
    const performScan = useCallback(async () => {
        if (!webcamRef.current || isScanningRef.current || autoConfirmingRef.current || detectedPatientRef.current) return;

        const video = webcamRef.current.video;
        if (!video || video.readyState !== 4 || video.videoWidth === 0) return;

        scanCountRef.current += 1;
        const attempt = scanCountRef.current;

        // Log a cada 10 tentativas para diagnostico
        if (attempt % 10 === 1) {
            console.log(`[FaceCheckIn] Scan #${attempt} - video: ${video.videoWidth}x${video.videoHeight}`);
        }

        isScanningRef.current = true;
        setIsScanning(true);
        setScanAttempts(prev => prev + 1);

        try {
            // Downscale o frame do video para 480x360 via canvas off-screen
            const canvas = getDownscaleCanvas();
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, 480, 360);

            // Detectar face no canvas reduzido
            const detection = await faceapi
                .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.15 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setFaceDetected(false);
                if (attempt % 5 === 0) {
                    console.log(`[FaceCheckIn] Scan #${attempt} - nenhum rosto detectado`);
                }
                return;
            }

            console.log(`[FaceCheckIn] Scan #${attempt} - ROSTO DETECTADO! Score: ${detection.detection.score.toFixed(3)}`);
            setFaceDetected(true);

            // Enviar descriptor para a API do backend para reconhecimento
            const response = await fetch('/api/checkin/face-recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descriptor: Array.from(detection.descriptor),
                    clinic_id: clinicId
                })
            });

            const result = await response.json();
            console.log(`[FaceCheckIn] API resposta:`, result.success ? `MATCH: ${result.patient?.name}` : result.error || 'sem match');

            if (result.success && result.patient) {
                const matchedPatient: PatientMatch = {
                    patient_id: result.patient.id,
                    full_name: result.patient.name,
                    confidence: Math.round(result.confidence * 100),
                    appointment_id: result.appointment_id,
                };
                setDetectedPatient(matchedPatient);

                try {
                    new Audio('/sounds/success.mp3').play();
                } catch { }

                // Auto-confirm check-in imediatamente
                if (!autoConfirmingRef.current) {
                    autoConfirmingRef.current = true;
                    try {
                        const res = await fetch('/api/checkin/face-confirm', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                appointment_id: result.appointment_id,
                                clinic_id: clinicId,
                                patient_id: result.patient.id,
                            })
                        });
                        const confirmResult = await res.json();
                        if (confirmResult.success || confirmResult.data?.already_in_queue) {
                            toast.success(`Check-in confirmado: ${result.patient.name}`);
                            setCheckInCompleted({ name: result.patient.name });
                            onCheckInSuccess?.(result.patient.id, result.patient.name);
                        } else {
                            toast.error(confirmResult.error?.message || confirmResult.error || 'Erro ao confirmar');
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
            isScanningRef.current = false;
            setIsScanning(false);
        }
    }, [clinicId, onCheckInSuccess]);

    // Loop de deteccao continua com requestAnimationFrame (mais responsivo que setInterval)
    useEffect(() => {
        if (isLoading || detectedPatient) return;

        let cancelled = false;

        const loop = () => {
            if (cancelled) return;

            const now = Date.now();
            // Throttle: executa scan no maximo a cada 350ms
            if (now - lastScanTimeRef.current >= 350) {
                lastScanTimeRef.current = now;
                performScan();
            }

            scanLoopRef.current = requestAnimationFrame(loop);
        };

        scanLoopRef.current = requestAnimationFrame(loop);

        return () => {
            cancelled = true;
            if (scanLoopRef.current) {
                cancelAnimationFrame(scanLoopRef.current);
            }
        };
    }, [isLoading, detectedPatient, performScan]);

    const confirmCheckIn = async () => {
        if (!detectedPatient) return;

        try {
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

    // Check-in completed - show success screen
    if (checkInCompleted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-14 h-14 text-green-600" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-green-700 mb-2">Check-in Realizado com Sucesso!</h2>
                    <p className="text-lg text-muted-foreground">{checkInCompleted.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">Paciente adicionado a fila de atendimento</p>
                </div>
                <Button variant="outline" onClick={resetDetection} className="mt-4 min-h-[44px]">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Proximo Check-in
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

    // Check-in visual manual
    if (showVisualGrid) {
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
                                photoUrl: patient.photoUrl,
                                confidence: 100,
                                appointment_id: patient.appointmentId
                            } as any)}
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

                <div className="flex flex-wrap gap-2 justify-center">
                    <Button variant="outline" onClick={() => loadPatientsWithPhotos()} className="min-h-[44px]">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                    </Button>
                    <Button variant="outline" onClick={() => setShowVisualGrid(false)} className="min-h-[44px]">
                        <Camera className="w-4 h-4 mr-2" />
                        Voltar para Camera
                    </Button>
                    <Button variant="outline" onClick={onFallbackToQR} className="min-h-[44px]">
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Code
                    </Button>
                </div>

                {/* Modal de confirmacao para check-in visual manual */}
                {detectedPatient && (
                    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                            <img
                                src={detectedPatient.reference_image_url || detectedPatient.photoUrl || ''}
                                alt={detectedPatient.full_name}
                                className="w-32 h-32 rounded-full mx-auto object-cover mb-4 border-4 border-primary"
                            />
                            <h2 className="text-2xl font-bold mb-2">{detectedPatient.full_name}</h2>
                            <p className="text-muted-foreground mb-6">Confirma o check-in?</p>
                            <div className="flex gap-4 justify-center">
                                <Button onClick={confirmCheckIn} className="bg-green-600 hover:bg-green-700 min-h-[44px]">
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Confirmar
                                </Button>
                                <Button variant="outline" onClick={resetDetection} className="min-h-[44px]">
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

    return (
        <div className="flex flex-col items-center gap-6 p-4">
            {/* Camera - resolucao reduzida para processamento rapido */}
            <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    mirrored
                    videoConstraints={{
                        facingMode: 'user',
                        width: 640,
                        height: 480
                    }}
                />

                {/* Overlay de scan */}
                {!detectedPatient && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`
                            w-64 h-80 border-4 rounded-[50%] transition-all duration-300
                            ${faceDetected ? 'border-emerald-400 ring-4 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.25)]' : isScanning ? 'border-sky-400/80 animate-pulse' : 'border-white/40'}
                        `} />
                    </div>
                )}

                {/* Status badge */}
                <div className="absolute top-4 right-4">
                    <Badge variant={faceDetected ? 'default' : isScanning ? 'secondary' : 'outline'} className={faceDetected ? 'bg-emerald-600 text-white' : ''}>
                        {faceDetected ? 'Rosto detectado - Comparando...' : isScanning ? 'Escaneando...' : 'Posicione o rosto no circulo'}
                    </Badge>
                </div>

                {/* Scan counter */}
                {scanAttempts > 0 && !detectedPatient && (
                    <div className="absolute top-4 left-4">
                        <Badge variant="outline" className="bg-black/40 text-white/80 border-white/20 text-xs">
                            Varreduras: {scanAttempts}
                        </Badge>
                    </div>
                )}

                {/* Match encontrado */}
                {detectedPatient && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white animate-in fade-in zoom-in duration-300">
                        <UserCheck className="w-16 h-16 text-emerald-400 mb-4" />
                        <h2 className="text-3xl font-bold mb-2">Ola, {detectedPatient.full_name}!</h2>
                        <p className="text-lg mb-2 text-white/80">
                            Confianca: {detectedPatient.confidence}%
                        </p>
                        <p className="text-lg mb-6">Confirma seu check-in?</p>

                        <div className="flex gap-4">
                            <Button
                                size="lg"
                                onClick={confirmCheckIn}
                                className="bg-green-600 hover:bg-green-700 text-lg px-8 min-h-[44px]"
                            >
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                Sim, confirmar
                            </Button>
                            <Button
                                size="lg"
                                onClick={resetDetection}
                                className="bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 text-base font-medium px-6 min-h-[44px] shadow-sm transition-colors active:scale-95"
                            >
                                <XCircle className="w-5 h-5 mr-2 text-rose-400" />
                                Não sou eu
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Instrucoes e fallback */}
            <div className="text-center space-y-3">
                <p className="text-muted-foreground">
                    Posicione seu rosto no circulo para check-in automatico
                </p>

                <div className="flex flex-wrap gap-2 justify-center items-center">
                    <Button 
                        onClick={() => performScan()} 
                        disabled={isScanning || !!detectedPatient}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-5 font-medium shadow-sm"
                    >
                        {isScanning ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Comparando...
                            </>
                        ) : (
                            <>
                                <Camera className="w-4 h-4 mr-2" />
                                Reconhecer Agora
                            </>
                        )}
                    </Button>
                    <Button variant="outline" onClick={() => loadPatientsWithPhotos()} className="min-h-[44px]">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar Lista
                    </Button>
                    <Button variant="outline" onClick={() => setShowVisualGrid(true)} className="min-h-[44px]">
                        <User className="w-4 h-4 mr-2" />
                        Check-in Manual
                    </Button>
                    <Button variant="outline" onClick={onFallbackToQR} className="min-h-[44px]">
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Code
                    </Button>
                </div>

                {scanAttempts > 15 && !detectedPatient && (
                    <p className="text-sm text-amber-600">
                        Dificuldade em reconhecer? Tente melhorar a iluminacao ou use QR Code.
                    </p>
                )}
            </div>
        </div>
    );
}