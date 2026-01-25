import {
    Body,
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
    Button,
} from '@react-email/components'
import * as React from 'react'

interface ClinicWelcomeEmailProps {
    fullName: string
    clinicName: string
    email: string
    loginUrl?: string
}

export const ClinicWelcomeEmail = ({
    fullName = 'Administrador',
    clinicName = 'Sua Clínica',
    email = 'admin@clinica.com',
    loginUrl = 'https://clinigo.app/clinica'
}: ClinicWelcomeEmailProps) => {
    const dashboardUrl = loginUrl || 'https://clinigo.app/clinica'
    const logoUrl = 'https://clinigo.app/logo-email.png'

    return (
        <Html>
            <Head />
            <Preview>Bem-vindo ao CliniGo - Sistema de Gestão Médica</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header com Logo */}
                    <Section style={header}>
                        <Img
                            src={logoUrl}
                            width="180"
                            height="50"
                            alt="CliniGo"
                            style={logo}
                        />
                    </Section>

                    {/* Título Principal */}
                    <Section style={heroSection}>
                        <Heading style={h1}>
                            Bem-vindo ao CliniGo!
                        </Heading>
                        <Text style={welcomeText}>
                            Olá, <strong>{fullName}</strong>
                        </Text>
                        <Text style={paragraph}>
                            Sua clínica <strong>{clinicName}</strong> foi cadastrada com sucesso no CliniGo,
                            o sistema completo de gestão médica.
                        </Text>
                    </Section>

                    {/* Credenciais */}
                    <Section style={credentialsBox}>
                        <Text style={credentialsTitle}>Suas credenciais de acesso:</Text>
                        <Text style={credentialItem}>
                            <strong>Email:</strong> {email}
                        </Text>
                        <Text style={credentialItem}>
                            <strong>Senha:</strong> A senha que você definiu no cadastro
                        </Text>
                    </Section>

                    {/* Próximos Passos */}
                    <Section style={stepsSection}>
                        <Text style={stepsTitle}>Próximos passos para começar:</Text>
                        <Text style={stepItem}>
                            <strong>1.</strong> Acesse seu painel administrativo
                        </Text>
                        <Text style={stepItem}>
                            <strong>2.</strong> Configure os horários de atendimento
                        </Text>
                        <Text style={stepItem}>
                            <strong>3.</strong> Cadastre seus médicos e especialidades
                        </Text>
                        <Text style={stepItem}>
                            <strong>4.</strong> Personalize a página pública da clínica
                        </Text>
                    </Section>

                    {/* CTA Button */}
                    <Section style={buttonSection}>
                        <Button
                            style={button}
                            href={dashboardUrl}
                        >
                            Acessar Painel Administrativo
                        </Button>
                    </Section>

                    {/* Suporte */}
                    <Section style={supportSection}>
                        <Text style={supportText}>
                            Precisa de ajuda para começar?
                        </Text>
                        <Text style={supportText}>
                            Entre em contato com nossa equipe:{' '}
                            <Link href="mailto:contato@clinigo.app" style={link}>
                                contato@clinigo.app
                            </Link>
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            <Link href="https://clinigo.app" style={link}>www.clinigo.app</Link>
                            {' '} • {' '}
                            <Link href="https://clinigo.app/termos" style={link}>Termos de Uso</Link>
                            {' '} • {' '}
                            <Link href="https://clinigo.app/privacidade" style={link}>Privacidade</Link>
                        </Text>
                        <Text style={footerCopyright}>
                            © {new Date().getFullYear()} CliniGo. Todos os direitos reservados.
                        </Text>
                        <Text style={footerNote}>
                            Você está recebendo este email porque cadastrou sua clínica no CliniGo.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

export default ClinicWelcomeEmail

// ============================================================================
// STYLES
// ============================================================================

const main = {
    backgroundColor: '#f3f4f6',
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
    backgroundColor: '#ffffff',
    margin: '40px auto',
    padding: '40px 20px',
    borderRadius: '8px',
    maxWidth: '600px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
}

const header = {
    textAlign: 'center' as const,
    marginBottom: '32px',
}

const logo = {
    margin: '0 auto',
    display: 'block',
}

const heroSection = {
    marginBottom: '32px',
}

const h1 = {
    color: '#1f2937',
    fontSize: '28px',
    fontWeight: '700',
    lineHeight: '1.3',
    margin: '0 0 16px 0',
    textAlign: 'center' as const,
}

const welcomeText = {
    color: '#4b5563',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px 0',
}

const paragraph = {
    color: '#4b5563',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px 0',
}

const credentialsBox = {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '32px',
}

const credentialsTitle = {
    color: '#1f2937',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
}

const credentialItem = {
    color: '#374151',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '8px 0',
}

const stepsSection = {
    marginBottom: '32px',
}

const stepsTitle = {
    color: '#1f2937',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 16px 0',
}

const stepItem = {
    color: '#4b5563',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '8px 0',
    paddingLeft: '8px',
}

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 0',
}

const button = {
    backgroundColor: '#14b8a6',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 32px',
    lineHeight: '1.5',
}

const supportSection = {
    textAlign: 'center' as const,
    marginTop: '32px',
}

const supportText = {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '4px 0',
}

const link = {
    color: '#14b8a6',
    textDecoration: 'underline',
}

const hr = {
    borderColor: '#e5e7eb',
    margin: '32px 0',
}

const footer = {
    textAlign: 'center' as const,
}

const footerText = {
    color: '#9ca3af',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '8px 0',
}

const footerCopyright = {
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '8px 0',
}

const footerNote = {
    color: '#d1d5db',
    fontSize: '11px',
    lineHeight: '16px',
    margin: '16px 0 0 0',
    fontStyle: 'italic' as const,
}
