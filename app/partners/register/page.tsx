'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Copy, Check, Users, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PartnerTermsModal } from '@/components/partners/partner-terms-modal'
import { EditorialShell } from '@/components/marketing/EditorialShell'

// CPF validation helper
function isValidCPF(cpf: string): boolean {
    const cleaned = cpf.replace(/\D/g, '')

    if (cleaned.length !== 11) return false
    if (/^(\d)\1{10}$/.test(cleaned)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned.charAt(i)) * (10 - i)
    }
    let remainder = sum % 11
    const digit1 = remainder < 2 ? 0 : 11 - remainder

    if (digit1 !== parseInt(cleaned.charAt(9))) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned.charAt(i)) * (11 - i)
    }
    remainder = sum % 11
    const digit2 = remainder < 2 ? 0 : 11 - remainder

    return digit2 === parseInt(cleaned.charAt(10))
}

// Validation schema
const schema = z
    .object({
        full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
        email: z.string().email('Email inválido'),
        cpf: z
            .string()
            .transform((val) => val.replace(/\D/g, ''))
            .refine((val) => val.length === 11, 'CPF deve ter 11 dígitos')
            .refine(isValidCPF, 'CPF inválido'),
        phone: z
            .string()
            .transform((val) => val.replace(/\D/g, ''))
            .refine((val) => val.length >= 10, 'Telefone inválido'),
        pix_key_type: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']),
        pix_key: z.string().min(1, 'Chave Pix obrigatória'),
        cnpj: z.string().optional(),
        company_name: z.string().optional(),
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
        confirm_password: z.string().min(1, 'Confirme sua senha'),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: 'As senhas não coincidem',
        path: ['confirm_password'],
    })

type FormData = z.infer<typeof schema>

export default function PartnerRegisterPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [registeredCode, setRegisteredCode] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)
    const [showTermsModal, setShowTermsModal] = useState(false)
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            pix_key_type: 'CPF',
        },
    })

    // Form step 1: validate form and show terms modal
    const onFormSubmit = (data: FormData) => {
        setPendingFormData(data)
        setShowTermsModal(true)
    }

    // Form step 2: after terms acceptance, complete registration
    const onTermsAccepted = async () => {
        if (!pendingFormData) return

        setShowTermsModal(false)
        setIsLoading(true)

        try {
            const response = await fetch('/api/partners/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...pendingFormData,
                    terms_accepted: true,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao cadastrar')
            }

            setRegisteredCode(result.referral_code)
            toast.success('Cadastro realizado com sucesso!')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
            setPendingFormData(null)
        }
    }

    const copyCode = () => {
        if (registeredCode) {
            navigator.clipboard.writeText(registeredCode)
            setCopied(true)
            toast.success('Código copiado!')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Success screen
    if (registeredCode) {
        const shareUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app').replace(/\/$/, '')}/cadastro?ref=${registeredCode}`

        return (
            <EditorialShell
                minimal
                backHref="/partners"
                backLabel="Voltar para Parceiros"
                rightAction={{ label: 'Acessar painel', href: '/partners/login', accent: true }}
                compactFooter
            >
                <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
                    <Card className="max-w-lg w-full bg-white border border-[#E6E8E5] shadow-sm">
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-[#E6F2EE] w-14 h-14 rounded-full flex items-center justify-center mb-3">
                                <CheckCircle2 className="w-7 h-7 text-[#155E4B]" strokeWidth={1.75} />
                            </div>
                            <CardTitle className="text-2xl text-[#0F1F1B]">Cadastro concluído</CardTitle>
                            <CardDescription className="text-[#4B5B56]">
                                Você agora faz parte do Programa de Parceiros CliniGo
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-center p-4 rounded-xl bg-[#FAFAF8] border border-[#E6E8E5]">
                                <p className="text-xs font-tech-mono uppercase tracking-[0.12em] text-[#4B5B56] mb-2">
                                    Seu código de parceiro
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-3xl font-bold text-[#155E4B] font-tech-mono">
                                        {registeredCode}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={copyCode}
                                        aria-label="Copiar código de parceiro"
                                        className="min-w-[44px] min-h-[44px] border-[#E6E8E5] hover:bg-[#F2F5F3]"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-[#155E4B]" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-[#4B5B56]" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-[#F2F5F3] p-4 rounded-xl border border-[#E6E8E5]">
                                <h4 className="font-semibold mb-2 text-[#0F1F1B] text-sm">
                                    Como funciona a comissão:
                                </h4>
                                <ol className="list-decimal list-inside space-y-1.5 text-sm text-[#4B5B56]">
                                    <li>Apresente o CliniGo para clínicas de terapias multidisciplinares</li>
                                    <li>A clínica se cadastra informando seu código ou usando seu link</li>
                                    <li>
                                        Quando a clínica <strong className="text-[#0F1F1B]">pagar a primeira mensalidade</strong>, sua comissão é liberada
                                    </li>
                                    <li>
                                        Você recebe <strong className="text-[#155E4B]">35% a 45%</strong> + <strong className="text-[#155E4B]">8% recorrente</strong> mensal enquanto ela permanecer ativa
                                    </li>
                                </ol>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[#0F1F1B] text-xs font-semibold">Link direto de indicação</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={shareUrl}
                                        readOnly
                                        className="text-xs min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B] font-tech-mono"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        aria-label="Copiar link de indicação"
                                        className="min-w-[44px] min-h-[44px] border-[#E6E8E5] hover:bg-[#F2F5F3]"
                                        onClick={() => {
                                            navigator.clipboard.writeText(shareUrl)
                                            setCopiedLink(true)
                                            toast.success('Link copiado!')
                                            setTimeout(() => setCopiedLink(false), 2000)
                                        }}
                                    >
                                        {copiedLink ? (
                                            <Check className="w-4 h-4 text-[#155E4B]" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-[#4B5B56]" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    className="min-h-[46px] bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold"
                                    onClick={() => router.push('/partners/login')}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Acessar painel
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-[46px] border-[#E6E8E5] text-[#0F1F1B] hover:bg-[#F2F5F3]"
                                    onClick={() => router.push('/')}
                                >
                                    Voltar ao início
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </EditorialShell>
        )
    }

    // Registration form
    return (
        <EditorialShell
            minimal
            backHref="/partners"
            backLabel="Voltar para Parceiros"
            rightAction={{ label: 'Já sou parceiro', href: '/partners/login' }}
            compactFooter
        >
            <main className="flex-1 py-10 sm:py-12 px-5 sm:px-8">
                <div className="max-w-xl mx-auto">
                    {/* Intro */}
                    <div className="text-center mb-8">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                            CADASTRO DE PARCEIRO COMERCIAL
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-2">
                            Seja um parceiro CliniGo
                        </h1>
                        <p className="text-sm sm:text-base text-[#4B5B56]">
                            Receba <strong className="text-[#0F1F1B]">35% a 45%</strong> na primeira mensalidade confirmada + <strong className="text-[#0F1F1B]">8% recorrente</strong> mensal.
                        </p>
                    </div>

                    {/* Resumo de benefícios */}
                    <div className="grid grid-cols-3 gap-3 mb-7">
                        <div className="text-center p-4 bg-white rounded-xl border border-[#E6E8E5]">
                            <div className="font-tech-mono text-lg sm:text-xl font-semibold text-[#155E4B]">35–45%</div>
                            <div className="text-xs text-[#4B5B56] mt-0.5">Por venda</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-xl border border-[#E6E8E5]">
                            <div className="font-tech-mono text-lg sm:text-xl font-semibold text-[#155E4B]">+8%</div>
                            <div className="text-xs text-[#4B5B56] mt-0.5">Recorrente/mês</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-xl border border-[#E6E8E5]">
                            <div className="font-tech-mono text-lg sm:text-xl font-semibold text-[#155E4B]">Dia 5</div>
                            <div className="text-xs text-[#4B5B56] mt-0.5">Repasse via Pix</div>
                        </div>
                    </div>

                    {/* Form */}
                    <Card className="bg-white border border-[#E6E8E5] shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl text-[#0F1F1B]">Dados do parceiro</CardTitle>
                            <CardDescription className="text-[#4B5B56]">
                                Preencha seus dados para gerar seu código exclusivo e acessar o painel
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="full_name" className="text-[#0F1F1B]">Nome Completo *</Label>
                                    <Input
                                        id="full_name"
                                        placeholder="Mariana Alves"
                                        className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B]"
                                        {...register('full_name')}
                                    />
                                    {errors.full_name && (
                                        <p className="text-xs text-red-600">{errors.full_name.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-[#0F1F1B]">E-mail *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="mariana@email.com.br"
                                        className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B]"
                                        {...register('email')}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-red-600">{errors.email.message}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="cpf" className="text-[#0F1F1B]">CPF * (apenas números)</Label>
                                        <Input
                                            id="cpf"
                                            placeholder="12345678900"
                                            maxLength={11}
                                            inputMode="numeric"
                                            className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B]"
                                            {...register('cpf')}
                                        />
                                        {errors.cpf && (
                                            <p className="text-xs text-red-600">{errors.cpf.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone" className="text-[#0F1F1B]">Telefone / WhatsApp *</Label>
                                        <Input
                                            id="phone"
                                            placeholder="11999999999"
                                            maxLength={11}
                                            inputMode="numeric"
                                            className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B]"
                                            {...register('phone')}
                                        />
                                        {errors.phone && (
                                            <p className="text-xs text-red-600">{errors.phone.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pix_key_type" className="text-[#0F1F1B]">Tipo de Chave Pix *</Label>
                                        <Select
                                            value={watch('pix_key_type')}
                                            onValueChange={(value: any) => setValue('pix_key_type', value)}
                                        >
                                            <SelectTrigger className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-[#E6E8E5] text-[#0F1F1B]">
                                                <SelectItem value="CPF">CPF</SelectItem>
                                                <SelectItem value="CNPJ">CNPJ</SelectItem>
                                                <SelectItem value="EMAIL">E-mail</SelectItem>
                                                <SelectItem value="PHONE">Telefone</SelectItem>
                                                <SelectItem value="RANDOM">Chave Aleatória</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="pix_key" className="text-[#0F1F1B]">Chave Pix *</Label>
                                        <Input
                                            id="pix_key"
                                            placeholder="Sua chave Pix"
                                            className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B]"
                                            {...register('pix_key')}
                                        />
                                        {errors.pix_key && (
                                            <p className="text-xs text-red-600">{errors.pix_key.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-[#E6E8E5] pt-4 mt-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#4B5B56] mb-3">
                                        Dados Empresariais (opcional)
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="cnpj" className="text-[#0F1F1B]">CNPJ</Label>
                                            <Input
                                                id="cnpj"
                                                placeholder="00.000.000/0000-00"
                                                className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B]"
                                                {...register('cnpj')}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="company_name" className="text-[#0F1F1B]">Razão Social</Label>
                                            <Input
                                                id="company_name"
                                                placeholder="Empresa Ltda"
                                                className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B]"
                                                {...register('company_name')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Password Section */}
                                <div className="border-t border-[#E6E8E5] pt-4 mt-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#4B5B56] mb-3">
                                        Crie sua senha para o painel de parceiro
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="password" className="text-[#0F1F1B]">Senha *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Mínimo 6 caracteres"
                                                    className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B] pr-11"
                                                    {...register('password')}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#4B5B56] hover:text-[#0F1F1B] cursor-pointer"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {errors.password && (
                                                <p className="text-xs text-red-600">{errors.password.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="confirm_password" className="text-[#0F1F1B]">Confirmar Senha *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirm_password"
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    placeholder="Repita a senha"
                                                    className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B] pr-11"
                                                    {...register('confirm_password')}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#4B5B56] hover:text-[#0F1F1B] cursor-pointer"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {errors.confirm_password && (
                                                <p className="text-xs text-red-600">{errors.confirm_password.message}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full min-h-[48px] bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold mt-2"
                                    size="lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Cadastrando...
                                        </>
                                    ) : (
                                        <>
                                            Continuar para Termo de Parceria
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>

                                <p className="text-xs text-[#4B5B56] text-center">
                                    Na próxima etapa você revisa e confirma o Termo de Parceria Comercial.
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Terms Modal */}
            <PartnerTermsModal
                open={showTermsModal}
                onOpenChange={setShowTermsModal}
                onAccept={onTermsAccepted}
                partnerData={{
                    full_name: watch('full_name') || '',
                    cpf: watch('cpf') || '',
                    email: watch('email') || '',
                    phone: watch('phone') || '',
                }}
            />
        </EditorialShell>
    )
}
