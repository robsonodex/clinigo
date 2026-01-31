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
    const [scanAttempts, setScanAttempts] = useState(0);
    const [biometricsLoaded, setBiometricsLoaded] = useState(false);
    const descriptorsRef = useRef<Array<{ patientId: string; name: string; descriptor: Float32Array; imageUrl?: string }>>([]);
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

        const { data, error } = await supabase
            .from('patient_face_biometrics')
            .select(`
                patient_id,
                face_descriptor_encrypted,
                reference_image_url,
                patients(full_name)
            `)
            .eq('clinic_id', clinicId)
            .eq('consent_given', true);

        if (error) {
            console.error('Error loading biometrics:', error);
            return;
        }

        if (!data || data.length === 0) {
            setBiometricsLoaded(true);
            return;
        }

        // Descriptografa no servidor
        const decryptResponse = await fetch('/api/face-biometrics/decrypt-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                encrypted: data.map(d => ({
                    id: d.patient_id,
                    data: d.face_descriptor_encrypted
                }))
            })
        });

        if (!decryptResponse.ok) {
            console.error('Failed to decrypt biometrics');
            return;
        }

        const { decrypted } = await decryptResponse.json();

        descriptorsRef.current = data.map((bio, idx) => ({
            patientId: bio.patient_id,
            name: (bio.patients as any)?.full_name || 'Paciente',
            descriptor: new Float32Array(decrypted[idx]),
            imageUrl: bio.reference_image_url
        }));

        setBiometricsLoaded(true);
    };

    // Loop de detecção contínua
    useEffect(() => {
        if (isLoading || detectedPatient || !biometricsLoaded) return;

        if (descriptorsRef.current.length === 0) {
            return; // Nenhuma biometria cadastrada
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
                    setDetectedPatient({
                        patient_id: bestMatch.patient.patientId,
                        full_name: bestMatch.patient.name,
                        reference_image_url: bestMatch.patient.imageUrl,
                        confidence: Math.round((1 - bestMatch.distance) * 100)
                    });

                    // Som de sucesso
                    try {
                        new Audio('/sounds/success.mp3').play();
                    } catch { }

                    // Para o scan
                    if (scanIntervalRef.current) {
                        clearInterval(scanIntervalRef.current);
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
            const supabase = createClient();

            // Buscar appointment do dia do paciente
            const today = new Date().toISOString().split('T')[0];

            const { data: appointments } = await supabase
                .from('appointments')
                .select('id')
                .eq('patient_id', detectedPatient.patient_id)
                .eq('appointment_date', today)
                .in('status', ['SCHEDULED', 'CONFIRMED'])
                .limit(1);

            if (appointments && appointments.length > 0) {
                // Atualiza status do appointment
                await supabase
                    .from('appointments')
                    .update({
                        status: 'CHECKED_IN',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', appointments[0].id);
            }

            toast.success(`Check-in confirmado: ${detectedPatient.full_name}`);
            onCheckInSuccess?.(detectedPatient.patient_id, detectedPatient.full_name);

            // Reset após 3s
            setTimeout(() => {
                setDetectedPatient(null);
                setScanAttempts(0);
            }, 3000);

        } catch (error) {
            toast.error('Erro ao confirmar check-in');
            console.error('Check-in error:', error);
        }
    };

    const resetDetection = () => {
        setDetectedPatient(null);
        setScanAttempts(0);
    };

    // Loading
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg">Inicializando reconhecimento facial...</p>
            </div>
        );
    }

    // Nenhuma biometria cadastrada
    if (biometricsLoaded && descriptorsRef.current.length === 0) {
        return (
            <Card className="max-w-md mx-auto">
                <CardContent className="pt-6 text-center space-y-4">
                    <User className="w-16 h-16 text-muted-foreground mx-auto" />
                    <h2 className="text-xl font-bold">Nenhuma Biometria Cadastrada</h2>
                    <p className="text-muted-foreground">
                        Ainda não há pacientes com biometria facial cadastrada nesta clínica.
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
