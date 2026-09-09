'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import Webcam from 'react-webcam';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Camera,
    CheckCircle2,
    ShieldCheck,
    AlertCircle,
    Loader2,
    UserCheck,
    UserPlus,
    RefreshCw,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { FaceEnrollment } from '@/components/face-recognition';

interface DoctorBiometricModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: string;
    patientId: string;
    patientName: string;
    clinicId: string;
    onSuccess: (data?: any) => void;
    onConfirmManual: () => void;
}

const MODEL_URL = '/models/face-api';

export function DoctorBiometricModal({
    open,
    onOpenChange,
    appointmentId,
    patientId,
    patientName,
    clinicId,
    onSuccess,
    onConfirmManual
}: DoctorBiometricModalProps) {
    const webcamRef = useRef<Webcam>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [checkingBiometrics, setCheckingBiometrics] = useState(true);
    const [hasBiometrics, setHasBiometrics] = useState<boolean | null>(null);
    const [showEnrollment, setShowEnrollment] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanAttempts, setScanAttempts] = useState(0);
    const [matchedPerson, setMatchedPerson] = useState<{
        name: string;
        type: string;
        confidence: number;
    } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const scanLoopRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingRef = useRef(false);

    // 1. Verificar se paciente possui biometria cadastrada
    const checkPatientBiometrics = useCallback(async () => {
        if (!patientId) return;
        setCheckingBiometrics(true);
        try {
            const res = await fetch(`/api/patients/${patientId}/biometrics`);
            if (res.ok) {
                const data = await res.json();
                setHasBiometrics(Boolean(data.hasBiometrics && data.count > 0));
            } else {
                setHasBiometrics(false);
            }
        } catch {
            setHasBiometrics(false);
        } finally {
            setCheckingBiometrics(false);
        }
    }, [patientId]);

    // 2. Carregar modelos neurais do face-api
    const loadNeuralModels = useCallback(async () => {
        try {
            setIsLoading(true);
            const isLoaded = 
                faceapi.nets.ssdMobilenetv1?.isLoaded &&
                faceapi.nets.faceLandmark68Net?.isLoaded &&
                faceapi.nets.faceRecognitionNet?.isLoaded;

            if (!isLoaded) {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
            }
            setIsLoading(false);
        } catch (err) {
            console.error('[DoctorBiometricModal] Erro ao carregar modelos neurais:', err);
            setIsLoading(false);
            toast.error('Não foi possível inicializar a câmera inteligente');
        }
    }, []);

    useEffect(() => {
        if (open) {
            setMatchedPerson(null);
            setShowEnrollment(false);
            setIsScanning(false);
            setScanAttempts(0);
            checkPatientBiometrics();
            loadNeuralModels();
        } else {
            if (scanLoopRef.current) {
                clearInterval(scanLoopRef.current);
                scanLoopRef.current = null;
            }
        }
    }, [open, checkPatientBiometrics, loadNeuralModels]);

    // 3. Execução de um ciclo de leitura e verificação facial
    const executeScanCycle = useCallback(async () => {
        if (isProcessingRef.current || !webcamRef.current?.video || matchedPerson) return;

        const video = webcamRef.current.video;
        if (video.readyState !== 4) return;

        try {
            isProcessingRef.current = true;
            setIsScanning(true);

            const detection = await faceapi
                .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection?.descriptor) {
                setScanAttempts(prev => prev + 1);
                const rawDescriptor = Array.from(detection.descriptor);

                const verifyRes = await fetch(`/api/patients/${patientId}/biometrics/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descriptor: rawDescriptor })
                });

                if (verifyRes.ok) {
                    const result = await verifyRes.json();
                    if (result.match && result.matchData) {
                        const typeMap: Record<string, string> = {
                            patient: 'Paciente',
                            mother: 'Mãe',
                            father: 'Pai',
                            guardian: 'Responsável Legal',
                            other: 'Acompanhante'
                        };

                        const personTypeStr = typeMap[result.matchData.person_type] || 'Paciente';
                        const personNameStr = result.matchData.person_name || patientName;

                        setMatchedPerson({
                            name: personNameStr,
                            type: personTypeStr,
                            confidence: result.matchData.confidence || 95
                        });

                        if (scanLoopRef.current) {
                            clearInterval(scanLoopRef.current);
                            scanLoopRef.current = null;
                        }

                        toast.success(`Biometria confirmada: ${personNameStr} (${personTypeStr})`);
                    }
                }
            }
        } catch (err) {
            console.warn('[DoctorBiometricModal] Erro no ciclo de reconhecimento:', err);
        } finally {
            isProcessingRef.current = false;
            setIsScanning(false);
        }
    }, [patientId, patientName, matchedPerson]);

    // 4. Iniciar loop de varredura quando câmera e modelos estiverem prontos
    useEffect(() => {
        if (open && !isLoading && !checkingBiometrics && hasBiometrics && !showEnrollment && !matchedPerson) {
            if (!scanLoopRef.current) {
                scanLoopRef.current = setInterval(executeScanCycle, 600);
            }
        } else {
            if (scanLoopRef.current) {
                clearInterval(scanLoopRef.current);
                scanLoopRef.current = null;
            }
        }

        return () => {
            if (scanLoopRef.current) {
                clearInterval(scanLoopRef.current);
                scanLoopRef.current = null;
            }
        };
    }, [open, isLoading, checkingBiometrics, hasBiometrics, showEnrollment, matchedPerson, executeScanCycle]);

    // 5. Confirmação do check-in biométrico na API
    const handleConfirmBiometricAttendance = async () => {
        if (!matchedPerson && hasBiometrics) {
            toast.error('Posicione o rosto do paciente ou responsável para validação');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/appointments/${appointmentId}/doctor-checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: 'FACIAL_DOCTOR',
                    biometric_verified: true,
                    person_name: matchedPerson ? `${matchedPerson.name} (${matchedPerson.type})` : undefined
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Erro ao registrar validação biométrica');
            }

            toast.success('Atendimento iniciado com comprovação biométrica');
            onOpenChange(false);
            onSuccess(data);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao confirmar presença biométrica');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md sm:max-w-lg w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
                <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <Camera className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base sm:text-lg font-bold">
                                Validação Biométrica no Consultório
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Confirmação facial de presença antes de iniciar a sessão
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-5 space-y-4">
                    {/* Paciente em Atendimento */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Paciente Agendado
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {patientName}
                            </span>
                        </div>
                        {hasBiometrics ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Biometria Ativa
                            </Badge>
                        ) : checkingBiometrics ? (
                            <Badge variant="outline" className="text-xs gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Verificando...
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Sem Cadastro
                            </Badge>
                        )}
                    </div>

                    {/* Caso 1: Cadastrando biometria na hora */}
                    {showEnrollment ? (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden p-2">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 px-2">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Novo Cadastro Facial na Sala
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowEnrollment(false)}
                                    className="h-7 px-2 text-xs"
                                >
                                    <X className="w-3.5 h-3.5 mr-1" />
                                    Fechar
                                </Button>
                            </div>
                            <FaceEnrollment
                                patientId={patientId}
                                clinicId={clinicId}
                                patientName={patientName}
                                onComplete={() => {
                                    setShowEnrollment(false);
                                    checkPatientBiometrics();
                                    toast.success('Biometria cadastrada. Iniciando validação facial...');
                                }}
                                onCancel={() => setShowEnrollment(false)}
                            />
                        </div>
                    ) : checkingBiometrics || isLoading ? (
                        /* Caso 2: Carregando */
                        <div className="py-12 flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            <p className="text-xs text-muted-foreground text-center">
                                Inicializando câmera e modelos biométricos neurais...
                            </p>
                        </div>
                    ) : !hasBiometrics ? (
                        /* Caso 3: Paciente não possui cadastro biométrico */
                        <div className="py-6 px-4 border border-dashed rounded-xl bg-amber-50/40 dark:bg-amber-950/20 text-center space-y-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 mx-auto">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    Nenhuma biometria cadastrada
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                    Este paciente ainda não possui registro facial ou de responsáveis no sistema.
                                </p>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                                <Button
                                    onClick={() => setShowEnrollment(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] gap-1.5 text-xs font-semibold"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Cadastrar Biometria Agora
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        onOpenChange(false);
                                        onConfirmManual();
                                    }}
                                    className="min-h-[44px] text-xs"
                                >
                                    Iniciar Sem Biometria
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Caso 4: Validação facial ativa via Webcam */
                        <div className="space-y-3">
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video flex items-center justify-center shadow-inner">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{
                                        width: 640,
                                        height: 480,
                                        facingMode: 'user'
                                    }}
                                    className="w-full h-full object-cover"
                                />

                                {/* Overlay de Varredura */}
                                {!matchedPerson ? (
                                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 bg-gradient-to-b from-black/40 via-transparent to-black/60">
                                        <Badge className="bg-slate-900/80 text-white border-slate-700 text-xs gap-1.5 backdrop-blur">
                                            {isScanning ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                                                    Analisando enquadramento...
                                                </>
                                            ) : (
                                                <>
                                                    <Camera className="w-3 h-3 text-sky-400" />
                                                    Posicione o rosto de frente
                                                </>
                                            )}
                                        </Badge>
                                        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl border-2 border-dashed border-emerald-400/80 animate-pulse flex items-center justify-center">
                                            <span className="text-[11px] text-white/80 bg-black/50 px-2 py-1 rounded backdrop-blur">
                                                Enquadre o rosto
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-white/90 font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur">
                                            Paciente, mãe, pai ou responsável legal
                                        </span>
                                    </div>
                                ) : (
                                    /* Overlay de Sucesso */
                                    <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-2 text-white">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                                            <CheckCircle2 className="w-7 h-7" />
                                        </div>
                                        <h4 className="text-base font-bold">
                                            Identificação Confirmada
                                        </h4>
                                        <p className="text-xs text-emerald-200">
                                            {matchedPerson.name} ({matchedPerson.type})
                                        </p>
                                        <Badge className="bg-emerald-800 text-emerald-100 text-[11px] font-semibold">
                                            Precisão: {matchedPerson.confidence}%
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* Informações e Alternativas */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                                <span>Tentativas: {scanAttempts}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setMatchedPerson(null);
                                        setScanAttempts(0);
                                    }}
                                    className="h-7 text-xs px-2"
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Reiniciar Câmera
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="min-h-[44px] text-xs font-medium w-full sm:w-auto"
                    >
                        Voltar
                    </Button>

                    {hasBiometrics && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                onOpenChange(false);
                                onConfirmManual();
                            }}
                            disabled={isSubmitting}
                            className="min-h-[44px] text-xs font-medium w-full sm:w-auto"
                            title="Iniciar sem validação de câmera em caso de necessidade"
                        >
                            Confirmar Sem Biometria
                        </Button>
                    )}

                    {hasBiometrics && matchedPerson && (
                        <Button
                            onClick={handleConfirmBiometricAttendance}
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] text-xs font-semibold gap-1.5 shadow-sm w-full sm:w-auto flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                    Iniciando...
                                </>
                            ) : (
                                <>
                                    <UserCheck className="w-4 h-4 mr-1" />
                                    Iniciar Atendimento Validado
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
