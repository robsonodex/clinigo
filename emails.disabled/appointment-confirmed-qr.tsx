import {
    Text,
    Button,
    Section,
    Img,
    Link,
    Hr,
} from '@react-email/components'
import { BaseLayout } from './layout'
import * as React from 'react'

interface AppointmentConfirmedWithQREmailProps {
    patientName: string
    doctorName: string
    date: string
    time: string
    clinicName: string
    clinicAddress?: string
    clinicPhone?: string
    appointmentType: 'PRESENCIAL' | 'TELEMEDICINE'
    videoLink?: string
    qrCodeImage?: string // Base64 data URL
    preRegistrationUrl?: string
    whatsappShareUrl?: string
    // Clinic custom messages
    customMessage?: string
    parkingInfo?: string
    publicTransportInfo?: string
    emergencyContact?: string
}

export const AppointmentConfirmedWithQREmail = ({
    patientName,
    doctorName,
    date,
    time,
    clinicName,
    clinicAddress,
    clinicPhone,
    appointmentType,
    videoLink,
    qrCodeImage,
    preRegistrationUrl,
    whatsappShareUrl,
    customMessage,
    parkingInfo,
    publicTransportInfo,
    emergencyContact,
}: AppointmentConfirmedWithQREmailProps) => {
    const isTelemedicine = appointmentType === 'TELEMEDICINE'

    return (
        <BaseLayout
            preview={`Consulta Confirmada - ${clinicName}`}
            heading="✅ Sua Consulta foi Confirmada!"
            clinicName={clinicName}
        >
            <Text className="text-black text-[14px] leading-[24px]">
                Prezado(a) <strong>{patientName}</strong>,
            </Text>

            <Text className="text-black text-[14px] leading-[24px]">
                {isTelemedicine
                    ? 'Sua teleconsulta foi confirmada com sucesso!'
                    : 'Sua consulta presencial foi confirmada com sucesso!'}
            </Text>

            {/* Appointment Details Box */}
            <Section className="bg-emerald-50 p-4 rounded-lg my-4 border border-emerald-200">
                <Text className="text-black text-[14px] m-0 font-semibold">
                    📅 Data: {date}
                </Text>
                <Text className="text-black text-[14px] m-0 mt-2 font-semibold">
                    🕒 Horário: {time}
                </Text>
                <Text className="text-black text-[14px] m-0 mt-2 font-semibold">
                    👨‍⚕️ Médico(a): Dr(a). {doctorName}
                </Text>
                {!isTelemedicine && clinicAddress && (
                    <Text className="text-black text-[14px] m-0 mt-2 font-semibold">
                        📍 Endereço: {clinicAddress}
                    </Text>
                )}
                {isTelemedicine && (
                    <Text className="text-emerald-700 text-[14px] m-0 mt-2 font-semibold">
                        💻 Tipo: Teleconsulta (Online)
                    </Text>
                )}
            </Section>

            {/* Custom clinic message */}
            {customMessage && (
                <Section className="bg-blue-50 p-4 rounded-lg my-4 border border-blue-200">
                    <Text className="text-blue-800 text-[14px] m-0">
                        {customMessage}
                    </Text>
                </Section>
            )}

            {/* QR Code for Check-in (Presential only) */}
            {!isTelemedicine && qrCodeImage && (
                <Section className="text-center my-6">
                    <Text className="text-black text-[14px] font-semibold mb-2">
                        📱 QR Code para Check-in Rápido:
                    </Text>
                    <Img
                        src={qrCodeImage}
                        width="200"
                        height="200"
                        alt="QR Code Check-in"
                        className="mx-auto"
                    />
                    <Text className="text-gray-500 text-[12px] mt-2">
                        Apresente este QR Code na recepção para realizar o check-in.
                    </Text>
                </Section>
            )}

            {/* Pre-registration link */}
            {preRegistrationUrl && (
                <Section className="text-center my-4">
                    <Button
                        className="bg-emerald-600 rounded-lg text-white text-[14px] font-semibold no-underline text-center px-6 py-3"
                        href={preRegistrationUrl}
                    >
                        📋 Completar Pré-Cadastro
                    </Button>
                    <Text className="text-gray-500 text-[12px] mt-2">
                        Complete seus dados antes da consulta para agilizar o atendimento
                    </Text>
                </Section>
            )}

            {/* Video link for telemedicine */}
            {isTelemedicine && videoLink && (
                <Section className="text-center my-6">
                    <Button
                        className="bg-blue-600 rounded-lg text-white text-[14px] font-semibold no-underline text-center px-6 py-3"
                        href={videoLink}
                    >
                        🎥 Acessar Sala de Vídeo
                    </Button>
                    <Text className="text-gray-500 text-[12px] mt-2">
                        O link estará ativo 15 minutos antes do horário agendado.
                    </Text>
                </Section>
            )}

            <Hr className="border border-gray-200 my-4" />

            {/* Important Information */}
            <Section className="my-4">
                <Text className="text-black text-[14px] font-semibold">
                    ℹ️ Informações Importantes:
                </Text>
                <Text className="text-gray-700 text-[13px] m-0">
                    {isTelemedicine
                        ? '• Acesse o link 5 minutos antes do horário'
                        : '• Chegue 15 minutos antes do horário'}
                </Text>
                {!isTelemedicine && (
                    <Text className="text-gray-700 text-[13px] m-0">
                        • Traga documentos: RG e Carteirinha do Convênio (se aplicável)
                    </Text>
                )}
                {isTelemedicine && (
                    <>
                        <Text className="text-gray-700 text-[13px] m-0">
                            • Tenha uma conexão de internet estável
                        </Text>
                        <Text className="text-gray-700 text-[13px] m-0">
                            • Use um ambiente silencioso e bem iluminado
                        </Text>
                    </>
                )}
                {parkingInfo && (
                    <Text className="text-gray-700 text-[13px] m-0">
                        🅿️ {parkingInfo}
                    </Text>
                )}
                {publicTransportInfo && (
                    <Text className="text-gray-700 text-[13px] m-0">
                        🚌 {publicTransportInfo}
                    </Text>
                )}
            </Section>

            {/* Contact */}
            <Section className="bg-gray-50 p-4 rounded-lg my-4">
                <Text className="text-black text-[13px] m-0">
                    <strong>Em caso de dúvidas:</strong>
                </Text>
                {clinicPhone && (
                    <Text className="text-gray-700 text-[13px] m-0">
                        📞 Telefone: {clinicPhone}
                    </Text>
                )}
                {emergencyContact && (
                    <Text className="text-gray-700 text-[13px] m-0">
                        🆘 Emergência: {emergencyContact}
                    </Text>
                )}
            </Section>

            {/* WhatsApp Share */}
            {whatsappShareUrl && (
                <Section className="text-center my-4">
                    <Link
                        href={whatsappShareUrl}
                        className="text-green-600 text-[13px] font-semibold"
                    >
                        📱 Compartilhar no WhatsApp
                    </Link>
                </Section>
            )}

            <Text className="text-gray-600 text-[12px] mt-6">
                Atenciosamente,<br />
                <strong>Equipe {clinicName}</strong>
            </Text>
        </BaseLayout>
    )
}

export default AppointmentConfirmedWithQREmail
