import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Mail } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Como Configurar SMTP | Central de Ajuda | CliniGo',
    description: 'Guia passo a passo para configurar o envio de e-mails no CliniGo',
}

export default function SMTPHelpPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header with Logo */}
            <header className="border-b bg-white sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="inline-block">
                        <Image
                            src="/logo_black.svg"
                            alt="CliniGo"
                            width={140}
                            height={40}
                            className="h-10 w-auto"
                        />
                    </Link>
                    <Link href="/help">
                        <Button variant="ghost">← Voltar para Ajuda</Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto py-12 px-4 max-w-4xl">

                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">
                        Como Configurar o SMTP (E-mail)
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Guia passo a passo para configurar o envio de e-mails no CliniGo
                    </p>
                </div>

                <Alert className="mb-8">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Importante:</strong> Para configurar o SMTP, você precisará
                        das credenciais do seu provedor de e-mail. Se não tiver essas
                        informações, consulte seu departamento de TI ou o suporte do seu
                        provedor.
                    </AlertDescription>
                </Alert>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>O que é SMTP?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            SMTP (Simple Mail Transfer Protocol) é o protocolo usado para envio
                            de e-mails. Ao configurar o SMTP no CliniGo, você permite que o
                            sistema envie automaticamente:
                        </p>
                        <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
                            <li>Confirmações de consulta</li>
                            <li>Lembretes automáticos</li>
                            <li>Links de teleconsulta</li>
                            <li>QR Codes de check-in</li>
                            <li>Notificações para pacientes e equipe</li>
                        </ul>
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold mb-4">
                            📧 Opção 1: Gmail (Recomendado para Começar)
                        </h2>

                        <Card>
                            <CardHeader>
                                <CardTitle>Passo a Passo - Gmail</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">
                                        1. Criar Senha de App no Gmail
                                    </h3>
                                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                                        <li>Acesse: <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://myaccount.google.com/security</a></li>
                                        <li>Ative a &quot;Verificação em duas etapas&quot; (se ainda não estiver ativa)</li>
                                        <li>Vá em &quot;Senhas de app&quot;</li>
                                        <li>Selecione &quot;E-mail&quot; e &quot;Outro (nome personalizado)&quot;</li>
                                        <li>Digite &quot;CliniGo&quot; e clique em &quot;Gerar&quot;</li>
                                        <li>Copie a senha de 16 caracteres gerada</li>
                                    </ol>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">
                                        2. Configurar no CliniGo
                                    </h3>
                                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                                        <li>Acesse: <Link href="/dashboard/configuracoes" className="text-primary underline">Configurações → SMTP</Link></li>
                                        <li>Preencha os campos:</li>
                                    </ol>

                                    <div className="bg-muted p-4 rounded-lg mt-3 font-mono text-sm">
                                        <div className="space-y-2">
                                            <div><strong>Host:</strong> smtp.gmail.com</div>
                                            <div><strong>Porta:</strong> 587</div>
                                            <div><strong>Usuário:</strong> seuemail@gmail.com</div>
                                            <div><strong>Senha:</strong> [senha de app de 16 caracteres]</div>
                                            <div><strong>Nome do Remetente:</strong> Clínica [Seu Nome]</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">
                                        3. Testar Configuração
                                    </h3>
                                    <p className="text-muted-foreground mb-2">
                                        Clique no botão &quot;Testar Conexão&quot; para verificar se tudo está
                                        funcionando.
                                    </p>
                                    <Alert>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription>
                                            Se receber &quot;Conexão bem-sucedida&quot;, está tudo certo!
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-4">
                            📧 Opção 2: Outlook / Hotmail
                        </h2>

                        <Card>
                            <CardHeader>
                                <CardTitle>Configuração - Outlook</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                                    <div className="space-y-2">
                                        <div><strong>Host:</strong> smtp-mail.outlook.com</div>
                                        <div><strong>Porta:</strong> 587</div>
                                        <div><strong>Usuário:</strong> seuemail@outlook.com</div>
                                        <div><strong>Senha:</strong> [sua senha do Outlook]</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-4">
                            📧 Opção 3: SendGrid (Profissional)
                        </h2>

                        <Card>
                            <CardHeader>
                                <CardTitle>Configuração - SendGrid</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-4">
                                    SendGrid é um serviço profissional de envio de e-mails,
                                    recomendado para clínicas com alto volume.
                                </p>
                                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                                    <div className="space-y-2">
                                        <div><strong>Host:</strong> smtp.sendgrid.net</div>
                                        <div><strong>Porta:</strong> 587</div>
                                        <div><strong>Usuário:</strong> apikey</div>
                                        <div><strong>Senha:</strong> [sua API Key do SendGrid]</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Alert className="mt-8">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Problemas Comuns:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Erro &quot;Authentication failed&quot; → Verifique usuário e senha</li>
                            <li>E-mails não chegam → Verifique pasta de SPAM</li>
                            <li>Erro de conexão → Verifique porta e host</li>
                        </ul>
                    </AlertDescription>
                </Alert>

                <div className="mt-8 flex gap-4">
                    <Link href="/dashboard/configuracoes" className="flex-1">
                        <Button className="w-full" size="lg">
                            <Mail className="w-4 h-4 mr-2" />
                            Configurar Agora
                        </Button>
                    </Link>
                    <Link href="/help" className="flex-1">
                        <Button variant="outline" className="w-full" size="lg">
                            Voltar para Ajuda
                        </Button>
                    </Link>
                </div>
            </main>
        </div>
    )
}
