'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

export const ButtonManualCharge = ({ clinicId, customPrice }: { clinicId: string; customPrice?: number | null }) => {
    const [isLoading, setIsLoading] = useState(false)

    const handleSendCharge = async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/billing/generate-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: clinicId,
                    custom_price: customPrice, // Envia preço customizado se existir
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao gerar cobrança')

            toast.success('Link de pagamento gerado!')

            // Copiar para área de transferência
            navigator.clipboard.writeText(data.payment_url)
            toast.info('Link copiado para a área de transferência!')
        } catch (error) {
            toast.error('Erro ao gerar cobrança: ' + (error as Error).message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button onClick={handleSendCharge} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            Enviar Cobrança {customPrice ? `(R$ ${customPrice.toFixed(0)})` : '(Push)'}
        </Button>
    )
}

export const PaymentHistoryList = ({ clinicId }: { clinicId: string }) => {
    // Aqui buscaríamos o histórico real
    return (
        <div className="text-sm text-muted-foreground text-center py-4">
            Nenhum histórico disponível ainda.
        </div>
    )
}
