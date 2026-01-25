import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components'

interface RescheduleNoShowEmailProps {
    patientName: string
    doctorName: string
    appointmentDate: string
    appointmentTime: string
    clinicName: string
    clinicPhone?: string
    rescheduleUrl: string
}

export default function RescheduleNoShowEmail({
    patientName,
    doctorName,
    appointmentDate,
    appointmentTime,
    clinicName,
    clinicPhone,
    rescheduleUrl,
}: RescheduleNoShowEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Sentimos sua falta - Reagende sua consulta no {clinicName}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Olá {patientName},</Heading>

                    <Text style={text}>
                        Percebemos que você não compareceu à consulta agendada para{' '}
                        <strong>{appointmentDate}</strong> às <strong>{appointmentTime}</strong> com{' '}
                        <strong>{doctorName}</strong>.
                    </Text>

                    <Text style={text}>
                        Sabemos que imprevistos acontecem! 😊 Gostaríamos de ajudá-lo a reagendar
                        sua consulta de forma rápida e fácil.
                    </Text>

                    <Section style={btnContainer}>
                        <Button style={button} href={rescheduleUrl}>
                            🗓️ Reagendar Consulta
                        </Button>
                    </Section>

                    <Text style={text}>
                        Ou copie e cole este link no seu navegador:
                    </Text>

                    <Text style={link}>
                        <Link href={rescheduleUrl} style={linkStyle}>
                            {rescheduleUrl}
                        </Link>
                    </Text>

                    <Hr style={hr} />

                    <Text style={footer}>
                        <strong>Importante:</strong> Este link é válido por 7 dias e pode ser usado
                        apenas uma vez.
                    </Text>

                    {clinicPhone && (
                        <Text style={footer}>
                            Se preferir, entre em contato conosco:{' '}
                            <Link href={`tel:${clinicPhone}`} style={linkStyle}>
                                {clinicPhone}
                            </Link>
                        </Text>
                    )}

                    <Text style={footer}>
                        Atenciosamente,<br />
                        <strong>{clinicName}</strong>
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
}

const h1 = {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '40px 0 20px',
    padding: '0 40px',
}

const text = {
    color: '#374151',
    fontSize: '16px',
    lineHeight: '26px',
    padding: '0 40px',
    marginBottom: '20px',
}

const btnContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
}

const button = {
    backgroundColor: '#3b82f6',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 32px',
}

const link = {
    padding: '0 40px',
    marginBottom: '20px',
    fontSize: '14px',
    wordBreak: 'break-all' as const,
}

const linkStyle = {
    color: '#3b82f6',
    textDecoration: 'underline',
}

const hr = {
    borderColor: '#e5e7eb',
    margin: '32px 40px',
}

const footer = {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '24px',
    padding: '0 40px',
    marginBottom: '12px',
}
