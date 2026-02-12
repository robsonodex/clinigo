'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, Loader2, Stethoscope, Copy, CheckCircle, Barcode, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PlanCard } from '@/components/plans/plan-card'
import { RegistrationStepper } from '@/components/registration/registration-stepper'
import { ReferralCodeInput } from '@/components/partners/ReferralCodeInput'
import { PLANS, PLAN_ORDER, type PlanType } from '@/lib/constants/plans'
import { generateSlug } from '@/lib/utils/slug'
import { maskCNPJ, validateCNPJ, cleanCNPJ } from '@/lib/utils/cnpj'

// Validation schemas for each step
const step2Schema = z.object({
    clinic_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cnpj: z.string().refine(validateCNPJ, 'CNPJ inválido'),
    phone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'),
    email: z.string().email('Email inválido'),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug inválido'),
})

const step4Schema = z.object({
    admin_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    admin_email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirm_password: z.string(),
    accept_terms: z.boolean().refine(v => v, 'Você deve aceitar os termos'),
}).refine(data => data.password === data.confirm_password, {
    message: 'Senhas não conferem',
    path: ['confirm_password'],
})

const STEPS = [
    { id: 1, title: 'Plano', description: 'Escolha seu plano' },
    { id: 2, title: 'Clínica', description: 'Dados da clínica' },
    { id: 3, title: 'Endereço', description: 'Localização (opcional)' },
    { id: 4, title: 'Admin', description: 'Seus dados' },
    { id: 5, title: 'Revisão', description: 'Confirme os dados' },
    { id: 6, title: 'Pagamento', description: 'Finalize sua assinatura' },
]

type FormData = {
    // Step 1
    plan_type: PlanType
    // Step 2
    clinic_name: string
    cnpj: string
    phone: string
    email: string
    slug: string
    referral_code?: string
    // Step 3
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zip?: string
    // Step 4
    admin_name: string
    admin_email: string
    password: string
    confirm_password: string
    accept_terms: boolean
}

function CadastroContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const preselectedPlan = searchParams.get('plan') as PlanType | null
    const refCode = searchParams.get('ref')

    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [referralCode, setReferralCode] = useState(refCode?.toUpperCase() || '')
    const [validPartner, setValidPartner] = useState<{ id: string; full_name: string } | null>(null)
    const [boletoData, setBoletoData] = useState<{
        linha_digitavel: string
        codigo_barras: string
        nosso_numero: string
        plan_name: string
        plan_price: number
        due_date: string
    } | null>(null)
    const [copied, setCopied] = useState(false)
    // Não pré-seleciona o plano mesmo quando vem da URL - usuário precisa clicar
    const [formData, setFormData] = useState<Partial<FormData>>({
        plan_type: undefined,
        referral_code: refCode?.toUpperCase() || '',
    })

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        defaultValues: formData,
    })

    // Auto-generate slug from clinic name
    const clinicName = watch('clinic_name')
    useEffect(() => {
        if (clinicName && currentStep === 2) {
            const slug = generateSlug(clinicName)
            setValue('slug', slug)
        }
    }, [clinicName, currentStep, setValue])

    // Prevent skipping steps via stepper
    const handleStepClick = (stepId: number) => {
        // Allow going back to any previous step
        if (stepId < currentStep) {
            setCurrentStep(stepId)
            return
        }
        // Prevent clicking future steps directly
        // Only allow clicking the immediate next step if current logic allows (e.g. valid form) - but simpler to just disable future jumps for now
    }

    const nextStep = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(prev => prev + 1)
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const onSubmitStep = async (data: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...data }))

        // Step 5 is Revisão - this is where we redirect to payment
        if (currentStep === 5) {
            // Final submission - go to payment
            await handleFinalSubmit({ ...formData, ...data } as FormData)
        } else {
            nextStep()
        }
    }

    const handleFinalSubmit = async (data: FormData) => {
        setIsSubmitting(true)

        // Merge all form data
        const allData = { ...formData, ...data }

        console.log('📝 [CADASTRO] Submitting with data:', {
            plan_type: allData.plan_type,
            clinic_name: allData.clinic_name,
            email: allData.email,
            admin_email: allData.admin_email,
            admin_name: allData.admin_name,
        })

        try {
            // Validate required fields before sending
            if (!allData.plan_type) {
                throw new Error('Selecione um plano antes de continuar')
            }
            if (!allData.clinic_name) {
                throw new Error('Nome da clínica é obrigatório')
            }
            if (!allData.admin_email) {
                throw new Error('Email do administrador é obrigatório')
            }
            if (!allData.password) {
                throw new Error('Senha é obrigatória')
            }

            // Pre-register and generate boleto via Banco Inter
            const response = await fetch('/api/auth/pre-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: allData.admin_email,
                    password: allData.password,
                    full_name: allData.admin_name,
                    clinic_name: allData.clinic_name,
                    cnpj: allData.cnpj ? cleanCNPJ(allData.cnpj) : null,
                    phone: allData.phone,
                    responsible_phone: allData.phone,
                    plan_type: allData.plan_type,
                    referral_code: referralCode || null,
                    address: {
                        street: allData.street,
                        number: allData.number,
                        complement: allData.complement,
                        neighborhood: allData.neighborhood,
                        city: allData.city,
                        state: allData.state,
                        zip: allData.zip,
                    },
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error?.message || result.error || 'Erro ao criar pré-cadastro')
            }

            // Show boleto data on Step 6
            if (result.success && result.boleto) {
                setBoletoData({
                    linha_digitavel: result.boleto.linha_digitavel,
                    codigo_barras: result.boleto.codigo_barras,
                    nosso_numero: result.boleto.nosso_numero,
                    plan_name: result.plan?.name || '',
                    plan_price: result.plan?.price || 0,
                    due_date: result.due_date || '',
                })
                setCurrentStep(6)
                toast.success('Boleto gerado com sucesso!')
            } else {
                throw new Error('Erro ao gerar boleto')
            }
        } catch (error) {
            console.error('Registration error:', error)
            toast.error(error instanceof Error ? error.message : 'Erro ao processar cadastro')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCopyLinhaDigitavel = () => {
        if (boletoData?.linha_digitavel) {
            navigator.clipboard.writeText(boletoData.linha_digitavel)
            setCopied(true)
            toast.success('Linha digitável copiada!')
            setTimeout(() => setCopied(false), 3000)
        }
    }


    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <Link
                        href="/"
                        className="inline-flex items-center"
                    >
                        <img src="/logo_black.svg" alt="CliniGo" className="h-10 w-auto" />
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Stepper */}
                <RegistrationStepper
                    steps={STEPS}
                    currentStep={currentStep}
                    onStepClick={handleStepClick}
                    loading={isSubmitting}
                />

                {/* Content */}
                <div className="max-w-5xl mx-auto mt-8">
                    <form onSubmit={handleSubmit(onSubmitStep)}>
                        {/* Step 1: Plan Selection */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold">Escolha seu plano</h2>
                                    <p className="text-muted-foreground mt-2">
                                        Selecione o plano ideal para sua clínica
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {PLAN_ORDER.map((planKey) => {
                                        const plan = PLANS[planKey]
                                        return (
                                            <PlanCard
                                                key={plan.id}
                                                plan={plan}
                                                selected={formData.plan_type === plan.id}
                                                onSelect={() => {
                                                    // Update both formData state AND react-hook-form
                                                    setFormData(prev => ({ ...prev, plan_type: plan.id }))
                                                    setValue('plan_type', plan.id)
                                                }}
                                            />
                                        )
                                    })}
                                </div>

                                <div className="flex justify-end mt-8">
                                    <Button
                                        type="button"
                                        onClick={nextStep}
                                        size="lg"
                                        disabled={!formData.plan_type}
                                    >
                                        Continuar
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Clinic Data */}
                        {currentStep === 2 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dados da Clínica</CardTitle>
                                    <CardDescription>
                                        Informações básicas sobre sua clínica
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="clinic_name">Nome da Clínica *</Label>
                                            <Input
                                                id="clinic_name"
                                                placeholder="Clínica Exemplo"
                                                {...register('clinic_name', { required: true })}
                                                error={!!errors.clinic_name}
                                            />
                                            {errors.clinic_name && (
                                                <p className="text-xs text-destructive">{errors.clinic_name.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="cnpj">CNPJ *</Label>
                                            <Input
                                                id="cnpj"
                                                placeholder="00.000.000/0000-00"
                                                {...register('cnpj', {
                                                    required: true,
                                                    onChange: (e) => {
                                                        e.target.value = maskCNPJ(e.target.value)
                                                    }
                                                })}
                                                error={!!errors.cnpj}
                                            />
                                            {errors.cnpj && (
                                                <p className="text-xs text-destructive">{errors.cnpj.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Telefone *</Label>
                                            <Input
                                                id="phone"
                                                placeholder="11999999999"
                                                {...register('phone', { required: true })}
                                                error={!!errors.phone}
                                            />
                                            {errors.phone && (
                                                <p className="text-xs text-destructive">{errors.phone.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="email">Email *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="contato@clinica.com"
                                                {...register('email', { required: true })}
                                                error={!!errors.email}
                                            />
                                            {errors.email && (
                                                <p className="text-xs text-destructive">{errors.email.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="slug">URL da Clínica *</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">clinigo.com/</span>
                                                <Input
                                                    id="slug"
                                                    placeholder="minha-clinica"
                                                    {...register('slug', { required: true })}
                                                    error={!!errors.slug}
                                                    className="flex-1"
                                                />
                                            </div>
                                            {errors.slug && (
                                                <p className="text-xs text-destructive">{errors.slug.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Referral Code */}
                                    <div className="border-t pt-4 mt-4">
                                        <ReferralCodeInput
                                            value={referralCode}
                                            onChange={(value) => {
                                                setReferralCode(value)
                                                setFormData(prev => ({ ...prev, referral_code: value }))
                                            }}
                                            onValidPartner={setValidPartner}
                                        />
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button type="button" variant="outline" onClick={prevStep}>
                                            <ArrowLeft className="mr-2 w-4 h-4" />
                                            Voltar
                                        </Button>
                                        <Button type="submit" size="lg">
                                            Continuar
                                            <ArrowRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3: Address (Optional) */}
                        {currentStep === 3 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Endereço</CardTitle>
                                    <CardDescription>
                                        Localização da clínica (opcional)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="street">Rua</Label>
                                            <Input id="street" {...register('street')} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="number">Número</Label>
                                            <Input id="number" {...register('number')} />
                                        </div>

                                        <div className="space-y-2 md:col-span-3">
                                            <Label htmlFor="complement">Complemento</Label>
                                            <Input id="complement" {...register('complement')} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="neighborhood">Bairro</Label>
                                            <Input id="neighborhood" {...register('neighborhood')} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="city">Cidade</Label>
                                            <Input id="city" {...register('city')} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="state">Estado</Label>
                                            <Input id="state" maxLength={2} {...register('state')} />
                                        </div>
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button type="button" variant="outline" onClick={prevStep}>
                                            <ArrowLeft className="mr-2 w-4 h-4" />
                                            Voltar
                                        </Button>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="ghost" onClick={nextStep}>
                                                Pular
                                            </Button>
                                            <Button type="submit" size="lg">
                                                Continuar
                                                <ArrowRight className="ml-2 w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 4: Admin Data */}
                        {currentStep === 4 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dados do Administrador</CardTitle>
                                    <CardDescription>
                                        Suas informações de acesso
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="admin_name">Nome Completo *</Label>
                                            <Input
                                                id="admin_name"
                                                placeholder="Dr. João Silva"
                                                {...register('admin_name', { required: true })}
                                                error={!!errors.admin_name}
                                            />
                                            {errors.admin_name && (
                                                <p className="text-xs text-destructive">{errors.admin_name.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="admin_email">Email *</Label>
                                            <Input
                                                id="admin_email"
                                                type="email"
                                                placeholder="seu@email.com"
                                                {...register('admin_email', { required: true })}
                                                error={!!errors.admin_email}
                                            />
                                            {errors.admin_email && (
                                                <p className="text-xs text-destructive">{errors.admin_email.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Senha *</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="••••••••"
                                                {...register('password', { required: true })}
                                                error={!!errors.password}
                                            />
                                            {errors.password && (
                                                <p className="text-xs text-destructive">{errors.password.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirm_password">Confirmar Senha *</Label>
                                            <Input
                                                id="confirm_password"
                                                type="password"
                                                placeholder="••••••••"
                                                {...register('confirm_password', { required: true })}
                                                error={!!errors.confirm_password}
                                            />
                                            {errors.confirm_password && (
                                                <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
                                            )}
                                        </div>

                                        <div className="flex items-start space-x-2">
                                            <Checkbox
                                                id="accept_terms"
                                                checked={!!formData.accept_terms}
                                                onCheckedChange={(checked) => {
                                                    setFormData(prev => ({ ...prev, accept_terms: !!checked }))
                                                    setValue('accept_terms', !!checked)
                                                }}
                                            />
                                            <Label htmlFor="accept_terms" className="text-sm cursor-pointer leading-tight">
                                                Aceito os <Link href="/termos" className="text-primary hover:underline">termos de uso</Link> e <Link href="/privacidade" className="text-primary hover:underline">política de privacidade</Link> *
                                            </Label>
                                        </div>
                                        {!formData.accept_terms && errors.accept_terms && (
                                            <p className="text-xs text-destructive">Você deve aceitar os termos para continuar</p>
                                        )}
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button type="button" variant="outline" onClick={prevStep}>
                                            <ArrowLeft className="mr-2 w-4 h-4" />
                                            Voltar
                                        </Button>
                                        <Button type="submit" size="lg">
                                            Continuar
                                            <ArrowRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 5: Review */}
                        {currentStep === 5 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Revise seus dados</CardTitle>
                                    <CardDescription>
                                        Verifique se está tudo correto antes de finalizar
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Plan Summary */}
                                    <div>
                                        <h3 className="font-semibold mb-2">Plano Selecionado</h3>
                                        <div className="p-4 bg-muted rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{formData.plan_type ? PLANS[formData.plan_type]?.name : 'Nenhum plano selecionado'}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formData.plan_type ? PLANS[formData.plan_type]?.tagline : 'Volte e selecione um plano'}
                                                    </p>
                                                </div>
                                                <p className="text-2xl font-bold">
                                                    {formData.plan_type ? PLANS[formData.plan_type]?.priceLabel : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Clinic Data Summary */}
                                    <div>
                                        <h3 className="font-semibold mb-2">Dados da Clínica</h3>
                                        <div className="p-4 bg-muted rounded-lg space-y-2">
                                            <p><strong>Nome:</strong> {formData.clinic_name}</p>
                                            <p><strong>CNPJ:</strong> {formData.cnpj}</p>
                                            <p><strong>Email:</strong> {formData.email}</p>
                                            <p><strong>Telefone:</strong> {formData.phone}</p>
                                            <p><strong>URL:</strong> clinigo.com/{formData.slug}</p>
                                        </div>
                                    </div>

                                    {/* Admin Data Summary */}
                                    <div>
                                        <h3 className="font-semibold mb-2">Administrador</h3>
                                        <div className="p-4 bg-muted rounded-lg space-y-2">
                                            <p><strong>Nome:</strong> {formData.admin_name}</p>
                                            <p><strong>Email:</strong> {formData.admin_email}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
                                            <ArrowLeft className="mr-2 w-4 h-4" />
                                            Voltar
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="lg"
                                            disabled={isSubmitting}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                                    Processando...
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowRight className="mr-2 w-4 h-4" />
                                                    Ir para Pagamento
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 6: Boleto / Payment */}
                        {currentStep === 6 && boletoData && (
                            <Card>
                                <CardHeader className="text-center">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                                        <CheckCircle className="h-8 w-8 text-emerald-600" />
                                    </div>
                                    <CardTitle className="text-2xl">Pré-cadastro realizado!</CardTitle>
                                    <CardDescription>
                                        Pague o boleto abaixo para ativar sua clínica
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Plan Summary */}
                                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-emerald-800">{boletoData.plan_name}</p>
                                                <p className="text-sm text-emerald-600">Assinatura mensal</p>
                                            </div>
                                            <p className="text-2xl font-bold text-emerald-700">
                                                R$ {boletoData.plan_price.toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                        {boletoData.due_date && (
                                            <p className="text-xs text-emerald-600 mt-2">
                                                Vencimento: {new Date(boletoData.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Linha Digitável */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Barcode className="w-4 h-4" />
                                            Linha Digitável
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={boletoData.linha_digitavel}
                                                readOnly
                                                className="font-mono text-sm bg-gray-50"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={handleCopyLinhaDigitavel}
                                                className="shrink-0"
                                            >
                                                {copied ? (
                                                    <Check className="w-4 h-4 text-emerald-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-blue-800 mb-2">📋 Como pagar:</h4>
                                        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                                            <li>Copie a linha digitável acima</li>
                                            <li>Abra o app do seu banco</li>
                                            <li>Escolha &quot;Pagar Boleto&quot; e cole a linha digitável</li>
                                            <li>Confirme o pagamento</li>
                                        </ol>
                                        <p className="text-xs text-blue-600 mt-3">
                                            Após a confirmação do pagamento (pode levar até 24h úteis),
                                            você receberá um e-mail com suas credenciais de acesso.
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-3">
                                        <Button
                                            type="button"
                                            size="lg"
                                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                                            onClick={handleCopyLinhaDigitavel}
                                        >
                                            {copied ? (
                                                <><Check className="mr-2 w-4 h-4" /> Copiado!</>
                                            ) : (
                                                <><Copy className="mr-2 w-4 h-4" /> Copiar Linha Digitável</>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="lg"
                                            variant="outline"
                                            className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => {
                                                if (boletoData?.nosso_numero) {
                                                    window.open(`/api/auth/boleto-pdf?nossoNumero=${boletoData.nosso_numero}`, '_blank')
                                                }
                                            }}
                                        >
                                            <Download className="mr-2 w-4 h-4" /> Baixar Boleto em PDF
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.push('/')}
                                        >
                                            Voltar para o site
                                        </Button>
                                    </div>

                                    <p className="text-center text-xs text-muted-foreground">
                                        Dúvidas? Entre em contato: suporte@clinigo.app
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function CadastroPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <CadastroContent />
        </Suspense>
    )
}

