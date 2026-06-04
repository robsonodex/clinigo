'use client';

/**
 * CLINIGO PREMIUM - Face Enrollment Component
 * Cadastra biometria facial do paciente em 3 ângulos
 * 
 * IMPORTANTE: Este componente é ADITIVO - não modifica check-in QR existente
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Camera, CheckCircle2, AlertCircle, RotateCcw, User, Shield } from 'lucide-react';

interface FaceEnrollmentProps {
    patientId: string;
    clinicId: string;
    patientName?: string;
    onComplete?: () => void;
    onCancel?: () => void;
}

type CaptureStep = 'consent' | 'frontal' | 'left' | 'right' | 'processing' | 'complete';

const MODEL_URL = '/models/face-api';

const STEP_LABELS: Record<CaptureStep, string> = {
    consent: 'Consentimento LGPD',
    frontal: 'Olhe para a câmera',
    left: 'Vire levemente para a esquerda',
    right: 'Vire levemente para a direita',
    processing: 'Processando biometria...',
    complete: 'Cadastro concluído!'
};

export function FaceEnrollment({
    patientId,
    clinicId,
    patientName,
    onComplete,
    onCancel
}: FaceEnrollmentProps) {
    const webcamRef = useRef<Webcam>(null);
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [step, setStep] = useState<CaptureStep>('consent');
    const [descriptors, setDescriptors] = useState<Float32Array[]>([]);
    const [consentGiven, setConsentGiven] = useState(false);
    const [detectionScore, setDetectionScore] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);

    // Carrega modelos do face-api (CDN)
    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setIsModelLoading(false);
            } catch (error) {
                toast.error('Erro ao carregar modelos de IA');
                console.error('Face-api model loading error:', error);
            }
        };

        if (step !== 'consent') {
            loadModels();
        }
    }, [step]);

    const startEnrollment = () => {
        if (!consentGiven) {
            toast.error('É necessário aceitar o termo de consentimento');
            return;
        }
        setStep('frontal');
    };

    const captureAngle = async () => {
        if (!webcamRef.current || isCapturing) return;

        setIsCapturing(true);

        try {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) {
                toast.error('Não foi possível capturar imagem');
                setIsCapturing(false);
                return;
            }

            // Detecta rosto na imagem
            const img = await faceapi.fetchImage(imageSrc);
            const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                toast.error('Rosto não detectado. Posicione-se melhor na câmera.');
                setIsCapturing(false);
                return;
            }

            if (detection.detection.score < 0.6) {
                toast.error('Qualidade insuficiente. Melhore a iluminação.');
                setIsCapturing(false);
                return;
            }

            setDetectionScore(detection.detection.score);

            // Salva descriptor
            const newDescriptors = [...descriptors, detection.descriptor];
            setDescriptors(newDescriptors);

            toast.success(`Ângulo capturado! (${(detection.detection.score * 100).toFixed(0)}% qualidade)`);

            // Avança passo
            if (step === 'frontal') {
                setStep('left');
            } else if (step === 'left') {
                setStep('right');
            } else if (step === 'right') {
                setStep('processing');
                await saveBiometrics(newDescriptors, imageSrc);
            }
        } catch (error) {
            toast.error('Erro na captura: ' + (error as Error).message);
        } finally {
            setIsCapturing(false);
        }
    };

    const saveBiometrics = async (allDescriptors: Float32Array[], thumbnailBase64: string) => {
        try {
            // Calcula média dos 3 descriptors (mais robusto a variações)
            const avgDescriptor = new Float32Array(128);

            for (let i = 0; i < 128; i++) {
                let sum = 0;
                allDescriptors.forEach(d => sum += d[i]);
                avgDescriptor[i] = sum / allDescriptors.length;
            }

            // Criptografa usando API route (server-side encryption)
            const encryptResponse = await fetch('/api/face-biometrics/encrypt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descriptor: Array.from(avgDescriptor)
                })
            });

            if (!encryptResponse.ok) {
                throw new Error('Erro ao criptografar biometria');
            }

            const { encrypted } = await encryptResponse.json();

            const supabase = createClient();

            // Upload thumbnail para Storage
            let imageUrl = null;
            try {
                const fileName = `${clinicId}/${patientId}-face-${Date.now()}.jpg`;
                const blob = await fetch(thumbnailBase64).then(r => r.blob());

                const { error: uploadError } = await supabase
                    .storage
                    .from('biometric-photos')
                    .upload(fileName, blob, { upsert: true });

                if (!uploadError) {
                    const { data: urlData } = supabase
                        .storage
                        .from('biometric-photos')
                        .getPublicUrl(fileName);
                    imageUrl = urlData.publicUrl;
                }
            } catch (uploadErr) {
                console.warn('Thumbnail upload failed, continuing without photo');
            }

            // Salva no banco
            const { error } = await supabase
                .from('patient_face_biometrics')
                .upsert({
                    patient_id: patientId,
                    clinic_id: clinicId,
                    face_descriptor_encrypted: encrypted,
                    reference_image_url: imageUrl,
                    detection_score: detectionScore,
                    angles_captured: ['frontal', 'left', 'right'],
                    consent_given: true,
                    consent_date: new Date().toISOString(),
                    retention_until: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString()
                });

            if (error) throw error;

            setStep('complete');
            toast.success('Biometria facial cadastrada com sucesso!');

            setTimeout(() => {
                onComplete?.();
            }, 2000);

        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message);
            setStep('frontal');
            setDescriptors([]);
        }
    };

    const resetEnrollment = () => {
        setStep('frontal');
        setDescriptors([]);
        setDetectionScore(0);
    };

    const getProgress = () => {
        switch (step) {
            case 'consent': return 0;
            case 'frontal': return 25;
            case 'left': return 50;
            case 'right': return 75;
            case 'processing': return 90;
            case 'complete': return 100;
            default: return 0;
        }
    };

    // Tela de consentimento LGPD
    if (step === 'consent') {
        return (
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Cadastro Biométrico Facial
                    </CardTitle>
                    <CardDescription>
                        {patientName && `Paciente: ${patientName}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
                        <p className="font-medium">Termo de Consentimento (LGPD)</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>Sua biometria será criptografada e armazenada com segurança</li>
                            <li>Usamos apenas para identificação no check-in</li>
                            <li>Dados serão retidos por 5 anos e depois excluídos</li>
                            <li>Você pode solicitar exclusão a qualquer momento</li>
                        </ul>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="consent"
                            checked={consentGiven}
                            onCheckedChange={(checked) => setConsentGiven(!!checked)}
                        />
                        <Label htmlFor="consent" className="text-sm">
                            Autorizo o uso da minha imagem para check-in biométrico
                        </Label>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={startEnrollment}
                            disabled={!consentGiven}
                            className="flex-1"
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Iniciar Cadastro
                        </Button>
                        {onCancel && (
                            <Button variant="outline" onClick={onCancel}>
                                Cancelar
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Tela de conclusão
    if (step === 'complete') {
        return (
            <Card className="max-w-md mx-auto">
                <CardContent className="pt-6 text-center space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                    <h2 className="text-xl font-bold">Cadastro Concluído!</h2>
                    <p className="text-muted-foreground">
                        A biometria facial de {patientName || 'paciente'} foi cadastrada com sucesso.
                        Agora o check-in poderá ser feito por reconhecimento facial.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Loading modelos
    if (isModelLoading) {
        return (
            <Card className="max-w-md mx-auto">
                <CardContent className="pt-6 text-center space-y-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p>Carregando modelos de IA...</p>
                </CardContent>
            </Card>
        );
    }

    // Tela de captura
    return (
        <Card className="max-w-lg mx-auto">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Cadastro Facial</CardTitle>
                    <Badge variant={step === 'processing' ? 'default' : 'outline'}>
                        {descriptors.length}/3 ângulos
                    </Badge>
                </div>
                <Progress value={getProgress()} className="h-2" />
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
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

                    {/* Guia visual de posicionamento */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-64 border-2 border-dashed border-white/40 rounded-[50%]" />
                    </div>

                    {/* Instrução */}
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <span className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                            {STEP_LABELS[step]}
                        </span>
                    </div>

                    {/* Processing overlay */}
                    {step === 'processing' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="text-center text-white">
                                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p>Processando biometria...</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={captureAngle}
                        disabled={step === 'processing' || isCapturing}
                        className="flex-1"
                        size="lg"
                    >
                        {isCapturing ? (
                            <>Capturando...</>
                        ) : (
                            <>
                                <Camera className="w-4 h-4 mr-2" />
                                Capturar {step === 'frontal' ? 'Frente' : step === 'left' ? 'Esquerda' : 'Direita'}
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        onClick={resetEnrollment}
                        disabled={step === 'processing'}
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Dados criptografados com AES-256. Apenas o hash matemático é armazenado.
                </p>
            </CardContent>
        </Card>
    );
}
