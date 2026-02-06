'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface PartnerInfo {
    id: string
    full_name: string
    referral_code: string
}

interface ReferralCodeInputProps {
    value: string
    onChange: (value: string) => void
    onValidPartner?: (partner: PartnerInfo | null) => void
    className?: string
}

export function ReferralCodeInput({
    value,
    onChange,
    onValidPartner,
    className
}: ReferralCodeInputProps) {
    const [isValidating, setIsValidating] = useState(false)
    const [validationResult, setValidationResult] = useState<{
        valid: boolean
        partner: PartnerInfo | null
    } | null>(null)

    // Validate code when user types (with debounce)
    useEffect(() => {
        // Reset if empty
        if (!value || value.length < 5) {
            setValidationResult(null)
            onValidPartner?.(null)
            return
        }

        const timer = setTimeout(async () => {
            setIsValidating(true)

            try {
                const response = await fetch('/api/partners/validate-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: value })
                })

                const result = await response.json()
                setValidationResult(result)

                if (result.valid && result.partner) {
                    onValidPartner?.(result.partner)
                } else {
                    onValidPartner?.(null)
                }
            } catch (error) {
                console.error('Erro ao validar código:', error)
                setValidationResult({ valid: false, partner: null })
                onValidPartner?.(null)
            } finally {
                setIsValidating(false)
            }
        }, 500) // 500ms debounce

        return () => clearTimeout(timer)
    }, [value, onValidPartner])

    return (
        <div className={className}>
            <Label htmlFor="referral_code">
                Código do Parceiro <span className="text-muted-foreground text-xs">(Opcional)</span>
            </Label>

            <div className="relative mt-1.5">
                <Input
                    id="referral_code"
                    placeholder="Ex: JOAO-8472"
                    value={value}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    className="pr-10"
                    maxLength={15}
                />

                {/* Validation icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValidating && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}

                    {!isValidating && validationResult?.valid && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}

                    {!isValidating && validationResult && !validationResult.valid && value.length >= 5 && (
                        <XCircle className="w-4 h-4 text-destructive" />
                    )}
                </div>
            </div>

            {/* Validation feedback */}
            {validationResult?.valid && validationResult.partner && (
                <p className="text-xs text-emerald-600 mt-1">
                    ✓ Parceiro: {validationResult.partner.full_name}
                </p>
            )}

            {validationResult && !validationResult.valid && value.length >= 5 && (
                <p className="text-xs text-destructive mt-1">
                    ✗ Código inválido ou parceiro inativo
                </p>
            )}

            <p className="text-xs text-muted-foreground mt-1">
                Se você foi indicado por um parceiro, insira o código aqui
            </p>
        </div>
    )
}
