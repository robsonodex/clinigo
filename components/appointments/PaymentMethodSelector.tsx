'use client'

import { useFormContext } from 'react-hook-form'
import {
    Banknote,
    CreditCard,
    QrCode,
    Shield,
    Link,
    Gift,
    Clock,
} from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

export type ManualPaymentType =
    | 'cash'
    | 'debit_card'
    | 'credit_card'
    | 'pix_presencial'
    | 'health_insurance'
    | 'payment_link'
    | 'courtesy'
    | 'to_be_paid'

interface PaymentOption {
    value: ManualPaymentType
    label: string
    icon: React.ReactNode
    description?: string
    showPrice?: boolean
}

const paymentOptions: PaymentOption[] = [
    { value: 'cash', label: 'Dinheiro', icon: <Banknote className="h-4 w-4" />, showPrice: true },
    { value: 'debit_card', label: 'Cartão Débito', icon: <CreditCard className="h-4 w-4" />, showPrice: true },
    { value: 'credit_card', label: 'Cartão Crédito', icon: <CreditCard className="h-4 w-4" />, showPrice: true },
    { value: 'pix_presencial', label: 'PIX no Balcão', icon: <QrCode className="h-4 w-4" />, showPrice: true },
    { value: 'health_insurance', label: 'Convênio', icon: <Shield className="h-4 w-4" /> },
    { value: 'payment_link', label: 'Enviar Link de Pagamento', icon: <Link className="h-4 w-4" />, description: 'Paciente paga depois' },
    { value: 'courtesy', label: 'Cortesia (Gratuito)', icon: <Gift className="h-4 w-4" /> },
    { value: 'to_be_paid', label: 'A Pagar', icon: <Clock className="h-4 w-4" />, description: 'Sem pagamento agora' },
]

interface HealthInsurance {
    id: string
    name: string
    plan_name?: string
}

interface PaymentMethodSelectorProps {
    price: number
    selectedType: ManualPaymentType
    onTypeChange: (type: ManualPaymentType) => void
    healthInsurances?: HealthInsurance[]
    selectedInsuranceId?: string
    onInsuranceChange?: (id: string) => void
    insuranceCardNumber?: string
    onCardNumberChange?: (value: string) => void
}

export function PaymentMethodSelector({
    price,
    selectedType,
    onTypeChange,
    healthInsurances = [],
    selectedInsuranceId,
    onInsuranceChange,
    insuranceCardNumber,
    onCardNumberChange,
}: PaymentMethodSelectorProps) {
    return (
        <div className="space-y-4">
            <RadioGroup
                value={selectedType}
                onValueChange={(value) => onTypeChange(value as ManualPaymentType)}
                className="grid grid-cols-2 gap-3"
            >
                {paymentOptions.map((option) => (
                    <div key={option.value}>
                        <RadioGroupItem
                            value={option.value}
                            id={`payment-${option.value}`}
                            className="peer sr-only"
                        />
                        <Label
                            htmlFor={`payment-${option.value}`}
                            className="flex items-center gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-colors"
                        >
                            <div className="shrink-0">{option.icon}</div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-medium text-sm">{option.label}</span>
                                {option.showPrice && price > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {formatCurrency(price)}
                                    </span>
                                )}
                                {option.description && (
                                    <span className="text-xs text-muted-foreground">
                                        {option.description}
                                    </span>
                                )}
                            </div>
                        </Label>
                    </div>
                ))}
            </RadioGroup>

            {/* Health Insurance Details */}
            {selectedType === 'health_insurance' && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <Label>Convênio / Operadora</Label>
                        <Select
                            value={selectedInsuranceId}
                            onValueChange={onInsuranceChange}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o convênio" />
                            </SelectTrigger>
                            <SelectContent>
                                {healthInsurances.map((insurance) => (
                                    <SelectItem key={insurance.id} value={insurance.id}>
                                        {insurance.name}
                                        {insurance.plan_name && ` - ${insurance.plan_name}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Número da Carteirinha</Label>
                        <Input
                            placeholder="000000000000"
                            value={insuranceCardNumber}
                            onChange={(e) => onCardNumberChange?.(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Courtesy note */}
            {selectedType === 'courtesy' && (
                <div className="p-3 bg-purple-50 text-purple-700 rounded-lg text-sm">
                    🎁 Consulta gratuita - nenhum valor será cobrado
                </div>
            )}

            {/* Payment link note */}
            {selectedType === 'payment_link' && (
                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    📧 Um link de pagamento será enviado ao paciente por SMS/WhatsApp
                </div>
            )}
        </div>
    )
}
