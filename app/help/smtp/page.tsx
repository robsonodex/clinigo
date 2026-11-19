'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertCircle, Check, CheckCircle, Copy, Mail } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'

const SMTP_PROVIDERS = [
    {
        id: 'gmail',
        title: 'Opção 1: Gmail (Recomendado para começar)',
        host: 'smtp.gmail.com',
        port: '587',
        userExample: 'seuemail@gmail.com',
        passwordNote: 'Senha de app de 16 caracteres gerada na Conta Google',
        steps: [
            'Acesse myaccount.google.com/security e ative a Verificação em duas etapas.',
            'Abra a opção Senhas de app, selecione E-mail e dê o nome "CliniGo".',
            'Copie a senha de 16 caracteres gerada e informe em Configurações -> SMTP no painel.',
        ],
    },
    {
        id: 'outlook',
        title: 'Opção 2: Outlook / Microsoft 365',
        host: 'smtp-mail.outlook.com',
        port: '587',
        userExample: 'seuemail@outlook.com',
        passwordNote: 'Senha da conta ou senha de aplicativo configurada na Microsoft',
        steps: [
            'Confirme se o envio autenticado SMTP está habilitado na caixa de e-mail.',
            'Preencha host, porta 587, usuário e senha em Configurações -> SMTP.',
        ],
    },
    {
        id: 'sendgrid',
        title: 'Opção 3: SendGrid (Alto volume de envios)',
        host: 'smtp.sendgrid.net',
        port: '587',
        userExample: 'apikey',
        passwordNote: 'Sua API Key com permissão Mail Send no SendGrid',
        steps: [
            'Crie uma API Key no painel SendGrid com permissão de envio de e-mail.',
            'Informe "apikey" no campo Usuário e cole a chave no campo Senha.',
        ],
    },
]

export default function SMTPHelpPage() {
    const [copiedHost, setCopiedHost] = useState<string | null>(null)

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedHost(id)
        toast.success(`Host ${text} copiado!`)
        setTimeout(() => setCopiedHost(null), 2000)
    }

    return (
        <EditorialShell
            minimal
            backHref="/help"
            backLabel="Voltar para Ajuda"
            rightAction={{ label: 'Acessar painel', href: '/login' }}
        >
            <main className="flex-1 py-12 px-5 sm:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                            TUTORIAL TÉCNICO · E-MAIL TRANSACIONAL
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-semibold text-[#0F1F1B] tracking-tight mb-3">
                            Como configurar o SMTP no CliniGo
                        </h1>
                        <p className="text-base text-[#4B5B56] leading-relaxed">
                            Passo a passo para habilitar confirmações de sessões, lembretes, links de teleatendimento e QR Codes de check-in com o e-mail da sua clínica.
                        </p>
                    </div>

                    <div className="bg-[#F2F5F3] border border-[#E6E8E5] rounded-xl p-5 mb-8 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-[#155E4B] shrink-0 mt-0.5" />
                        <p className="text-sm text-[#0F1F1B] leading-relaxed">
                            <strong>Antes de começar:</strong> tenha em mãos as credenciais do provedor de e-mail da clínica. Após preencher os dados em <strong>Configurações -&gt; SMTP</strong>, utilize o botão &quot;Testar Conexão&quot;.
                        </p>
                    </div>

                    <div className="space-y-6 mb-10">
                        {SMTP_PROVIDERS.map((provider) => (
                            <section
                                key={provider.id}
                                className="bg-white border border-[#E6E8E5] rounded-xl p-6 sm:p-7 space-y-4"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center shrink-0">
                                        <Mail className="w-4 h-4" strokeWidth={1.75} />
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B]">
                                        {provider.title}
                                    </h2>
                                </div>

                                <ol className="list-decimal list-inside space-y-1.5 text-sm text-[#4B5B56]">
                                    {provider.steps.map((step) => (
                                        <li key={step}>{step}</li>
                                    ))}
                                </ol>

                                <div className="bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg p-4 font-tech-mono text-xs sm:text-sm space-y-1.5 text-[#0F1F1B]">
                                    <div className="flex items-center justify-between gap-2">
                                        <span><strong>Host:</strong> {provider.host}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(provider.id, provider.host)}
                                            className="min-h-[36px] px-2.5 rounded border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-sans font-medium text-[#0F1F1B] inline-flex items-center gap-1 cursor-pointer"
                                        >
                                            {copiedHost === provider.id ? <Check className="w-3.5 h-3.5 text-[#155E4B]" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copiedHost === provider.id ? 'Copiado' : 'Copiar host'}
                                        </button>
                                    </div>
                                    <div><strong>Porta:</strong> {provider.port}</div>
                                    <div><strong>Usuário:</strong> {provider.userExample}</div>
                                    <div><strong>Senha:</strong> {provider.passwordNote}</div>
                                </div>
                            </section>
                        ))}
                    </div>

                    <div className="bg-white border border-[#E6E8E5] rounded-xl p-6 mb-8">
                        <div className="flex items-center gap-2 text-[#155E4B] font-semibold text-sm mb-3">
                            <CheckCircle className="w-4 h-4" />
                            Diagnóstico rápido de problemas comuns
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 text-sm text-[#4B5B56]">
                            <li><strong>Authentication failed:</strong> confirme usuário, senha de app e se a verificação em 2 etapas está ativa.</li>
                            <li><strong>E-mails não chegam:</strong> verifique a caixa de spam do destinatário e os registros SPF/DKIM do domínio.</li>
                            <li><strong>Erro de conexão:</strong> valide se a porta 587 (TLS) e o endereço do host foram digitados sem espaços.</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            href="/dashboard/configuracoes"
                            className="flex-1 min-h-[46px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            <Mail className="w-4 h-4" />
                            Abrir configurações SMTP
                        </Link>
                        <Link
                            href="/help"
                            className="flex-1 min-h-[46px] px-5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center transition-colors"
                        >
                            Voltar para Central de Ajuda
                        </Link>
                    </div>
                </div>
            </main>
        </EditorialShell>
    )
}
