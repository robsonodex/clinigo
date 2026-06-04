import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, MessageSquare, FileText, HelpCircle, Tv, Monitor } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Central de Ajuda | CliniGo',
    description: 'Tutoriais e guias para configurar seu sistema CliniGo',
}

export default function HelpPage() {
    return (
        <div className="min-h-screen bg-slate-50">
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
                    <h1 className="text-4xl font-bold mb-4 text-slate-900">Central de Ajuda CliniGo</h1>
                    <p className="text-xl text-muted-foreground">
                        Tutoriais e guias para configurar e otimizar seu sistema
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card SMTP */}
                    <Card className="hover:shadow-lg transition-shadow bg-white">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Mail className="w-8 h-8 text-blue-600" />
                                <CardTitle className="text-xl">E-mail (SMTP)</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
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
                    <Card className="hover:shadow-lg transition-shadow bg-white">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <MessageSquare className="w-8 h-8 text-green-600" />
                                <CardTitle className="text-xl">WhatsApp Automático</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
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

                    {/* Card Totem de Autoatendimento */}
                    <Card className="hover:shadow-lg transition-shadow bg-white">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Monitor className="w-8 h-8 text-amber-500" />
                                <CardTitle className="text-xl">Totem de Autoatendimento</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                                Configure a emissão de senhas de atendimento, check-in facial
                                ou QR Code diretamente na recepção da sua clínica.
                            </p>
                            <a href="#totem-section">
                                <Button variant="outline" className="w-full">
                                    Ver Detalhes do Totem ↓
                                </Button>
                            </a>
                        </CardContent>
                    </Card>

                    {/* Card Painel de TV */}
                    <Card className="hover:shadow-lg transition-shadow bg-white">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Tv className="w-8 h-8 text-sky-500" />
                                <CardTitle className="text-xl">Painel de TV (Chamadas)</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                                Habilite a transmissão de senhas e chamadas sonoras com sintetizador
                                de voz (leitura automática de nomes) na sala de espera.
                            </p>
                            <a href="#tv-section">
                                <Button variant="outline" className="w-full">
                                    Ver Detalhes da TV ↓
                                </Button>
                            </a>
                        </CardContent>
                    </Card>

                    {/* Card Primeiros Passos */}
                    <Card className="hover:shadow-lg transition-shadow bg-white">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <FileText className="w-8 h-8 text-purple-600" />
                                <CardTitle className="text-xl">Primeiros Passos</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
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
                    <Card className="hover:shadow-lg transition-shadow bg-white">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <HelpCircle className="w-8 h-8 text-orange-600" />
                                <CardTitle className="text-xl">Ainda Precisa de Ajuda?</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
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

                {/* Totem & TV Panel Documentation Section */}
                <div className="mt-16 border-t pt-16">
                    <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">
                        Novos Módulos de Recepção (Totem e TV)
                    </h2>

                    <div className="grid gap-8 max-w-4xl mx-auto">
                        {/* Seção Totem */}
                        <div id="totem-section" className="space-y-6 scroll-mt-20">
                            <h3 className="text-2xl font-semibold flex items-center gap-2 text-slate-800">
                                <Monitor className="text-amber-500" />
                                Totem de Autoatendimento
                            </h3>

                            <div className="space-y-4">
                                <Card className="bg-white border-l-4 border-l-amber-500">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">Botão &quot;Retirar Senha&quot; e Triagem</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div>
                                            <strong className="text-slate-800">O que é?</strong>
                                            <p className="text-muted-foreground">É um botão interativo posicionado no menu inicial do totem para a emissão de senhas de atendimento.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Para que serve?</strong>
                                            <p className="text-muted-foreground">Permite que pacientes que não tenham agendamento prévio ou que precisem de atendimento de encaixe/recepção geral possam se posicionar na fila sem passar pela recepcionista.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Como ou Quando usar?</strong>
                                            <p className="text-muted-foreground">O paciente clica na tela do totem ao chegar e escolhe &quot;Retirar Senha&quot;, podendo selecionar o tipo de prioridade antes de receber o número do ticket.</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white border-l-4 border-l-amber-500">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">Seleção de Prioridade: Geral vs Preferencial</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div>
                                            <strong className="text-slate-800">O que é?</strong>
                                            <p className="text-muted-foreground">Uma etapa do fluxo que diferencia o atendimento entre a fila convencional e a de prioridade legal.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Para que serve?</strong>
                                            <p className="text-muted-foreground">Garante que idosos, gestantes ou pessoas com necessidades especiais tenham prioridade de chamada no painel, gerando senhas com o prefixo &quot;P-&quot;, enquanto atendimentos padrão recebem o prefixo &quot;N-&quot;.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Como ou Quando usar?</strong>
                                            <p className="text-muted-foreground">O Totem exibe essa pergunta obrigatoriamente logo depois de clicar em &quot;Retirar Senha&quot;. O paciente clica na categoria correspondente.</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white border-l-4 border-l-amber-500">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">Formulário de Identificação e Controle PWA</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div>
                                            <strong className="text-slate-800">O que é?</strong>
                                            <p className="text-muted-foreground">Uma tela opcional para inserção de Nome Completo e CPF com proteção visual PWA.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Para que serve?</strong>
                                            <p className="text-muted-foreground">Associa a senha ao prontuário do paciente na clínica. Caso o paciente opte por privacidade ou agilidade, pode clicar em &quot;Gerar Senha Rápida&quot; para emitir um bilhete anônimo. O layout usa tamanho de fonte de 16px para evitar o comportamento de autozoom em telas mobile iOS.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Como ou Quando usar?</strong>
                                            <p className="text-muted-foreground">Ao preencher os dados, o paciente clica em &quot;Gerar Senha Identificada&quot;. Se preferir omitir, clica em &quot;Gerar Senha Rápida (Anônima)&quot;.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Seção TV */}
                        <div id="tv-section" className="space-y-6 scroll-mt-20 border-t pt-8">
                            <h3 className="text-2xl font-semibold flex items-center gap-2 text-slate-800">
                                <Tv className="text-sky-500" />
                                Painel de TV (Chamadas Waiting Room)
                            </h3>

                            <div className="space-y-4">
                                <Card className="bg-white border-l-4 border-l-sky-500">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">Chamadas em Tempo Real e Sinalização Sonora</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div>
                                            <strong className="text-slate-800">O que é?</strong>
                                            <p className="text-muted-foreground">Um display de visualização contínua para recepções conectado em tempo real à base de dados.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Para que serve?</strong>
                                            <p className="text-muted-foreground">Notifica os pacientes que estão na recepção quando um médico ou atendente os chama à sala. O painel executa um aviso de carrilhão profissional de 3 tons musicais antes de iniciar a fala.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Como ou Quando usar?</strong>
                                            <p className="text-muted-foreground">Deixe a página `/painel-tv/[clinicId]` aberta em tela cheia na TV da recepção. Certifique-se de clicar na tela uma única vez para liberar o som de notificação (exigido pelos navegadores).</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white border-l-4 border-l-sky-500">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">Vocalização Sintética (Leitura de Nomes e Senhas)</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div>
                                            <strong className="text-slate-800">O que é?</strong>
                                            <p className="text-muted-foreground">Um sintetizador de voz integrado ao painel que traduz o texto do chamado em som falado em português.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Para que serve?</strong>
                                            <p className="text-muted-foreground">Lê a senha (soletrando letra por letra), o nome completo do paciente chamado e a sala ou consultório de destino, garantindo acessibilidade a idosos, pessoas com baixa visão ou distraídos.</p>
                                        </div>
                                        <div>
                                            <strong className="text-slate-800">Como ou Quando usar?</strong>
                                            <p className="text-muted-foreground">O sistema ativa a fala automaticamente 1 segundo após o início do carrilhão de áudio. Nenhuma intervenção manual é necessária.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-16 border-t pt-16">
                    <h2 className="text-2xl font-bold mb-6 text-center text-slate-900">
                        Perguntas Frequentes
                    </h2>
                    <div className="space-y-4 max-w-4xl mx-auto">
                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Como faço para adicionar um médico?
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-sm">
                                    Acesse Menu → Equipe → Médicos → Novo Médico. Preencha os
                                    dados e clique em &quot;Enviar Convite&quot; para que o médico crie sua
                                    senha.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Meu e-mail não está sendo enviado. O que fazer?
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-sm">
                                    Verifique se o SMTP está configurado corretamente em
                                    Configurações → SMTP. Consulte nosso{' '}
                                    <Link href="/help/smtp" className="text-primary underline">
                                        tutorial completo
                                    </Link>
                                    .
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Qual plano preciso para ter WhatsApp automático?
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-sm">
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
