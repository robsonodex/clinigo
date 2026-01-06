import {
    Text,
    Button,
    Section,
} from '@react-email/components'
import { BaseLayout } from './layout'
import * as React from 'react'

interface AppointmentConfirmedEmailProps {
    patientName: string
    doctorName: string
    date: string
    time: string
    clinicName: string
    address: string
    videoLink?: string
}

export const AppointmentConfirmedEmail = ({
    patientName,
    doctorName,
    date,
    time,
    clinicName,
    address,
    videoLink,
}: AppointmentConfirmedEmailProps) => {
    return (
        <BaseLayout
            preview={`Consulta Confirmada - ${clinicName}`}
            heading="Consulta Confirmada"
            clinicName={clinicName}
        >
            <Text className="text-black text-[14px] leading-[24px]">
                Olá <strong>{patientName}</strong>,
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
                Sua consulta com <strong>Dr(a). {doctorName}</strong> foi confirmada.
            </Text>
            <Section className="bg-green-50 p-4 rounded-md my-4 border border-green-200">
                <Text className="text-black text-[14px] m-0">
                    <strong>Data:</strong> {date}
                </Text>
                <Text className="text-black text-[14px] m-0">
                    <strong>Horário:</strong> {time}
                </Text>
                <Text className="text-black text-[14px] m-0">
                    <strong>Local:</strong> {clinicName}
                </Text>
                {address && (
                    <Text className="text-gray-600 text-[12px] mt-1">
                        {address}
                    </Text>
                )}
            </Section>

            {videoLink && (
                <Section className="text-center mt-[32px] mb-[32px]">
                    <Button
                        className="bg-blue-600 rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                        href={videoLink}
                    >
                        Acessar Sala de Vídeo
                    </Button>
                    <Text className="text-xs text-gray-500 mt-2">
                        O link estará ativo 10 minutos antes da consulta.
                    </Text>
                </Section>
            )}
        </BaseLayout>
    )
}

export default AppointmentConfirmedEmail
