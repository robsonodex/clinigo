import {
    Text,
    Button,
    Section,
} from '@react-email/components'
import { BaseLayout } from './layout'
import * as React from 'react'

interface PaymentApprovedEmailProps {
    patientName: string
    amount: string
    clinicName: string
    appointmentDate: string
}

export const PaymentApprovedEmail = ({
    patientName,
    amount,
    clinicName,
    appointmentDate,
}: PaymentApprovedEmailProps) => {
    return (
        <BaseLayout
            preview={`Pagamento Aprovado - ${clinicName}`}
            heading="Pagamento Confirmado"
            clinicName={clinicName}
        >
            <Text className="text-black text-[14px] leading-[24px]">
                Olá <strong>{patientName}</strong>!
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
                Recebemos seu pagamento de <strong>{amount}</strong> referente à consulta do dia {appointmentDate}.
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
                Seu agendamento está 100% confirmado. Enviaremos os detalhes de acesso em breve.
            </Text>
        </BaseLayout>
    )
}

export default PaymentApprovedEmail
