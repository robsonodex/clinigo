'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw, Check } from 'lucide-react'

interface SignaturePadProps {
    onSave: (dataUrl: string) => void
    onClear?: () => void
    disabled?: boolean
}

export function SignaturePad({ onSave, onClear, disabled = false }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Ajuste de DPI de tela de alta resolução (Retina / Mobile)
        const ratio = Math.max(window.devicePixelRatio || 1, 1)
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * ratio
        canvas.height = rect.height * ratio
        ctx.scale(ratio, ratio)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 2.5
    }, [])

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()
        if ('touches' in e && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            }
        } else if ('clientX' in e) {
            return {
                x: (e as MouseEvent).clientX - rect.left,
                y: (e as MouseEvent).clientY - rect.top,
            }
        }
        return { x: 0, y: 0 }
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (disabled) return
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { x, y } = getCoordinates(e.nativeEvent)
        ctx.beginPath()
        ctx.moveTo(x, y)
        setIsDrawing(true)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || disabled) return
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Evita scroll da tela ao desenhar no touch
        if ('touches' in e.nativeEvent) {
            e.preventDefault()
        }

        const { x, y } = getCoordinates(e.nativeEvent)
        ctx.lineTo(x, y)
        ctx.stroke()
        setHasSignature(true)
    }

    const stopDrawing = () => {
        if (!isDrawing) return
        setIsDrawing(false)

        const canvas = canvasRef.current
        if (!canvas) return

        onSave(canvas.toDataURL('image/png'))
    }

    const handleClear = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
        if (onClear) onClear()
    }

    return (
        <div className="space-y-2">
            <div className="relative border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors overflow-hidden touch-none">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-44 cursor-crosshair block"
                />

                {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/60 text-xs sm:text-sm font-medium select-none">
                        ✍️ Desenhe sua assinatura aqui com o dedo ou mouse
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                    {hasSignature ? 'Assinatura capturada com sucesso' : 'Rubrique no quadro acima'}
                </p>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    disabled={!hasSignature || disabled}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Limpar
                </Button>
            </div>
        </div>
    )
}
