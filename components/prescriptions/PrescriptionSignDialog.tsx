'use client'

/**
 * PrescriptionSignDialog — Modal de assinatura digital
 * Re-autentica o médico com senha antes de assinar
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ShieldCheck, Loader2, KeyRound, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface PrescriptionSignDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    prescriptionId: string
    onSuccess?: () => void
}

export function PrescriptionSignDialog({
    open,
    onOpenChange,
    prescriptionId,
    onSuccess,
}: PrescriptionSignDialogProps) {
    const { toast } = useToast()
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSign = async () => {
        if (!password.trim()) {
            setError('Informe sua senha')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await fetch(`/api/prescriptions/${prescriptionId}/sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Erro ao assinar prescrição')
                return
            }

            toast({
                title: '✅ Prescrição assinada!',
                description: `Assinada digitalmente em ${new Date(data.data?.signed_at).toLocaleString('pt-BR')}`,
            })

            setPassword('')
            onOpenChange(false)
            onSuccess?.()
        } catch (err: any) {
            setError(err.message || 'Erro inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-600" />
                        Assinar Prescrição
                    </DialogTitle>
                    <DialogDescription>
                        Para assinar digitalmente, confirme sua identidade informando sua senha.
                        Prescrições assinadas não poderão ser editadas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <KeyRound className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-800">
                            Após a assinatura, a prescrição ficará <strong>bloqueada para edição</strong> e
                            poderá ser enviada ao paciente.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sign-password">Senha</Label>
                        <Input
                            id="sign-password"
                            type="password"
                            placeholder="Insira sua senha..."
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                if (error) setError('')
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSign()
                            }}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setPassword('')
                            setError('')
                            onOpenChange(false)
                        }}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSign}
                        disabled={loading || !password.trim()}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Assinando...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Assinar Digitalmente
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
