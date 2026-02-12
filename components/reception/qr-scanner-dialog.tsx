'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QrCode, Camera, CheckCircle, XCircle, Loader2, User, Clock, Stethoscope } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface QRScannerDialogProps {
    onCheckIn?: () => void
}

interface CheckInResult {
    success: boolean
    message?: string
    error?: string
    data?: {
        patient_name: string
        patient_phone?: string
        doctor_name: string
        scheduled_at: string
        checked_in_at: string
    }
}

export function QRScannerDialog({ onCheckIn }: QRScannerDialogProps) {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [result, setResult] = useState<CheckInResult | null>(null)
    const [cameraError, setCameraError] = useState<string | null>(null)

    const videoRef = useRef<HTMLVideoElement>(null)
    const scannerRef = useRef<any>(null) // Html5Qrcode instance
    const streamRef = useRef<MediaStream | null>(null)

    // Cleanup function
    const stopCamera = useCallback(async () => {
        try {
            if (scannerRef.current) {
                await scannerRef.current.stop().catch(() => { })
                scannerRef.current = null
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
                streamRef.current = null
            }
        } catch (error) {
            console.error('Error stopping camera:', error)
        }
        setScanning(false)
    }, [])

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            setCameraError(null)
            setResult(null)
            setScanning(true)

            // Import QR scanner library
            const { Html5Qrcode } = await import('html5-qrcode')

            // Wait for element to render
            await new Promise(resolve => setTimeout(resolve, 100))

            // Create scanner instance
            const scanner = new Html5Qrcode('qr-reader')

            scannerRef.current = scanner

            // Start scanning with camera
            await scanner.start(
                { facingMode: 'environment' }, // Use back camera on mobile
                {
                    fps: 10, // Scans per second
                    qrbox: { width: 250, height: 250 }, // Scanning area
                    aspectRatio: 1.0
                },
                (decodedText) => {
                    // Success callback - QR code detected!
                    console.log('[QR SCANNER] Detected:', decodedText)
                    handleQRDetected(decodedText)
                },
                (errorMessage) => {
                    // Error callback - just means no QR detected in this frame, ignore
                    // console.log('[QR SCANNER] No QR in frame')
                }
            )

            console.log('[QR SCANNER] Started successfully')

        } catch (err) {
            console.error('Camera error:', err)
            setCameraError('Não foi possível acessar a câmera. Verifique as permissões.')
            setScanning(false)
        }
    }, [processing])

    // Handle QR detection
    const handleQRDetected = async (qrData: string) => {
        if (processing) return

        setProcessing(true)
        stopCamera()

        try {
            // Extract token from QR data
            // QR might be a URL like https://clinigo.app/checkin/TOKEN or just the token
            let token = qrData
            if (qrData.includes('/checkin/')) {
                token = qrData.split('/checkin/').pop() || qrData
            }
            if (qrData.includes('token=')) {
                token = new URL(qrData).searchParams.get('token') || qrData
            }

            // Call check-in API
            const res = await fetch('/api/reception/checkin-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_token: token })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setResult({
                    success: true,
                    message: data.message,
                    data: data.data
                })
                toast({
                    title: '✅ Check-in Realizado!',
                    description: `${data.data.patient_name} - Dr(a). ${data.data.doctor_name}`
                })
                onCheckIn?.()
            } else {
                setResult({
                    success: false,
                    error: data.error || 'Erro ao processar check-in'
                })
                toast({
                    variant: 'destructive',
                    title: 'Erro no Check-in',
                    description: data.error
                })
            }
        } catch (error) {
            setResult({
                success: false,
                error: 'Erro de conexão. Tente novamente.'
            })
        } finally {
            setProcessing(false)
        }
    }

    // Cleanup on close
    useEffect(() => {
        if (!open) {
            stopCamera() // No need to await, it's fire-and-forget cleanup
            setResult(null)
            setCameraError(null)
        }
    }, [open, stopCamera])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera() // Synchronous wrapper for async cleanup
        }
    }, [stopCamera])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 text-base font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all">
                    <QrCode className="w-5 h-5" />
                    Escanear QR Code
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Check-in por QR Code
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">

                    {/* Result display */}
                    {result && (
                        <Card className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                            <CardContent className="pt-4">
                                <div className="flex items-start gap-3">
                                    {result.success ? (
                                        <CheckCircle className="w-8 h-8 text-green-600 shrink-0" />
                                    ) : (
                                        <XCircle className="w-8 h-8 text-red-600 shrink-0" />
                                    )}
                                    <div className="flex-1">
                                        <h4 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                            {result.success ? 'Check-in Realizado!' : 'Erro no Check-in'}
                                        </h4>
                                        {result.success && result.data ? (
                                            <div className="mt-2 space-y-1 text-sm text-green-700">
                                                <p className="flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    {result.data.patient_name}
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <Stethoscope className="w-4 h-4" />
                                                    Dr(a). {result.data.doctor_name}
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    {new Date(result.data.scheduled_at).toLocaleTimeString('pt-BR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-red-700 mt-1">{result.error}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Camera view - Html5Qrcode renders here */}
                    {!result && (
                        <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                            {cameraError ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                                    <XCircle className="w-12 h-12 mb-2 text-red-500" />
                                    <p>{cameraError}</p>
                                    <Button
                                        variant="secondary"
                                        className="mt-4"
                                        onClick={startCamera}
                                    >
                                        Tentar Novamente
                                    </Button>
                                </div>
                            ) : scanning ? (
                                <>
                                    {/* Html5Qrcode renders camera video and overlay here */}
                                    <div id="qr-reader" className="w-full h-full" />
                                    {/* Scan overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-48 h-48 border-4 border-white rounded-lg opacity-75">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                                        </div>
                                    </div>
                                    <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
                                        Aponte a câmera para o QR Code do paciente
                                    </p>
                                </>
                            ) : processing ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                    <Loader2 className="w-12 h-12 animate-spin mb-2" />
                                    <p>Processando check-in...</p>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                    <Camera className="w-16 h-16 mb-4 opacity-50" />
                                    <p className="text-sm opacity-75">Câmera pronta para iniciar</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        {result ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setResult(null)
                                        startCamera()
                                    }}
                                >
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Escanear Outro
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => setOpen(false)}
                                >
                                    Concluir
                                </Button>
                            </>
                        ) : (
                            <>
                                {!scanning && !processing && (
                                    <Button
                                        className="flex-1"
                                        onClick={startCamera}
                                    >
                                        <Camera className="w-4 h-4 mr-2" />
                                        Iniciar Câmera
                                    </Button>
                                )}
                                {scanning && (
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={stopCamera}
                                    >
                                        Parar Câmera
                                    </Button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Manual input fallback */}
                    <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground text-center mb-2">
                            Ou digite o código manualmente:
                        </p>
                        <ManualCodeInput onSubmit={handleQRDetected} disabled={processing} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Manual code input component
function ManualCodeInput({ onSubmit, disabled }: { onSubmit: (code: string) => void, disabled: boolean }) {
    const [code, setCode] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (code.trim()) {
            onSubmit(code.trim())
            setCode('')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Digite o código do QR..."
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                disabled={disabled}
            />
            <Button type="submit" disabled={disabled || !code.trim()}>
                Verificar
            </Button>
        </form>
    )
}
