'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
    QrCode,
    Camera,
    CameraOff,
    CheckCircle2,
    XCircle,
    Loader2,
    User,
    Clock,
    AlertTriangle,
    RefreshCw,
    Phone,
    Calendar,
    Stethoscope,
    UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QRScannerRecepcaoProps {
    clinicId: string
    onCheckinSuccess?: (data: PatientData) => void
}

interface PatientData {
    appointment_id: string
    patient_name: string
    patient_phone?: string
    doctor_name?: string
    appointment_date?: string
    appointment_time?: string
    main_complaint?: string
    health_insurance?: string
    priority?: string
    queue_position?: number
    estimated_wait?: number
}

interface ScanResult {
    success: boolean
    message: string
    patient?: PatientData
    needsConfirmation?: boolean
    queueId?: string
}

const priorityLabels: Record<string, { label: string; color: string; icon?: boolean }> = {
    emergencia: { label: 'Emergência', color: 'bg-red-100 text-red-800 border-red-200', icon: true },
    idoso: { label: 'Idoso 60+', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    gestante: { label: 'Gestante', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    deficiente: { label: 'PcD', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    retorno_urgente: { label: 'Retorno Urgente', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    normal: { label: 'Normal', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

export function QRScannerRecepcao({ clinicId, onCheckinSuccess }: QRScannerRecepcaoProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [lastResult, setLastResult] = useState<ScanResult | null>(null)
    const [priorityReason, setPriorityReason] = useState('normal')
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
    const [selectedCamera, setSelectedCamera] = useState<string>('')
    const [scannedToken, setScannedToken] = useState<string | null>(null)

    // Get available cameras
    useEffect(() => {
        Html5Qrcode.getCameras()
            .then((devices) => {
                if (devices && devices.length) {
                    setCameras(devices.map((d) => ({ id: d.id, label: d.label || `Câmera ${d.id}` })))
                    setSelectedCamera(devices[0].id)
                }
            })
            .catch((err) => {
                console.error('Error getting cameras:', err)
                toast.error('Não foi possível acessar as câmeras')
            })
    }, [])

    // Validate token and get patient data (without confirming)
    const validateToken = useCallback(async (token: string): Promise<ScanResult> => {
        try {
            // First, just decode and validate without adding to queue
            const response = await fetch('/api/checkin/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            })

            const result = await response.json()

            if (result.success) {
                return {
                    success: true,
                    message: 'QR Code válido',
                    patient: result.data,
                    needsConfirmation: true,
                }
            } else {
                // Fallback: try the verify endpoint directly
                const verifyResponse = await fetch('/api/checkin/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token,
                        priority_reason: priorityReason,
                        validate_only: true,
                    }),
                })

                const verifyResult = await verifyResponse.json()

                if (verifyResult.success) {
                    return {
                        success: true,
                        message: 'QR Code válido',
                        patient: {
                            appointment_id: verifyResult.data.appointment_id,
                            patient_name: verifyResult.data.patient_name || 'Paciente',
                            doctor_name: verifyResult.data.doctor_name,
                            appointment_time: verifyResult.data.appointment_time,
                        },
                        needsConfirmation: !verifyResult.data.already_in_queue,
                        queueId: verifyResult.data.queue_id,
                    }
                }

                return {
                    success: false,
                    message: verifyResult.error || result.error || 'Token inválido',
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Erro ao validar QR Code',
            }
        }
    }, [priorityReason])

    // Confirm presence and add to queue
    const confirmPresence = async () => {
        if (!scannedToken || !lastResult?.patient) return

        setIsConfirming(true)
        try {
            const response = await fetch('/api/checkin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: scannedToken,
                    priority_reason: priorityReason,
                }),
            })

            const result = await response.json()

            if (result.success) {
                const confirmedResult: ScanResult = {
                    success: true,
                    message: result.data.message || 'Presença confirmada!',
                    patient: {
                        ...lastResult.patient,
                        queue_position: result.data.queue_position,
                        estimated_wait: result.data.estimated_wait,
                        priority: priorityReason,
                    },
                    needsConfirmation: false,
                    queueId: result.data.queue_id,
                }
                setLastResult(confirmedResult)
                toast.success(`✅ ${lastResult.patient.patient_name} confirmado(a)!`)
                onCheckinSuccess?.(confirmedResult.patient!)

                // Stop scanner after successful confirmation
                if (scannerRef.current?.isScanning) {
                    await scannerRef.current.stop()
                    setIsScanning(false)
                }
            } else {
                toast.error(result.error || 'Erro ao confirmar presença')
            }
        } catch (error) {
            toast.error('Erro de conexão')
        } finally {
            setIsConfirming(false)
        }
    }

    // Process scanned QR code
    const processQRCode = useCallback(async (decodedText: string) => {
        if (isProcessing) return

        setIsProcessing(true)
        setLastResult(null)

        try {
            // Parse QR data - support multiple formats
            let token: string
            let appointmentId: string | null = null

            // Format 1: Simple CLINIGO:{appointment_id} format (new, preferred)
            if (decodedText.startsWith('CLINIGO:')) {
                appointmentId = decodedText.replace('CLINIGO:', '')
                token = appointmentId // Use appointment_id as token for lookup
            }
            // Format 2: JSON with token (legacy)
            else {
                try {
                    const qrData = JSON.parse(decodedText)
                    if (qrData.type === 'clinigo_checkin') {
                        token = qrData.token
                        appointmentId = qrData.appointment_id
                    } else {
                        throw new Error('QR Code inválido - não é do CliniGo')
                    }
                } catch {
                    // Format 3: Plain token/appointment_id (fallback)
                    token = decodedText
                }
            }

            setScannedToken(appointmentId || token)

            // Validate and get patient data
            const result = await validateToken(appointmentId || token)
            setLastResult(result)

            if (result.success && result.patient) {
                toast.info(`Paciente: ${result.patient.patient_name}`, {
                    icon: <User className="w-4 h-4" />,
                })

                // Pause scanner while showing patient data
                if (scannerRef.current?.isScanning) {
                    await scannerRef.current.stop()
                    setIsScanning(false)
                }
            } else {
                toast.error(result.message)
            }
        } catch (error: any) {
            setLastResult({
                success: false,
                message: error.message || 'Erro ao processar QR Code',
            })
            toast.error('Erro ao processar QR Code')
        } finally {
            setIsProcessing(false)
        }
    }, [isProcessing, validateToken])

    // Start scanner
    const startScanner = async () => {
        if (!selectedCamera) {
            toast.error('Nenhuma câmera selecionada')
            return
        }

        try {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode('qr-reader')
            }

            await scannerRef.current.start(
                selectedCamera,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    processQRCode(decodedText)
                },
                () => {
                    // Ignore scan errors
                }
            )

            setIsScanning(true)
            setLastResult(null)
            setScannedToken(null)
        } catch (err: any) {
            console.error('Error starting scanner:', err)
            toast.error('Erro ao iniciar câmera: ' + err.message)
        }
    }

    // Stop scanner
    const stopScanner = async () => {
        try {
            if (scannerRef.current?.isScanning) {
                await scannerRef.current.stop()
            }
            setIsScanning(false)
        } catch (err) {
            console.error('Error stopping scanner:', err)
        }
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error)
            }
        }
    }, [])

    // Reset for new scan
    const resetScanner = () => {
        setLastResult(null)
        setScannedToken(null)
        startScanner()
    }

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Scanner de Check-in
                </CardTitle>
                <CardDescription>
                    Leia o QR Code do paciente para confirmar a presença
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Camera Selection */}
                {cameras.length > 1 && !lastResult?.patient && (
                    <div className="space-y-2">
                        <Label>Câmera</Label>
                        <Select
                            value={selectedCamera}
                            onValueChange={setSelectedCamera}
                            disabled={isScanning}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma câmera" />
                            </SelectTrigger>
                            <SelectContent>
                                {cameras.map((cam) => (
                                    <SelectItem key={cam.id} value={cam.id}>
                                        {cam.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Priority Selection - Show before scanning or when patient found */}
                {(!lastResult || lastResult.needsConfirmation) && (
                    <div className="space-y-2">
                        <Label>Prioridade de Atendimento</Label>
                        <Select value={priorityReason} onValueChange={setPriorityReason}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="idoso">👴 Idoso (60+)</SelectItem>
                                <SelectItem value="gestante">🤰 Gestante</SelectItem>
                                <SelectItem value="deficiente">♿ PcD</SelectItem>
                                <SelectItem value="emergencia">🚨 Emergência</SelectItem>
                                <SelectItem value="retorno_urgente">🔄 Retorno Urgente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Scanner Area */}
                <div
                    id="qr-reader"
                    className={cn(
                        'relative w-full aspect-square rounded-lg overflow-hidden bg-muted',
                        !isScanning && !lastResult && 'flex items-center justify-center'
                    )}
                >
                    {!isScanning && !lastResult && (
                        <div className="text-center text-muted-foreground">
                            <Camera className="w-16 h-16 mx-auto mb-2 opacity-50" />
                            <p>Câmera desligada</p>
                        </div>
                    )}
                </div>

                {/* Processing Indicator */}
                {isProcessing && (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Validando QR Code...</span>
                    </div>
                )}

                {/* Patient Data Display */}
                {lastResult?.success && lastResult.patient && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-7 h-7 text-green-700" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-green-900">
                                    {lastResult.patient.patient_name}
                                </h3>
                                {lastResult.patient.patient_phone && (
                                    <p className="text-sm text-green-700 flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {lastResult.patient.patient_phone}
                                    </p>
                                )}
                            </div>
                            {!lastResult.needsConfirmation && (
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            )}
                        </div>

                        {/* Appointment Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {lastResult.patient.doctor_name && (
                                <div className="flex items-center gap-2 text-green-800">
                                    <Stethoscope className="w-4 h-4" />
                                    <span>Dr(a). {lastResult.patient.doctor_name}</span>
                                </div>
                            )}
                            {lastResult.patient.appointment_time && (
                                <div className="flex items-center gap-2 text-green-800">
                                    <Clock className="w-4 h-4" />
                                    <span>{lastResult.patient.appointment_time}</span>
                                </div>
                            )}
                            {lastResult.patient.health_insurance && (
                                <div className="flex items-center gap-2 text-green-800 col-span-2">
                                    <span>Convênio: {lastResult.patient.health_insurance}</span>
                                </div>
                            )}
                        </div>

                        {/* Main Complaint */}
                        {lastResult.patient.main_complaint && (
                            <div className="bg-white/60 p-3 rounded-lg">
                                <p className="text-xs text-green-700 font-medium mb-1">Queixa Principal:</p>
                                <p className="text-sm text-green-900">{lastResult.patient.main_complaint}</p>
                            </div>
                        )}

                        {/* Priority Badge */}
                        {priorityReason !== 'normal' && lastResult.needsConfirmation && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-green-700">Prioridade:</span>
                                <Badge variant="outline" className={priorityLabels[priorityReason]?.color}>
                                    {priorityLabels[priorityReason]?.icon && (
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                    )}
                                    {priorityLabels[priorityReason]?.label}
                                </Badge>
                            </div>
                        )}

                        {/* Queue Info - After Confirmation */}
                        {!lastResult.needsConfirmation && lastResult.patient.queue_position && (
                            <div className="bg-white/80 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-900">
                                        Posição na Fila: #{lastResult.patient.queue_position}
                                    </p>
                                    {lastResult.patient.estimated_wait && (
                                        <p className="text-xs text-green-700">
                                            Tempo estimado: ~{lastResult.patient.estimated_wait} min
                                        </p>
                                    )}
                                </div>
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                        )}

                        {/* Confirm Button */}
                        {lastResult.needsConfirmation && (
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                size="lg"
                                onClick={confirmPresence}
                                disabled={isConfirming}
                            >
                                {isConfirming ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Confirmando...
                                    </>
                                ) : (
                                    <>
                                        <UserCheck className="w-5 h-5 mr-2" />
                                        Confirmar Presença
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                )}

                {/* Error Display */}
                {lastResult && !lastResult.success && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="flex items-center gap-3">
                            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-red-800">{lastResult.message}</p>
                                <p className="text-sm text-red-600 mt-1">
                                    Verifique se o QR Code é válido e não expirou.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-2">
                    {!isScanning && !lastResult?.patient ? (
                        <Button
                            className="flex-1"
                            onClick={startScanner}
                            disabled={!selectedCamera || cameras.length === 0}
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Iniciar Scanner
                        </Button>
                    ) : isScanning ? (
                        <Button
                            className="flex-1"
                            variant="destructive"
                            onClick={stopScanner}
                        >
                            <CameraOff className="w-4 h-4 mr-2" />
                            Parar Scanner
                        </Button>
                    ) : (
                        <Button
                            className="flex-1"
                            variant="outline"
                            onClick={resetScanner}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Escanear Outro
                        </Button>
                    )}
                </div>

                {/* No cameras warning */}
                {cameras.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                        <CameraOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma câmera encontrada</p>
                        <p className="text-xs">Verifique as permissões do navegador</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
