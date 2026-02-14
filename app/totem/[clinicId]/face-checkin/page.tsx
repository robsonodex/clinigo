'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { InactivityTimer } from '@/components/totem/InactivityTimer'

export default function TotemFaceCheckinPage() {
    const router = useRouter()
    const params = useParams()
    const clinicId = params.clinicId as string
    const videoRef = useRef<HTMLVideoElement>(null)

    const [status, setStatus] = useState<'ready' | 'processing' | 'success' | 'error'>('ready')
    const [message, setMessage] = useState('')
    const [patientName, setPatientName] = useState('')
    const [cameraError, setCameraError] = useState('')
    const autoIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const startCamera = useCallback(async () => {
        setCameraError('')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            })
            if (videoRef.current) videoRef.current.srcObject = stream
        } catch {
            setCameraError('Câmera indisponível. Verifique as permissões.')
        }
    }, [])

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(t => t.stop())
        }
        if (autoIntervalRef.current) clearInterval(autoIntervalRef.current)
    }, [])

    const captureAndRecognize = useCallback(async () => {
        if (!videoRef.current || status === 'processing' || status === 'success') return

        setStatus('processing')
        setMessage('Analisando...')

        try {
            const canvas = document.createElement('canvas')
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas error')
            ctx.drawImage(videoRef.current, 0, 0)
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.8)

            const recognizeRes = await fetch('/api/checkin/face-recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    photo: imageBase64,
                    clinic_id: clinicId,
                    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
                })
            })

            const recognizeData = await recognizeRes.json()

            if (recognizeData.success && recognizeData.patient) {
                const confirmRes = await fetch('/api/checkin/face-confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appointment_id: recognizeData.appointment_id,
                        clinic_id: clinicId,
                        patient_id: recognizeData.patient.id,
                    })
                })

                if (confirmRes.ok) {
                    setStatus('success')
                    setPatientName(recognizeData.patient.name)
                    if (autoIntervalRef.current) clearInterval(autoIntervalRef.current)

                    setTimeout(() => {
                        stopCamera()
                        router.push(`/totem/${clinicId}/confirmacao?nome=${encodeURIComponent(recognizeData.patient.name)}&tipo=facial`)
                    }, 2000)
                } else {
                    throw new Error('Falha ao confirmar')
                }
            } else {
                setStatus('error')
                setMessage('Não identificado. Posicione-se melhor.')
                setTimeout(() => { setStatus('ready'); setMessage('') }, 3000)
            }
        } catch {
            setStatus('error')
            setMessage('Erro de conexão.')
            setTimeout(() => { setStatus('ready'); setMessage('') }, 3000)
        }
    }, [clinicId, status, stopCamera, router])

    useEffect(() => {
        startCamera()
        const timeout = setTimeout(() => {
            autoIntervalRef.current = setInterval(captureAndRecognize, 3000)
        }, 2000)
        return () => { stopCamera(); clearTimeout(timeout) }
    }, [startCamera, stopCamera, captureAndRecognize])

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

            <h1 className="text-3xl font-light text-white mb-2 tracking-tight">Reconhecimento Facial</h1>
            <p className="text-white/60 text-sm mb-10 font-light">Olhe para a câmera — identificação automática</p>

            {/* Camera */}
            <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden"
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
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

                        {/* Face guide */}
                        {status === 'ready' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-56 h-56 rounded-full border border-white/20" />
                            </div>
                        )}

                        {/* Processing */}
                        {status === 'processing' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                                style={{ background: 'rgba(15, 23, 42, 0.8)' }}
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
                                <p className="text-white/40 text-sm">Check-in confirmado</p>
                            </div>
                        )}

                        {/* Error */}
                        {status === 'error' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center"
                                style={{ background: 'rgba(15, 23, 42, 0.9)' }}
                            >
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <p className="text-white/50 text-sm">{message}</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Manual capture */}
            {!cameraError && status === 'ready' && (
                <button
                    onClick={captureAndRecognize}
                    className="mt-10 px-10 py-4 rounded-xl text-base font-medium text-white tracking-wide transition-all active:scale-[0.97] hover:brightness-110"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
                    }}
                >
                    Identificar agora
                </button>
            )}
        </div>
    )
}
