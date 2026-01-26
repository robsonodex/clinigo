import {
    Text,
    Button,
    Section,
} from '@react-email/components'
import { BaseLayout } from './layout'
import * as React from 'react'

interface DoctorWelcomeEmailProps {
    doctorName: string
    clinicName: string
    loginUrl: string
    email: string
}

export const DoctorWelcomeEmail = ({
    doctorName = 'Doutor',
    clinicName = 'CliniGo',
    loginUrl = 'http://localhost:3000/login',
    email = 'doutor@exemplo.com'
}: DoctorWelcomeEmailProps) => {
    return (
        <BaseLayout
            preview={`Bem-vindo ao ${clinicName}`}
            heading={`Olá, Dr(a). ${doctorName}!`}
            clinicName={clinicName}
        >
            <Text className="text-black text-[14px] leading-[24px]">
                Sua conta na clínica <strong>{clinicName}</strong> foi criada com sucesso.
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
                Suas credenciais de acesso são:
            </Text>
            <Section className="bg-gray-100 p-4 rounded-md my-4">
                <Text className="text-black text-[14px] m-0">
                    <strong>Email:</strong> {email}
                </Text>
                <Text className="text-black text-[14px] m-0">
                    <strong>Senha:</strong> (A senha que você definiu ou foi enviada separadamente)
                </Text>
            </Section>
            <Section className="text-center mt-[32px] mb-[32px]">
                <Button
                    className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                    href={loginUrl}
                >
                    Acessar Painel
                </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
                Se tiver alguma dúvida, entre em contato com a administração da clínica.
            </Text>
        </BaseLayout>
    )
}

export default DoctorWelcomeEmail
