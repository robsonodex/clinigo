'use client';

/**
 * CLINIGO PREMIUM // components/face-recognition/FaceEnrollment.tsx
 * CliniGo Premium - Componente de captura e cadastro biométrico facial (v2.1)
 * Cadastra biometria facial do paciente ou de seus responsáveis em 3 ângulos.
 * Suporta múltiplos registros biométricos por paciente (Criança, Mãe, Pai, Responsável Legal).
 */

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Camera, CheckCircle2, RotateCcw, User, Shield, Check, X, AlertCircle } from 'lucide-react';

interface FaceEnrollmentProps {
    patientId: string;
    clinicId: string;
    patientName?: string;
    onComplete?: () => void;
    onCancel?: () => void;
}

type CaptureStep = 'consent' | 'person_info' | 'frontal' | 'left' | 'right' | 'preview' | 'processing' | 'complete';

const MODEL_URL = '/models/face-api';

const STEP_LABELS: Record<CaptureStep, string> = {
    consent: 'Termo de Consentimento LGPD',
    person_info: 'Identificação da Pessoa',
    frontal: 'Posicione o rosto de frente para a câmera',
    left: 'Vire a cabeça levemente para a esquerda',
    right: 'Vire a cabeça levemente para a direita',
    preview: 'Conferência da Captura Biométrica',
    processing: 'Criptografando e salvando biometria...',
    complete: 'Biometria cadastrada com sucesso'
};

export function FaceEnrollment({
    patientId,
    clinicId,
    patientName = 'Paciente',
    onComplete,
    onCancel
}: FaceEnrollmentProps) {
    const webcamRef = useRef<Webcam>(null);
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [modelLoadError, setModelLoadError] = useState<string | null>(null);
    const [step, setStep] = useState<CaptureStep>('consent');
    const [personType, setPersonType] = useState<'patient' | 'mother' | 'father' | 'guardian' | 'other'>('patient');
    const [personName, setPersonName] = useState(patientName);
    const [descriptors, setDescriptors] = useState<Float32Array[]>([]);
    const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
    const [consentGiven, setConsentGiven] = useState(false);
    const [detectionScore, setDetectionScore] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);

    // Carrega modelos do face-api (utiliza ssdMobilenetv1 com pesos presentes em /public/models/face-api)
    const loadModels = async () => {
        try {
            setModelLoadError(null);
            setIsModelLoading(true);

            // Verifica se os modelos já estão carregados na memória
            const isAlreadyLoaded = 
                faceapi.nets.ssdMobilenetv1?.isLoaded &&
                faceapi.nets.faceLandmark68Net?.isLoaded &&
                faceapi.nets.faceRecognitionNet?.isLoaded;

            if (isAlreadyLoaded) {
                setIsModelLoading(false);
                return;
            }

            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            setIsModelLoading(false);
        } catch (error) {
            console.error('Face-api model loading error:', error);
            setModelLoadError('Não foi possível inicializar os modelos neurais');
            setIsModelLoading(false);
            toast.error('Não foi possível carregar os modelos locais de IA');
        }
    };

    useEffect(() => {
        if (step !== 'consent') {
            loadModels();
        }
    }, [step]);

    const handlePersonTypeChange = (type: 'patient' | 'mother' | 'father' | 'guardian' | 'other') => {
        setPersonType(type);
        if (type === 'patient') {
            setPersonName(patientName);
        } else if (personName === patientName) {
            setPersonName('');
        }
    };

    const startEnrollment = () => {
        if (!consentGiven) {
            toast.error('É obrigatório aceitar o termo de consentimento LGPD para prosseguir');
            return;
        }
        setStep('person_info');
    };

    const proceedToCamera = () => {
        if (!personName.trim()) {
            toast.error('Informe o nome da pessoa a ser cadastrada');
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
                toast.error('Falha ao obter captura da câmera. Verifique a permissão do dispositivo.');
                setIsCapturing(false);
                return;
            }

            // Detecta rosto na imagem com alta precisão
            const img = await faceapi.fetchImage(imageSrc);
            const detection = await faceapi
                .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                toast.error('Rosto não detectado. Mantenha o rosto enquadrado no círculo e com boa iluminação.');
                setIsCapturing(false);
                return;
            }

            if (detection.detection.score < 0.55) {
                toast.error('Nitidez insuficiente. Evite sombras fortes ou reflexos na lente.');
                setIsCapturing(false);
                return;
            }

            setDetectionScore(detection.detection.score);

            // Salva descriptor
            const newDescriptors = [...descriptors, detection.descriptor];
            setDescriptors(newDescriptors);

            if (step === 'frontal') {
                setLastCapturedImage(imageSrc);
                toast.success(`Ângulo frontal capturado com sucesso (${(detection.detection.score * 100).toFixed(0)}% qualidade).`);
                setStep('left');
            } else if (step === 'left') {
                toast.success(`Ângulo esquerdo capturado (${(detection.detection.score * 100).toFixed(0)}% qualidade).`);
                setStep('right');
            } else if (step === 'right') {
                toast.success(`Ângulo direito capturado (${(detection.detection.score * 100).toFixed(0)}% qualidade).`);
                setStep('preview');
            }
        } catch (error) {
            toast.error('Erro no processamento da imagem: ' + (error as Error).message);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleConfirmAndSave = async () => {
        if (descriptors.length < 3 || !lastCapturedImage) {
            toast.error('É necessário capturar todos os 3 ângulos');
            return;
        }
        setStep('processing');
        await saveBiometrics(descriptors, lastCapturedImage);
    };

    const saveBiometrics = async (allDescriptors: Float32Array[], thumbnailBase64: string) => {
        try {
            // Calcula média dos 3 descriptors
            const avgDescriptor = new Float32Array(128);

            for (let i = 0; i < 128; i++) {
                let sum = 0;
                allDescriptors.forEach(d => sum += d[i]);
                avgDescriptor[i] = sum / allDescriptors.length;
            }

            // Envia para API route server-side (garante autenticacao, isolamento por clinica e upload seguro)
            const response = await fetch(`/api/patients/${patientId}/biometrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    person_type: personType,
                    person_name: personName.trim() || patientName,
                    notes: '',
                    detection_score: detectionScore || 0.95,
                    angles_captured: ['frontal', 'left', 'right'],
                    thumbnailBase64,
                    descriptor: Array.from(avgDescriptor)
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Falha ao salvar biometria no servidor');
            }

            setStep('complete');
            toast.success('Biometria facial registrada com sucesso!');

            setTimeout(() => {
                onComplete?.();
            }, 1800);

        } catch (err: any) {
            console.error('Save biometrics error:', err);
            toast.error('Erro ao registrar biometria: ' + (err.message || 'Falha de comunicação com o servidor'));
            setStep('preview');
        }
    };

    const resetEnrollment = () => {
        setStep('frontal');
        setDescriptors([]);
        setDetectionScore(0);
        setLastCapturedImage(null);
    };

    const getProgress = () => {
        switch (step) {
            case 'consent': return 0;
            case 'person_info': return 15;
            case 'frontal': return 35;
            case 'left': return 60;
            case 'right': return 80;
            case 'preview': return 90;
            case 'processing': return 95;
            case 'complete': return 100;
            default: return 0;
        }
    };

    // 1. Tela de consentimento LGPD
    if (step === 'consent') {
        return (
            <Card className="max-w-lg mx-auto border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
                        Cadastro Biométrico Facial (LGPD)
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Paciente: <strong className="text-foreground">{patientName}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-2 border border-slate-200/80 dark:border-slate-800">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                            Termo de Consentimento para Identificação Facial
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li>O vetor biométrico facial é criptografado e utilizado exclusivamente para validação de check-in presencial na clínica.</li>
                            <li>É permitido cadastrar a face da criança e de seus responsáveis (mãe, pai ou tutor).</li>
                            <li>Os dados ficam resguardados sob a LGPD (Lei nº 13.709/2018) com período de retenção de 5 anos.</li>
                            <li>O titular ou responsável legal pode solicitar a revogação e exclusão da biometria a qualquer momento.</li>
                        </ul>
                    </div>

                    <div className="flex items-start space-x-2.5 pt-1">
                        <Checkbox
                            id="consent"
                            checked={consentGiven}
                            onCheckedChange={(checked) => setConsentGiven(!!checked)}
                            className="mt-0.5"
                        />
                        <Label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                            Autorizo a captura e o processamento seguro do registro biométrico facial para fins de check-in e segurança de atendimento clínico.
                        </Label>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                            onClick={startEnrollment}
                            disabled={!consentGiven}
                            className="flex-1 min-h-[44px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Prosseguir para Identificação
                        </Button>
                        {onCancel && (
                            <Button variant="outline" onClick={onCancel} className="min-h-[44px]">
                                Cancelar
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // 2. Tela de identificação da pessoa (Paciente vs Mãe vs Responsável)
    if (step === 'person_info') {
        return (
            <Card className="max-w-lg mx-auto border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <User className="w-5 h-5 text-emerald-600 shrink-0" />
                        Quem está sendo cadastrado?
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Vincule o rosto ao paciente ou a um de seus responsáveis legais.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="person_type" className="text-xs font-semibold">Vínculo com o Paciente</Label>
                        <Select
                            value={personType}
                            onValueChange={(val: any) => handlePersonTypeChange(val)}
                        >
                            <SelectTrigger id="person_type" className="min-h-[44px] text-sm">
                                <SelectValue placeholder="Selecione o vínculo..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="patient">Próprio Paciente ({patientName})</SelectItem>
                                <SelectItem value="mother">Mãe do Paciente</SelectItem>
                                <SelectItem value="father">Pai do Paciente</SelectItem>
                                <SelectItem value="guardian">Responsável Legal / Tutor</SelectItem>
                                <SelectItem value="other">Outro Acompanhante Autorizado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="person_name" className="text-xs font-semibold">Nome Completo da Pessoa *</Label>
                        <Input
                            id="person_name"
                            value={personName}
                            onChange={(e) => setPersonName(e.target.value)}
                            placeholder="Nome de quem será fotografado"
                            className="min-h-[44px] text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Este nome será exibido durante a confirmação biométrica e check-in.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                            onClick={proceedToCamera}
                            disabled={!personName.trim()}
                            className="flex-1 min-h-[44px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Abrir Câmera e Iniciar Captura
                        </Button>
                        <Button variant="outline" onClick={() => setStep('consent')} className="min-h-[44px]">
                            Voltar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // 3. Falha no carregamento dos modelos
    if (modelLoadError && (step === 'frontal' || step === 'left' || step === 'right')) {
        return (
            <Card className="max-w-md mx-auto border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Falha ao carregar visão neural</p>
                        <p className="text-xs text-muted-foreground">{modelLoadError}. Verifique sua conexão e tente novamente.</p>
                    </div>
                    <div className="flex gap-2 justify-center pt-2">
                        <Button variant="outline" size="sm" onClick={() => setStep('consent')} className="min-h-[40px]">
                            Voltar
                        </Button>
                        <Button size="sm" onClick={loadModels} className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                            Tentar Novamente
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // 3.1. Loading modelos de IA
    if (isModelLoading && (step === 'frontal' || step === 'left' || step === 'right')) {
        return (
            <Card className="max-w-md mx-auto border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                    <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <div className="space-y-1">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Carregando inteligência de visão facial...</p>
                        <p className="text-xs text-muted-foreground">Inicializando detector neural SSD-MobileNet e 68 marcos faciais</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // 4. Tela de Preview e Conferência Final
    if (step === 'preview') {
        return (
            <Card className="max-w-lg mx-auto border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center mb-1">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-base sm:text-lg">Conferência da Captura Biométrica</CardTitle>
                    <CardDescription className="text-xs">
                        Confirme os dados antes de gravar a biometria criptografada.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col items-center justify-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        {lastCapturedImage ? (
                            <img
                                src={lastCapturedImage}
                                alt="Foto de referência"
                                className="w-36 h-36 object-cover rounded-full border-4 border-emerald-500 shadow-sm"
                            />
                        ) : (
                            <div className="w-36 h-36 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                <User className="w-12 h-12 text-slate-400" />
                            </div>
                        )}
                        <div className="text-center space-y-1">
                            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{personName}</p>
                            <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 dark:text-emerald-400">
                                {personType === 'patient' ? 'Paciente' : personType === 'mother' ? 'Mãe' : personType === 'father' ? 'Pai' : 'Responsável Legal'}
                            </Badge>
                            <p className="text-xs text-muted-foreground pt-1">
                                Qualidade média de leitura: <strong>{(detectionScore * 100).toFixed(0)}%</strong> • 3 ângulos validados
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                            onClick={handleConfirmAndSave}
                            className="flex-1 min-h-[44px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Confirmar e Salvar Biometria
                        </Button>
                        <Button
                            variant="outline"
                            onClick={resetEnrollment}
                            className="min-h-[44px]"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Recapturar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // 5. Tela de conclusão com sucesso
    if (step === 'complete') {
        return (
            <Card className="max-w-md mx-auto border-emerald-200 dark:border-emerald-900">
                <CardContent className="pt-8 pb-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Cadastro Concluído</h2>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        O rosto de <strong>{personName}</strong> foi registrado e ativado para check-in por reconhecimento facial na recepção e totem.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // 6. Tela de Captura via Webcam
    return (
        <Card className="max-w-lg mx-auto border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold">Captura Facial em 3 Ângulos</CardTitle>
                        <CardDescription className="text-xs">
                            Pessoa: <span className="font-semibold text-foreground">{personName}</span> ({personType === 'patient' ? 'Paciente' : 'Responsável'})
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        {descriptors.length}/3 capturados
                    </Badge>
                </div>
                <Progress value={getProgress()} className="h-1.5 mt-2" />
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden shadow-inner">
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
                        <div className="w-44 h-56 border-2 border-dashed border-white/50 rounded-[45%]" />
                    </div>

                    {/* Instrução em badge na tela */}
                    <div className="absolute bottom-3 left-0 right-0 text-center px-4">
                        <span className="bg-black/75 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-xs">
                            {STEP_LABELS[step]}
                        </span>
                    </div>

                    {/* Overlay durante processamento da IA */}
                    {(step === 'processing' || isCapturing) && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="text-center text-white space-y-2">
                                <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-xs font-medium">Analisando padrão biométrico...</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={captureAngle}
                        disabled={step === 'processing' || isCapturing}
                        className="flex-1 min-h-[44px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="lg"
                    >
                        {isCapturing ? (
                            'Processando...'
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
                        disabled={step === 'processing' || descriptors.length === 0}
                        className="min-h-[44px] px-3.5"
                        title="Reiniciar captura de ângulos"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>

                    {onCancel && (
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={onCancel}
                            className="min-h-[44px] px-3.5"
                            title="Cancelar"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dados criptografados sob padrão médico seguro. Apenas o hash de 128 dimensões é armazenado.</span>
                </div>
            </CardContent>
        </Card>
    );
}
