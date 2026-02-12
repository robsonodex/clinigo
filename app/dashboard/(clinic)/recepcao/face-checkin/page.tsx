'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    ArrowLeft, Camera, CheckCircle, Loader2, VideoOff, RefreshCw
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/components/ui/use-toast';

export default function FaceCheckInPage() {
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<{ success: boolean; patientName?: string } | null>(null);

    const clinicId = user?.clinic_id;

    // Start camera automatically on page load
    const startCamera = useCallback(async () => {
        setCameraError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error: any) {
            console.error('Camera access error:', error);
            if (error.name === 'NotAllowedError') {
                setCameraError('Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.');
            } else if (error.name === 'NotFoundError') {
                setCameraError('Nenhuma câmera encontrada neste dispositivo.');
            } else {
                setCameraError('Erro ao acessar a câmera. Verifique se o dispositivo possui câmera disponível.');
            }
        }
    }, []);

    // Stop camera when leaving page
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        startCamera();
        return () => {
            // Cleanup: stop all tracks
            if (videoRef.current?.srcObject) {
                const s = videoRef.current.srcObject as MediaStream;
                s.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera]);

    // Capture photo from video and attempt recognition
    async function captureAndRecognize() {
        if (!videoRef.current || !clinicId) return;

        setIsProcessing(true);
        setLastResult(null);

        try {
            // Capture frame from video
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');
            ctx.drawImage(videoRef.current, 0, 0);
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

            // Call face recognition API
            const response = await fetch('/api/checkin/face-recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    photo: imageBase64,
                    clinic_id: clinicId,
                    date: new Date().toISOString().split('T')[0]
                })
            });

            const data = await response.json();

            if (data.success && data.patient) {
                // Patient recognized — confirm check-in via existing API
                const confirmRes = await fetch('/api/checkin/face-confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appointment_id: data.appointment_id,
                        clinic_id: clinicId,
                        patient_id: data.patient.id,
                    })
                });

                const confirmData = await confirmRes.json();

                if (confirmRes.ok) {
                    setLastResult({ success: true, patientName: data.patient.name });
                    toast({
                        title: '✅ Check-in realizado!',
                        description: `Paciente: ${data.patient.name}${confirmData.already_in_queue ? ' (já estava na fila)' : ''}`,
                    });

                    // Reset after 3 seconds for next patient
                    setTimeout(() => {
                        setLastResult(null);
                    }, 3000);
                } else {
                    throw new Error(confirmData.error || 'Falha ao confirmar check-in');
                }
            } else {
                setLastResult({ success: false });
                toast({
                    title: '❌ Paciente não reconhecido',
                    description: data.error || 'Nenhum paciente agendado para hoje foi reconhecido. Tente novamente ou faça check-in manual.',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Face recognition error:', error);
            toast({
                title: 'Erro no reconhecimento',
                description: error instanceof Error ? error.message : 'Erro ao processar reconhecimento facial. Tente novamente.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => { stopCamera(); router.push('/dashboard/recepcao'); }}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar para Recepção
                        </Button>
                        <div className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-emerald-600" />
                            <h1 className="text-xl font-bold">Check-in Facial</h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container py-8 px-4 max-w-3xl mx-auto">
                <Card className="overflow-hidden shadow-lg">
                    <CardContent className="p-0">
                        {/* Camera Feed */}
                        <div className="relative aspect-video bg-black">
                            {cameraError ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                                    <VideoOff className="w-16 h-16 text-red-400" />
                                    <p className="text-white text-lg">{cameraError}</p>
                                    <Button
                                        variant="outline"
                                        onClick={startCamera}
                                        className="text-white border-white hover:bg-white/10"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Tentar Novamente
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Processing overlay */}
                                    {isProcessing && (
                                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="w-12 h-12 text-white animate-spin" />
                                            <p className="text-white text-lg font-medium">Reconhecendo...</p>
                                        </div>
                                    )}

                                    {/* Success overlay */}
                                    {lastResult?.success && (
                                        <div className="absolute inset-0 bg-emerald-600/80 flex flex-col items-center justify-center gap-3">
                                            <CheckCircle className="w-16 h-16 text-white" />
                                            <p className="text-white text-2xl font-bold">Check-in Realizado!</p>
                                            <p className="text-white/90 text-lg">{lastResult.patientName}</p>
                                        </div>
                                    )}

                                    {/* Face guide overlay */}
                                    {!isProcessing && !lastResult && (
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                            <div className="w-64 h-64 border-2 border-white/40 rounded-full" />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="p-6 space-y-4">
                            <p className="text-center text-muted-foreground">
                                Posicione o rosto do paciente dentro do círculo e clique em &quot;Reconhecer Paciente&quot;
                            </p>

                            <Button
                                onClick={captureAndRecognize}
                                disabled={isProcessing || !!cameraError}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-semibold"
                                size="lg"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Camera className="w-5 h-5 mr-2" />
                                        Reconhecer Paciente
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
