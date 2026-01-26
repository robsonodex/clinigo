import {
    Text,
    Button,
    Section,
} from '@react-email/components'
import { BaseLayout } from './layout'
import * as React from 'react'

interface ReminderEmailProps {
    patientName: string
    doctorName: string
    date: string
    time: string
    clinicName: string
    videoLink?: string
}

export const ReminderEmail = ({
    patientName,
    doctorName,
    date,
    time,
    clinicName,
    videoLink,
}: ReminderEmailProps) => {
    return (
        <BaseLayout
            preview={`Lembrete de Consulta - ${clinicName}`}
            heading="Lembrete de Consulta"
            clinicName={clinicName}
        >
            <Text className="text-black text-[14px] leading-[24px]">
                Olá <strong>{patientName}</strong>,
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
                Lembramos que sua consulta com <strong>Dr(a). {doctorName}</strong> é em breve.
            </Text>
            <Section className="bg-yellow-50 p-4 rounded-md my-4 border border-yellow-200">
                <Text className="text-black text-[14px] m-0">
                    <strong>Data:</strong> {date}
                </Text>
                <Text className="text-black text-[14px] m-0">
                    <strong>Horário:</strong> {time}
                </Text>
            </Section>

            {videoLink && (
                <Section className="text-center mt-[32px] mb-[32px]">
                    <Button
                        className="bg-blue-600 rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                        href={videoLink}
                    >
                        Entrar na Consulta
                    </Button>
                </Section>
            )}
        </BaseLayout>
    )
}

export default ReminderEmail
