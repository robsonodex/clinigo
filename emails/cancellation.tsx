import { Html, Head, Body, Container, Text, Button, Section } from '@react-email/components'
import { formatDate } from '@/lib/utils'

interface CancellationEmailProps {
    appointment: any
}

export function CancellationEmail({ appointment }: CancellationEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Text style={heading}>Consulta Cancelada ❌</Text>

                    <Section style={box}>
                        <Text style={paragraph}>
                            A consulta com Dr(a). {appointment.doctor.full_name} agendada para {formatDate(appointment.appointment_date)} às {appointment.appointment_time} foi cancelada.
                        </Text>
                        {appointment.cancellation_reason && (
                            <Text><strong>Motivo:</strong> {appointment.cancellation_reason}</Text>
                        )}
                    </Section>

                    <Text style={paragraph}>
                        Se você não solicitou este cancelamento, entre em contato conosco.
                    </Text>

                    <Button href={`${process.env.NEXT_PUBLIC_APP_URL}/agendar`} style={button}>
                        Agendar Nova Consulta
                    </Button>
                </Container>
            </Body>
        </Html>
    )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' }
const container = { margin: '0 auto', padding: '20px 0 48px', maxWidth: '560px' }
const heading = { fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }
const box = { backgroundColor: '#fff', border: '1px solid #e6e6e6', borderRadius: '8px', padding: '24px' }
const paragraph = { fontSize: '16px', lineHeight: '26px', marginTop: '20px' }
const button = { backgroundColor: '#0070f3', borderRadius: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center', display: 'block', padding: '12px', marginTop: '20px' }
