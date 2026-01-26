import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, MessageSquare, FileText, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Central de Ajuda | CliniGo',
    description: 'Tutoriais e guias para configurar seu sistema CliniGo',
}

export default function HelpPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header with Logo */}
            <header className="border-b bg-white sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/dashboard" className="inline-block">
                        <Image
                            src="/logo_black.svg"
                            alt="CliniGo"
                            width={140}
                            height={40}
                            className="h-10 w-auto"
                        />
                    </Link>
                </div>
            </header>

            <main className="container mx-auto py-12 px-4 max-w-6xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Central de Ajuda CliniGo</h1>
                    <p className="text-xl text-muted-foreground">
                        Tutoriais e guias para configurar seu sistema
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Card SMTP */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Mail className="w-8 h-8 text-blue-600" />
                                <CardTitle>Configuração de E-mail (SMTP)</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Aprenda a configurar o envio de e-mails para notificações,
                                confirmações de consulta e lembretes automáticos.
                            </p>
                            <Link href="/help/smtp">
                                <Button className="w-full">
                                    Ver Tutorial Completo →
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Card WhatsApp */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <MessageSquare className="w-8 h-8 text-green-600" />
                                <CardTitle>WhatsApp Automático</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Envie lembretes e confirmações via WhatsApp automaticamente
                                (disponível nos planos Professional e Enterprise).
                            </p>
                            <Link href="/dashboard/planos">
                                <Button variant="outline" className="w-full">
                                    Ver Planos →
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Card Primeiros Passos */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <FileText className="w-8 h-8 text-purple-600" />
                                <CardTitle>Primeiros Passos</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Guia completo de configuração inicial: cadastrar médicos,
                                pacientes e horários de atendimento.
                            </p>
                            <Link href="/dashboard">
                                <Button variant="outline" className="w-full">
                                    Ir para Dashboard →
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Card Contato */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <HelpCircle className="w-8 h-8 text-orange-600" />
                                <CardTitle>Ainda Precisa de Ajuda?</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Nossa equipe de suporte está pronta para ajudar com qualquer
                                dúvida sobre o CliniGo.
                            </p>
                            <Link href="/contato">
                                <Button variant="outline" className="w-full">
                                    Contatar Suporte →
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* FAQ Section */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        Perguntas Frequentes
                    </h2>
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Como faço para adicionar um médico?
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Acesse Menu → Equipe → Médicos → Novo Médico. Preencha os
                                    dados e clique em &quot;Enviar Convite&quot; para que o médico crie sua
                                    senha.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Meu e-mail não está sendo enviado. O que fazer?
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Verifique se o SMTP está configurado corretamente em
                                    Configurações → SMTP. Consulte nosso{' '}
                                    <Link href="/help/smtp" className="text-primary underline">
                                        tutorial completo
                                    </Link>
                                    .
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Qual plano preciso para ter WhatsApp automático?
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    O WhatsApp automático está disponível nos planos Professional
                                    (R$ 549/mês) e Enterprise (R$ 799/mês).{' '}
                                    <Link href="/dashboard/planos" className="text-primary underline">
                                        Veja todos os planos
                                    </Link>
                                    .
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
