// app/terminal/page.tsx
// Terminal Quiosque de Consultorio: Check-in Biometrico sem Login de Usuario e sem QR Code
// Totalmente desacoplado de sessao de usuario, active_sessions e useSessionGuard.

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import Webcam from 'react-webcam'
import { createClient } from '@/lib/supabase/client'
import { SignaturePad } from '@/components/signature/SignaturePad'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Camera,
    CheckCircle2,
    ShieldCheck,
    AlertCircle,
    Loader2,
    RefreshCw,
    Clock,
    UserCheck,
    Tablet,
    LogOut,
    Volume2,
    FileEdit,
    ArrowLeft,
    PhoneCall,
    Check,
    KeyRound,
    Lock,
    Unlock,
    Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { ReceptionPinGate } from '@/components/terminal/ReceptionPinGate'

const MODEL_URL = '/models/face-api'

interface QueueItem {
    appointment_id: string
    patient_id: string
    time: string
    patient_first_name: string
    therapist_first_name: string
    status: string
    checkin_confirmed: boolean
    checkin_method: string | null
}

export default function TerminalPage() {
    // 1. Estado do Token de Dispositivo Pareado (persistido localmente no tablet)
    const [deviceToken, setDeviceToken] = useState<string | null>(null)
    const [pairingInput, setPairingInput] = useState('')
    const [isPairingLoading, setIsPairingLoading] = useState(false)
    const [pairingError, setPairingError] = useState<string | null>(null)

    // 2. Metadados do terminal
    const [clinicId, setClinicId] = useState<string | null>(null)
    const [deviceId, setDeviceId] = useState<string | null>(null)
    const [roomLabel, setRoomLabel] = useState<string>('Consultorio')
    const [currentTime, setCurrentTime] = useState<Date>(new Date())

    // 3. Fila do dia
    const [queue, setQueue] = useState<QueueItem[]>([])
    const [isQueueLoading, setIsQueueLoading] = useState(false)

    // 4. Fluxo de Atendimento / Captura
    const [activeCaptureToken, setActiveCaptureToken] = useState<string | null>(null)
    const [activePatientName, setActivePatientName] = useState<string | null>(null)
    const [captureExpiresAt, setCaptureExpiresAt] = useState<Date | null>(null)
    const [remainingSeconds, setRemainingSeconds] = useState<number>(180)
    const [captureMode, setCaptureMode] = useState<'camera' | 'signature'>('camera')

    // 5. Reconhecimento Facial
    const webcamRef = useRef<Webcam>(null)
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [modelsLoading, setModelsLoading] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [scanAttempts, setScanAttempts] = useState(0)
    const [lastScanError, setLastScanError] = useState<string | null>(null)
    const [confirmationSuccess, setConfirmationSuccess] = useState<string | null>(null)
    const [isEscalating, setIsEscalating] = useState(false)
    const [isSubmittingSignature, setIsSubmittingSignature] = useState(false)
    const [signatureData, setSignatureData] = useState<string | null>(null)

    const scanLoopRef = useRef<NodeJS.Timeout | null>(null)
    const isProcessingFrameRef = useRef<boolean>(false)

    // 6. Modo Recepção via PIN Efêmero (15 min isolado de sessões do sistema)
    const [openPinGate, setOpenPinGate] = useState(false)
    const [isReceptionMode, setIsReceptionMode] = useState(false)
    const [receptionLabel, setReceptionLabel] = useState<string>('Recepção')
    const [receptionExpiresAt, setReceptionExpiresAt] = useState<number | null>(null)
    const [receptionSearch, setReceptionSearch] = useState('')

    // Monitoramento da expiração do Modo Recepção
    useEffect(() => {
        if (!isReceptionMode || !receptionExpiresAt) return
        const timer = setInterval(() => {
            if (Date.now() >= receptionExpiresAt) {
                setIsReceptionMode(false)
                setReceptionExpiresAt(null)
                toast.info('Sessão do Modo Recepção expirou após 15 minutos. Retornado ao Quiosque.')
            }
        }, 2000)
        return () => clearInterval(timer)
    }, [isReceptionMode, receptionExpiresAt])

    // Relogio em tempo real
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // Inicializacao: carregar token de pareamento do localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedToken = localStorage.getItem('clinigo_device_token')
            if (savedToken) {
                setDeviceToken(savedToken.trim())
            }
        }
    }, [])

    // Validar e buscar fila inicial ao obter o deviceToken
    const fetchQueue = useCallback(async (tokenToUse?: string) => {
        const token = tokenToUse || deviceToken
        if (!token) return

        try {
            setIsQueueLoading(true)
            const res = await fetch('/api/device/queue', {
                method: 'GET',
                headers: { 'x-clinigo-device-token': token }
            })

            if (!res.ok) {
                if (res.status === 401) {
                    // Token revogado ou invalido
                    localStorage.removeItem('clinigo_device_token')
                    setDeviceToken(null)
                    setPairingError('Dispositivo nao autorizado ou revogado pelo administrador.')
                }
                return
            }

            const data = await res.json()
            setClinicId(data.clinic_id)
            setDeviceId(data.device_id)
            setRoomLabel(data.room_label || 'Consultorio')
            setQueue(data.queue || [])
            setPairingError(null)
        } catch (err) {
            console.error('[Terminal] Erro ao consultar fila:', err)
        } finally {
            setIsQueueLoading(false)
        }
    }, [deviceToken])

    useEffect(() => {
        if (deviceToken) {
            fetchQueue(deviceToken)
            const interval = setInterval(() => fetchQueue(deviceToken), 30000) // refresh a cada 30s
            return () => clearInterval(interval)
        }
    }, [deviceToken, fetchQueue])

    // Escuta em tempo real no canal do dispositivo (push-checkin do computador da terapeuta)
    useEffect(() => {
        if (!deviceId) return

        const supabase = createClient()
        const channelName = `device:${deviceId}`

        const channel = supabase
            .channel(channelName)
            .on('broadcast', { event: 'start_checkin' }, (payload: any) => {
                const data = payload.payload || payload
                if (data?.capture_token && data?.patient_first_name) {
                    setActiveCaptureToken(data.capture_token)
                    setActivePatientName(data.patient_first_name)
                    if (data.expires_at) {
                        setCaptureExpiresAt(new Date(data.expires_at))
                    }
                    setCaptureMode('camera')
                    setScanAttempts(0)
                    setLastScanError(null)
                    setConfirmationSuccess(null)
                    toast.info(`Check-in iniciado para ${data.patient_first_name}`)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [deviceId])

    // Carregar modelos neurais do face-api sob demanda
    const loadFaceApiModels = useCallback(async () => {
        if (modelsLoaded || modelsLoading) return
        try {
            setModelsLoading(true)
            const isLoaded =
                faceapi.nets.ssdMobilenetv1?.isLoaded &&
                faceapi.nets.faceLandmark68Net?.isLoaded &&
                faceapi.nets.faceRecognitionNet?.isLoaded

            if (!isLoaded) {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ])
            }
            setModelsLoaded(true)
        } catch (err) {
            console.error('[Terminal FaceAPI] Erro ao carregar modelos neurais:', err)
            toast.error('Erro ao carregar detector facial inteligente')
        } finally {
            setModelsLoading(false)
        }
    }, [modelsLoaded, modelsLoading])

    // Disparar carregamento de modelos quando entrar na tela de captura
    useEffect(() => {
        if (activeCaptureToken && captureMode === 'camera') {
            loadFaceApiModels()
        }
    }, [activeCaptureToken, captureMode, loadFaceApiModels])

    // Contador regressivo do token (3 minutos)
    useEffect(() => {
        if (!activeCaptureToken || !captureExpiresAt) return

        const timer = setInterval(() => {
            const diffSeconds = Math.max(0, Math.floor((captureExpiresAt.getTime() - Date.now()) / 1000))
            setRemainingSeconds(diffSeconds)

            if (diffSeconds <= 0) {
                toast.error('Tempo limite de 3 minutos esgotado. Solicite novo check-in.')
                handleCancelCapture()
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [activeCaptureToken, captureExpiresAt])

    // Varredura facial em tempo real (scan loop)
    const executeScanFrame = useCallback(async () => {
        if (
            isProcessingFrameRef.current ||
            !webcamRef.current?.video ||
            !activeCaptureToken ||
            confirmationSuccess
        ) {
            return
        }

        const video = webcamRef.current.video
        if (video.readyState !== 4) return

        try {
            isProcessingFrameRef.current = true
            setIsScanning(true)

            const detection = await faceapi
                .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor()

            if (detection?.descriptor) {
                const descriptorArray = Array.from(detection.descriptor)

                const res = await fetch(`/api/checkin/${activeCaptureToken}/confirm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descriptor: descriptorArray })
                })

                const json = await res.json()

                if (res.ok && json.success && json.match) {
                    // Reconhecimento bem sucedido
                    if (scanLoopRef.current) {
                        clearInterval(scanLoopRef.current)
                        scanLoopRef.current = null
                    }
                    const confirmedName = json.person_name || activePatientName || 'Paciente'
                    setConfirmationSuccess(confirmedName)
                    toast.success(`Presença confirmada: ${confirmedName}`)

                    // Retorna a fila apos 2.5 segundos
                    setTimeout(() => {
                        handleCancelCapture()
                        fetchQueue()
                    }, 2500)
                } else if (res.ok && json.success && !json.match) {
                    setScanAttempts(prev => prev + 1)
                    setLastScanError('Rosto posicionado não confere com os registros cadastrados.')
                } else if (!res.ok) {
                    setLastScanError(json.error || 'Falha ao processar biometria.')
                }
            }
        } catch (err: any) {
            console.warn('[Terminal Scan] Erro no quadro:', err)
        } finally {
            isProcessingFrameRef.current = false
            setIsScanning(false)
        }
    }, [activeCaptureToken, confirmationSuccess, activePatientName, fetchQueue])

    // Loop de varredura ativo
    useEffect(() => {
        if (
            activeCaptureToken &&
            captureMode === 'camera' &&
            modelsLoaded &&
            !confirmationSuccess
        ) {
            if (!scanLoopRef.current) {
                scanLoopRef.current = setInterval(executeScanFrame, 700)
            }
        } else {
            if (scanLoopRef.current) {
                clearInterval(scanLoopRef.current)
                scanLoopRef.current = null
            }
        }

        return () => {
            if (scanLoopRef.current) {
                clearInterval(scanLoopRef.current)
                scanLoopRef.current = null
            }
        }
    }, [activeCaptureToken, captureMode, modelsLoaded, confirmationSuccess, executeScanFrame])

    // Conectar terminal via codigo
    const handleConnectDevice = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanCode = pairingInput.trim()
        if (!cleanCode) {
            setPairingError('Informe o código de pareamento do terminal.')
            return
        }

        setIsPairingLoading(true)
        setPairingError(null)

        try {
            const res = await fetch('/api/device/queue', {
                method: 'GET',
                headers: { 'x-clinigo-device-token': cleanCode }
            })

            if (!res.ok) {
                setPairingError('Código de pareamento inválido ou terminal revogado.')
                return
            }

            const data = await res.json()
            localStorage.setItem('clinigo_device_token', cleanCode)
            setDeviceToken(cleanCode)
            setClinicId(data.clinic_id)
            setDeviceId(data.device_id)
            setRoomLabel(data.room_label || 'Consultorio')
            setQueue(data.queue || [])
            toast.success('Terminal pareado com sucesso')
        } catch (err) {
            setPairingError('Falha na comunicação com o servidor.')
        } finally {
            setIsPairingLoading(false)
        }
    }

    // Desconectar tablet da sala
    const handleUnpairDevice = () => {
        if (confirm('Deseja realmente desvincular este tablet da sala?')) {
            localStorage.removeItem('clinigo_device_token')
            setDeviceToken(null)
            setQueue([])
            setActiveCaptureToken(null)
            toast.info('Terminal desvinculado.')
        }
    }

    // Iniciar check-in tocando em um paciente da fila
    const handleStartCheckin = async (item: QueueItem) => {
        if (!deviceToken) return
        try {
            const res = await fetch('/api/device/checkin/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-clinigo-device-token': deviceToken,
                },
                body: JSON.stringify({ appointment_id: item.appointment_id })
            })

            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || 'Erro ao iniciar check-in')
                return
            }

            setActiveCaptureToken(data.capture_token)
            setActivePatientName(data.patient_first_name)
            setCaptureExpiresAt(new Date(data.expires_at))
            setCaptureMode('camera')
            setScanAttempts(0)
            setLastScanError(null)
            setConfirmationSuccess(null)
        } catch (err) {
            toast.error('Erro ao conectar ao servidor de check-in')
        }
    }

    // Cancelar/fechar tela de captura
    const handleCancelCapture = () => {
        if (scanLoopRef.current) {
            clearInterval(scanLoopRef.current)
            scanLoopRef.current = null
        }
        setActiveCaptureToken(null)
        setActivePatientName(null)
        setCaptureExpiresAt(null)
        setConfirmationSuccess(null)
        setSignatureData(null)
        setScanAttempts(0)
        setLastScanError(null)
    }

    // Fallback: Acionar suporte da recepção
    const handleEscalateToReception = async () => {
        if (!activeCaptureToken || isEscalating) return
        try {
            setIsEscalating(true)
            const res = await fetch(`/api/checkin/${activeCaptureToken}/escalate`, {
                method: 'POST',
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('Equipe de recepção notificada. Aguarde um instante no consultório.')
            } else {
                toast.error(data.error || 'Falha ao notificar recepção')
            }
        } catch {
            toast.error('Erro ao acionar recepção')
        } finally {
            setIsEscalating(false)
        }
    }

    // Fallback: Enviar assinatura touch
    const handleSubmitSignature = async () => {
        if (!activeCaptureToken || !signatureData || isSubmittingSignature) {
            toast.error('Desenhe sua assinatura no quadro antes de confirmar.')
            return
        }

        try {
            setIsSubmittingSignature(true)
            const res = await fetch(`/api/checkin/${activeCaptureToken}/signature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature_data_url: signatureData })
            })

            const data = await res.json()
            if (res.ok && data.success) {
                setConfirmationSuccess(activePatientName || 'Paciente')
                toast.success('Presença confirmada com sucesso via assinatura touch.')
                setTimeout(() => {
                    handleCancelCapture()
                    fetchQueue()
                }, 2000)
            } else {
                toast.error(data.error || 'Erro ao registrar assinatura.')
            }
        } catch {
            toast.error('Erro ao registrar assinatura')
        } finally {
            setIsSubmittingSignature(false)
        }
    }

    // ==========================================
    // RENDER: Estado 1 - Gate de Pareamento
    // ==========================================
    if (!deviceToken) {
        return (
            <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 select-none">
                <Card className="w-full max-w-md border-slate-800 bg-slate-900/90 shadow-2xl rounded-2xl">
                    <CardHeader className="text-center pb-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                            <Tablet className="w-7 h-7" />
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight text-white">
                            Terminal CliniGo
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">
                            Pareamento de tablet para validação presencial de sala
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {pairingError && (
                            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{pairingError}</span>
                            </div>
                        )}

                        <form onSubmit={handleConnectDevice} className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                                    Código do Dispositivo
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Cole ou digite o código de pareamento"
                                    value={pairingInput}
                                    onChange={(e) => setPairingInput(e.target.value)}
                                    className="bg-slate-950/70 border-slate-700 text-white font-mono text-sm h-12 rounded-xl focus:border-emerald-500"
                                    autoFocus
                                />
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Gerado no painel da clínica em: Configurações &gt; Dispositivos & Tablets.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={isPairingLoading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] rounded-xl font-semibold text-sm transition-all shadow-md"
                            >
                                {isPairingLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Verificando Terminal...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Conectar Tablet à Sala
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ==========================================
    // RENDER: Estado 3 / 4 - Câmera ou Assinatura
    // ==========================================
    if (activeCaptureToken) {
        return (
            <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none">
                {/* Cabeçalho do Check-in */}
                <header className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelCapture}
                            className="min-h-[44px] px-3.5 border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white rounded-xl gap-1.5"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Voltar</span>
                        </Button>
                        <div>
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                                {roomLabel}
                            </span>
                            <h1 className="text-base sm:text-lg font-bold text-white">
                                Check-in: {activePatientName}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Temporizador de 3 minutos */}
                        <Badge
                            variant="outline"
                            className={`min-h-[36px] px-3 font-mono text-xs font-semibold gap-1.5 rounded-xl ${
                                remainingSeconds < 30
                                    ? 'bg-rose-950/50 text-rose-300 border-rose-700 animate-pulse'
                                    : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}</span>
                        </Badge>
                    </div>
                </header>

                {/* Conteúdo Central: Câmera ou Assinatura */}
                <main className="flex-1 flex items-center justify-center py-4">
                    {confirmationSuccess ? (
                        /* Feedback Visual de Sucesso */
                        <div className="max-w-md w-full p-8 rounded-3xl bg-emerald-950/80 border border-emerald-600/60 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-white">
                                Presença Confirmada!
                            </h2>
                            <p className="text-sm text-emerald-200 font-medium">
                                Atendimento de {confirmationSuccess} validado com sucesso.
                            </p>
                            <div className="pt-2">
                                <span className="inline-block text-xs font-mono text-emerald-400/80 bg-black/40 px-3 py-1 rounded-full">
                                    Retornando à fila em instantes...
                                </span>
                            </div>
                        </div>
                    ) : captureMode === 'camera' ? (
                        /* Modo Câmera */
                        <div className="max-w-md w-full space-y-3">
                            <div className="relative rounded-3xl overflow-hidden border-2 border-slate-800 bg-black aspect-[4/3] flex items-center justify-center shadow-2xl">
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

                                {/* Guia Visual de Enquadramento */}
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 bg-gradient-to-b from-black/40 via-transparent to-black/60">
                                    <Badge className="bg-slate-900/90 text-slate-100 border-slate-700 text-xs gap-1.5 backdrop-blur px-3 py-1">
                                        {modelsLoading ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                                Inicializando câmera...
                                            </>
                                        ) : isScanning ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                                Analisando rosto...
                                            </>
                                        ) : (
                                            <>
                                                <Camera className="w-3.5 h-3.5 text-sky-400" />
                                                Olhe para a câmera
                                            </>
                                        )}
                                    </Badge>

                                    <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl border-2 border-dashed border-emerald-400/90 animate-pulse flex items-center justify-center">
                                        <span className="text-[11px] text-white/90 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur">
                                            Posicione o rosto aqui
                                        </span>
                                    </div>

                                    <span className="text-xs text-white/80 font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur">
                                        Paciente ou Responsável Legal
                                    </span>
                                </div>
                            </div>

                            {/* Alerta de Retentativa */}
                            {lastScanError && (
                                <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800/50 text-amber-200 text-xs flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                        <span>{lastScanError}</span>
                                    </div>
                                    <span className="font-mono text-[11px] text-amber-400">
                                        Tentativa {scanAttempts}
                                    </span>
                                </div>
                            )}

                            {/* Ações de Fallback e Alternativas */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCaptureMode('signature')}
                                    className="flex-1 min-h-[44px] rounded-xl border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-xs text-slate-200 gap-1.5"
                                >
                                    <FileEdit className="w-4 h-4 text-emerald-400" />
                                    <span>Assinar na Tela</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleEscalateToReception}
                                    disabled={isEscalating}
                                    className="min-h-[44px] rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-900 gap-1.5"
                                >
                                    <PhoneCall className="w-4 h-4 text-amber-400" />
                                    <span>Chamar Recepção</span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Modo Assinatura Touch (Fallback c) */
                        <div className="max-w-md w-full space-y-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-2xl">
                            <div>
                                <h3 className="text-base font-bold text-white">
                                    Assinatura do Comparecimento
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Rubrique abaixo com o dedo para validar o atendimento
                                </p>
                            </div>

                            <SignaturePad
                                onSave={(dataUrl) => setSignatureData(dataUrl)}
                                onClear={() => setSignatureData(null)}
                            />

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCaptureMode('camera')}
                                    className="min-h-[44px] rounded-xl border-slate-800 text-xs text-slate-300"
                                >
                                    Voltar para Câmera
                                </Button>

                                <Button
                                    type="button"
                                    onClick={handleSubmitSignature}
                                    disabled={!signatureData || isSubmittingSignature}
                                    className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-md"
                                >
                                    {isSubmittingSignature ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                            Confirmando...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-1" />
                                            Confirmar Presença
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </main>

                {/* Rodapé Operacional */}
                <footer className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[11px]">
                        Canal Seguro CliniGo Quiosque
                    </span>
                    <button
                        type="button"
                        onClick={handleEscalateToReception}
                        disabled={isEscalating}
                        className="text-xs text-slate-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer min-h-[44px] flex items-center"
                    >
                        Precisa de ajuda? Chamar Recepção
                    </button>
                </footer>
            </div>
        )
    }

    // ==========================================
    // RENDER: Estado 2 - Fila do Dia da Sala (Modo Quiosque)
    // ==========================================
    return (
        <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
            {/* Barra Superior */}
            <header className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                        <Tablet className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                                {roomLabel}
                            </h1>
                            {isReceptionMode && (
                                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700/60 text-[10px] font-semibold">
                                    Modo Recepção ({receptionLabel})
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">
                            {isReceptionMode
                                ? 'Terminal Desbloqueado — Gestão Rápida e Walk-in'
                                : 'Fila de Atendimento do Dia (Quiosque)'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Botão de Ativação / Desativação do Modo Recepção */}
                    {!isReceptionMode ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenPinGate(true)}
                            className="min-h-[44px] rounded-xl border-slate-800 hover:border-emerald-500/50 bg-slate-900/80 text-slate-200 text-xs gap-1.5"
                        >
                            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Modo Recepção</span>
                        </Button>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-1 rounded-lg">
                                {receptionExpiresAt ? Math.max(0, Math.ceil((receptionExpiresAt - Date.now()) / 60000)) : 15} min
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsReceptionMode(false)
                                    setReceptionExpiresAt(null)
                                    toast.info('Modo Recepção finalizado.')
                                }}
                                className="min-h-[44px] text-xs text-slate-400 hover:text-white"
                            >
                                <Lock className="w-3.5 h-3.5 mr-1" />
                                Bloquear
                            </Button>
                        </div>
                    )}

                    <div className="text-right font-mono pl-1 border-l border-slate-800">
                        <span className="text-lg sm:text-xl font-bold text-white block leading-none">
                            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                            {currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleUnpairDevice}
                        title="Desconectar Tablet"
                        className="h-10 w-10 min-h-[44px] min-w-[44px] text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-xl"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Corpo: Lista da Fila de Pacientes */}
            <main className="flex-1 py-4 sm:py-6 overflow-y-auto space-y-4">
                {isReceptionMode && (
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-900/90 border border-emerald-500/30 rounded-2xl">
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Filtrar paciente ou terapeuta na fila do dia..."
                                value={receptionSearch}
                                onChange={(e) => setReceptionSearch(e.target.value)}
                                className="pl-9 h-11 bg-slate-950 border-slate-800 text-xs rounded-xl text-white placeholder:text-slate-500"
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={() => fetchQueue()}
                            variant="outline"
                            className="w-full sm:w-auto min-h-[44px] text-xs border-slate-800 rounded-xl text-slate-300 gap-1.5"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Atualizar Fila
                        </Button>
                    </div>
                )}
                {isQueueLoading && queue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-3 py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <p className="text-xs text-slate-400">Carregando fila da sala...</p>
                    </div>
                ) : queue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-16 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h2 className="text-base font-bold text-white">
                            Nenhum paciente agendado no momento
                        </h2>
                        <p className="text-xs text-slate-400">
                            Novos pacientes atribuídos a esta sala aparecerão automaticamente aqui.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchQueue()}
                            className="min-h-[44px] rounded-xl border-slate-800 text-xs text-slate-300 gap-1.5"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Atualizar Agora
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto">
                        {queue
                            .filter((item) => {
                                if (!receptionSearch.trim()) return true
                                const term = receptionSearch.toLowerCase()
                                return (
                                    (item.patient_first_name || '').toLowerCase().includes(term) ||
                                    (item.therapist_first_name || '').toLowerCase().includes(term)
                                )
                            })
                            .map((item) => {
                            const isConfirmed = item.checkin_confirmed || item.status === 'IN_PROGRESS' || item.status === 'COMPLETED'
                            return (
                                <div
                                    key={item.appointment_id}
                                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                                        isConfirmed
                                            ? 'bg-slate-900/50 border-slate-800/80 opacity-80'
                                            : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 shadow-md'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                                                {item.time}
                                            </span>
                                            <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                                {item.therapist_first_name}
                                            </span>
                                        </div>

                                        {isConfirmed ? (
                                            <Badge variant="outline" className="bg-emerald-950/50 text-emerald-300 border-emerald-700/60 text-[10px] font-semibold gap-1">
                                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                                Confirmado
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-slate-800/80 text-slate-300 border-slate-700 text-[10px]">
                                                Aguardando
                                            </Badge>
                                        )}
                                    </div>

                                    <div>
                                        <span className="text-xs text-slate-400 block font-medium">
                                            Paciente
                                        </span>
                                        <h3 className="text-lg font-bold text-white tracking-tight">
                                            {item.patient_first_name}
                                        </h3>
                                    </div>

                                    <div>
                                        {isConfirmed ? (
                                            <div className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1.5 py-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Presença Validada ({item.checkin_method || 'Facial'})</span>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => handleStartCheckin(item)}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs min-h-[44px] rounded-xl gap-2 shadow-sm transition-all"
                                            >
                                                <UserCheck className="w-4 h-4" />
                                                <span>Validar Presença</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Rodapé Informativo */}
            <footer className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                        {isReceptionMode ? 'Terminal em Modo Recepção' : 'Terminal Ativo (Modo Quiosque)'}
                    </span>
                </div>

                <div className="text-[11px] text-slate-400">
                    O terapeuta também pode acionar o tablet remotamente pelo computador
                </div>
            </footer>

            {/* Modal de Desbloqueio por PIN Efêmero */}
            <ReceptionPinGate
                open={openPinGate}
                onOpenChange={setOpenPinGate}
                deviceToken={deviceToken}
                onUnlocked={(session) => {
                    setIsReceptionMode(true)
                    setReceptionLabel(session.label)
                    setReceptionExpiresAt(Date.now() + session.expires_in_seconds * 1000)
                }}
            />
        </div>
    )
}
