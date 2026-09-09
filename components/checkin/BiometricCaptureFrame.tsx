'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, AlertCircle, Loader2, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react'

const MODEL_URL = '/models/face-api'

export interface BiometricCaptureFrameProps {
    subjectType: 'patient' | 'therapist'
    title?: string
    description?: string
    onCapture: (data: { descriptor: number[]; thumbnailBase64?: string }) => Promise<void> | void
    onCancel?: () => void
    isProcessing?: boolean
    errorMessage?: string | null
}

export function BiometricCaptureFrame({
    subjectType,
    title,
    description,
    onCapture,
    onCancel,
    isProcessing = false,
    errorMessage = null,
}: BiometricCaptureFrameProps) {
    const webcamRef = useRef<Webcam>(null)
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [modelsLoading, setModelsLoading] = useState(true)
    const [modelError, setModelError] = useState<string | null>(null)
    const [cameraReady, setCameraReady] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [captureFeedback, setCaptureFeedback] = useState<string | null>(null)

    // 1. Carregar modelos SSD-MobileNet, Landmarks e Recognition
    const loadNeuralModels = useCallback(async () => {
        try {
            setModelsLoading(true)
            setModelError(null)

            const isAlreadyLoaded =
                faceapi.nets.ssdMobilenetv1?.isLoaded &&
                faceapi.nets.faceLandmark68Net?.isLoaded &&
                faceapi.nets.faceRecognitionNet?.isLoaded

            if (!isAlreadyLoaded) {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ])
            }

            setModelsLoaded(true)
        } catch (err: any) {
            console.error('[BiometricCaptureFrame] Falha ao carregar modelos neurais:', err)
            setModelError('Falha ao inicializar visão neural. Verifique os arquivos do modelo.')
        } finally {
            setModelsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadNeuralModels()
    }, [loadNeuralModels])

    // 2. Extração de vetor facial a partir de frame do vídeo
    const handleCaptureAndExtract = async () => {
        if (!webcamRef.current || !webcamRef.current.video || !modelsLoaded || isProcessing || isAnalyzing) {
            return
        }

        const video = webcamRef.current.video
        if (video.readyState !== 4) {
            setCaptureFeedback('Aguardando inicialização do sinal da câmera...')
            return
        }

        try {
            setIsAnalyzing(true)
            setCaptureFeedback('Analisando pontos biométricos...')

            const detection = await faceapi
                .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor()

            if (!detection) {
                setCaptureFeedback('Nenhum rosto detectado. Centralize o rosto na moldura.')
                return
            }

            const descriptorArray = Array.from(detection.descriptor)
            const thumbnail = webcamRef.current.getScreenshot() || undefined

            setCaptureFeedback('Rosto capturado com sucesso. Validando...')
            await onCapture({ descriptor: descriptorArray, thumbnailBase64: thumbnail })
        } catch (err: any) {
            console.error('[BiometricCaptureFrame] Erro ao extrair descritor:', err)
            setCaptureFeedback(err?.message || 'Falha na captura biométrica.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const defaultTitle = subjectType === 'therapist'
        ? 'Verificação de Terapeuta Responsável'
        : 'Captura Biométrica do Paciente'

    const defaultDescription = subjectType === 'therapist'
        ? 'Posicione o seu rosto de frente para a câmera para validar o início do atendimento.'
        : 'Posicione o paciente ou responsável de frente para a câmera para confirmação.'

    return (
        <div className="w-full max-w-md mx-auto space-y-3">
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        {title || defaultTitle}
                    </h3>
                    <Badge variant="outline" className="text-[11px] font-mono">
                        {subjectType === 'therapist' ? 'Terapeuta' : 'Paciente'}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                    {description || defaultDescription}
                </p>
            </div>

            {/* Viewport de Câmera */}
            <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800">
                {modelsLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-slate-900">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        <span className="text-xs">Carregando inteligência neural...</span>
                    </div>
                ) : modelError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-900 text-rose-300 gap-2">
                        <AlertCircle className="w-6 h-6 text-rose-400" />
                        <span className="text-xs">{modelError}</span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={loadNeuralModels}
                            className="min-h-[38px] text-xs text-white border-white/20 hover:bg-white/10"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            Tentar Novamente
                        </Button>
                    </div>
                ) : cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-900 text-rose-300 gap-2">
                        <AlertCircle className="w-6 h-6 text-rose-400" />
                        <span className="text-xs font-semibold">Câmera indisponível</span>
                        <span className="text-[11px] text-slate-300">{cameraError}</span>
                    </div>
                ) : (
                    <>
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{
                                facingMode: 'user',
                                width: { ideal: 640 },
                                height: { ideal: 480 },
                            }}
                            onUserMedia={() => setCameraReady(true)}
                            onUserMediaError={(err) => {
                                console.error('[BiometricCaptureFrame] Erro ao abrir webcam:', err)
                                setCameraError('Permissão de câmera negada ou dispositivo indisponível.')
                            }}
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />

                        {/* Guia visual de enquadramento */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-36 h-48 sm:w-44 sm:h-56 border-2 border-dashed border-emerald-400/80 rounded-[45%] shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                        </div>

                        {/* Overlay de carregamento / análise */}
                        {(isProcessing || isAnalyzing) && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2 backdrop-blur-xs">
                                <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                                <span className="text-xs font-medium">Processando biometria...</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Feedback em tempo real ou erros */}
            {(errorMessage || captureFeedback) && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    errorMessage
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                }`}>
                    {errorMessage ? (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    )}
                    <span className="flex-1">{errorMessage || captureFeedback}</span>
                </div>
            )}

            {/* Ações */}
            <div className="flex gap-2 pt-1">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isProcessing || isAnalyzing}
                        className="min-h-[44px] px-4 text-xs font-medium border-slate-200 dark:border-slate-800"
                    >
                        Voltar
                    </Button>
                )}

                <Button
                    type="button"
                    onClick={handleCaptureAndExtract}
                    disabled={!modelsLoaded || !cameraReady || isProcessing || isAnalyzing}
                    className="flex-1 min-h-[44px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                    {isProcessing || isAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Camera className="w-4 h-4" />
                    )}
                    <span>Capturar e Validar Rosto</span>
                </Button>
            </div>
        </div>
    )
}
