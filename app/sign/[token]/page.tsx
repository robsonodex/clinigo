'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Pen,
    RotateCcw,
    Send,
    ShieldCheck,
    FileText,
    Clock,
} from 'lucide-react'

interface RecordData {
    record_id: string
    patient_name: string
    doctor_name: string
    doctor_specialty: string
    clinic_name: string
    chief_complaint: string
    diagnosis: string
    treatment_plan: string
    date: string
    already_signed: boolean
    signed_at?: string
}

export default function SignPage() {
    const params = useParams()
    const token = params.token as string

    const [loading, setLoading] = useState(true)
    const [record, setRecord] = useState<RecordData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [signing, setSigning] = useState(false)
    const [signed, setSigned] = useState(false)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const lastPos = useRef<{ x: number; y: number } | null>(null)

    // Load record data
    useEffect(() => {
        if (!token) return
        loadRecord()
    }, [token])

    async function loadRecord() {
        try {
            const res = await fetch(`/api/records/signature?token=${token}`)
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Token inválido')
                return
            }

            if (data.already_signed) {
                setSigned(true)
                setRecord({ ...data, clinic_name: data.clinic_name } as any)
                return
            }

            setRecord(data)
        } catch (err) {
            setError('Erro ao carregar dados')
        } finally {
            setLoading(false)
        }
    }

    // Canvas setup
    useEffect(() => {
        if (!record || signed) return
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * 2
        canvas.height = rect.height * 2
        ctx.scale(2, 2)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 2.5
        ctx.strokeStyle = '#1a1a2e'
    }, [record, signed])

    const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()

        if ('touches' in e) {
            const touch = e.touches[0]
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
    }, [])

    const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault()
        setIsDrawing(true)
        lastPos.current = getPos(e)
    }, [getPos])

    const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing) return
        e.preventDefault()
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !lastPos.current) return

        const pos = getPos(e)
        ctx.beginPath()
        ctx.moveTo(lastPos.current.x, lastPos.current.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
        lastPos.current = pos
        setHasSignature(true)
    }, [isDrawing, getPos])

    const stopDraw = useCallback(() => {
        setIsDrawing(false)
        lastPos.current = null
    }, [])

    const clearCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
    }

    const handleSign = async () => {
        if (!hasSignature || !canvasRef.current) return
        setSigning(true)

        try {
            const dataUrl = canvasRef.current.toDataURL('image/png')

            const res = await fetch('/api/records/signature', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    signature_data_url: dataUrl,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Erro ao assinar')
                return
            }

            setSigned(true)
        } catch (err) {
            setError('Erro ao enviar assinatura')
        } finally {
            setSigning(false)
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm text-muted-foreground">Carregando prontuário...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error && !record) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="flex flex-col items-center py-12 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                        <h2 className="text-xl font-bold mb-2">Acesso Inválido</h2>
                        <p className="text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Signed state
    if (signed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                <Card className="max-w-md w-full border-green-200">
                    <CardContent className="flex flex-col items-center py-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
                            <ShieldCheck className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-2">
                            Prontuário Assinado! ✅
                        </h2>
                        <p className="text-muted-foreground">
                            Sua assinatura digital foi registrada com sucesso.
                        </p>
                        {record?.clinic_name && (
                            <p className="text-sm text-muted-foreground mt-3">
                                {record.clinic_name}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Signature form
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 pb-8">
            <div className="max-w-lg mx-auto space-y-4">
                {/* Header */}
                <div className="text-center pt-6 pb-2">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-7 h-7 text-blue-600" />
                    </div>
                    <h1 className="text-xl font-bold">Assinatura Digital</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {record?.clinic_name}
                    </p>
                </div>

                {/* Record summary */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Dados do Prontuário
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-muted-foreground text-xs">Paciente</p>
                                <p className="font-medium">{record?.patient_name}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Profissional</p>
                                <p className="font-medium">{record?.doctor_name}</p>
                            </div>
                        </div>
                        {record?.doctor_specialty && (
                            <div>
                                <p className="text-muted-foreground text-xs">Especialidade</p>
                                <p className="font-medium">{record.doctor_specialty}</p>
                            </div>
                        )}
                        {record?.chief_complaint && (
                            <div>
                                <p className="text-muted-foreground text-xs">Queixa Principal</p>
                                <p>{record.chief_complaint}</p>
                            </div>
                        )}
                        {record?.diagnosis && (
                            <div>
                                <p className="text-muted-foreground text-xs">Diagnóstico</p>
                                <p>{record.diagnosis}</p>
                            </div>
                        )}
                        {record?.treatment_plan && (
                            <div>
                                <p className="text-muted-foreground text-xs">Plano de Tratamento</p>
                                <p>{record.treatment_plan}</p>
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {record?.date && new Date(record.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Signature canvas */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Pen className="w-4 h-4" />
                                Sua Assinatura
                            </CardTitle>
                            {hasSignature && (
                                <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-xs gap-1 h-7">
                                    <RotateCcw className="w-3 h-3" />
                                    Limpar
                                </Button>
                            )}
                        </div>
                        <CardDescription className="text-xs">
                            Desenhe sua assinatura no campo abaixo com o dedo ou mouse
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white relative">
                            <canvas
                                ref={canvasRef}
                                className="w-full touch-none cursor-crosshair"
                                style={{ height: '180px' }}
                                onMouseDown={startDraw}
                                onMouseMove={draw}
                                onMouseUp={stopDraw}
                                onMouseLeave={stopDraw}
                                onTouchStart={startDraw}
                                onTouchMove={draw}
                                onTouchEnd={stopDraw}
                            />
                            {!hasSignature && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <p className="text-gray-300 text-sm">Assine aqui</p>
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm mt-2">{error}</p>
                        )}

                        <Button
                            onClick={handleSign}
                            disabled={!hasSignature || signing}
                            className="w-full mt-4 h-12 text-base gap-2"
                        >
                            {signing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                            {signing ? 'Enviando...' : 'Confirmar Assinatura'}
                        </Button>

                        <p className="text-[10px] text-muted-foreground text-center mt-3">
                            Ao assinar, você confirma ter lido e concordado com as informações acima.
                            Esta assinatura tem validade digital conforme Lei 14.063/2020.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
