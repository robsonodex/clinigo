'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { InactivityTimer } from '@/components/totem/InactivityTimer'

export default function TotemQRCodePage() {
    const router = useRouter()
    const params = useParams()
    const clinicId = params.clinicId as string
    const videoRef = useRef<HTMLVideoElement>(null)
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const [status, setStatus] = useState<'scanning' | 'processing' | 'success' | 'error'>('scanning')
    const [message, setMessage] = useState('')
    const [patientName, setPatientName] = useState('')
    const [cameraError, setCameraError] = useState('')

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            })
            if (videoRef.current) videoRef.current.srcObject = stream
        } catch {
            setCameraError('Câmera indisponível. Verifique as permissões do navegador.')
        }
    }, [])

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(t => t.stop())
        }
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }, [])

    const processQRCode = async (qrToken: string) => {
        setStatus('processing')
        setMessage('Validando...')

        try {
            const response = await fetch('/api/totem/checkin-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_token: qrToken, clinic_id: clinicId })
            })

            const data = await response.json()

            if (response.ok && data.data?.success) {
                setStatus('success')
                setPatientName(data.data.patient_name)
                setMessage(data.data.doctor_name ? `Dr(a). ${data.data.doctor_name}` : '')

                setTimeout(() => {
                    stopCamera()
                    router.push(`/totem/${clinicId}/confirmacao?nome=${encodeURIComponent(data.data.patient_name)}&tipo=qr`)
                }, 2000)
            } else {
                setStatus('error')
                setMessage(data.error?.message || data.message || 'Código inválido ou expirado')
                setTimeout(() => { setStatus('scanning'); setMessage('') }, 4000)
            }
        } catch {
            setStatus('error')
            setMessage('Falha na conexão. Tente novamente.')
            setTimeout(() => { setStatus('scanning'); setMessage('') }, 3000)
        }
    }

    const scanQRCode = useCallback(async () => {
        if (status !== 'scanning' || !videoRef.current || videoRef.current.readyState < 2) return
        try {
            if ('BarcodeDetector' in window) {
                const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
                const barcodes = await detector.detect(videoRef.current)
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                    await processQRCode(barcodes[0].rawValue)
                }
            }
        } catch { /* retry on next interval */ }
    }, [status, clinicId])

    useEffect(() => {
        startCamera()
        scanIntervalRef.current = setInterval(scanQRCode, 500)
        return () => stopCamera()
    }, [startCamera, stopCamera, scanQRCode])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 select-none"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
        >
            <InactivityTimer redirectTo={`/totem/${clinicId}`} timeoutSeconds={60} />

            {/* Back */}
            <button
                onClick={() => { stopCamera(); router.push(`/totem/${clinicId}`) }}
                className="absolute top-10 left-10 flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm tracking-wide"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
                Voltar
            </button>

            <h1 className="text-3xl font-light text-white mb-2 tracking-tight">QR Code</h1>
            <p className="text-white/60 text-sm mb-10 font-light">Posicione o código no centro da câmera</p>

            {/* Camera */}
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
                {cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-10 text-center"
                        style={{ background: 'rgba(15, 23, 42, 0.95)' }}
                    >
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
                            <path d="M16.5 15.5L22 21M2 2l20 20" />
                            <path d="M5.5 5.5A9.6 9.6 0 0 0 3 12c0 5.5 4.5 10 10 10a9.6 9.6 0 0 0 6.5-2.5" />
                        </svg>
                        <p className="text-white/50 text-sm">{cameraError}</p>
                        <button onClick={startCamera} className="px-5 py-2.5 rounded-lg text-sm text-white/70 border border-white/20 hover:border-white/40 transition-colors">
                            Tentar novamente
                        </button>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                        {/* Scan frame */}
                        {status === 'scanning' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-52 h-52 relative">
                                    <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-white/60 rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-white/60 rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-white/60 rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-white/60 rounded-br-lg" />
                                </div>
                            </div>
                        )}

                        {/* Processing */}
                        {status === 'processing' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                                style={{ background: 'rgba(15, 23, 42, 0.85)' }}
                            >
                                <div className="w-10 h-10 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
                                <p className="text-white/60 text-sm">{message}</p>
                            </div>
                        )}

                        {/* Success */}
                        {status === 'success' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                                style={{ background: 'rgba(15, 23, 42, 0.92)' }}
                            >
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                                <p className="text-white text-xl font-medium">{patientName}</p>
                                <p className="text-white/40 text-sm">{message}</p>
                            </div>
                        )}

                        {/* Error */}
                        {status === 'error' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center"
                                style={{ background: 'rgba(15, 23, 42, 0.92)' }}
                            >
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400/70">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                <p className="text-white/60 text-sm">{message}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
